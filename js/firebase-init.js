/* ============================================================
   DMG SaaS — Inicialização do Firebase
   ============================================================
   Preencha firebaseConfig com os dados do SEU projeto Firebase
   (Console Firebase → Configurações do projeto → Seus apps → SDK).

   Este arquivo é um módulo ES (import/export nativo do navegador,
   sem bundler) — por isso o <script> que o carrega no HTML precisa
   ter type="module".
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// TODO: substitua pelos valores reais do seu projeto Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyCYPZBy_sVo6ZI-RdMZ4wXZ6P7WZx98RNQ",
  authDomain: "dmgdev-group.firebaseapp.com",
  projectId: "dmgdev-group",
  storageBucket: "dmgdev-group.appspot.com",
  messagingSenderId: "705819967455",
  appId: "1:705819967455:web:f3a40d0053ae7ac5b3ce6a",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
