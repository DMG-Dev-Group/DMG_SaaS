/* ============================================================
   DMG SaaS — Camada de dados (Firestore)
   ============================================================
   Mesma interface pública do store.js original em localStorage:
     Store.get(col) / Store.add(col, obj) / Store.update(col, id, patch)
     Store.remove(col, id) / Store.log(texto, tipo) / Store.uid() / Store.isoDay(d)

   O que muda por baixo:
     - Cada coleção (`projetos`, `clientes`, `receitas`, `eventos`,
       `atividades`) agora é uma collection do Firestore.
     - Um listener em tempo real (onSnapshot) mantém um cache local
       em memória atualizado, e chama Store.onChange(...) sempre que
       algo muda — inclusive mudanças feitas por outra pessoa do
       time, em outro navegador.
     - add/update/remove agora são assíncronos por baixo dos panos
       (gravam no Firestore), mas o app.js não precisa mudar: o
       cache local + o listener cuidam de refletir a mudança na UI.
   ============================================================ */

import { db } from "./firebase-init.js";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const COLECOES = ["projetos", "clientes", "receitas", "eventos", "atividades"];

const Store = (() => {
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const isoDay = (d) => {
    const x = new Date(d);
    x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
    return x.toISOString().slice(0, 10);
  };

  // Cache local em memória — é o que Store.get() lê de forma síncrona.
  const cache = { projetos: [], clientes: [], receitas: [], eventos: [], atividades: [] };
  const listenersProntos = new Set();
  const inscritos = []; // callbacks chamados a cada mudança de qualquer coleção

  function notificar() {
    inscritos.forEach((fn) => fn());
  }

  // Assina updates em tempo real de todas as coleções.
  // Chama `onReady` quando as 5 coleções já carregaram pela 1ª vez.
  function iniciar(onReady) {
    let restantes = COLECOES.length;
    COLECOES.forEach((col) => {
      onSnapshot(
        collection(db, col),
        (snap) => {
          cache[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          if (!listenersProntos.has(col)) {
            listenersProntos.add(col);
            restantes--;
            if (restantes === 0 && onReady) onReady();
          }
          notificar();
        },
        (err) => {
          console.error(`[Store] erro no listener de "${col}":`, err);
        }
      );
    });
  }

  return {
    uid,
    isoDay,
    iniciar,

    // Inscreve uma função pra ser chamada sempre que qualquer coleção mudar
    // (usado pelo app.js pra re-renderizar a view atual em tempo real).
    onChange(fn) {
      inscritos.push(fn);
    },

    get: (col) => cache[col] || [],

    async add(col, obj) {
      const { id, ...semId } = obj; // Firestore gera o id, não usamos o uid() local aqui
      await addDoc(collection(db, col), { ...semId, criadoEm: serverTimestamp() });
    },

    async update(col, id, patch) {
      await updateDoc(doc(db, col, id), patch);
    },

    async remove(col, id) {
      await deleteDoc(doc(db, col, id));
    },

    async log(texto, tipo = "info") {
      await addDoc(collection(db, "atividades"), { tipo, texto, ts: Date.now() });
      // Manter só as últimas 60 fica a cargo de uma limpeza periódica manual
      // ou de uma Cloud Function futura — não é feito no cliente pra evitar
      // condição de corrida entre vários usuários lendo/apagando ao mesmo tempo.
    },

    reset() {
      alert("Reset de dados agora é feito direto no Console do Firebase (Firestore), não pelo navegador.");
    },
  };
})();

export default Store;
window.Store = Store; // mantém compatível com app.js, que usa `Store` como global
