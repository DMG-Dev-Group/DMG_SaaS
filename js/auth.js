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

/* ── Painel por usuário ──
   Mesmas funcionalidades e mesmo js/ para todos; o que muda é a página:
   dashboard.html (visual novo) ou dashboard-classic.html (visual clássico,
   idêntico ao painel original). Quando o login resolve, se o usuário está
   na página "errada" pro seu perfil, redireciona preservando a view (#hash). */
const PAINEL_POR_UID = {
  "5McOaiX7HfPzVWhhs9I9YSFa6mj1": "dashboard-classic.html", // Miguel — visual clássico
};

/* Devolve true se disparou um redirect — nesse caso a página atual vai ser
   substituída e não deve montar o dashboard (evita abrir listeners do
   Firestore que morreriam no meio da troca de página). */
function levarAoPainelCerto(user) {
  const atual = location.pathname.split("/").pop() || "index.html";
  if (atual !== "dashboard.html" && atual !== "dashboard-classic.html") return false;
  const alvo = (user && PAINEL_POR_UID[user.uid]) || "dashboard.html";
  // Persiste pro snippet do <head> das duas páginas mandar o navegador
  // direto pro painel certo antes do primeiro paint (sem "flash")
  try {
    if (alvo === "dashboard-classic.html") localStorage.setItem("dmg-painel", "classic");
    else localStorage.removeItem("dmg-painel");
  } catch (e) { /* storage indisponível — o redirect abaixo resolve mesmo assim */ }
  if (user && atual !== alvo) {
    location.replace(alvo + location.hash);
    return true;
  }
  return false;
}

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

/* ── Avatar do usuário logado ──
   Antes era um "M" fixo no HTML. Agora sai do próprio usuário do
   Firebase Auth: usa o displayName se existir, senão a parte do email
   antes do "@". Clicar no avatar faz logout. */

function nomeDoUsuario(user) {
  if (user.displayName?.trim()) return user.displayName.trim();
  const local = (user.email || "").split("@")[0];
  if (!local) return "Usuário";
  // "miguel.silva" / "miguel_silva" / "miguel-silva" → "Miguel Silva"
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((parte) => parte[0].toUpperCase() + parte.slice(1))
    .join(" ");
}

function iniciaisDoUsuario(nome) {
  const partes = nome.split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return (partes[0]?.[0] || "?").toUpperCase();
}

function atualizarAvatar(user) {
  const el = $("#user-avatar");
  if (!el) return;
  const nome = nomeDoUsuario(user);
  el.textContent = iniciaisDoUsuario(nome);
  el.title = `${nome} — ${user.email || ""} (clique para sair)`;
  el.onclick = () => {
    if (confirm(`Sair da conta de ${nome}?`)) signOut(auth);
  };
}

onAuthStateChanged(auth, (user) => {
  if (levarAoPainelCerto(user)) return; // a página certa carrega do zero
  if (user) {
    removerTelaLogin();
    atualizarAvatar(user);
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
