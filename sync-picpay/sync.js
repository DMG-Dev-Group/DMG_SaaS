/* ============================================================
   DMG SaaS — Sincronização PicPay → coleção "receitas"
   ============================================================
   Escreve no MESMO formato que Store.add("receitas", ...) já usa
   no dashboard (js/app.js) — por isso o dashboard não precisa de
   nenhuma alteração: o onSnapshot do store.js pega as transações
   novas em tempo real, como se tivessem sido lançadas manualmente.

   Idempotência: cada transação usa como docId `picpay_<idPluggy>`,
   então rodar a sincronização de novo nunca duplica lançamento.
   ============================================================ */

const admin = require("./firebaseAdmin");
const { fetchTransactions, fetchAccounts, triggerItemUpdate } = require("./pluggyClient");

const db = admin.firestore();
const SYNC_STATE_DOC = "syncState/picpay";

async function getLastSyncDate() {
  const snap = await db.doc(SYNC_STATE_DOC).get();
  return snap.exists ? snap.data().lastSyncDate || null : null;
}

async function setLastSyncDate(isoDate) {
  await db
    .doc(SYNC_STATE_DOC)
    .set({ lastSyncDate: isoDate, atualizadoEm: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

/** Converte uma transação da Pluggy pro schema de "receitas" do dashboard. */
function mapParaReceita(tx) {
  // Convenção da Pluggy: amount negativo = saída da conta, positivo = entrada.
  const tipo = tx.amount >= 0 ? "entrada" : "saida";

  return {
    desc: tx.description || tx.merchant?.name || "Transação PicPay",
    valor: Math.abs(tx.amount),
    tipo,
    data: (tx.date || "").slice(0, 10), // YYYY-MM-DD, mesmo formato usado no resto do app
    projetoId: "",
    projeto: "",
    origem: "picpay", // campo novo, não quebra nada — o app.js ignora campos que não usa
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function sincronizarPicPay() {
  const itemId = process.env.PLUGGY_PICPAY_ITEM_ID;
  if (!itemId) throw new Error("PLUGGY_PICPAY_ITEM_ID não configurado no .env.");

  await triggerItemUpdate(itemId);

  // O itemId identifica a CONEXÃO, não a conta em si — a API de transações
  // quer o accountId. Um item pode ter mais de uma account (ex: conta +
  // cartão), então buscamos transações de todas.
  const accounts = await fetchAccounts(itemId);
  if (accounts.length === 0) {
    console.log("[sync-picpay] nenhuma account encontrada para esse item ainda (tente de novo em instantes).");
    return { novas: 0 };
  }

  const lastSyncDate = await getLastSyncDate();

  // Janela de sobreposição: recua 3 dias do último sync na hora de buscar.
  // Evita perder transações com data igual/próxima à última sincronizada
  // (filtros de data podem ser exclusivos, e transações podem ser lançadas
  // retroativamente pelo banco). Não duplica nada: o docId determinístico
  // (picpay_<id>) faz regravações virarem merge inofensivo.
  let dateFrom = null;
  if (lastSyncDate) {
    const d = new Date(`${lastSyncDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 3);
    dateFrom = d.toISOString().slice(0, 10);
  }

  const transacoes = [];
  for (const account of accounts) {
    const txs = await fetchTransactions(account.id, dateFrom);
    transacoes.push(...txs);
  }

  if (transacoes.length === 0) {
    console.log("[sync-picpay] nenhuma transação nova.");
    return { novas: 0 };
  }

  const batch = db.batch();
  for (const tx of transacoes) {
    const ref = db.collection("receitas").doc(`picpay_${tx.id}`);
    batch.set(ref, mapParaReceita(tx), { merge: true });
  }
  await batch.commit();

  const maisRecente = transacoes.map((t) => t.date).sort().at(-1);
  await setLastSyncDate(maisRecente.slice(0, 10));

  console.log(`[sync-picpay] ${transacoes.length} transação(ões) sincronizada(s).`);
  return { novas: transacoes.length };
}

module.exports = { sincronizarPicPay };
