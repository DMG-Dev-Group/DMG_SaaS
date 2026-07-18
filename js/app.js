/* ============================================================
   DMG SaaS — Aplicação do painel (views, modal, calendário)
   ============================================================ */

/* ── Helpers ── */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const BRL = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS = {
  producao: { label: "produção", cls: "prod" },
  dev: { label: "desenvolvimento", cls: "dev" },
  plan: { label: "planejamento", cls: "plan" },
  done: { label: "concluído", cls: "prod" },
};

const EV_TIPOS = { reuniao: "Reunião", entrega: "Entrega", deadline: "Deadline", outro: "Outro" };

const tempoRelativo = (ts) => {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.round(h / 24)}d`;
};

const mesKey = (iso) => iso.slice(0, 7);

/* ── Data no topo ── */
$("#today").textContent = "// " + new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

/* ============ NAVEGAÇÃO ENTRE VIEWS ============ */

const TITULOS = {
  dashboard: ["// visão geral", "Dashboard"],
  projetos: ["// operação", "Projetos"],
  projeto: ["// projetos", "Detalhes"],
  clientes: ["// operação", "Clientes"],
  equipe: ["// operação", "Equipe"],
  financeiro: ["// operação", "Financeiro"],
  calendario: ["// operação", "Calendário"],
  atividades: ["// registro", "Atividades"],
  infraestrutura: ["// sistemas", "Infraestrutura"],
  seguranca: ["// sistemas", "Segurança"],
  analytics: ["// sistemas", "Analytics"],
  config: ["// sistemas", "Configurações"],
};

const RENDER = {};

function irPara(view) {
  $$(".view").forEach((v) => (v.hidden = v.dataset.view !== view));
  $$(".s-nav a[data-view]").forEach((a) => a.classList.toggle("active", a.dataset.view === view));
  $("#sidebar").classList.remove("open");
  const [label, titulo] = TITULOS[view] || TITULOS.dashboard;
  $("#page-label").textContent = label;
  $("#page-title").innerHTML = titulo + '<span class="cursor">_</span>';
  if (RENDER[view]) RENDER[view]();
  if (location.hash !== "#" + view) location.hash = view;
}

window.addEventListener("hashchange", () => {
  const v = location.hash.replace("#", "");
  if (TITULOS[v] && document.querySelector(`.view[data-view="${v}"]`).hidden) irPara(v);
});

$$("a[data-view]").forEach((a) =>
  a.addEventListener("click", (e) => {
    e.preventDefault();
    irPara(a.dataset.view);
  })
);

/* ============ MODAL GENÉRICO ============ */

function abrirModal(titulo, camposHTML, onSubmit) {
  $("#modal-title").textContent = titulo;
  const form = $("#modal-form");
  form.innerHTML = camposHTML + '<button type="submit" class="btn-primary" style="margin-top:6px">Salvar</button>';
  $("#modal").hidden = false;
  const first = form.querySelector("input,select");
  if (first) first.focus();
  form.onsubmit = (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(form).entries());
    onSubmit(dados);
    fecharModal();
  };
}

const fecharModal = () => ($("#modal").hidden = true);
$("#modal-close").addEventListener("click", fecharModal);
$("#modal").addEventListener("click", (e) => {
  if (e.target === $("#modal")) fecharModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharModal();
});

const campo = (label, inner) => `<label class="field"><span>${label}</span>${inner}</label>`;
const opts = (obj, sel) =>
  Object.entries(obj)
    .map(([v, l]) => `<option value="${v}" ${v === sel ? "selected" : ""}>${l.label || l}</option>`)
    .join("");

/* ============ DASHBOARD ============ */

RENDER.dashboard = () => {
  const hoje = new Date();
  const kAtual = mesKey(Store.isoDay(hoje));
  const ant = new Date(hoje);
  ant.setMonth(ant.getMonth() - 1);
  const kAnt = mesKey(Store.isoDay(ant));

  const receitas = Store.get("receitas");
  const somaMes = (k, tipo = "entrada") =>
    receitas.filter((r) => r.tipo === tipo && mesKey(r.data) === k).reduce((s, r) => s + Number(r.valor), 0);
  const rAtual = somaMes(kAtual);
  const rAnt = somaMes(kAnt);
  const deltaPct = rAnt ? (((rAtual - rAnt) / rAnt) * 100).toFixed(1).replace(".", ",") : "—";
  const subiu = rAtual >= rAnt;
  const fmtK = (v) => (v >= 1000 ? "R$ " + (v / 1000).toFixed(1).replace(".", ",") + "K" : BRL(v));

  $("#m-receita").textContent = fmtK(rAtual);
  $("#m-receita-badge").textContent = (subiu ? "▲ +" : "▼ −") + deltaPct + "%";
  $("#m-receita-badge").className = "badge" + (subiu ? " success" : "");
  $("#m-receita-delta").innerHTML = '<span class="vs">vs mês anterior</span>';

  const projetos = Store.get("projetos");
  const ativos = projetos.filter((p) => p.status !== "done");
  const devs = ativos.filter((p) => p.status === "dev");
  $("#badge-projetos").textContent = ativos.length;
  $("#m-projetos").textContent = String(ativos.length).padStart(2, "0");
  $("#m-projetos-badge").textContent = devs.length + " em dev";
  $("#m-projetos-delta").innerHTML = `<span class="vs">${projetos.length - ativos.length} concluídos</span>`;

  $("#m-clientes").textContent = String(Store.get("clientes").length).padStart(2, "0");

  const seteDias = new Date(hoje);
  seteDias.setDate(seteDias.getDate() + 7);
  const hojeISO = Store.isoDay(hoje);
  const proxISO = Store.isoDay(seteDias);
  const futuros = Store.get("eventos")
    .filter((ev) => ev.data >= hojeISO)
    .sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")));
  const semana = futuros.filter((ev) => ev.data <= proxISO);
  $("#m-eventos").textContent = String(semana.length).padStart(2, "0");
  $("#m-eventos-delta").innerHTML = semana.length
    ? `<span class="vs">próximo: ${semana[0].titulo}</span>`
    : '<span class="vs">semana livre</span>';

  /* ── Hero: atalhos práticos ── */
  const fmtDia = (iso) =>
    new Date(iso + "T12:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

  if (futuros.length) {
    $("#hero-evento").textContent = futuros[0].titulo;
    $("#hero-evento-meta").textContent = fmtDia(futuros[0].data) + (futuros[0].hora ? " · " + futuros[0].hora : "");
  } else {
    $("#hero-evento").textContent = "Agenda livre";
    $("#hero-evento-meta").textContent = "clique para adicionar um evento";
  }

  const saldo = rAtual - somaMes(kAtual, "saida");
  $("#hero-saldo").textContent = BRL(saldo);
  $("#hero-dev").textContent = String(devs.length).padStart(2, "0");
  $("#hero-dev-meta").textContent = devs.length
    ? devs.slice(0, 2).map((p) => p.nome).join(" · ")
    : "nenhum em andamento";

  desenharGrafico();

  /* ── Receita 12 meses (mini-bars) ── */
  const barras = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(15);
    d.setMonth(d.getMonth() - i);
    barras.push(somaMes(mesKey(Store.isoDay(d))));
  }
  const maxB = Math.max(...barras, 1);
  $("#rev-bars").innerHTML = barras
    .map((v) => `<span style="height:${Math.max(6, Math.round((v / maxB) * 100))}%"></span>`)
    .join("");
  $("#rev-valor").textContent = fmtK(rAtual);
  $("#rev-delta").textContent = (subiu ? "▲ +" : "▼ −") + deltaPct + "%";
  $("#rev-delta").className = "badge" + (subiu ? " success" : "");

  /* ── Próximos eventos (mini lista) ── */
  $("#dash-eventos").innerHTML = futuros.length
    ? futuros
        .slice(0, 3)
        .map(
          (ev) => `<div class="act">
            <div class="a-ico">▸</div>
            <div class="a-body"><b>${ev.titulo}</b><span class="a-time">${fmtDia(ev.data)}${ev.hora ? " · " + ev.hora : ""}</span></div>
          </div>`
        )
        .join("")
    : '<p class="empty">Nenhum evento futuro.</p>';

  /* ── Tabela resumida + atividades ── */
  $("#dash-projetos").innerHTML = projetos
    .slice()
    .sort((a, b) => (a.status === "done") - (b.status === "done"))
    .slice(0, 4)
    .map((p) => linhaProjeto(p, false))
    .join("");

  $("#dash-atividades").innerHTML = Store.get("atividades").slice(0, 4).map(itemAtividade).join("");
};

/* Gráfico de linha genérico (SVG) — curva suavizada + tooltip no hover */
function desenharLinha(svg, labels, serie, fmtValor) {
  const W = 800, H = 260, PAD = 30;
  const gid = svg.id;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const max = Math.max(...serie, 1) * 1.15;
  const stepX = (W - PAD * 2) / (serie.length - 1);
  const x = (i) => PAD + i * stepX;
  const y = (v) => H - PAD - (v / max) * (H - PAD * 2);
  const pts = serie.map((v, i) => ({ x: x(i), y: y(v) }));

  /* Curva spline (Catmull-Rom → Bézier), como o "monotone" do recharts */
  let curva = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    curva += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  const area = curva + ` L${pts[pts.length - 1].x.toFixed(1)},${H - PAD} L${pts[0].x.toFixed(1)},${H - PAD} Z`;

  let grid = "";
  for (let g = 0; g <= 4; g++) {
    const gy = PAD + (g * (H - PAD * 2)) / 4;
    grid += `<line x1="${PAD}" y1="${gy}" x2="${W - PAD}" y2="${gy}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4 8"/>`;
  }
  const passo = Math.ceil(labels.length / 10);
  labels.forEach((l, i) => {
    if (i % passo) return;
    grid += `<text x="${x(i)}" y="${H - 8}" fill="rgba(255,255,255,.42)" font-size="11" font-family="Geist Mono, monospace" text-anchor="middle">${l}</text>`;
  });

  svg.innerHTML = `
    <defs>
      <linearGradient id="fill-${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.05" stop-color="#C0181A" stop-opacity="0.72"/><stop offset="0.95" stop-color="#C0181A" stop-opacity="0.02"/>
      </linearGradient>
      <linearGradient id="line-${gid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#C0181A"/><stop offset="1" stop-color="#ff4d4f"/>
      </linearGradient>
    </defs>
    ${grid}
    <path d="${area}" fill="url(#fill-${gid})"/>
    <path d="${curva}" fill="none" stroke="url(#line-${gid})" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <line id="cur-${gid}" y1="${PAD}" y2="${H - PAD}" stroke="rgba(192,24,26,.45)" stroke-width="1" opacity="0"/>
    <circle id="dot-${gid}" r="4.5" fill="#0a0a0a" stroke="#ff4d4f" stroke-width="2.5" opacity="0"/>`;

  /* ── Tooltip por mês/dia no hover ── */
  const wrap = svg.closest(".chart-wrap");
  let tip = wrap.querySelector(".chart-tip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "chart-tip";
    wrap.appendChild(tip);
  }
  const cursor = svg.querySelector(`#cur-${gid}`);
  const dot = svg.querySelector(`#dot-${gid}`);

  svg.onmousemove = (e) => {
    const r = svg.getBoundingClientRect();
    const fx = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(serie.length - 1, Math.round((fx - PAD) / stepX)));

    cursor.setAttribute("x1", pts[i].x);
    cursor.setAttribute("x2", pts[i].x);
    cursor.setAttribute("opacity", "1");
    dot.setAttribute("cx", pts[i].x);
    dot.setAttribute("cy", pts[i].y);
    dot.setAttribute("opacity", "1");

    tip.innerHTML = `<b>${labels[i]}</b><span>${fmtValor(serie[i], labels[i])}</span>`;
    const px = (pts[i].x / W) * r.width;
    const py = (pts[i].y / H) * r.height;
    tip.style.left = Math.min(Math.max(px, 64), r.width - 64) + "px";
    tip.style.top = Math.max(py, 44) + "px";
    tip.style.opacity = "1";
  };

  svg.onmouseleave = () => {
    tip.style.opacity = "0";
    cursor.setAttribute("opacity", "0");
    dot.setAttribute("opacity", "0");
  };
}

function desenharGrafico() {
  /* Receita (entradas) por mês — últimos 8 meses */
  const meses = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(15);
    d.setMonth(d.getMonth() - i);
    meses.push({ k: mesKey(Store.isoDay(d)), label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") });
  }
  const receitas = Store.get("receitas");
  const serie = meses.map((m) =>
    receitas.filter((r) => r.tipo === "entrada" && mesKey(r.data) === m.k).reduce((s, r) => s + Number(r.valor), 0) / 1000
  );
  desenharLinha($("#chart"), meses.map((m) => m.label), serie, (v) => `R$ ${v.toFixed(1)}K`);
}

/* ============ ANALYTICS (site principal) ============ */
/* Dados de exemplo — trocar pela integração real (Plausible/GA/Cloudflare) */

RENDER.analytics = () => {
  const visitas = [86, 102, 94, 120, 133, 141, 98, 110, 125, 152, 169, 148, 171, 190];
  const labels = [];
  for (let i = visitas.length - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));
  }

  const ult7 = visitas.slice(-7).reduce((a, b) => a + b, 0);
  $("#an-visitas").textContent = ult7.toLocaleString("pt-BR");
  $("#an-unicos").textContent = Math.round(ult7 * 0.62).toLocaleString("pt-BR");
  $("#an-tempo").textContent = "1m 42s";

  desenharLinha($("#an-chart"), labels, visitas, (v) => `${v} acessos`);
};

/* ============ PROJETOS ============ */

function linhaProjeto(p, acoes = true) {
  const st = STATUS[p.status] || STATUS.plan;
  return `<tr>
    <td class="td-click" data-abrir="${p.id}"><span class="p-name">${p.nome} <span class="abrir-seta">→</span></span><span class="p-type">${p.tipo}</span></td>
    <td><span class="owner-dot" title="${p.resp || ""}">${(p.resp || "?")[0]}</span></td>
    <td><span class="status ${st.cls}">${st.label}</span></td>
    <td><div style="display:flex;align-items:center"><div class="progress"><i style="width:${p.progresso}%"></i></div><span class="pct">${p.progresso}%</span></div></td>
    ${acoes ? `<td>${p.valor ? BRL(Number(p.valor)) : "—"}</td>
    <td class="td-acoes">
      <button class="icon-mini" data-editar="${p.id}" title="Editar">✎</button>
      <button class="icon-mini" data-excluir="${p.id}" title="Excluir">✕</button>
    </td>` : ""}
  </tr>`;
}

RENDER.projetos = () => {
  const lista = Store.get("projetos");
  $("#tbl-projetos tbody").innerHTML = lista.length
    ? lista.map((p) => linhaProjeto(p)).join("")
    : `<tr><td colspan="6" class="empty">Nenhum projeto — adicione o primeiro.</td></tr>`;
  $("#badge-projetos").textContent = lista.filter((p) => p.status !== "done").length;
};

function formProjeto(p = {}) {
  const resp = { Daniel: "Daniel", Miguel: "Miguel", Guilherme: "Guilherme", Equipe: "Equipe" };
  abrirModal(
    p.id ? "Editar projeto" : "Novo projeto",
    campo("Nome", `<input name="nome" required value="${p.nome || ""}">`) +
      campo("Tipo", `<input name="tipo" placeholder="e-commerce, site, app..." value="${p.tipo || ""}">`) +
      campo("Responsável", `<select name="resp">${opts(resp, p.resp)}</select>`) +
      campo("Status", `<select name="status">${opts(STATUS, p.status)}</select>`) +
      campo("Progresso (%)", `<input name="progresso" type="number" min="0" max="100" value="${p.progresso ?? 0}">`) +
      campo("Valor contratado (R$)", `<input name="valor" type="number" min="0" step="0.01" value="${p.valor ?? ""}">`) +
      campo("Stack (separada por vírgula)", `<input name="stack" placeholder="React, Node.js, PostgreSQL" value="${p.stack || ""}">`) +
      campo("Repositório", `<input name="repo" placeholder="https://github.com/DMG-Dev-Group/..." value="${p.repo || ""}">`) +
      campo("URL de produção", `<input name="url" placeholder="https://..." value="${p.url || ""}">`) +
      campo("Como foi feito / notas", `<textarea name="desc" rows="4" placeholder="decisões, arquitetura, aprendizados...">${p.desc || ""}</textarea>`),
    (d) => {
      d.progresso = Number(d.progresso) || 0;
      d.valor = Number(d.valor) || 0;
      if (p.id) {
        Store.update("projetos", p.id, d);
        Store.log(`<b>Projeto</b> — ${d.nome} atualizado`, "projeto");
      } else {
        Store.add("projetos", d);
        Store.log(`<b>Projeto</b> — ${d.nome} criado`, "projeto");
      }
      RENDER.projetos();
      if (!$(".view[data-view='projeto']").hidden) RENDER.projeto();
    }
  );
}

$("#add-projeto").addEventListener("click", () => formProjeto());

$("#dash-projetos").addEventListener("click", (e) => {
  const ab = e.target.closest("[data-abrir]");
  if (ab) abrirProjeto(ab.dataset.abrir);
});

$("#tbl-projetos").addEventListener("click", (e) => {
  const ed = e.target.closest("[data-editar]");
  const ex = e.target.closest("[data-excluir]");
  const ab = e.target.closest("[data-abrir]");
  if (ab && !ed && !ex) return abrirProjeto(ab.dataset.abrir);
  if (ed) formProjeto(Store.get("projetos").find((p) => p.id === ed.dataset.editar));
  if (ex) {
    const p = Store.get("projetos").find((x) => x.id === ex.dataset.excluir);
    if (confirm(`Excluir o projeto "${p.nome}"?`)) {
      Store.remove("projetos", p.id);
      Store.log(`<b>Projeto</b> — ${p.nome} excluído`, "projeto");
      RENDER.projetos();
    }
  }
});

/* ============ DETALHES DO PROJETO ============ */

let projetoAtualId = null;

function abrirProjeto(id) {
  projetoAtualId = id;
  irPara("projeto");
}

/* ── Integração com GitHub (painel "Repositório" na aba do projeto) ── */

const repoCache = {}; // evita refazer a chamada toda vez que a view renderiza

function parseGithubUrl(url) {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

async function carregarRepo(p) {
  const box = $("#pd-repo-conteudo");
  if (!box) return; // usuário já navegou pra outra view
  const parsed = parseGithubUrl(p.repo);
  if (!parsed) {
    box.innerHTML = `<p class="empty">Repositório informado não parece uma URL do GitHub válida.</p>`;
    return;
  }

  const cacheKey = `${parsed.owner}/${parsed.repo}`;
  if (repoCache[cacheKey]) return desenharRepo(box, p, repoCache[cacheKey]);

  try {
    const [rRepo, rCommits] = await Promise.all([
      fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`),
      fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=1`),
    ]);

    if (rRepo.status === 404) {
      box.innerHTML = `<p class="repo-erro">Repositório não encontrado — confira a URL, ou se ele é privado (veja nota abaixo).</p>`;
      return;
    }
    if (rRepo.status === 403) {
      box.innerHTML = `<p class="repo-erro">GitHub bloqueou a consulta (limite de requisições sem autenticação, ou repositório privado). Repos privados exigem um token — peça pra eu configurar isso se for o caso.</p>`;
      return;
    }
    if (!rRepo.ok) {
      box.innerHTML = `<p class="repo-erro">Não consegui consultar o GitHub agora (${rRepo.status}).</p>`;
      return;
    }

    const repoInfo = await rRepo.json();
    const commits = rCommits.ok ? await rCommits.json() : [];
    const dados = { repoInfo, ultimoCommit: commits[0] || null };
    repoCache[cacheKey] = dados;
    desenharRepo(box, p, dados);
  } catch (err) {
    box.innerHTML = `<p class="repo-erro">Erro de conexão ao consultar o GitHub.</p>`;
    console.error("[repo]", err);
  }
}

function desenharRepo(box, p, { repoInfo, ultimoCommit }) {
  const atualizado = new Date(repoInfo.pushed_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const commitHtml = ultimoCommit
    ? `<div class="repo-commit">
        <img class="avatar" src="${ultimoCommit.author?.avatar_url || "images/logo.svg"}" alt="">
        <div>
          <div class="repo-commit-msg">${(ultimoCommit.commit.message || "").split("\n")[0]}</div>
          <div class="repo-commit-meta">${ultimoCommit.commit.author.name} · ${new Date(ultimoCommit.commit.author.date).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · <a href="${ultimoCommit.html_url}" target="_blank" rel="noopener">${ultimoCommit.sha.slice(0, 7)}</a></div>
        </div>
      </div>`
    : "";

  box.innerHTML = `
    <div class="repo-card">
      <div class="repo-topo">
        <span class="repo-nome">${repoInfo.full_name}</span>
        <a class="link-out" href="${repoInfo.html_url}" target="_blank" rel="noopener">abrir no GitHub ↗</a>
      </div>
      ${repoInfo.description ? `<p class="repo-desc">${repoInfo.description}</p>` : ""}
      <div class="repo-stats">
        <span>branch padrão <b>${repoInfo.default_branch}</b></span>
        <span>linguagem <b>${repoInfo.language || "—"}</b></span>
        <span>issues abertas <b>${repoInfo.open_issues_count}</b></span>
        <span>★ <b>${repoInfo.stargazers_count}</b></span>
        <span>última atividade <b>${atualizado}</b></span>
      </div>
      ${commitHtml}
    </div>`;
}

RENDER.projeto = () => {
  const p = Store.get("projetos").find((x) => x.id === projetoAtualId);
  if (!p) return irPara("projetos");

  $("#page-label").textContent = "// projeto";
  $("#page-title").innerHTML = p.nome + '<span class="cursor">_</span>';

  const st = STATUS[p.status] || STATUS.plan;
  const lanc = Store.get("receitas")
    .filter((l) => l.projeto === p.nome)
    .sort((a, b) => b.data.localeCompare(a.data));
  const faturado = lanc.filter((l) => l.tipo === "entrada").reduce((s, l) => s + Number(l.valor), 0);
  const gastos = lanc.filter((l) => l.tipo === "saida").reduce((s, l) => s + Number(l.valor), 0);
  const stack = (p.stack || "").split(",").map((s) => s.trim()).filter(Boolean);

  const linkOut = (url, rotulo) =>
    url
      ? `<a class="link-out" href="${url}" target="_blank" rel="noopener">${url.replace(/^https?:\/\//, "")} ↗</a>`
      : `<span class="kv-vazio">não informado — edite o projeto para adicionar ${rotulo}</span>`;

  $("#pd-conteudo").innerHTML = `
    <div class="panel pd-head">
      <div class="pd-head-info">
        <button class="btn-sm" id="pd-voltar">← projetos</button>
        <div>
          <span class="status ${st.cls}">${st.label}</span>
          <span class="pd-meta">${p.tipo || "—"} · responsável: <b>${p.resp || "—"}</b></span>
        </div>
      </div>
      <div class="pd-head-acoes">
        <button class="btn-sm" id="pd-editar">✎ editar</button>
        <button class="btn-sm danger" id="pd-excluir">✕ excluir</button>
      </div>
      <div class="pd-progress">
        <div class="u-head"><span>Progresso</span><b>${p.progresso}%</b></div>
        <div class="u-bar"><i style="width:${p.progresso}%"></i></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-title"><h3>Como foi feito</h3></div>
        ${p.desc ? `<p class="pd-desc">${p.desc}</p>` : `<p class="empty">Sem notas ainda — clique em "editar" e conte como o projeto foi construído: decisões, arquitetura, aprendizados.</p>`}
        <div class="panel-title" style="margin-top:22px"><h3>Stack utilizada</h3></div>
        ${stack.length ? `<div class="info-pills">${stack.map((s) => `<span class="info-pill">${s}</span>`).join("")}</div>` : `<p class="empty">Stack não informada.</p>`}
      </div>

      <div class="panel">
        <div class="panel-title"><h3>Ficha técnica</h3></div>
        <div class="kv-list">
          <div class="kv"><span>Repositório</span>${linkOut(p.repo, "o repositório")}</div>
          <div class="kv"><span>Produção</span>${linkOut(p.url, "a URL")}</div>
          <div class="kv"><span>Valor contratado</span><b>${p.valor ? BRL(Number(p.valor)) : "—"}</b></div>
          <div class="kv"><span>Faturado</span><b class="ok-txt">${BRL(faturado)}</b></div>
          <div class="kv"><span>Gastos</span><b class="bad-txt">${BRL(gastos)}</b></div>
          <div class="kv"><span>Resultado</span><b>${BRL(faturado - gastos)}</b></div>
        </div>
      </div>
    </div>

    <div class="panel" id="pd-repo-panel">
      <div class="panel-title"><h3>Repositório</h3></div>
      <div id="pd-repo-conteudo"><p class="empty">${p.repo ? "Carregando informações do repositório…" : 'Nenhum repositório vinculado — edite o projeto e informe a URL do GitHub.'}</p></div>
    </div>

    <div class="panel">
      <div class="panel-title"><h3>Lançamentos do projeto</h3></div>
      ${
        lanc.length
          ? `<div style="overflow-x:auto"><table><thead><tr><th>Descrição</th><th>Data</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>
              ${lanc
                .map(
                  (l) => `<tr>
                    <td><span class="p-name">${l.desc}</span></td>
                    <td>${new Date(l.data + "T12:00").toLocaleDateString("pt-BR")}</td>
                    <td><span class="status ${l.tipo === "entrada" ? "prod" : "dev"}">${l.tipo}</span></td>
                    <td style="font-family:var(--mono);color:${l.tipo === "entrada" ? "#2ecc71" : "var(--red)"}">${l.tipo === "entrada" ? "+" : "−"} ${BRL(Number(l.valor))}</td>
                  </tr>`
                )
                .join("")}
            </tbody></table></div>`
          : `<p class="empty">Nenhum lançamento vinculado — no Financeiro, escolha "${p.nome}" no campo projeto ao lançar.</p>`
      }
    </div>`;

  if (p.repo) carregarRepo(p);
};

$("#pd-conteudo").addEventListener("click", (e) => {
  if (e.target.closest("#pd-voltar")) return irPara("projetos");
  if (e.target.closest("#pd-editar")) return formProjeto(Store.get("projetos").find((x) => x.id === projetoAtualId));
  if (e.target.closest("#pd-excluir")) {
    const p = Store.get("projetos").find((x) => x.id === projetoAtualId);
    if (p && confirm(`Excluir o projeto "${p.nome}"?`)) {
      Store.remove("projetos", p.id);
      Store.log(`<b>Projeto</b> — ${p.nome} excluído`, "projeto");
      irPara("projetos");
    }
  }
});

/* ============ CLIENTES ============ */

RENDER.clientes = () => {
  const lista = Store.get("clientes");
  $("#grid-clientes").innerHTML = lista.length
    ? lista
        .map(
          (c) => `<div class="cliente-card">
            <div class="t-avatar">${c.nome[0].toUpperCase()}</div>
            <div class="c-info">
              <b>${c.nome}</b>
              <span>${c.contato || "sem contato"}</span>
              <span class="c-desde">cliente desde ${c.desde || "—"}</span>
            </div>
            <button class="icon-mini" data-excluir-cliente="${c.id}" title="Remover">✕</button>
          </div>`
        )
        .join("")
    : `<p class="empty">Nenhum cliente cadastrado.</p>`;
};

$("#add-cliente").addEventListener("click", () =>
  abrirModal(
    "Novo cliente",
    campo("Nome", `<input name="nome" required>`) +
      campo("Contato", `<input name="contato" placeholder="email ou telefone">`) +
      campo("Cliente desde", `<input name="desde" type="month" value="${Store.isoDay(new Date()).slice(0, 7)}">`),
    (d) => {
      Store.add("clientes", d);
      Store.log(`<b>Novo cliente</b> — ${d.nome} cadastrado`, "cliente");
      RENDER.clientes();
    }
  )
);

$("#grid-clientes").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-excluir-cliente]");
  if (!btn) return;
  const c = Store.get("clientes").find((x) => x.id === btn.dataset.excluirCliente);
  if (confirm(`Remover o cliente "${c.nome}"?`)) {
    Store.remove("clientes", c.id);
    Store.log(`<b>Cliente</b> — ${c.nome} removido`, "cliente");
    RENDER.clientes();
  }
});

/* ============ FINANCEIRO ============ */

RENDER.financeiro = () => {
  const k = mesKey(Store.isoDay(new Date()));
  const lanc = Store.get("receitas");
  const doMes = lanc.filter((l) => mesKey(l.data) === k);
  const entradas = doMes.filter((l) => l.tipo === "entrada").reduce((s, l) => s + Number(l.valor), 0);
  const saidas = doMes.filter((l) => l.tipo === "saida").reduce((s, l) => s + Number(l.valor), 0);

  $("#fin-entradas").textContent = BRL(entradas);
  $("#fin-saidas").textContent = BRL(saidas);
  $("#fin-saldo").textContent = BRL(entradas - saidas);

  $("#tbl-fin tbody").innerHTML = lanc
    .slice()
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 25)
    .map(
      (l) => `<tr>
        <td><span class="p-name">${l.desc}</span><span class="p-type">${l.projeto || "—"}</span></td>
        <td>${new Date(l.data + "T12:00").toLocaleDateString("pt-BR")}</td>
        <td><span class="status ${l.tipo === "entrada" ? "prod" : "dev"}">${l.tipo}</span></td>
        <td style="color:${l.tipo === "entrada" ? "#2ecc71" : "var(--red)"};font-family:var(--mono)">${l.tipo === "entrada" ? "+" : "−"} ${BRL(Number(l.valor))}</td>
        <td class="td-acoes"><button class="icon-mini" data-excluir-fin="${l.id}" title="Excluir">✕</button></td>
      </tr>`
    )
    .join("");
};

$("#add-fin").addEventListener("click", () => {
  const projs = Object.fromEntries([["—", "—"], ...Store.get("projetos").map((p) => [p.nome, p.nome])]);
  abrirModal(
    "Novo lançamento",
    campo("Descrição", `<input name="desc" required>`) +
      campo("Valor (R$)", `<input name="valor" type="number" min="0.01" step="0.01" required>`) +
      campo("Tipo", `<select name="tipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select>`) +
      campo("Projeto", `<select name="projeto">${opts(projs)}</select>`) +
      campo("Data", `<input name="data" type="date" value="${Store.isoDay(new Date())}">`),
    (d) => {
      d.valor = Number(d.valor);
      Store.add("receitas", d);
      Store.log(`<b>Financeiro</b> — ${d.tipo} de ${BRL(d.valor)}: ${d.desc}`, "fin");
      RENDER.financeiro();
    }
  );
});

$("#tbl-fin").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-excluir-fin]");
  if (!btn) return;
  if (confirm("Excluir este lançamento?")) {
    Store.remove("receitas", btn.dataset.excluirFin);
    RENDER.financeiro();
  }
});

/* ============ CALENDÁRIO ============ */

const cal = (() => {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() };
})();

RENDER.calendario = () => {
  const primeiro = new Date(cal.ano, cal.mes, 1);
  $("#cal-mes").textContent = primeiro
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());

  const eventos = Store.get("eventos");
  const hojeISO = Store.isoDay(new Date());
  const inicio = new Date(primeiro);
  inicio.setDate(1 - primeiro.getDay());

  let html = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    const iso = Store.isoDay(d);
    const doDia = eventos.filter((ev) => ev.data === iso).sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
    const cls = ["cal-day", d.getMonth() !== cal.mes ? "other" : "", iso === hojeISO ? "today" : ""].join(" ");
    html += `<div class="${cls}" data-dia="${iso}">
      <span class="cal-num">${d.getDate()}</span>
      ${doDia.length ? '<span class="cal-tem"></span>' : ""}
      ${doDia.slice(0, 2).map((ev) => `<span class="ev-chip" title="${ev.hora || ""} ${ev.titulo}">${ev.hora ? ev.hora + " · " : ""}${ev.titulo}</span>`).join("")}
      ${doDia.length > 2 ? `<span class="ev-more">+${doDia.length - 2}</span>` : ""}
    </div>`;
  }
  $("#cal-grid").innerHTML = html;

  /* Próximos eventos (lista lateral) */
  const proximos = eventos
    .filter((ev) => ev.data >= hojeISO)
    .sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")))
    .slice(0, 8);
  $("#lista-eventos").innerHTML = proximos.length
    ? proximos
        .map(
          (ev) => `<div class="act">
            <div class="a-ico">📅</div>
            <div class="a-body"><b>${ev.titulo}</b> — ${EV_TIPOS[ev.tipo] || "Evento"}
              <span class="a-time">${new Date(ev.data + "T12:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}${ev.hora ? " · " + ev.hora : ""}</span>
            </div>
            <button class="icon-mini" data-excluir-ev="${ev.id}" title="Excluir">✕</button>
          </div>`
        )
        .join("")
    : `<p class="empty">Nenhum evento futuro.</p>`;
};

function formEvento(dataISO) {
  abrirModal(
    "Novo evento",
    campo("Título", `<input name="titulo" required>`) +
      campo("Data", `<input name="data" type="date" required value="${dataISO || Store.isoDay(new Date())}">`) +
      campo("Hora", `<input name="hora" type="time">`) +
      campo("Tipo", `<select name="tipo">${opts(EV_TIPOS)}</select>`),
    (d) => {
      Store.add("eventos", d);
      Store.log(`<b>Calendário</b> — evento "${d.titulo}" em ${new Date(d.data + "T12:00").toLocaleDateString("pt-BR")}`, "evento");
      RENDER.calendario();
    }
  );
}

$("#add-evento").addEventListener("click", () => formEvento());
$("#cal-grid").addEventListener("click", (e) => {
  const dia = e.target.closest("[data-dia]");
  if (dia) formEvento(dia.dataset.dia);
});
$("#lista-eventos").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-excluir-ev]");
  if (!btn) return;
  e.stopPropagation();
  Store.remove("eventos", btn.dataset.excluirEv);
  RENDER.calendario();
});
$("#cal-prev").addEventListener("click", () => {
  cal.mes--;
  if (cal.mes < 0) (cal.mes = 11), cal.ano--;
  RENDER.calendario();
});
$("#cal-next").addEventListener("click", () => {
  cal.mes++;
  if (cal.mes > 11) (cal.mes = 0), cal.ano++;
  RENDER.calendario();
});

/* ============ ATIVIDADES ============ */

function itemAtividade(a) {
  return `<div class="act">
    <div class="a-ico">▸</div>
    <div class="a-body">${a.texto}<span class="a-time">${tempoRelativo(a.ts)}</span></div>
  </div>`;
}

RENDER.atividades = () => {
  const lista = Store.get("atividades");
  $("#lista-atividades").innerHTML = lista.length ? lista.map(itemAtividade).join("") : `<p class="empty">Nenhuma atividade registrada.</p>`;
};

/* ============ CONFIGURAÇÕES ============ */

$("#btn-logout").addEventListener("click", () => window.dmgLogout());

/* ============ SIDEBAR MOBILE / HERO / EQUIPE ============ */

$("#menu-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  $("#sidebar").classList.toggle("open");
});

document.addEventListener("click", (e) => {
  const sb = $("#sidebar");
  if (sb.classList.contains("open") && !sb.contains(e.target) && !e.target.closest("#menu-btn")) {
    sb.classList.remove("open");
  }
});

$("#hero-novo-projeto").addEventListener("click", () => formProjeto());
$("#hero-novo-evento").addEventListener("click", () => formEvento());

/* Cards dos fundadores (view Equipe) — mesma lógica do site */
$("#equipe-cards").addEventListener("click", (e) => {
  const card = e.target.closest(".founder-card");
  if (!card) return;
  const cards = $$("#equipe-cards .founder-card");
  const estavaAtivo = card.classList.contains("active");

  cards.forEach((c) => {
    c.classList.remove("active", "inactive");
    c.querySelectorAll(".member-info").forEach((p) => p.classList.remove("visible"));
  });

  if (estavaAtivo) return;

  card.classList.add("active");
  cards.forEach((c) => {
    if (c !== card) c.classList.add("inactive");
  });
  card.querySelectorAll(".member-info").forEach((p) => p.classList.add("visible"));
});

/* ============ INIT (Firestore + Auth) ============ */

function viewAtual() {
  const v = location.hash.replace("#", "");
  return TITULOS[v] ? v : "dashboard";
}

// Re-renderiza a view atual sempre que qualquer coleção do Firestore mudar
// (inclusive mudanças feitas por outra pessoa do time, em tempo real).
Store.onChange(() => {
  const v = viewAtual();
  if (RENDER[v]) RENDER[v]();
});

function iniciarDashboard() {
  Store.iniciar(() => {
    irPara(viewAtual());
  });
}

// auth.js dispara este evento assim que o login é confirmado.
window.addEventListener("dmg:autenticado", iniciarDashboard, { once: true });
