/* ============================================================
   DMG SaaS — Firebase Admin (uso exclusivo deste serviço)
   ============================================================
   Diferente do js/firebase-init.js do dashboard (que usa o SDK
   client, com a apiKey pública do projeto — normal e seguro pra
   Firebase), aqui usamos o Admin SDK com uma service account, que
   tem permissão total e por isso PRECISA ficar só no servidor.
   ============================================================ */

require("dotenv").config();
const admin = require("firebase-admin");
const path = require("path");

if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(
    __dirname,
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./secrets/firebase-service-account.json"
  );

  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
  });
}

module.exports = admin;
