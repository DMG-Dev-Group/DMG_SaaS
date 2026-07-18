/* ============================================================
   DMG SaaS — Cliente da API Pluggy
   ============================================================
   Único arquivo do sistema que conhece api.pluggy.ai. O
   PLUGGY_CLIENT_SECRET nunca sai daqui — em especial, nunca é
   colocado em nenhum arquivo dentro de css/, js/, dashboard.html
   ou index.html (esses rodam no navegador do usuário, onde
   qualquer segredo vira público).
   ============================================================ */

const PLUGGY_BASE_URL = "https://api.pluggy.ai";

let cachedApiKey = null;
let cachedApiKeyExpiresAt = 0;

/**
 * Lança um erro incluindo o corpo da resposta da Pluggy — sem isso, só
 * vemos o código HTTP e ficamos adivinhando o motivo real.
 */
async function erroComCorpo(resp, contexto) {
  let corpo = "";
  try {
    corpo = await resp.text();
  } catch {
    corpo = "(não foi possível ler o corpo da resposta)";
  }
  return new Error(`${contexto} (${resp.status}): ${corpo}`);
}

async function getApiKey() {
  const now = Date.now();
  if (cachedApiKey && now < cachedApiKeyExpiresAt) return cachedApiKey;

  const resp = await fetch(`${PLUGGY_BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
  });
  if (!resp.ok) throw await erroComCorpo(resp, "Falha na autenticação Pluggy");

  const data = await resp.json();
  cachedApiKey = data.apiKey;
  cachedApiKeyExpiresAt = now + 110 * 60 * 1000; // renova com folga antes de expirar (~2h)
  return cachedApiKey;
}

/**
 * Pede pra Pluggy buscar dados frescos na instituição antes de ler.
 * Obs: itens vindos do MeuPluggy não podem ser atualizados por aqui —
 * quem sincroniza com o banco é o próprio Meu Pluggy (diariamente).
 * Nesses casos a API responde 400 "MeuPluggy item cant be updated",
 * o que é esperado e ignorado em silêncio.
 */
async function triggerItemUpdate(itemId) {
  const apiKey = await getApiKey();
  const resp = await fetch(`${PLUGGY_BASE_URL}/items/${itemId}`, {
    method: "PATCH",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    if (!corpo.includes("MeuPluggy item cant be updated")) {
      console.warn("[pluggyClient] aviso ao atualizar item:", resp.status, corpo);
    }
  }
}

/**
 * Lista as accounts (contas) dentro de um item (conexão). Um item pode ter
 * mais de uma account — o PicPay normalmente tem uma do tipo BANK/PAYMENT.
 * É o accountId daqui que a API de transações espera, NUNCA o itemId.
 */
async function fetchAccounts(itemId) {
  const apiKey = await getApiKey();

  const url = new URL(`${PLUGGY_BASE_URL}/accounts`);
  url.searchParams.set("itemId", itemId);

  const resp = await fetch(url, { headers: { "X-API-KEY": apiKey } });
  if (!resp.ok) throw await erroComCorpo(resp, "Falha ao buscar accounts do item");

  const data = await resp.json();
  return data.results || [];
}

/**
 * Busca transações de uma account específica a partir de uma data
 * (YYYY-MM-DD), com paginação por cursor (GET /v2/transactions).
 */
async function fetchTransactions(accountId, fromDateISO) {
  const apiKey = await getApiKey();
  const all = [];

  const primeiraUrl = new URL(`${PLUGGY_BASE_URL}/v2/transactions`);
  primeiraUrl.searchParams.set("accountId", accountId);
  if (fromDateISO) primeiraUrl.searchParams.set("dateFrom", fromDateISO);
  // Obs: /v2/transactions NÃO aceita pageSize — as páginas são fixas em 500
  // e mandar o parâmetro causa 400 ("property pageSize should not exist").

  let nextUrl = primeiraUrl.toString();

  while (nextUrl) {
    const resp = await fetch(nextUrl, { headers: { "X-API-KEY": apiKey } });
    if (!resp.ok) throw await erroComCorpo(resp, "Falha ao buscar transações");

    const data = await resp.json();
    all.push(...(data.results || []));
    nextUrl = data.next || null;
  }

  return all;
}

module.exports = { fetchTransactions, fetchAccounts, triggerItemUpdate };
