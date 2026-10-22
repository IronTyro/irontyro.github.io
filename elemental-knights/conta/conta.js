// Minha conta — Elemental Knights (out/2026).
// Segurança: o Google entrega um ID token; quem confere é o SERVIDOR, que
// devolve uma sessão do site SÓ DE LEITURA (2 h). Ela fica só na memória
// desta aba (nada em localStorage/cookies). Todo texto vindo do servidor
// entra com textContent — nunca como HTML.
"use strict";

// Client ID do cliente WEB no Google Cloud (público). Vazio = ainda não
// configurado: a página avisa em vez de mostrar o botão.
const GOOGLE_CLIENT_ID = "";
const API = "https://elementalknights-production.up.railway.app/web";

const CLASSES = [
  { name: "Cavaleiro", bust: "cavaleiro" },
  { name: "Arqueiro", bust: "arqueiro" },
  { name: "Maga", bust: "maga" },
  { name: "Ladra", bust: "ladra" },
];
const ELEMENTS = {
  FIRE: { name: "Fogo", gem: "fogo", color: "#ff6a3d" },
  WATER: { name: "Água", gem: "agua", color: "#4aa3cf" },
  EARTH: { name: "Terra", gem: "terra", color: "#c08a4a" },
  ICE: { name: "Gelo", gem: "gelo", color: "#8fd9e8" },
  LIGHTNING: { name: "Raio", gem: "raio", color: "#f0c93d" },
  NATURE: { name: "Natureza", gem: "natureza", color: "#6fbf55" },
};
const ELEMENT_BY_INDEX = ["FIRE", "WATER", "EARTH", "ICE", "LIGHTNING", "NATURE"];
const SLOTS = ["Arma", "Capacete", "Peitoral", "Calças", "Bracelete", "Botas", "Colar", "Capa"];
const RARITIES = [
  { name: "Básico", color: "#f3f5fb" }, { name: "Comum", color: "#9aa3ae" },
  { name: "Incomum", color: "#5bf07c" }, { name: "Raro", color: "#c68cff" },
  { name: "Heroico", color: "#8a2be2" }, { name: "Épico", color: "#2f8bff" },
  { name: "Lendário", color: "#ffc23d" }, { name: "Mítico", color: "#ff3b3b" },
];

let session = null; // só na memória

const $ = (id) => document.getElementById(id);
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = String(text);
  return n;
}
const fmt = (n) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

function showMsg(text, bad) {
  const m = $("signin-msg");
  m.textContent = text;
  m.classList.toggle("bad", !!bad);
}

async function onGoogleCredential(resp) {
  showMsg("Entrando…");
  try {
    const r = await fetch(`${API}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: resp.credential }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      showMsg(data.error || "Não foi possível entrar agora.", true);
      if (r.status === 404) document.querySelector(".howto").open = true;
      return;
    }
    session = data.token;
    await loadProfile();
  } catch {
    showMsg("Sem conexão com o servidor do jogo. Tente de novo em instantes.", true);
  }
}

async function loadProfile() {
  const r = await fetch(`${API}/profile`, { headers: { Authorization: `Bearer ${session}` } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    session = null;
    showMsg(data.error || "Sessão encerrada. Entre de novo.", true);
    return;
  }
  render(data);
  $("signin").hidden = true;
  $("profile").hidden = false;
  window.scrollTo(0, 0);
}

function render(p) {
  const cls = p.characterClass !== null && CLASSES[p.characterClass] ? CLASSES[p.characterClass] : null;
  $("p-class").textContent = cls ? cls.name : "Classe ainda não escolhida";
  $("p-name").textContent = p.name;
  const bust = $("p-bust");
  if (cls) {
    bust.src = `../img/busto_${cls.bust}_serio.webp`;
    bust.alt = cls.name;
    const head = document.querySelector(".hero-head");
    head.onmouseenter = () => (bust.src = `../img/busto_${cls.bust}_alegre.webp`);
    head.onmouseleave = () => (bust.src = `../img/busto_${cls.bust}_serio.webp`);
  } else {
    bust.removeAttribute("src");
  }
  $("p-since").textContent = `Aventureiro desde ${new Date(p.since).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;
  $("p-level").textContent = p.level;
  $("p-rank").textContent = `#${fmt(p.levelRank)} no Ranking`;
  const pct = p.xpToNext > 0 ? Math.min(100, (p.currentXp / p.xpToNext) * 100) : 100;
  $("p-xpbar").style.width = `${pct}%`;
  $("p-xp").textContent = `${fmt(p.currentXp)} / ${fmt(p.xpToNext)} XP para o próximo Nível`;

  const m = $("p-mastery");
  m.replaceChildren();
  for (const row of p.mastery) {
    const e = ELEMENTS[row.element];
    if (!e) continue;
    const card = el("div", "m-card");
    card.style.setProperty("--e", e.color);
    const img = el("img");
    img.src = `../img/gema_${e.gem}.webp`;
    img.alt = "";
    card.append(img);
    const body = el("div", "m-body");
    const top = el("div", "m-top");
    top.append(el("span", "m-name", e.name), el("span", "m-lvl", `Nv ${row.level}`));
    body.append(top);
    const bar = el("div", "bar small");
    const fill = el("i");
    fill.style.width = `${row.xpToNext > 0 ? Math.min(100, (row.xp / row.xpToNext) * 100) : 100}%`;
    bar.append(fill);
    body.append(bar, el("span", "m-rank", `#${fmt(row.rank)} em ${e.name}`));
    card.append(body);
    m.append(card);
  }

  const s = p.stats;
  const tiles = [
    ["Lutas vencidas", s.battlesWon],
    ["Jornadas concluídas", s.journeysCompleted],
    ["Andares da Torre (ciclo atual)", s.towerFloor],
    ["Peças forjadas", s.itemsForged],
    ["Combinações", s.combinations],
    ["Elixires preparados", s.elixirsBrewed],
    ["Vendas no Mercado", s.marketSales],
  ];
  const st = $("p-stats");
  st.replaceChildren();
  for (const [label, value] of tiles) {
    const t = el("div", "stat");
    t.append(el("b", "", fmt(value)), el("span", "", label));
    st.append(t);
  }

  const g = $("p-gear");
  g.replaceChildren();
  if (!p.equipped.length) g.append(el("p", "muted", "Nenhum equipamento vestido."));
  for (const it of p.equipped) {
    const r = RARITIES[it.rarity] || RARITIES[0];
    const row = el("div", "g-row");
    row.style.setProperty("--r", r.color);
    row.append(el("span", "g-slot", SLOTS[it.slot] || "—"));
    const name = el("span", "g-name", it.name);
    row.append(name);
    const tags = el("span", "g-tags");
    tags.append(el("span", "g-rar", r.name), el("span", "g-tier", `Tier ${it.tier}`));
    if (it.element !== null && ELEMENT_BY_INDEX[it.element]) {
      tags.append(el("span", "g-el", ELEMENTS[ELEMENT_BY_INDEX[it.element]].name));
    }
    row.append(tags);
    g.append(row);
  }
}

function logout() {
  session = null;
  if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
  $("profile").hidden = true;
  $("signin").hidden = false;
  showMsg("Você saiu.");
}

function initGoogle() {
  if (!GOOGLE_CLIENT_ID) {
    showMsg("O login com Google chega em breve.");
    return;
  }
  if (!window.google?.accounts?.id) {
    setTimeout(initGoogle, 200);
    return;
  }
  google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onGoogleCredential, ux_mode: "popup" });
  google.accounts.id.renderButton($("gbtn"), { theme: "filled_black", size: "large", shape: "pill", text: "signin_with", locale: "pt-BR" });
}

document.addEventListener("DOMContentLoaded", () => {
  $("logout").addEventListener("click", logout);
  initGoogle();
});
