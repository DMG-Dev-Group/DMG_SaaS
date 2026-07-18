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

/** Busca transações do item a partir de uma data (YYYY-MM-DD), com paginação. */
async function fetchTransactions(itemId, fromDateISO) {
  const apiKey = await getApiKey();
  let page = 1;
  const all = [];

  while (true) {
    const url = new URL(`${PLUGGY_BASE_URL}/transactions`);
    url.searchParams.set("accountId", itemId);
    if (fromDateISO) url.searchParams.set("from", fromDateISO);
    url.searchParams.set("pageSize", "500");
    url.searchParams.set("page", String(page));

    const resp = await fetch(url, { headers: { "X-API-KEY": apiKey } });
    if (!resp.ok) throw new Error(`Falha ao buscar transações (${resp.status}).`);

    const data = await resp.json();
    all.push(...(data.results || []));

    if (!data.results || data.results.length < 500) break;
    page += 1;
  }

  return all;
}

module.exports = { fetchTransactions, triggerItemUpdate };
