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
  if (!resp.ok) throw new Error(`Falha na autenticação Pluggy (${resp.status}).`);

  const data = await resp.json();
  cachedApiKey = data.apiKey;
  cachedApiKeyExpiresAt = now + 110 * 60 * 1000; // renova com folga antes de expirar (~2h)
  return cachedApiKey;
}

/** Pede pra Pluggy buscar dados frescos na instituição antes de ler. */
async function triggerItemUpdate(itemId) {
  const apiKey = await getApiKey();
  await fetch(`${PLUGGY_BASE_URL}/items/${itemId}`, {
    method: "PATCH",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
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
  if (!resp.ok) throw new Error(`Falha ao buscar accounts do item (${resp.status}).`);

  const data = await resp.json();
  return data.results || [];
}

/**
 * Busca transações de uma account específica a partir de uma data
 * (YYYY-MM-DD), com paginação por cursor.
 *
 * IMPORTANTE: o endpoint antigo (GET /transactions, paginado por número de
 * página) foi descontinuado pela Pluggy e retorna 410 Gone. O substituto é
 * GET /v2/transactions, que devolve { results, next }, onde `next` é a URL
 * completa da próxima página (ou null quando acabou).
 */
async function fetchTransactions(accountId, fromDateISO) {
  const apiKey = await getApiKey();
  const all = [];

  const primeiraUrl = new URL(`${PLUGGY_BASE_URL}/v2/transactions`);
  primeiraUrl.searchParams.set("accountId", accountId);
  if (fromDateISO) primeiraUrl.searchParams.set("dateFrom", fromDateISO);
  primeiraUrl.searchParams.set("pageSize", "500");

  let nextUrl = primeiraUrl.toString();

  while (nextUrl) {
    const resp = await fetch(nextUrl, { headers: { "X-API-KEY": apiKey } });
    if (!resp.ok) throw new Error(`Falha ao buscar transações (${resp.status}).`);

    const data = await resp.json();
    all.push(...(data.results || []));
    nextUrl = data.next || null;
  }

  return all;
}

module.exports = { fetchTransactions, fetchAccounts, triggerItemUpdate };
