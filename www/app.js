(() => {
"use strict";
const D = window.QH_DATA;
const $app = document.getElementById("app");
const KEY_PLAYERS = "qh_players_v1", KEY_GAME = "qh_game_v1", KEY_SET = "qh_settings_v1";

// ---------- utilidades ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uid = () => Math.random().toString(36).slice(2, 9);
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const del = k => { try { localStorage.removeItem(k); } catch {} };
const wait = ms => new Promise(r => setTimeout(r, ms));

let actions = {};
let timers = [];
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
$app.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (b && actions[b.dataset.act]) { tick(); actions[b.dataset.act](b.dataset.arg, b); }
});
function render(html, acts = {}) { clearTimers(); actions = acts; $app.innerHTML = `<main class="screen ${acts._cls || ""}">${html}</main>`; window.scrollTo(0, 0); }

// ---------- sonido ----------
let actx;
function beep(f = 660, d = 0.12, type = "triangle", vol = 0.15) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d);
    o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + d);
  } catch {}
}
const tick = () => beep(880, 0.04, "square", 0.04);
function fanfare() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.18), i * 110)); }
function drumroll(ms) { for (let t = 0; t < ms; t += 70) setTimeout(() => beep(110 + rnd(30), 0.05, "sawtooth", 0.05), t); }
let wakeLock;
async function keepAwake() { try { wakeLock = await navigator.wakeLock?.request("screen"); } catch {} }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && G) keepAwake(); });

// ---------- estado ----------
let players = load(KEY_PLAYERS, []);          // {id,name,photo}
let settings = Object.assign({ vote: "secret", maxCoal: 3, rounds: 15 }, load(KEY_SET, {}));
let G = null;                                  // partida en curso
const savePlayers = () => { if (!save(KEY_PLAYERS, players)) alertBox("No se pudo guardar. Prueba con menos fotos."); };
const saveGame = () => G && save(KEY_GAME, G);
const P = id => G.players.find(p => p.id === id);
const active = () => G.players.filter(p => !p.out);

const avatar = (p, cls = "") => `<div class="avatar ${cls} ${p.out ? "out" : ""}">${p.photo ? `<img src="${p.photo}" alt="">` : esc((p.name || "?").trim().charAt(0).toUpperCase())}</div>`;
const coals = p => `<span class="coals">${Array.from({ length: p.coal }, () => `<img src="img/carbon.webp" alt="carbón">`).join("")}</span>`;
const cardHtml = (t, act, cls = "") => { const c = D.trampas[t]; return `<button class="tcard ${cls}" ${act ? `data-act="${act}" data-arg="${t}"` : "disabled"}><img src="img/${c.img}.webp" alt=""><b>${c.nombre}</b><span>${c.texto}</span></button>`; };
function alertBox(msg) { const d = document.createElement("div"); d.className = "pill"; d.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9;background:#000c;color:#fff;padding:.7rem 1rem"; d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }

// ---------- inicio ----------
function home() {
  const saved = load(KEY_GAME, null);
  render(`
    <div class="grow"></div>
    <img class="scene pop" src="img/reno.webp" alt="Un reno en el living comiéndose el arbolito">
    <div class="banner"><span class="eyebrow">Edición Navidad</span><h1>¿Quién Haría?</h1>
    <p class="muted">Situaciones absurdas, la familia vota quién haría cada cosa y el más votado paga prenda.</p></div>
    <div class="grow"></div>
    ${saved ? `<button class="btn gold" data-act="resume">Continuar partida (ronda ${saved.round})</button>` : ""}
    <button class="btn" data-act="setup" ${players.length < 3 ? "disabled" : ""}>Nueva partida</button>
    <div class="row"><button class="btn ghost" data-act="players">Jugadores (${players.length})</button><button class="btn ghost" data-act="rules">Cómo se juega</button></div>
    ${players.length < 3 ? `<p class="small muted" style="text-align:center">Agrega al menos 3 jugadores para empezar.</p>` : ""}
  `, {
    resume: () => { G = load(KEY_GAME, null); keepAwake(); nextRound(); },
    setup, players: () => playersScreen(home), rules
  });
}

function rules() {
  render(`
    <div class="topbar"><button class="btn ghost sm" data-act="back">← Volver</button></div>
    <h2>Cómo se juega</h2>
    <div class="opts">
      <div class="opt"><h3>1. La situación</h3><p class="muted">Aparece una escena y una pregunta: «¿Quién se escondería primero?».</p></div>
      <div class="opt"><h3>2. Todos votan</h3><p class="muted">Votación secreta: el celular pasa de mano en mano. Votación rápida: a mano alzada y el anfitrión anota.</p></div>
      <div class="opt"><h3>3. Empate = duelo</h3><p class="muted">Si hay empate, los empatados se enfrentan en un minijuego. El que pierde es el acusado. Si el duelo es de dos, el ganador se lleva una carta trampa.</p></div>
      <div class="opt"><h3>4. El acusado</h3><p class="muted">Tiene 20 segundos para defenderse y después paga una prenda y recibe un carbón. Si tiene cartas trampa, puede usarlas para salvarse.</p></div>
      <div class="opt"><h3>5. Carbones</h3><p class="muted">Con 3 carbones quedas fuera, pero sigues votando. Gana quien termine con menos carbones.</p></div>
      <div class="opt"><h3>Regalos bajo el árbol</h3><p class="muted">Al final de algunas rondas, alguien que no recibió votos gana una carta trampa.</p></div>
    </div>
    <button class="btn" data-act="back">Entendido</button>
  `, { back: home });
}

// ---------- jugadores ----------
function playersScreen(back) {
  let photo = null;
  const inGame = !!G && back !== home;
  const list = inGame ? G.players : players;
  render(`
    <div class="topbar"><button class="btn ghost sm" data-act="back">← Listo</button><span class="pill">${list.length} jugadores</span></div>
    <h2>${inGame ? "Sumar jugador" : "Jugadores"}</h2>
    <div class="add">
      <div class="line">
        <label class="photo-btn" id="phl" for="ph">Toca para<br>sacar foto</label>
        <input type="file" id="ph" accept="image/*" capture="user" hidden>
        <input type="text" id="nm" placeholder="Nombre o apodo" maxlength="18" autocomplete="off" enterkeyhint="done">
      </div>
      <button class="btn gold" data-act="add">Agregar jugador</button>
    </div>
    <div class="plist">${list.map(p => `
      <div class="pitem">${avatar(p)}<span class="name">${esc(p.name)}</span>${inGame ? coals(p) : `<button class="x" data-act="rm" data-arg="${p.id}" aria-label="Quitar a ${esc(p.name)}">✕</button>`}</div>`).join("") || `<p class="muted">Todavía no hay nadie. Saca una foto, escribe el nombre y toca «Agregar».</p>`}
    </div>
  `, {
    back: () => back(),
    rm: id => { players = players.filter(p => p.id !== id); savePlayers(); playersScreen(back); },
    add: () => {
      const name = document.getElementById("nm").value.trim();
      if (!name) { document.getElementById("nm").focus(); return alertBox("Escribe un nombre"); }
      const p = { id: uid(), name, photo };
      players.push(p); savePlayers();
      if (inGame) { G.players.push(newPlayerState(p)); saveGame(); }
      fanfare(); playersScreen(back);
    }
  });
  document.getElementById("ph").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    photo = await resizePhoto(f);
    document.getElementById("phl").innerHTML = `<img src="${photo}" alt="Foto">`;
    document.getElementById("nm").focus();
  });
  document.getElementById("nm").addEventListener("keydown", e => { if (e.key === "Enter") actions.add(); });
}

function resizePhoto(file) {
  return new Promise(res => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = 240, c = document.createElement("canvas"); c.width = c.height = s;
      const m = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = () => res(null);
    img.src = url;
  });
}

// ---------- configuración ----------
function setup() {
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-act="set" data-arg="${k}:${v}" aria-pressed="${settings[k] == v}">${l}</button>`).join("")}</div>`;
  render(`
    <div class="topbar"><button class="btn ghost sm" data-act="back">← Volver</button><span class="pill">${players.length} jugadores</span></div>
    <h2>Nueva partida</h2>
    <div class="opts">
      <div class="opt"><h3>Votación</h3>${seg("vote", [["secret", "Secreta (pasar el celular)"], ["quick", "Rápida (mano alzada)"]])}
        <p class="small muted">${settings.vote === "secret" ? "Cada uno vota en secreto. Ideal hasta 12 personas." : "Todos levantan la mano y el anfitrión anota los votos. Ideal para muchos."}</p></div>
      <div class="opt"><h3>Quedas fuera con</h3>${seg("maxCoal", [[2, "2 carbones"], [3, "3 carbones"], [5, "5 carbones"], [0, "Nunca"]])}</div>
      <div class="opt"><h3>Rondas</h3>${seg("rounds", [[10, "10"], [15, "15"], [25, "25"], [0, "Sin límite"]])}</div>
    </div>
    <div class="grow"></div>
    <button class="btn" data-act="go">¡Empezar!</button>
  `, {
    back: home,
    set: a => { const [k, v] = a.split(":"); settings[k] = k === "vote" ? v : +v; save(KEY_SET, settings); setup(); },
    go: () => { newGame(); nextRound(); }
  });
}

const newPlayerState = p => ({ ...p, coal: 0, cards: [], out: false, votes: 0, accused: 0, duelWins: 0 });
function newGame() {
  G = { settings: { ...settings }, players: players.map(newPlayerState), deck: [], round: 0 };
  keepAwake();
}
function drawSituation() {
  if (!G.deck.length) G.deck = shuffle(D.situaciones.flatMap(s => s.preguntas.map((q, i) => [s.id, i])));
  const [id, qi] = G.deck.pop();
  const s = D.situaciones.find(x => x.id === id);
  return { id, titulo: s.titulo, pregunta: s.preguntas[qi] };
}

// ---------- ronda ----------
function nextRound() {
  const S = G.settings;
  if ((S.maxCoal && active().length <= 2) || (S.rounds && G.round >= S.rounds)) return finalScreen();
  G.round++; G.cur = drawSituation(); G.cur.votes = {}; saveGame();
  showRound();
}
function showRound() {
  const S = G.settings, c = G.cur;
  render(`
    <div class="topbar"><span class="pill">Ronda ${G.round}${S.rounds ? " de " + S.rounds : ""}</span><button class="btn ghost sm" data-act="menu">Menú</button></div>
    <img class="scene pop" src="img/${c.id}.webp" alt="">
    <h2 style="text-align:center">${esc(c.titulo)}</h2>
    <div class="question">${esc(c.pregunta)}</div>
    <div class="grow"></div>
    <button class="btn" data-act="vote">¡A votar!</button>
  `, { menu: gameMenu, vote: () => S.vote === "secret" ? secretVote(0, shuffle(G.players.map(p => p.id))) : quickVote() });
}

function gameMenu() {
  render(`
    <div class="topbar"><button class="btn ghost sm" data-act="back">← Volver al juego</button></div>
    <h2>Menú</h2>
    <button class="btn gold" data-act="add">Sumar jugador con foto</button>
    <button class="btn ghost" data-act="score">Ver carbones y cartas</button>
    <div class="grow"></div>
    <button class="btn" data-act="end">Terminar partida</button>
  `, {
    back: showRound,
    add: () => playersScreen(gameMenu),
    score: scoreboard,
    end: () => render(`<div class="grow"></div><h2 style="text-align:center">¿Terminar la partida?</h2><p class="muted" style="text-align:center">Se muestran los premios finales.</p><div class="grow"></div>
      <button class="btn" data-act="yes">Sí, terminar</button><button class="btn ghost" data-act="no">No, seguir jugando</button>`, { yes: finalScreen, no: gameMenu })
  });
}

function scoreboard() {
  const list = G.players.slice().sort((a, b) => a.out - b.out || a.coal - b.coal);
  render(`
    <div class="topbar"><button class="btn ghost sm" data-act="back">← Volver</button></div>
    <h2>Carbones y cartas</h2>
    <div class="plist">${list.map(p => `<div class="pitem">${avatar(p)}<span class="name">${esc(p.name)}${p.out ? " · fuera" : ""}<br><span class="small muted">${p.cards.length ? p.cards.map(t => D.trampas[t].nombre).join(", ") : "Sin cartas"}</span></span>${coals(p)}</div>`).join("")}</div>
  `, { back: gameMenu });
}

// ---------- votación ----------
function secretVote(i, order) {
  if (i >= order.length) return results();
  const v = P(order[i]);
  render(`
    <div class="topbar"><span class="pill">Voto ${i + 1} de ${order.length}</span></div>
    <div class="grow"></div>
    <div class="banner"><p class="eyebrow">Pásale el celular a</p>${avatar(v, "xl pop")}<h1>${esc(v.name)}</h1></div>
    <div class="grow"></div>
    <button class="btn" data-act="me">Soy ${esc(v.name)}, votar</button>
    <button class="btn ghost sm" style="width:100%" data-act="skip">No está, saltar</button>
  `, { me: () => ballot(v, () => secretVote(i + 1, order)), skip: () => secretVote(i + 1, order) });
}
function ballot(voter, done) {
  const cands = active().filter(p => p.id !== voter.id);
  let sel = null;
  render(`
    <p class="eyebrow">${esc(voter.name)} vota</p>
    <div class="question" style="font-size:1.4rem">${esc(G.cur.pregunta)}</div>
    <div class="vgrid">${cands.map(p => `<button class="vcard" data-act="sel" data-arg="${p.id}" aria-pressed="false">${avatar(p)}<span>${esc(p.name)}</span></button>`).join("")}</div>
    <div class="grow"></div>
    <button class="btn" id="ok" data-act="ok" disabled>Elige a alguien</button>
  `, {
    sel: (id, el) => { sel = id; document.querySelectorAll(".vcard").forEach(b => b.setAttribute("aria-pressed", b === el)); const ok = document.getElementById("ok"); ok.disabled = false; ok.textContent = "Votar a " + P(id).name; },
    ok: () => {
      G.cur.votes[sel] = (G.cur.votes[sel] || 0) + 1;
      render(`<div class="grow"></div><div class="banner"><h1 class="pop">¡Voto secreto!</h1><p class="muted">Tapa la pantalla y pasa el celular.</p></div><div class="grow"></div><button class="btn" data-act="n">Siguiente</button>`, { n: done });
    }
  });
}
function quickVote() {
  const cands = active(); const v = G.cur.votes;
  const draw = () => {
    const total = Object.values(v).reduce((a, b) => a + b, 0);
    render(`
      <p class="eyebrow">Votación a mano alzada</p>
      <div class="question" style="font-size:1.4rem">${esc(G.cur.pregunta)}</div>
      <p class="small muted">A la cuenta de tres, todos señalan a alguien. Anota cuántos dedos apuntan a cada uno.</p>
      <div class="vgrid">${cands.map(p => `<div class="vcard">${avatar(p)}<span>${esc(p.name)}</span><div class="counter"><button data-act="dn" data-arg="${p.id}" aria-label="Quitar voto">−</button><b>${v[p.id] || 0}</b><button data-act="up" data-arg="${p.id}" aria-label="Sumar voto">+</button></div></div>`).join("")}</div>
      <div class="grow"></div>
      <button class="btn" data-act="ok" ${total ? "" : "disabled"}>Ver resultado (${total} votos)</button>
    `, { up: id => { v[id] = (v[id] || 0) + 1; draw(); }, dn: id => { v[id] = Math.max(0, (v[id] || 0) - 1); draw(); }, ok: results });
  };
  draw();
}

// ---------- resultados ----------
function results() {
  const v = G.cur.votes;
  const list = active().map(p => ({ p, n: v[p.id] || 0 })).sort((a, b) => b.n - a.n);
  const max = list[0] ? list[0].n : 0;
  if (!max) { alertBox("Nadie recibió votos. Vamos de nuevo."); return G.settings.vote === "secret" ? secretVote(0, shuffle(G.players.map(p => p.id))) : quickVote(); }
  list.forEach(x => x.p.votes += x.n);
  const top = list.filter(x => x.n === max).map(x => x.p);
  const second = list.find(x => x.n > 0 && x.n < max);
  G.cur.second = second ? second.p.id : null;
  const shown = list.filter(x => x.n > 0).slice(0, 8);
  render(`
    <p class="eyebrow">Resultado</p>
    <h2>${esc(G.cur.pregunta)}</h2>
    <div class="bars">${shown.map(x => `<div class="bar ${x.n === max ? "top" : ""}">${avatar(x.p)}<div class="track"><div class="fill" data-w="${(x.n / max) * 100}"></div><div class="lbl"><span>${esc(x.p.name)}</span><span>${x.n}</span></div></div></div>`).join("")}</div>
    <div class="grow"></div>
    <div id="verdict"></div>
  `, {
    duel: () => duel(top.map(p => p.id), { giveCard: true, onLoser: id => accused(id) }),
    acc: () => accused(top[0].id)
  });
  drumroll(1100);
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll(".fill").forEach(f => f.style.width = f.dataset.w + "%")));
  later(() => {
    const el = document.getElementById("verdict");
    if (top.length > 1) { beep(330, 0.3, "sawtooth"); el.innerHTML = `<div class="banner pop" style="margin-bottom:12px"><h2>¡Empate!</h2><p class="muted">${top.map(p => esc(p.name)).join(" vs ")}</p></div><button class="btn gold" data-act="duel">¡Al duelo!</button>`; }
    else { fanfare(); el.innerHTML = `<div class="banner pop" style="margin-bottom:12px"><h2>¡${esc(top[0].name)}!</h2></div><button class="btn" data-act="acc">Continuar</button>`; }
  }, 1300);
}

// ---------- duelos ----------
function duel(ids, ctx) {
  const ps = ids.map(P);
  const phone = ps.length === 2 && Math.random() < 0.5;
  const kind = phone ? pick(["reflejos", "toques"]) : null;
  const fis = phone ? null : pick(D.duelosFisicos);
  const info = kind === "reflejos" ? { nombre: "Reflejos de reno", texto: "Pongan el celular en la mesa entre los dos. Cuando la franja del medio se ponga verde, toquen su lado. Si tocan antes, pierden." }
    : kind === "toques" ? { nombre: "Carrera de toques", texto: "Pongan el celular en la mesa entre los dos. Cuando empiece, toquen su lado lo más rápido posible durante 5 segundos." } : fis;
  render(`
    <p class="eyebrow">Duelo</p>
    <h1>${esc(info.nombre)}</h1>
    <div class="row" style="justify-content:center">${ps.map(p => `<div class="banner">${avatar(p, "lg")}<b>${esc(p.name)}</b></div>`).join("")}</div>
    <p>${esc(info.texto)}</p>
    <div class="grow"></div>
    <button class="btn gold" data-act="go">¡Empezar!</button>
  `, { go: () => kind === "reflejos" ? reflexDuel(ps, ctx) : kind === "toques" ? tapDuel(ps, ctx) : physicalDuel(ps, fis, ctx) });
}
function physicalDuel(ps, fis, ctx) {
  render(`<div class="grow"></div><div class="count" id="ct"></div><div class="grow"></div>`, { _cls: "center" });
  fis.cuenta.forEach((t, i) => later(() => { document.getElementById("ct").textContent = t; beep(i === 2 ? 990 : 520, i === 2 ? 0.3 : 0.12); }, i * 1000));
  later(() => render(`
    <h2 style="text-align:center">¿Quién perdió?</h2>
    <div class="vgrid">${ps.map(p => `<button class="vcard" data-act="lose" data-arg="${p.id}">${avatar(p)}<span>${esc(p.name)}</span></button>`).join("")}</div>
    <button class="btn ghost" data-act="again">Empate, otra vez</button>
  `, { lose: id => duelEnd(ps, id, ctx), again: () => physicalDuel(ps, fis, ctx) }), 3600);
}
function duelBoard(ps, mid) {
  render(`<div class="duel" id="dz">
    <div class="half p1" id="h0">${avatar(ps[0], "lg")}<div>${esc(ps[0].name)}</div><div class="tapn" id="n0"></div></div>
    <div class="mid" id="mid">${mid}</div>
    <div class="half p2" id="h1">${avatar(ps[1], "lg")}<div>${esc(ps[1].name)}</div><div class="tapn" id="n1"></div></div></div>`);
}
function reflexDuel(ps, ctx) {
  duelBoard(ps, "Esperen la luz verde…");
  let go = false, done = false;
  const end = loserIdx => { if (done) return; done = true; clearTimers(); setTimeout(() => duelEnd(ps, ps[loserIdx].id, ctx), 700); };
  [0, 1].forEach(i => document.getElementById("h" + i).addEventListener("pointerdown", () => {
    if (done) return;
    if (!go) { document.getElementById("mid").textContent = "¡" + ps[i].name + " se adelantó!"; beep(200, 0.4, "sawtooth"); end(i); }
    else { document.getElementById("mid").textContent = "¡" + ps[i].name + " fue más rápido!"; fanfare(); end(1 - i); }
  }));
  later(() => { go = true; document.getElementById("dz").classList.add("go"); document.getElementById("mid").textContent = "¡YA!"; beep(1200, 0.25); }, 1600 + rnd(2800));
}
function tapDuel(ps, ctx) {
  duelBoard(ps, "Preparados…");
  const n = [0, 0]; let on = false;
  [0, 1].forEach(i => document.getElementById("h" + i).addEventListener("pointerdown", () => { if (on) { n[i]++; document.getElementById("n" + i).textContent = n[i]; } }));
  ["3", "2", "1"].forEach((t, k) => later(() => { document.getElementById("mid").textContent = t; beep(520); }, k * 800));
  later(() => { on = true; document.getElementById("mid").textContent = "¡TOQUEN!"; beep(1100, 0.2); }, 2400);
  later(() => {
    on = false; beep(300, 0.4);
    if (n[0] === n[1]) { document.getElementById("mid").textContent = "¡Empate! Otra vez…"; setTimeout(() => tapDuel(ps, ctx), 1500); return; }
    const loser = n[0] < n[1] ? 0 : 1;
    document.getElementById("mid").textContent = `${n[0]} a ${n[1]}`;
    setTimeout(() => duelEnd(ps, ps[loser].id, ctx), 1300);
  }, 7400);
}
function duelEnd(ps, loserId, ctx) {
  const loser = P(loserId);
  const winner = ps.length === 2 ? ps.find(p => p.id !== loserId) : null;
  let card = null;
  if (winner) { winner.duelWins++; if (ctx.giveCard) { card = pick(Object.keys(D.trampas)); winner.cards.push(card); } }
  saveGame(); fanfare();
  render(`
    <div class="grow"></div>
    <div class="banner">${avatar(loser, "lg shake")}<h2>${esc(loser.name)} pierde el duelo</h2></div>
    ${card ? `<div class="banner pop"><p class="eyebrow">Premio para ${esc(winner.name)}</p>${cardHtml(card, null, "big")}</div>` : ""}
    <div class="grow"></div>
    <button class="btn" data-act="ok">Continuar</button>
  `, { ok: () => ctx.onLoser(loserId) });
}

// ---------- acusado y cartas trampa ----------
function accused(id) {
  const p = P(id); p.accused++; saveGame();
  showAccused(p);
}
function showAccused(p) {
  let secs = 20;
  render(`
    <p class="eyebrow" style="text-align:center">El acusado es</p>
    <div class="banner">${avatar(p, "xl shake")}<h1>${esc(p.name)}</h1><p class="muted">${esc(G.cur.pregunta)}</p></div>
    <button class="btn ghost" data-act="def" id="def">Defensa: 20 segundos</button>
    ${p.cards.length ? `<p class="eyebrow">Cartas trampa de ${esc(p.name)}</p><div class="cards">${p.cards.map(t => cardHtml(t, canUse(t, p) ? "use" : null)).join("")}</div>` : ""}
    <div class="grow"></div>
    <button class="btn" data-act="accept">Aceptar la prenda</button>
  `, {
    def: (_, b) => {
      b.disabled = true;
      const t = () => { b.textContent = secs > 0 ? `${secs} s` : "¡Tiempo!"; if (secs <= 3 && secs > 0) beep(700); if (secs-- > 0) later(t, 1000); else beep(300, 0.5, "sawtooth"); };
      t();
    },
    use: t => useCard(p, t),
    accept: () => punish(p.id, true)
  });
}
function canUse(t, p) {
  if (t === "robo") return G.players.some(o => o.id !== p.id && o.cards.length);
  if (t === "rebote" || t === "duelo" || t === "veneno") return active().length > 1;
  return true;
}
const spend = (p, t) => p.cards.splice(p.cards.indexOf(t), 1);
function chooseOther(p, title, filter, then) {
  const list = G.players.filter(o => o.id !== p.id && filter(o));
  render(`
    <p class="eyebrow">${esc(D.trampas[title].nombre)}</p><h2>${title === "robo" ? "¿A quién le robas?" : title === "duelo" ? "¿A quién retas?" : "¿A quién le toca la prenda?"}</h2>
    <div class="vgrid">${list.map(o => `<button class="vcard" data-act="ch" data-arg="${o.id}">${avatar(o)}<span>${esc(o.name)}</span></button>`).join("")}</div>
    <div class="grow"></div><button class="btn ghost" data-act="back">Mejor no usarla</button>
  `, { ch: id => then(P(id)), back: () => showAccused(p) });
}
function useCard(p, t) {
  const C = D.trampas[t];
  const reveal = (msg, next) => { saveGame(); fanfare(); render(`<div class="grow"></div><div class="banner pop">${cardHtml(t, null, "big")}<h2>${msg}</h2></div><div class="grow"></div><button class="btn" data-act="ok">Continuar</button>`, { ok: next }); };
  if (t === "escudo") { spend(p, t); return reveal(`¡${esc(p.name)} se salva!`, afterRound); }
  if (t === "rebote") {
    let target = G.cur.second && P(G.cur.second) && !P(G.cur.second).out && G.cur.second !== p.id ? P(G.cur.second) : pick(active().filter(o => o.id !== p.id));
    spend(p, t); return reveal(`¡Rebota a ${esc(target.name)}!`, () => punish(target.id, true));
  }
  if (t === "duelo") return chooseOther(p, t, o => !o.out, rival => { spend(p, t); saveGame(); duel([p.id, rival.id], { giveCard: false, onLoser: id => punish(id, true) }); });
  if (t === "veneno") return chooseOther(p, t, o => !o.out, v => { spend(p, t); reveal(`${esc(p.name)} se salva y le regala la prenda a ${esc(v.name)}`, () => punish(v.id, false)); });
  if (t === "robo") return chooseOther(p, t, o => o.cards.length > 0, v => {
    const s = pick(v.cards); v.cards.splice(v.cards.indexOf(s), 1); spend(p, t); p.cards.push(s); saveGame(); fanfare();
    render(`<div class="grow"></div><div class="banner pop"><p class="eyebrow">${esc(p.name)} le robó a ${esc(v.name)}</p>${cardHtml(s, null, "big")}</div><div class="grow"></div><button class="btn" data-act="ok">Volver</button>`, { ok: () => showAccused(p) });
  });
}

// ---------- prendas y carbones ----------
function punish(id, withCoal) {
  const p = P(id); const prenda = pick(D.prendas);
  render(`
    <div class="banner">${avatar(p, "lg")}<h2>${esc(p.name)}, te toca:</h2></div>
    <div class="prenda pop">${esc(prenda)}</div>
    <p class="small muted" style="text-align:center">${withCoal ? "Al terminar la prenda recibes un carbón." : "Esta prenda no da carbón."}</p>
    <div class="grow"></div>
    <button class="btn gold" data-act="other">Otra prenda</button>
    <button class="btn" data-act="done">¡Hecho!</button>
  `, { other: () => punish(id, withCoal), done: () => withCoal ? giveCoal(p) : afterRound() });
}
function giveCoal(p) {
  p.coal++;
  const max = G.settings.maxCoal;
  const out = max && p.coal >= max && !p.out;
  if (out) p.out = true;
  saveGame(); beep(180, 0.5, "sawtooth");
  render(`
    <div class="grow"></div>
    <div class="banner"><img class="pop" src="img/carbon.webp" alt="Carbón" style="width:150px;border-radius:50%">
    <h2>+1 carbón para ${esc(p.name)}</h2>${coals(p)}
    ${out ? `<p class="prenda">¡${esc(p.name)} queda fuera de la partida! Pero sigue votando como jurado.</p>` : max ? `<p class="muted">Con ${max} carbones quedas fuera.</p>` : ""}</div>
    <div class="grow"></div>
    <button class="btn" data-act="ok">Siguiente ronda</button>
  `, { ok: afterRound });
}
function afterRound() {
  const zero = active().filter(p => !G.cur.votes[p.id]);
  if (Math.random() < 0.35 && active().length) {
    const lucky = pick(zero.length ? zero : active()); const t = pick(Object.keys(D.trampas));
    lucky.cards.push(t); saveGame(); fanfare();
    return render(`
      <p class="eyebrow" style="text-align:center">Regalo bajo el árbol</p>
      <div class="banner">${avatar(lucky, "lg pop")}<h2>¡Carta trampa para ${esc(lucky.name)}!</h2></div>
      ${cardHtml(t, null, "big pop")}
      <p class="small muted" style="text-align:center">La puede usar cuando la acusen.</p>
      <div class="grow"></div><button class="btn" data-act="ok">Siguiente ronda</button>
    `, { ok: nextRound });
  }
  nextRound();
}

// ---------- final ----------
function finalScreen() {
  const ps = G.players.slice();
  const by = (f, dir = 1) => ps.slice().sort((a, b) => dir * (f(a) - f(b)))[0];
  const angel = ps.slice().sort((a, b) => a.out - b.out || a.coal - b.coal || a.votes - b.votes)[0];
  const coalest = by(p => p.coal, -1), sus = by(p => p.votes, -1), duelist = by(p => p.duelWins, -1);
  const award = (p, t, d) => `<div class="award">${avatar(p)}<div><b>${t}</b><span>${esc(p.name)} · ${d}</span></div></div>`;
  del(KEY_GAME); fanfare();
  render(`
    <p class="eyebrow" style="text-align:center">Fin de la partida</p>
    <div class="banner">${avatar(angel, "xl pop")}<h1>${esc(angel.name)}</h1><p class="muted">El Angelito de la familia: el que menos carbón juntó.</p></div>
    <div class="podium">
      ${coalest.coal ? award(coalest, "El Carbonero", `${coalest.coal} carbones`) : ""}
      ${sus.votes ? award(sus, "El Más Sospechoso", `${sus.votes} votos en total`) : ""}
      ${duelist.duelWins ? award(duelist, "El Duelista", `${duelist.duelWins} duelos ganados`) : ""}
    </div>
    <div class="grow"></div>
    <button class="btn" data-act="again">Revancha</button>
    <button class="btn ghost" data-act="home">Inicio</button>
  `, { again: () => { newGame(); nextRound(); }, home: () => { G = null; home(); } });
}

home();
})();
