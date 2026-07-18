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
const { fetchTransactions, triggerItemUpdate } = require("./pluggyClient");

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

  const lastSyncDate = await getLastSyncDate();
  const transacoes = await fetchTransactions(itemId, lastSyncDate);

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
