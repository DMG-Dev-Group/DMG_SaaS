/* ============================================================
   DMG SaaS — Processo contínuo de sincronização do PicPay
   ============================================================
   Roda `npm start` deixa esse processo vivo, sincronizando a cada
   SYNC_INTERVAL_MINUTES. O plano gratuito do Meu Pluggy não tem
   webhook em tempo real, então esse polling é o mecanismo possível
   dentro do caminho sem custo — alguns minutos de atraso, não é
   instantâneo.

   Onde rodar: precisa de um processo Node vivo 24/7, então NÃO dá
   pra hospedar junto do site estático (Vercel/Netlify não mantêm
   processo rodando). Opções simples e gratuitas: Render (Background
   Worker, free tier) ou Railway (free tier), ou uma VPS que a DMG
   já tenha. Ver PICPAY-SETUP.md.
   ============================================================ */

require("dotenv").config();
const cron = require("node-cron");
const { sincronizarPicPay } = require("./sync");

const minutos = Number(process.env.SYNC_INTERVAL_MINUTES || 15);
console.log(`[sync-picpay] iniciado — sincronizando a cada ${minutos} min.`);

cron.schedule(`*/${minutos} * * * *`, async () => {
  try {
    await sincronizarPicPay();
  } catch (err) {
    console.error("[sync-picpay] erro:", err.message);
  }
});

// Roda uma vez já na subida do processo, sem esperar o primeiro intervalo.
sincronizarPicPay().catch((err) => console.error("[sync-picpay] erro na carga inicial:", err.message));
