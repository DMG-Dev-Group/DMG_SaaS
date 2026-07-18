/* ============================================================
   DMG SaaS — Portão de login (Firebase Auth)
   ============================================================
   Mostra uma tela de login simples (email/senha) até o usuário
   autenticar. Depois de autenticado, libera o dashboard e chama
   `iniciarDashboard()` (definida em app.js) uma única vez.

   Pré-requisito no Console do Firebase:
     Authentication → Sign-in method → ativar "Email/senha".
     Depois, criar manualmente um usuário por membro do time em
     Authentication → Users → Add user (nada de cadastro público
     aberto — é um painel interno).
   ============================================================ */

import { auth } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const $ = (s, c = document) => c.querySelector(s);

let jaIniciou = false;

function montarTelaLogin() {
  const overlay = document.createElement("div");
  overlay.id = "login-overlay";
  overlay.innerHTML = `
    <form id="login-form" class="login-box">
      <img src="images/logo.svg" alt="DMG" class="login-logo">
      <h2>DMG Command Center</h2>
      <p class="login-sub">Acesso restrito à equipe</p>
      <label class="field"><span>Email</span><input type="email" name="email" required autocomplete="username"></label>
      <label class="field"><span>Senha</span><input type="password" name="senha" required autocomplete="current-password"></label>
      <p id="login-erro" class="login-erro" hidden></p>
      <button type="submit" class="btn-primary">Entrar</button>
    </form>`;
  document.body.appendChild(overlay);

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { email, senha } = Object.fromEntries(new FormData(e.target).entries());
    const erro = $("#login-erro");
    erro.hidden = true;
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      // onAuthStateChanged cuida do resto (remove a tela, libera o dashboard)
    } catch (err) {
      erro.textContent = "Email ou senha inválidos.";
      erro.hidden = false;
    }
  });
}

function removerTelaLogin() {
  const overlay = document.getElementById("login-overlay");
  if (overlay) overlay.remove();
}

onAuthStateChanged(auth, (user) => {
  const dash = document.querySelector(".sidebar")?.closest("body");
  if (user) {
    removerTelaLogin();
    document.body.classList.remove("logueando");
    if (!jaIniciou) {
      jaIniciou = true;
      window.dispatchEvent(new CustomEvent("dmg:autenticado", { detail: { user } }));
    }
  } else {
    jaIniciou = false;
    document.body.classList.add("logueando");
    if (!document.getElementById("login-overlay")) montarTelaLogin();
  }
});

// Exposto pro botão de logout em Configurações, se você adicionar um.
window.dmgLogout = () => signOut(auth);
