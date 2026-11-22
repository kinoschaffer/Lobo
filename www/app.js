(() => {
"use strict";
const D = window.QH_DATA;
const $app = document.getElementById("app");
const KEY_PLAYERS = "qh_players_v1", KEY_GAME = "qh_game_v2", KEY_SET = "qh_settings_v2";
const PENALTY = 2; // votos extra por presentimiento fallido

// ---------- utilidades ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uid = () => Math.random().toString(36).slice(2, 9);
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const del = k => { try { localStorage.removeItem(k); } catch {} };
const names = ps => ps.map(p => esc(p.name)).join(", ").replace(/, ([^,]*)$/, " y $1");

let actions = {};
let timers = [];
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
$app.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (b && !b.disabled && actions[b.dataset.act]) { tick(); actions[b.dataset.act](b.dataset.arg, b); }
});
function render(html, acts = {}) { clearTimers(); actions = acts; $app.innerHTML = `<main class="screen ${acts._cls || ""}"><div id="activebar"></div>${html}</main>`; window.scrollTo(0, 0); drawActive(); }

// ---------- prendas activas (duran toda una ronda) ----------
const activeNow = () => (G && G.activeP || []).filter(a => a.round === G.round && P(a.pid));
function drawActive() {
  const el = document.getElementById("activebar"); if (!el) return;
  const list = activeNow();
  el.className = list.length ? "activebar" : "";
  el.innerHTML = list.map(a => { const p = P(a.pid); return `<div class="act">${avatar(p)}<span><small>Prenda activa</small><b>${esc(p.name)}:</b> ${esc(a.t)}</span><button data-broke="${a.k}">¡La rompió!</button></div>`; }).join("");
}
$app.addEventListener("click", e => {
  const b = e.target.closest("[data-broke]"); if (!b) return;
  e.stopPropagation();
  const a = G.activeP.find(x => x.k === b.dataset.broke); if (!a) return;
  const p = P(a.pid); G.activeP = G.activeP.filter(x => x !== a);
  p.coal++; const max = G.settings.maxCoal; const out = max && p.coal >= max && !p.out; if (out) p.out = true;
  saveGame(); beep(180, 0.5, "sawtooth");
  toast(`¡Tomatazo para ${p.name}! Rompió la prenda.${out ? " Queda fuera." : ""}`);
  drawActive();
}, true);

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
function mystic() { [880, 1175, 1397, 1760].forEach((f, i) => setTimeout(() => beep(f, 0.25, "sine", 0.1), i * 90)); }
function drumroll(ms) { for (let t = 0; t < ms; t += 70) setTimeout(() => beep(110 + rnd(30), 0.05, "sawtooth", 0.05), t); }
let wakeLock;
async function keepAwake() { try { wakeLock = await navigator.wakeLock?.request("screen"); } catch {} }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && G) keepAwake(); });

// ---------- estado ----------
let players = load(KEY_PLAYERS, []);          // {id,name,photo}
let settings = Object.assign({ vote: "secret", maxCoal: 3, rounds: 15, hunch: 2 }, load(KEY_SET, {}));
let G = null;                                  // partida en curso
const savePlayers = () => { if (!save(KEY_PLAYERS, players)) toast("No se pudo guardar. Prueba con menos fotos."); };
const saveGame = () => G && save(KEY_GAME, G);
const P = id => G.players.find(p => p.id === id);
const active = () => G.players.filter(p => !p.out);

const avatar = (p, cls = "") => `<div class="avatar ${cls} ${p.out ? "out" : ""}">${p.photo ? `<img src="${p.photo}" alt="">` : esc((p.name || "?").trim().charAt(0).toUpperCase())}</div>`;
const tomatoes = p => `<span class="coals">${Array.from({ length: p.coal }, () => `<img src="img/tomate.webp" alt="tomatazo">`).join("")}</span>`;
const cardHtml = (t, act, cls = "") => { const c = t === "presentimiento" ? D.presentimiento : D.trampas[t]; return `<button class="tcard ${cls}" ${act ? `data-act="${act}" data-arg="${t}"` : "disabled"}><img src="img/${c.img}.webp" alt=""><b>${c.nombre}</b><span>${c.texto}</span></button>`; };
function toast(msg) { const d = document.createElement("div"); d.className = "toast"; d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }

// ---------- inicio ----------
function home() {
  const saved = load(KEY_GAME, null);
  render(`
    <div class="grow"></div>
    <img class="scene pop" src="img/hero.webp" alt="Un grupo en un sillón señalando a la misma persona">
    <div class="banner"><span class="eyebrow">Juego party para el grupo</span><h1>¿Quién Haría?</h1>
    <p class="muted">Situaciones absurdas, todos votan quién haría cada cosa y el más votado paga prenda.</p></div>
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
      <div class="opt"><h3>2. Todos votan</h3><p class="muted">Votación secreta: el celular pasa de mano en mano. Votación rápida: todos señalan a la vez y el anfitrión anota.</p></div>
      <div class="opt"><h3>3. Presentimiento</h3><p class="muted">Cada jugador tiene ${settings.hunch} presentimientos por partida. Úsalo si crees que te van a votar a ti: si eres el más votado, te salvas y le toca al siguiente. Si fallas, la próxima ronda empiezas con +${PENALTY} votos.</p></div>
      <div class="opt"><h3>4. Empate = duelo</h3><p class="muted">Los empatados se enfrentan en un minijuego. El que pierde es el acusado. Si el duelo es de dos, el ganador se lleva una carta trampa.</p></div>
      <div class="opt"><h3>5. El acusado</h3><p class="muted">Puede usar cartas trampa, aceptar la prenda (y un tomatazo) o arriesgarse a defenderse.</p></div>
      <div class="opt"><h3>6. La defensa</h3><p class="muted">20 segundos para convencer al grupo. Después, levantan la mano los que le creen. Más de la mitad: se salva. Menos de un tercio: prenda y 2 tomatazos. En el medio: prenda y tomatazo.</p></div>
      <div class="opt"><h3>Prendas de ronda</h3><p class="muted">Algunas prendas duran toda la ronda siguiente y quedan a la vista arriba de la pantalla. Si alguien la rompe, tocan «¡La rompió!» y recibe un tomatazo. Si no cumple una prenda, también recibe un tomatazo.</p></div>
      <div class="opt"><h3>7. Tomatazos</h3><p class="muted">Con ${settings.maxCoal || "muchos"} tomatazos quedas fuera, pero sigues votando. Gana quien termine con menos.</p></div>
      <div class="opt"><h3>Golpe de suerte</h3><p class="muted">Al final de algunas rondas, alguien que no recibió votos gana una carta trampa o un presentimiento extra.</p></div>
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
      <div class="pitem">${avatar(p)}<span class="name">${esc(p.name)}</span>${inGame ? tomatoes(p) : `<button class="x" data-act="rm" data-arg="${p.id}" aria-label="Quitar a ${esc(p.name)}">✕</button>`}</div>`).join("") || `<p class="muted">Todavía no hay nadie. Saca una foto, escribe el nombre y toca «Agregar jugador».</p>`}
    </div>
  `, {
    back: () => back(),
    rm: id => { players = players.filter(p => p.id !== id); savePlayers(); playersScreen(back); },
    add: () => {
      const name = document.getElementById("nm").value.trim();
      if (!name) { document.getElementById("nm").focus(); return toast("Escribe un nombre"); }
      const p = { id: uid(), name, photo };
      players.push(p); savePlayers();
      if (inGame) { G.players.push(newPlayerState(p, G.settings)); saveGame(); }
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
      <div class="opt"><h3>Votación</h3>${seg("vote", [["secret", "Secreta (pasar el celular)"], ["quick", "Rápida (señalar)"]])}
        <p class="small muted">${settings.vote === "secret" ? "Cada uno vota en secreto. Ideal hasta 12 personas." : "Todos señalan a la vez y el anfitrión anota los votos. Ideal para muchos."}</p></div>
      <div class="opt"><h3>Presentimientos por jugador</h3>${seg("hunch", [[0, "Ninguno"], [1, "1"], [2, "2"], [3, "3"]])}</div>
      <div class="opt"><h3>Quedas fuera con</h3>${seg("maxCoal", [[2, "2 tomatazos"], [3, "3 tomatazos"], [5, "5 tomatazos"], [0, "Nunca"]])}</div>
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

const newPlayerState = (p, s) => ({ ...p, coal: 0, cards: [], out: false, votes: 0, accused: 0, duelWins: 0, hunch: s.hunch, penalty: 0, hunchHits: 0, defWins: 0 });
function newGame() {
  G = { settings: { ...settings }, players: players.map(p => newPlayerState(p, settings)), deck: [], round: 0 };
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
  G.round++; G.cur = drawSituation(); G.cur.votes = {}; G.cur.hunch = {};
  G.activeP = (G.activeP || []).filter(a => a.round >= G.round); saveGame();
  showRound();
}
function showRound() {
  const S = G.settings, c = G.cur;
  const pen = active().filter(p => p.penalty);
  render(`
    <div class="topbar"><span class="pill">Ronda ${G.round}${S.rounds ? " de " + S.rounds : ""}</span><button class="btn ghost sm" data-act="menu">Menú</button></div>
    <img class="scene pop" src="img/${c.id}.webp" alt="">
    <h2 style="text-align:center">${esc(c.titulo)}</h2>
    <div class="question">${esc(c.pregunta)}</div>
    ${pen.length ? `<p class="small muted" style="text-align:center">Empiezan con +${PENALTY} votos por presentimiento fallido: ${names(pen)}.</p>` : ""}
    <div class="grow"></div>
    <button class="btn" data-act="vote">¡A votar!</button>
  `, { menu: gameMenu, vote: startVote });
}
function startVote() {
  if (G.settings.vote === "secret") return secretVote(0, shuffle(G.players.map(p => p.id)));
  if (active().some(p => p.hunch > 0)) return hunchDeclare();
  quickVote();
}

function gameMenu() {
  render(`
    <div class="topbar"><button class="btn ghost sm" data-act="back">← Volver al juego</button></div>
    <h2>Menú</h2>
    <button class="btn gold" data-act="add">Sumar jugador con foto</button>
    <button class="btn ghost" data-act="score">Ver tomatazos y cartas</button>
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
  const cards = p => [...p.cards.map(t => D.trampas[t].nombre), p.hunch ? `${p.hunch} presentimiento${p.hunch > 1 ? "s" : ""}` : ""].filter(Boolean).join(", ") || "Sin cartas";
  render(`
    <div class="topbar"><button class="btn ghost sm" data-act="back">← Volver</button></div>
    <h2>Tomatazos y cartas</h2>
    <div class="plist">${list.map(p => `<div class="pitem">${avatar(p)}<span class="name">${esc(p.name)}${p.out ? " · fuera" : ""}${p.penalty ? ` · +${p.penalty} votos` : ""}<br><span class="small muted">${cards(p)}</span></span>${tomatoes(p)}</div>`).join("")}</div>
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
  const canHunch = !voter.out && voter.hunch > 0;
  const double = activeNow().some(a => a.pid === voter.id && a.voto2);
  let sel = null, hunch = false;
  render(`
    <p class="eyebrow">${esc(voter.name)} vota</p>
    <div class="question" style="font-size:1.4rem">${esc(G.cur.pregunta)}</div>
    ${double ? `<p class="small" style="color:var(--gold)">Tu voto vale doble. Dilo en voz alta antes de votar.</p>` : ""}
    <div class="vgrid">${cands.map(p => `<button class="vcard" data-act="sel" data-arg="${p.id}" aria-pressed="false">${avatar(p)}<span>${esc(p.name)}</span></button>`).join("")}</div>
    ${canHunch ? `<button class="hunch" data-act="hunch" aria-pressed="false"><img src="img/carta_presentimiento.webp" alt=""><span><b>Usar presentimiento</b>Creo que me van a votar a mí. Te ${voter.hunch > 1 ? `quedan ${voter.hunch}` : "queda 1"}.</span></button>` : ""}
    <div class="grow"></div>
    <button class="btn" id="ok" data-act="ok" disabled>Elige a alguien</button>
  `, {
    sel: (id, el) => { sel = id; document.querySelectorAll(".vcard").forEach(b => b.setAttribute("aria-pressed", b === el)); const ok = document.getElementById("ok"); ok.disabled = false; ok.textContent = "Votar a " + P(id).name; },
    hunch: (_, el) => { hunch = !hunch; el.setAttribute("aria-pressed", hunch); if (hunch) mystic(); },
    ok: () => {
      G.cur.votes[sel] = (G.cur.votes[sel] || 0) + (double ? 2 : 1);
      if (hunch) { G.cur.hunch[voter.id] = true; voter.hunch--; }
      render(`<div class="grow"></div><div class="banner"><h1 class="pop">¡Voto secreto!</h1><p class="muted">${hunch ? "Tu presentimiento quedó guardado. " : ""}Tapa la pantalla y pasa el celular.</p></div><div class="grow"></div><button class="btn" data-act="n">Siguiente</button>`, { n: done });
    }
  });
}
function hunchDeclare() {
  const cands = active().filter(p => p.hunch > 0);
  const h = G.cur.hunch;
  const draw = () => render(`
    <p class="eyebrow">Antes de votar</p>
    <h2>¿Alguien tiene un presentimiento?</h2>
    <p class="muted">Quien crea que va a ser el más votado puede usar un presentimiento en voz alta. Si acierta, se salva. Si falla, la próxima ronda empieza con +${PENALTY} votos. Ojo: ahora todos saben que lo usaste.</p>
    <div class="vgrid">${cands.map(p => `<button class="vcard" data-act="t" data-arg="${p.id}" aria-pressed="${!!h[p.id]}">${avatar(p)}<span>${esc(p.name)}</span><small class="muted">${p.hunch} disp.</small></button>`).join("")}</div>
    <div class="grow"></div>
    <button class="btn" data-act="go">${Object.keys(h).length ? "Listo, a votar" : "Nadie, a votar"}</button>
  `, { t: id => { h[id] ? delete h[id] : (h[id] = true, mystic()); draw(); }, go: () => { Object.keys(h).forEach(id => P(id).hunch--); saveGame(); quickVote(); } });
  draw();
}
function quickVote() {
  const cands = active(); const v = G.cur.votes;
  const draw = () => {
    const total = Object.values(v).reduce((a, b) => a + b, 0);
    render(`
      <p class="eyebrow">Votación rápida</p>
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
  const v = G.cur.votes, hunch = G.cur.hunch;
  const list = active().map(p => ({ p, n: (v[p.id] || 0) + p.penalty, pen: p.penalty })).sort((a, b) => b.n - a.n);
  const max = list[0] ? list[0].n : 0;
  if (!max) {
    Object.keys(hunch).forEach(id => P(id).hunch++); G.cur.hunch = {};
    toast("Nadie recibió votos. Vamos de nuevo."); return startVote();
  }
  // los votos de castigo se cobran una sola vez
  list.forEach(x => { x.p.votes += v[x.p.id] || 0; x.p.penalty = 0; });
  const top = list.filter(x => x.n === max).map(x => x.p);
  const saved = top.filter(p => hunch[p.id]);
  const failed = active().filter(p => hunch[p.id] && !top.includes(p));
  saved.forEach(p => p.hunchHits++);
  failed.forEach(p => p.penalty = PENALTY);
  // si alguien se salvó, le toca al siguiente más votado
  const rest = list.filter(x => !saved.includes(x.p));
  const max2 = saved.length ? (rest.find(x => x.n > 0) || { n: 0 }).n : max;
  const accusedGroup = max2 ? rest.filter(x => x.n === max2).map(x => x.p) : [];
  const second = rest.find(x => x.n > 0 && x.n < max2);
  G.cur.second = second ? second.p.id : null;
  saveGame();

  const shown = list.filter(x => x.n > 0).slice(0, 8);
  render(`
    <p class="eyebrow">Resultado</p>
    <h2>${esc(G.cur.pregunta)}</h2>
    <div class="bars">${shown.map(x => `<div class="bar ${x.n === max ? "top" : ""}">${avatar(x.p)}<div class="track"><div class="fill" data-w="${(x.n / max) * 100}"></div><div class="lbl"><span>${esc(x.p.name)}${hunch[x.p.id] ? ` <img class="mini" src="img/carta_presentimiento.webp" alt="usó presentimiento">` : ""}</span><span>${x.n}${x.pen ? ` <small>(+${x.pen})</small>` : ""}</span></div></div></div>`).join("")}</div>
    <div class="grow"></div>
    <div id="verdict" class="verdict"></div>
  `, {
    duel: () => duel(accusedGroup.map(p => p.id), { giveCard: true, onLoser: id => accused(id) }),
    acc: () => accused(accusedGroup[0].id),
    skip: afterRound
  });
  drumroll(1100);
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll(".fill").forEach(f => f.style.width = f.dataset.w + "%")));
  later(() => {
    const el = document.getElementById("verdict");
    let html = "";
    if (saved.length) { mystic(); html += `<div class="note good pop"><img src="img/carta_presentimiento.webp" alt=""><span><b>¡${names(saved)} lo ${saved.length > 1 ? "vieron" : "vio"} venir!</b> Usó su presentimiento y se salva.</span></div>`; }
    if (failed.length) html += `<div class="note bad pop"><img src="img/carta_presentimiento.webp" alt=""><span><b>${names(failed)} falló el presentimiento.</b> La próxima ronda empieza con +${PENALTY} votos.</span></div>`;
    if (!accusedGroup.length) html += `<div class="banner pop"><h2>¡Nadie paga esta ronda!</h2></div><button class="btn" data-act="skip">Continuar</button>`;
    else if (accusedGroup.length > 1) { beep(330, 0.3, "sawtooth"); html += `<div class="banner pop"><h2>¡Empate!</h2><p class="muted">${names(accusedGroup).replace(/, | y /g, " vs ")}</p></div><button class="btn gold" data-act="duel">¡Al duelo!</button>`; }
    else { if (!saved.length) fanfare(); html += `<div class="banner pop"><h2>${saved.length ? "Le toca a " : "¡"}${esc(accusedGroup[0].name)}${saved.length ? "" : "!"}</h2></div><button class="btn" data-act="acc">Continuar</button>`; }
    el.innerHTML = html;
  }, 1300);
}

// ---------- duelos ----------
function duel(ids, ctx) {
  const ps = ids.map(P);
  const phone = ps.length === 2 && Math.random() < 0.5;
  const kind = phone ? pick(["reflejos", "toques"]) : null;
  const fis = phone ? null : pick(D.duelosFisicos);
  const info = kind === "reflejos" ? { nombre: "Reflejos", texto: "Pongan el celular en la mesa entre los dos. Cuando la franja del medio se ponga verde, toquen su lado. Si tocan antes, pierden." }
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
  const end = loserIdx => { if (done) return; done = true; clearTimers(); setTimeout(() => duelEnd(ps, ps[loserIdx].id, ctx), 900); };
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
    if (n[0] === n[1]) { document.getElementById("mid").textContent = "¡Empate! Otra vez…"; later(() => tapDuel(ps, ctx), 1500); return; }
    const loser = n[0] < n[1] ? 0 : 1;
    document.getElementById("mid").textContent = `${n[0]} a ${n[1]}`;
    later(() => duelEnd(ps, ps[loser].id, ctx), 1300);
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
  const jury = G.players.length - 1;
  render(`
    <p class="eyebrow" style="text-align:center">Le toca a</p>
    <div class="banner">${avatar(p, "xl shake")}<h1>${esc(p.name)}</h1><p class="muted">${esc(G.cur.pregunta)}</p></div>
    ${p.cards.length ? `<p class="eyebrow">Cartas trampa de ${esc(p.name)}</p><div class="cards">${p.cards.map(t => cardHtml(t, canUse(t, p) ? "use" : null)).join("")}</div>` : ""}
    <div class="grow"></div>
    <div class="risk"><b>¿Te defiendes?</b>Tienes 20 segundos para convencer al grupo de que no lo harías.
      <span>Si convences a más de la mitad (${Math.floor(jury / 2) + 1} de ${jury}), <em class="ok">te salvas</em>.</span>
      <span>Si convences a menos de un tercio, <em class="ko">te llevas 2 tomatazos</em>.</span></div>
    <button class="btn gold" data-act="def">Defenderme</button>
    <button class="btn" data-act="accept">Aceptar la prenda</button>
  `, {
    use: t => useCard(p, t),
    def: () => defense(p),
    accept: () => punish(p.id, 1)
  });
}
function defense(p) {
  let secs = 20;
  render(`
    <p class="eyebrow" style="text-align:center">Defensa</p>
    <div class="banner">${avatar(p, "lg")}<h2>${esc(p.name)}, convence al grupo</h2><p class="muted">${esc(G.cur.pregunta)}</p></div>
    <div class="grow"></div>
    <div class="count" id="tm" style="text-align:center">20</div>
    <div class="grow"></div>
    <button class="btn" data-act="end">Terminé</button>
  `, { end: () => juryVote(p) });
  const t = () => {
    const el = document.getElementById("tm"); if (!el) return;
    el.textContent = secs > 0 ? secs : "¡Tiempo!";
    if (secs <= 3 && secs > 0) beep(700);
    if (secs-- > 0) later(t, 1000); else { beep(300, 0.5, "sawtooth"); later(() => juryVote(p), 900); }
  };
  t();
}
function juryVote(p) {
  const jury = G.players.length - 1; let n = 0;
  const draw = () => render(`
    <p class="eyebrow" style="text-align:center">Veredicto</p>
    <div class="banner">${avatar(p, "lg")}<h2>¿Los convenció ${esc(p.name)}?</h2>
    <p class="muted">Levanten la mano los que le creen. Cuenta las manos.</p></div>
    <div class="bigcounter"><button data-act="dn" aria-label="Menos">−</button><b>${n}</b><span>de ${jury}</span><button data-act="up" aria-label="Más">+</button></div>
    <div class="grow"></div>
    <button class="btn" data-act="go">Ver veredicto</button>
  `, {
    up: () => { n = Math.min(jury, n + 1); draw(); },
    dn: () => { n = Math.max(0, n - 1); draw(); },
    go: () => {
      if (n * 2 > jury) {
        p.defWins = (p.defWins || 0) + 1; saveGame(); fanfare();
        return render(`<div class="grow"></div><div class="banner pop">${avatar(p, "xl")}<h1>¡Absuelto!</h1><p class="muted">${n} de ${jury} le creyeron. ${esc(p.name)} se salva.</p></div><div class="grow"></div><button class="btn" data-act="ok">Continuar</button>`, { ok: afterRound });
      }
      const bad = n * 3 < jury;
      beep(200, 0.5, "sawtooth");
      render(`<div class="grow"></div><div class="banner pop">${avatar(p, "xl shake")}<h1>${bad ? "¡Defensa desastrosa!" : "No alcanzó"}</h1><p class="muted">Solo ${n} de ${jury} le creyeron. ${bad ? "Prenda y 2 tomatazos." : "Prenda y tomatazo."}</p></div><div class="grow"></div><button class="btn" data-act="ok">A la prenda</button>`, { ok: () => punish(p.id, bad ? 2 : 1) });
    }
  });
  draw();
}
function canUse(t, p) {
  if (t === "robo") return G.players.some(o => o.id !== p.id && o.cards.length);
  if (t === "rebote" || t === "duelo" || t === "papa") return active().length > 1;
  return true;
}
const spend = (p, t) => p.cards.splice(p.cards.indexOf(t), 1);
function chooseOther(p, t, filter, then) {
  const list = G.players.filter(o => o.id !== p.id && filter(o));
  render(`
    <p class="eyebrow">${esc(D.trampas[t].nombre)}</p><h2>${t === "robo" ? "¿A quién le robas?" : t === "duelo" ? "¿A quién retas?" : "¿A quién le pasas la prenda?"}</h2>
    <div class="vgrid">${list.map(o => `<button class="vcard" data-act="ch" data-arg="${o.id}">${avatar(o)}<span>${esc(o.name)}</span></button>`).join("")}</div>
    <div class="grow"></div><button class="btn ghost" data-act="back">Mejor no usarla</button>
  `, { ch: id => then(P(id)), back: () => showAccused(p) });
}
function useCard(p, t) {
  const reveal = (msg, next) => { saveGame(); fanfare(); render(`<div class="grow"></div><div class="banner pop">${cardHtml(t, null, "big")}<h2>${msg}</h2></div><div class="grow"></div><button class="btn" data-act="ok">Continuar</button>`, { ok: next }); };
  if (t === "escudo") { spend(p, t); return reveal(`¡${esc(p.name)} se salva!`, afterRound); }
  if (t === "rebote") {
    const s = G.cur.second && P(G.cur.second);
    const target = s && !s.out && s.id !== p.id ? s : pick(active().filter(o => o.id !== p.id));
    spend(p, t); return reveal(`¡Vuela hacia ${esc(target.name)}!`, () => punish(target.id, 1));
  }
  if (t === "duelo") return chooseOther(p, t, o => !o.out, rival => { spend(p, t); saveGame(); duel([p.id, rival.id], { giveCard: false, onLoser: id => punish(id, 1) }); });
  if (t === "papa") return chooseOther(p, t, o => !o.out, v => { spend(p, t); reveal(`${esc(p.name)} se salva y le pasa la papa caliente a ${esc(v.name)}`, () => punish(v.id, 0)); });
  if (t === "robo") return chooseOther(p, t, o => o.cards.length > 0, v => {
    const s = pick(v.cards); v.cards.splice(v.cards.indexOf(s), 1); spend(p, t); p.cards.push(s); saveGame(); fanfare();
    render(`<div class="grow"></div><div class="banner pop"><p class="eyebrow">${esc(p.name)} le robó a ${esc(v.name)}</p>${cardHtml(s, null, "big")}</div><div class="grow"></div><button class="btn" data-act="ok">Volver</button>`, { ok: () => showAccused(p) });
  });
}

// ---------- prendas y tomatazos ----------
function punish(id, hits) {
  const p = P(id);
  const ronda = Math.random() < 0.4;
  const pr = ronda ? pick(D.prendasRonda) : { t: pick(D.prendas) };
  const fail = hits + 1;
  const tom = n => n === 1 ? "un tomatazo" : `${n} tomatazos`;
  render(`
    <div class="banner">${avatar(p, "lg")}<h2>${esc(p.name)}, te toca:</h2></div>
    ${ronda ? `<p class="eyebrow" style="text-align:center">Prenda de ronda: se cumple durante toda la próxima ronda</p>` : ""}
    <div class="prenda pop">${esc(pr.t)}</div>
    <div class="rules-mini">
      <span>${ronda ? "Si la aceptas" : "Si la cumples"}: <b>${hits ? tom(hits) : "sin tomatazo"}</b></span>
      <span>${ronda ? "Si no la aceptas" : "Si no la cumples"}: <b>${tom(fail)}</b></span>
      ${ronda ? `<span>Si la rompes durante la ronda: <b>+1 tomatazo</b></span>` : ""}
    </div>
    <div class="grow"></div>
    <button class="btn gold" data-act="other">Otra prenda</button>
    <div class="row"><button class="btn ghost" data-act="fail">No la ${ronda ? "acepta" : "cumplió"}</button><button class="btn" data-act="done">${ronda ? "¡Acepto!" : "¡Hecho!"}</button></div>
  `, {
    other: () => punish(id, hits),
    fail: () => giveTomato(p, fail, `${p.name} no ${ronda ? "aceptó" : "cumplió"} la prenda`),
    done: () => {
      if (ronda) { G.activeP = G.activeP || []; G.activeP.push({ k: uid(), pid: p.id, t: pr.t, voto2: !!pr.voto2, round: G.round + 1 }); saveGame(); }
      hits ? giveTomato(p, hits) : afterRound();
    }
  });
}
function giveTomato(p, hits = 1, why = "") {
  p.coal += hits;
  const max = G.settings.maxCoal;
  const out = max && p.coal >= max && !p.out;
  if (out) p.out = true;
  saveGame(); beep(180, 0.5, "sawtooth");
  render(`
    <div class="grow"></div>
    <div class="banner"><img class="pop splat" src="img/tomate.webp" alt="Tomatazo">
    <h2>¡${hits > 1 ? hits + " tomatazos" : "Tomatazo"} para ${esc(p.name)}!</h2>${why ? `<p class="muted">${esc(why)}.</p>` : ""}${tomatoes(p)}
    ${out ? `<p class="prenda">¡${esc(p.name)} queda fuera de la partida! Pero sigue votando.</p>` : max ? `<p class="muted">Con ${max} tomatazos quedas fuera.</p>` : ""}</div>
    <div class="grow"></div>
    <button class="btn" data-act="ok">Siguiente ronda</button>
  `, { ok: afterRound });
}
function afterRound() {
  const zero = active().filter(p => !G.cur.votes[p.id]);
  if (Math.random() < 0.35 && active().length) {
    const lucky = pick(zero.length ? zero : active());
    const isHunch = G.settings.hunch > 0 && Math.random() < 0.3;
    const t = isHunch ? "presentimiento" : pick(Object.keys(D.trampas));
    isHunch ? lucky.hunch++ : lucky.cards.push(t);
    saveGame(); fanfare();
    return render(`
      <p class="eyebrow" style="text-align:center">Golpe de suerte</p>
      <div class="banner">${avatar(lucky, "lg pop")}<h2>¡${isHunch ? "Un presentimiento extra" : "Carta trampa"} para ${esc(lucky.name)}!</h2></div>
      ${cardHtml(t, null, "big pop")}
      <p class="small muted" style="text-align:center">${isHunch ? "Lo puede usar al votar." : "La puede usar cuando le toque la prenda."}</p>
      <div class="grow"></div><button class="btn" data-act="ok">Siguiente ronda</button>
    `, { ok: nextRound });
  }
  nextRound();
}

// ---------- final ----------
function finalScreen() {
  const ps = G.players.slice();
  const top = f => ps.slice().sort((a, b) => f(b) - f(a))[0];
  const best = ps.slice().sort((a, b) => a.out - b.out || a.coal - b.coal || a.votes - b.votes)[0];
  const hit = top(p => p.coal), sus = top(p => p.votes), duelist = top(p => p.duelWins), seer = top(p => p.hunchHits), lawyer = top(p => p.defWins || 0);
  const award = (p, t, d) => `<div class="award">${avatar(p)}<div><b>${t}</b><span>${esc(p.name)} · ${d}</span></div></div>`;
  del(KEY_GAME); fanfare();
  render(`
    <p class="eyebrow" style="text-align:center">Fin de la partida</p>
    <div class="banner">${avatar(best, "xl pop")}<h1>${esc(best.name)}</h1><p class="muted">El Intocable: el que menos tomatazos recibió.</p></div>
    <div class="podium">
      ${hit.coal ? award(hit, "El Más Tomateado", `${hit.coal} tomatazos`) : ""}
      ${sus.votes ? award(sus, "El Más Sospechoso", `${sus.votes} votos en total`) : ""}
      ${seer.hunchHits ? award(seer, "El Adivino", `${seer.hunchHits} presentimientos acertados`) : ""}
      ${duelist.duelWins ? award(duelist, "El Duelista", `${duelist.duelWins} duelos ganados`) : ""}
      ${lawyer.defWins ? award(lawyer, "El Abogado", `${lawyer.defWins} defensas ganadas`) : ""}
    </div>
    <div class="grow"></div>
    <button class="btn" data-act="again">Revancha</button>
    <button class="btn ghost" data-act="home">Inicio</button>
  `, { again: () => { newGame(); nextRound(); }, home: () => { G = null; home(); } });
}

home();
})();
