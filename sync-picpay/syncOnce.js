/* Uso: npm run sync:once — roda uma sincronização imediata (ex: carga inicial). */

const { sincronizarPicPay } = require("./sync");

sincronizarPicPay()
  .then((r) => {
    console.log("Concluído:", r);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Erro na sincronização:", err.message);
    process.exit(1);
  });
