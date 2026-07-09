/* ============================================================
   DMG SaaS — Camada de dados (localStorage)
   Trocar por Firebase/Firestore no futuro: manter esta API.
   ============================================================ */

const Store = (() => {
  const KEY = "dmg_saas_v1";

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const isoDay = (d) => {
    const x = new Date(d);
    x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
    return x.toISOString().slice(0, 10);
  };

  function seed() {
    const projetos = [
      { id: uid(), nome: "Flora Beauty", tipo: "e-commerce", resp: "Daniel", status: "producao", progresso: 100, valor: 12000 },
      { id: uid(), nome: "Tendresse", tipo: "site institucional", resp: "Guilherme", status: "dev", progresso: 64, valor: 6500 },
      { id: uid(), nome: "DMG Site / SaaS", tipo: "interno", resp: "Miguel", status: "dev", progresso: 82, valor: 0 },
      { id: uid(), nome: "DMG Design System", tipo: "interno", resp: "Equipe", status: "plan", progresso: 18, valor: 0 },
    ];

    const clientes = [
      { id: uid(), nome: "Flora Beauty", contato: "contato@florabeauty.com", desde: "2026-02" },
      { id: uid(), nome: "Tendresse", contato: "tendresse@gmail.com", desde: "2026-05" },
    ];

    /* Receitas agregadas dos últimos 8 meses (alimenta o gráfico) */
    const vals = [18000, 24000, 21000, 30000, 27000, 36000, 38000, 42800];
    const receitas = vals.map((v, i) => {
      const d = new Date();
      d.setDate(15);
      d.setMonth(d.getMonth() - (7 - i));
      return {
        id: uid(),
        desc: "Recebimentos de " + d.toLocaleDateString("pt-BR", { month: "long" }),
        valor: v,
        tipo: "entrada",
        projeto: "—",
        data: isoDay(d),
      };
    });
    receitas.push({ id: uid(), desc: "Domínio + infraestrutura", valor: 320, tipo: "saida", projeto: "DMG Site / SaaS", data: isoDay(new Date()) });

    const prox = new Date();
    prox.setDate(prox.getDate() + ((8 - prox.getDay()) % 7 || 7)); // próxima segunda
    const entrega = new Date();
    entrega.setDate(entrega.getDate() + 10);

    const eventos = [
      { id: uid(), titulo: "Reunião semanal DMG", data: isoDay(prox), hora: "20:00", tipo: "reuniao" },
      { id: uid(), titulo: "Entrega parcial — Tendresse", data: isoDay(entrega), hora: "18:00", tipo: "entrega" },
    ];

    const atividades = [
      { id: uid(), tipo: "deploy", texto: "<b>Deploy</b> — flora-beauty v2.4.1 em produção", ts: Date.now() - 26 * 60000 },
      { id: uid(), tipo: "commit", texto: "<b>Commit</b> — dmg-site: seção de membros finalizada", ts: Date.now() - 60 * 60000 },
      { id: uid(), tipo: "cliente", texto: "<b>Novo cliente</b> — proposta aceita: projeto ERP", ts: Date.now() - 5 * 3600000 },
      { id: uid(), tipo: "backup", texto: "<b>Backup</b> — rotina concluída sem erros", ts: Date.now() - 8 * 3600000 },
    ];

    return { projetos, clientes, receitas, eventos, atividades };
  }

  let data;
  try {
    data = JSON.parse(localStorage.getItem(KEY));
  } catch (_) {
    data = null;
  }
  if (!data || !data.projetos) {
    data = seed();
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  const save = () => localStorage.setItem(KEY, JSON.stringify(data));

  return {
    uid,
    isoDay,
    get: (col) => data[col],
    add(col, obj) {
      obj.id = obj.id || uid();
      data[col].push(obj);
      save();
      return obj;
    },
    update(col, id, patch) {
      const item = data[col].find((x) => x.id === id);
      if (item) Object.assign(item, patch);
      save();
      return item;
    },
    remove(col, id) {
      data[col] = data[col].filter((x) => x.id !== id);
      save();
    },
    log(texto, tipo = "info") {
      data.atividades.unshift({ id: uid(), tipo, texto, ts: Date.now() });
      data.atividades = data.atividades.slice(0, 60);
      save();
    },
    reset() {
      localStorage.removeItem(KEY);
      location.reload();
    },
  };
})();
