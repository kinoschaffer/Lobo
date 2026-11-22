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

// ---------- APK: zonas seguras (notch y barras) y botón atrás ----------
window.__setInsets = o => { const st = document.documentElement.style; ["top", "right", "bottom", "left"].forEach(k => st.setProperty("--safe-" + k, (o[k] || 0) + "px")); };
try { if (window.AndroidInsets) window.__setInsets(JSON.parse(window.AndroidInsets.get())); } catch {}
let backAt = 0;
try {
  const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (CapApp) CapApp.addListener("backButton", () => {
    if (Date.now() - backAt < 2000) return CapApp.exitApp();
    backAt = Date.now(); toast("Toca atrás otra vez para salir. La partida queda guardada.");
  });
} catch {}

let actions = {};
let timers = [];
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
$app.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (b && !b.disabled && actions[b.dataset.act]) { tick(); actions[b.dataset.act](b.dataset.arg, b); }
});
function render(html, acts = {}) { const y = window.scrollY; clearTimers(); actions = acts; $app.innerHTML = `<main class="screen ${acts._cls || ""}"><div id="activebar"></div>${html}</main>`; window.scrollTo(0, acts._keep ? y : 0); drawActive(); }

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
let settings = Object.assign({ vote: "secret", maxCoal: 3, rounds: 15, hunch: 2, modo: "indiv" }, load(KEY_SET, {}));
let G = null;                                  // partida en curso
const KEY_CUSTOM = "qh_custom_v1", KEY_TEAMS = "qh_teams_v1";
// Contenido elegido por el grupo: prendas y situaciones desactivadas, y prendas y preguntas propias.
let custom = Object.assign({ off: [], offSit: [], prendas: {}, preguntas: {} }, load(KEY_CUSTOM, {}));
custom.prendas = Object.assign({ normal: [], ronda: [], grupo: [] }, custom.prendas);
custom.preguntas = Object.assign({ indiv: [], grupo: [] }, custom.preguntas);
const saveCustom = () => save(KEY_CUSTOM, custom);
let teams = load(KEY_TEAMS, null);
const saveTeams = () => save(KEY_TEAMS, teams);
const savePlayers = () => { if (!save(KEY_PLAYERS, players)) toast("No se pudo guardar. Prueba con menos fotos."); };
const saveGame = () => G && save(KEY_GAME, G);
const P = id => G.players.find(p => p.id === id);
const active = () => G.players.filter(p => !p.out);

const avatar = (p, cls = "") => `<div class="avatar ${cls} ${p.out ? "out" : ""}">${p.photo ? `<img src="${p.photo}" alt="">` : esc((p.name || "?").trim().charAt(0).toUpperCase())}</div>`;
const tomatoes = p => `<span class="coals">${Array.from({ length: p.coal }, () => `<img src="img/tomate.webp" alt="tomatazo">`).join("")}</span>`;
const cardHtml = (t, act, cls = "", owner = "") => { const c = t === "presentimiento" ? D.presentimiento : t === "reto" ? D.reto : D.trampas[t]; return `<button class="tcard ${cls}" ${act ? `data-act="${act}" data-arg="${t}"${owner ? ` data-owner="${owner}"` : ""}` : "disabled"}><img src="img/${c.img}.webp" alt=""><b>${c.nombre}</b><span>${c.texto}</span></button>`; };
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
    <div class="row"><button class="btn ghost" data-act="players">Jugadores (${players.length})</button><button class="btn ghost" data-act="content">Prendas y preguntas</button></div>
    <button class="btn ghost" data-act="rules">Cómo se juega</button>
    ${players.length < 3 ? `<p class="small muted" style="text-align:center">Agrega al menos 3 jugadores para empezar.</p>` : ""}
  `, {
    resume: () => { G = load(KEY_GAME, null); G.players.forEach(p => p.cards = p.cards.filter(t => D.trampas[t])); keepAwake(); nextRound(); },
    setup, players: () => playersScreen(home), rules, content: () => contentScreen("normal")
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
      <div class="opt"><h3>5. El acusado</h3><p class="muted">Puede usar cartas trampa, aceptar la prenda o arriesgarse con un discurso o un reto. Si cumple la prenda, se salva del tomatazo. Si no la cumple, tomatazo.</p></div>
      <div class="opt"><h3>6. La defensa</h3><p class="muted">20 segundos para convencer al grupo. Después, levantan la mano los que le creen. Más de la mitad: se salva sin prenda. Menos de un tercio: 1 tomatazo seguro y además la prenda. En el medio: solo la prenda.</p></div>
      <div class="opt"><h3>Prendas de ronda</h3><p class="muted">Algunas prendas duran toda la ronda siguiente y quedan a la vista arriba de la pantalla. Si alguien la rompe, tocan «¡La rompió!» y recibe un tomatazo. Si no cumple una prenda, también recibe un tomatazo.</p></div>
      <div class="opt"><h3>7. Tomatazos</h3><p class="muted">Con ${settings.maxCoal || "muchos"} tomatazos quedas fuera, pero sigues votando. Gana quien termine con menos.</p></div>
      <div class="opt"><h3>Reto a duelo</h3><p class="muted">Cada jugador tiene 1 reto por partida, y a veces la ronda lo regala. Si te toca la prenda, retas a quien quieras: si ganas, la prenda pasa a él; si pierdes, 1 tomatazo seguro y además la prenda.</p></div>
      <div class="opt"><h3>Cartas</h3><p class="muted">Se ganan en duelos de dos y con el golpe de suerte. Hay cartas para cuando te toca la prenda (Escudo, Bumerán, Papa Caliente, Mano Traviesa, Cómplice, Abogado Defensor, Prenda Light, Ruleta, Doble o Nada), para votar en secreto (Voto Doble, Voto Robado, Anulador, Espejo), para usar en cualquier momento con el botón «Usar carta» (Limpieza, Castigo, Silencio, Intercambio) y Revancha para repetir un duelo perdido.</p></div>
      <div class="opt"><h3>Por equipos</h3><p class="muted">En «Nueva partida» elige «Por equipos» y arma de 2 a 5 equipos de 2 o 3 jugadores. Se vota a equipos, el equipo más votado se defiende o hace una prenda de equipo, y gana el equipo con menos tomatazos.</p></div>
      <div class="opt"><h3>Prendas y preguntas</h3><p class="muted">Desde el inicio puedes activar o desactivar prendas y situaciones, y agregar prendas y preguntas propias.</p></div>
      <div class="opt"><h3>Golpe de suerte</h3><p class="muted">Al final de algunas rondas, alguien que no recibió votos gana una carta trampa, un presentimiento o un reto extra.</p></div>
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
      <div class="opt"><h3>Modo de juego</h3>${seg("modo", [["indiv", "Individual"], ["equipos", "Por equipos"]])}
        ${settings.modo === "equipos" ? `<p class="small muted">${teamSummary()}</p><button class="btn gold sm" style="width:100%" data-act="teams">Armar equipos</button>` : ""}</div>
      <div class="opt"><h3>Votación</h3>${seg("vote", [["secret", "Secreta (pasar el celular)"], ["quick", "Rápida (señalar)"]])}
        <p class="small muted">${settings.vote === "secret" ? "Cada uno vota en secreto. Ideal hasta 12 personas." : "Todos señalan a la vez y el anfitrión anota los votos. Ideal para muchos."}</p></div>
      <div class="opt" ${settings.modo === "equipos" ? "hidden" : ""}><h3>Presentimientos por jugador</h3>${seg("hunch", [[0, "Ninguno"], [1, "1"], [2, "2"], [3, "3"]])}</div>
      <div class="opt"><h3>${settings.modo === "equipos" ? "Un equipo queda fuera con" : "Quedas fuera con"}</h3>${seg("maxCoal", [[2, "2 tomatazos"], [3, "3 tomatazos"], [5, "5 tomatazos"], [0, "Nunca"]])}</div>
      <div class="opt"><h3>Rondas</h3>${seg("rounds", [[10, "10"], [15, "15"], [25, "25"], [0, "Sin límite"]])}</div>
    </div>
    <div class="grow"></div>
    <button class="btn" data-act="go">¡Empezar!</button>
  `, {
    back: home,
    set: a => { const [k, v] = a.split(":"); settings[k] = k === "vote" || k === "modo" ? v : +v; save(KEY_SET, settings); setup(); },
    teams: () => teamsScreen(0),
    go: () => {
      if (settings.modo === "equipos") { const err = teamsError(); if (err) { toast(err); return teamsScreen(0); } }
      newGame(); nextRound();
    }
  });
}

const newPlayerState = (p, s) => ({ ...p, coal: 0, cards: [], out: false, votes: 0, accused: 0, duelWins: 0, hunch: s.hunch, penalty: 0, hunchHits: 0, defWins: 0, retos: 1, retoWins: 0 });
function newGame() {
  G = { settings: { ...settings }, players: players.map(p => newPlayerState(p, settings)), deck: [], round: 0, mode: settings.modo };
  if (G.mode === "equipos") G.teams = teams.map(t => ({ id: t.id, name: t.name, members: t.members.slice(), coal: 0, out: false, votes: 0, accused: 0, done: 0, defWins: 0 }));
  keepAwake();
}
const teamify = q => q.replace(/^¿Quién /, "¿Qué equipo ").replace(/^¿De quién /, "¿De qué equipo ").replace(/^¿A quién /, "¿A qué equipo ").replace(/^¿Con quién /, "¿Con qué equipo ");
function drawSituation() {
  const eq = G.mode === "equipos";
  const own = eq ? custom.preguntas.grupo : custom.preguntas.indiv;
  const build = () => {
    let sits = D.situaciones.filter(s => !custom.offSit.includes(s.id));
    if (!sits.length && !own.length) sits = D.situaciones;
    return shuffle([...sits.flatMap(s => s.preguntas.map((q, i) => [s.id, i])), ...own.map((q, i) => ["_propia", i])]);
  };
  for (let tries = 0; tries < 3; tries++) {
    if (!G.deck.length) G.deck = build();
    const [id, qi] = G.deck.pop();
    if (id === "_propia") { if (own[qi]) return { id, img: "hero", titulo: eq ? "Pregunta de equipos" : "Pregunta del grupo", pregunta: own[qi] }; continue; }
    const s = D.situaciones.find(x => x.id === id);
    if (s && !custom.offSit.includes(id)) return { id, titulo: s.titulo, pregunta: eq ? teamify(s.preguntas[qi]) : s.preguntas[qi] };
  }
  G.deck = build(); return drawSituation();
}

// ---------- ronda ----------
function nextRound() {
  const S = G.settings;
  if (G.mode === "equipos" ? (S.maxCoal && activeTeams().length <= 1) : (S.maxCoal && active().length <= 2)) return finalScreen();
  if (S.rounds && G.round >= S.rounds) return finalScreen();
  G.round++; G.cur = drawSituation(); G.cur.votes = {}; G.cur.hunch = {};
  G.activeP = (G.activeP || []).filter(a => a.round >= G.round); saveGame();
  showRound();
}
function showRound() {
  const S = G.settings, c = G.cur;
  const pen = active().filter(p => p.penalty);
  render(`
    <div class="topbar"><span class="pill">Ronda ${G.round}${S.rounds ? " de " + S.rounds : ""}</span><div class="row" style="flex-wrap:nowrap">${G.mode !== "equipos" && G.players.some(p => cardsOf(p, "siempre").length) ? `<button class="btn gold sm" data-act="cards">Usar carta</button>` : ""}<button class="btn ghost sm" data-act="menu">Menú</button></div></div>
    <img class="scene pop" src="img/${c.img || c.id}.webp" alt="">
    <h2 style="text-align:center">${esc(c.titulo)}</h2>
    <div class="question">${esc(c.pregunta)}</div>
    ${pen.length ? `<p class="small muted" style="text-align:center">Empiezan con +${PENALTY} votos por presentimiento fallido: ${names(pen)}.</p>` : ""}
    <div class="grow"></div>
    <button class="btn" data-act="vote">¡A votar!</button>
  `, { menu: gameMenu, vote: startVote, cards: anytimeCards });
}

// ---------- cartas de «cualquier momento» ----------
function anytimeCards() {
  const owners = G.players.filter(p => cardsOf(p, "siempre").length);
  render(`
    <div class="topbar"><button class="btn ghost sm" data-act="back">← Volver</button></div>
    <h2>Usar una carta</h2><p class="muted">Cartas que se pueden usar en cualquier momento.</p>
    ${owners.map(p => `<div class="owner"><div class="pitem">${avatar(p)}<span class="name">${esc(p.name)}</span>${tomatoes(p)}</div>
      <div class="cards">${cardsOf(p, "siempre").map(t => cardHtml(t, "use", "", p.id)).join("")}</div></div>`).join("") || `<p class="muted">Nadie tiene cartas de este tipo.</p>`}
  `, { back: showRound, use: (t, el) => useAnytime(P(el.dataset.owner), t) });
}
function pickPlayer(title, list, then, back) {
  render(`
    <h2>${title}</h2>
    <div class="vgrid">${list.map(o => `<button class="vcard" data-act="ch" data-arg="${o.id}">${avatar(o)}<span>${esc(o.name)}</span></button>`).join("")}</div>
    <div class="grow"></div><button class="btn ghost" data-act="back">Mejor no</button>
  `, { ch: id => then(P(id)), back });
}
function useAnytime(p, t) {
  const others = G.players.filter(o => o.id !== p.id);
  const done = msg => { saveGame(); fanfare(); render(`<div class="grow"></div><div class="banner pop">${cardHtml(t, null, "big")}<h2>${msg}</h2></div><div class="grow"></div><button class="btn" data-act="ok">Volver al juego</button>`, { ok: showRound }); };
  const addActive = (o, txt) => { G.activeP = G.activeP || []; G.activeP.push({ k: uid(), pid: o.id, t: txt, round: G.round }); };
  if (t === "limpieza") {
    if (!p.coal) return toast(`${p.name} no tiene tomatazos.`);
    spend(p, t); p.coal--; if (p.out && (!G.settings.maxCoal || p.coal < G.settings.maxCoal)) p.out = false;
    return done(`${esc(p.name)} se sacó un tomatazo`);
  }
  if (t === "castigo") return pickPlayer(`${esc(p.name)}, ¿a quién castigas?`, others.filter(o => !o.out), o => {
    const opts = shuffle(D.prendasRonda).slice(0, 4);
    render(`<h2>¿Qué prenda de ronda le das a ${esc(o.name)}?</h2><div class="plist">${opts.map((x, k) => `<button class="option" data-act="pr" data-arg="${k}"><span>${esc(x.t)}</span></button>`).join("")}</div><div class="grow"></div><button class="btn ghost" data-act="back">Mejor no</button>`, {
      pr: k => { spend(p, t); addActive(o, opts[k].t); done(`${esc(o.name)} tiene una prenda de ronda`); }, back: anytimeCards
    });
  }, anytimeCards);
  if (t === "silencio") return pickPlayer(`${esc(p.name)}, ¿a quién silencias?`, others.filter(o => !o.out), o => { spend(p, t); addActive(o, "No puede hablar en toda la ronda."); done(`¡Silencio para ${esc(o.name)}!`); }, anytimeCards);
  if (t === "intercambio") return pickPlayer(`${esc(p.name)}, ¿con quién cambias tus cartas?`, others, o => {
    spend(p, t); const a = p.cards; p.cards = o.cards; o.cards = a; done(`${esc(p.name)} y ${esc(o.name)} cambiaron sus cartas`);
  }, anytimeCards);
}
function startVote() {
  if (G.mode === "equipos") return G.settings.vote === "secret" ? teamSecretVote(0, shuffle(G.players.map(p => p.id))) : teamQuickVote();
  if (G.settings.vote === "secret") return secretVote(0, shuffle(G.players.map(p => p.id)));
  if (active().some(p => p.hunch > 0 || p.cards.includes("anulador"))) return hunchDeclare();
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
  if (G.mode === "equipos") return teamScoreboard();
  const list = G.players.slice().sort((a, b) => a.out - b.out || a.coal - b.coal);
  const cards = p => [...p.cards.map(t => D.trampas[t].nombre), p.hunch ? `${p.hunch} presentimiento${p.hunch > 1 ? "s" : ""}` : "", p.retos ? `${p.retos} reto${p.retos > 1 ? "s" : ""}` : ""].filter(Boolean).join(", ") || "Sin cartas";
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
  let sel = null, hunch = false, vcard = null;
  const vcards = [...new Set(cardsOf(voter, "voto"))];
  render(`
    <p class="eyebrow">${esc(voter.name)} vota</p>
    <div class="question" style="font-size:1.4rem">${esc(G.cur.pregunta)}</div>
    ${double ? `<p class="small" style="color:var(--gold)">Tu voto vale doble. Dilo en voz alta antes de votar.</p>` : ""}
    <div class="vgrid">${cands.map(p => `<button class="vcard" data-act="sel" data-arg="${p.id}" aria-pressed="false">${avatar(p)}<span>${esc(p.name)}</span></button>`).join("")}</div>
    ${vcards.length ? `<p class="eyebrow">Tus cartas de votación (puedes usar una)</p><div class="chips">${vcards.map(t => `<button class="chip" data-act="vc" data-arg="${t}" aria-pressed="false"><img src="img/${D.trampas[t].img}.webp" alt=""><span><b>${D.trampas[t].nombre}</b>${esc(D.trampas[t].texto.replace(/ Solo en votación secreta\./, ""))}</span></button>`).join("")}</div>` : ""}
    ${canHunch ? `<button class="hunch" data-act="hunch" aria-pressed="false"><img src="img/carta_presentimiento.webp" alt=""><span><b>Usar presentimiento</b>Creo que me van a votar a mí. Te ${voter.hunch > 1 ? `quedan ${voter.hunch}` : "queda 1"}.</span></button>` : ""}
    <div class="grow"></div>
    <button class="btn" id="ok" data-act="ok" disabled>Elige a alguien</button>
  `, {
    sel: (id, el) => { sel = id; document.querySelectorAll(".vcard").forEach(b => b.setAttribute("aria-pressed", b === el)); const ok = document.getElementById("ok"); ok.disabled = false; ok.textContent = "Votar a " + P(id).name; },
    hunch: (_, el) => { hunch = !hunch; el.setAttribute("aria-pressed", hunch); if (hunch) mystic(); },
    vc: (t, el) => { vcard = vcard === t ? null : t; document.querySelectorAll(".chip").forEach(b => b.setAttribute("aria-pressed", b.dataset.arg === vcard)); if (vcard) mystic(); },
    ok: () => {
      const w = (double ? 2 : 1) * (vcard === "voto_doble" ? 2 : 1);
      G.cur.votes[sel] = (G.cur.votes[sel] || 0) + w;
      (G.cur.ballots = G.cur.ballots || []).push({ from: voter.id, to: sel, w });
      if (hunch) { G.cur.hunch[voter.id] = true; voter.hunch--; }
      const fin = extra => render(`<div class="grow"></div><div class="banner"><h1 class="pop">¡Voto secreto!</h1><p class="muted">${hunch ? "Tu presentimiento quedó guardado. " : ""}${extra || ""}Tapa la pantalla y pasa el celular.</p></div><div class="grow"></div><button class="btn" data-act="n">Siguiente</button>`, { n: done });
      if (!vcard) return fin();
      spend(voter, vcard);
      const fx = G.cur.fx = G.cur.fx || { steal: [], anul: [], mirror: [] };
      if (vcard === "voto_doble") return fin("Tu voto cuenta doble. ");
      if (vcard === "anulador") { fx.anul.push(voter.id); return fin("Anulador activado. "); }
      if (vcard === "espejo") { fx.mirror.push(voter.id); return fin("Espejo activado. "); }
      if (vcard === "voto_robado") return render(`
        <p class="eyebrow">Voto Robado</p><h2>¿De quién robas el voto?</h2><p class="muted">Su voto va a contar para ${esc(P(sel).name)}.</p>
        <div class="vgrid">${G.players.filter(o => o.id !== voter.id).map(o => `<button class="vcard" data-act="st" data-arg="${o.id}">${avatar(o)}<span>${esc(o.name)}</span></button>`).join("")}</div>
      `, { st: id => { fx.steal.push({ thief: voter.id, victim: id, to: sel }); fin(`Le robaste el voto a ${esc(P(id).name)}. `); } });
    }
  });
}
function hunchDeclare() {
  const cands = active().filter(p => p.hunch > 0);
  const anulOwners = active().filter(p => p.cards.includes("anulador"));
  const h = G.cur.hunch, an = {};
  const draw = () => render(`
    <p class="eyebrow">Antes de votar</p>
    ${anulOwners.length ? `<h2>¿Alguien usa el Anulador?</h2><p class="muted">Si queda como el más votado, sus votos se anulan. Si no, pierde la carta igual.</p>
    <div class="vgrid">${anulOwners.map(p => `<button class="vcard" data-act="a" data-arg="${p.id}" aria-pressed="${!!an[p.id]}">${avatar(p)}<span>${esc(p.name)}</span><small class="muted">Anulador</small></button>`).join("")}</div>` : ""}
    ${cands.length ? `<h2>¿Alguien tiene un presentimiento?</h2>` : ""}
    <p class="muted" ${cands.length ? "" : "hidden"}>Quien crea que va a ser el más votado puede usar un presentimiento en voz alta. Si acierta, se salva. Si falla, la próxima ronda empieza con +${PENALTY} votos. Ojo: ahora todos saben que lo usaste.</p>
    ${cands.length ? "" : "<!--"}<div class="vgrid">${cands.map(p => `<button class="vcard" data-act="t" data-arg="${p.id}" aria-pressed="${!!h[p.id]}">${avatar(p)}<span>${esc(p.name)}</span><small class="muted">${p.hunch} disp.</small></button>`).join("")}</div>${cands.length ? "" : "-->"}
    <div class="grow"></div>
    <button class="btn" data-act="go">${Object.keys(h).length ? "Listo, a votar" : "Nadie, a votar"}</button>
  `, {
    t: id => { h[id] ? delete h[id] : (h[id] = true, mystic()); draw(); },
    a: id => { an[id] ? delete an[id] : (an[id] = true, mystic()); draw(); },
    go: () => {
      Object.keys(h).forEach(id => P(id).hunch--);
      const ids = Object.keys(an); if (ids.length) { const fx = G.cur.fx = G.cur.fx || { steal: [], anul: [], mirror: [] }; ids.forEach(id => { spend(P(id), "anulador"); fx.anul.push(id); }); }
      saveGame(); quickVote();
    }
  });
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
  const fx = G.cur.fx || { steal: [], anul: [], mirror: [] };
  const notes = [];
  if (!G.cur.fxDone) {
    G.cur.fxDone = true;
    const ballots = G.cur.ballots || [];
    fx.steal.forEach(s => {
      const b = ballots.find(x => x.from === s.victim && !x.stolen);
      if (!b) return notes.push(`${P(s.thief).name} quiso robar el voto de ${P(s.victim).name}, pero no votó.`);
      v[b.to] -= b.w; v[s.to] = (v[s.to] || 0) + b.w; b.to = s.to; b.stolen = true;
      notes.push(`Alguien le robó el voto a ${P(s.victim).name}.`);
    });
    fx.mirror.forEach(h => {
      const hits = ballots.filter(b => b.to === h && P(b.from) && !P(b.from).out);
      hits.forEach(b => v[b.from] = (v[b.from] || 0) + 1);
      notes.push(`¡Espejo de ${P(h).name}! ${hits.length ? `Sus ${hits.length} votante${hits.length > 1 ? "s" : ""} recibe${hits.length > 1 ? "n" : ""} un voto cada uno.` : "Nadie lo votó."}`);
    });
  }
  let list = active().map(p => ({ p, n: (v[p.id] || 0) + p.penalty, pen: p.penalty })).sort((a, b) => b.n - a.n);
  const topN = list[0] ? list[0].n : 0;
  fx.anul.forEach(id => {
    const x = list.find(y => y.p.id === id); if (!x) return;
    if (x.n === topN && topN > 0) { x.n = 0; x.anul = true; notes.push(`¡${x.p.name} usó el Anulador y sus votos no cuentan!`); }
    else notes.push(`${x.p.name} usó el Anulador, pero no era el más votado.`);
  });
  fx.anul = [];
  list.sort((a, b) => b.n - a.n);
  const max = list[0] ? list[0].n : 0;
  if (!max && !list.some(x => x.anul)) {
    Object.keys(hunch).forEach(id => P(id).hunch++); G.cur.hunch = {};
    toast("Nadie recibió votos. Vamos de nuevo."); return startVote();
  }
  // los votos de castigo se cobran una sola vez
  list.forEach(x => { x.p.votes += v[x.p.id] || 0; x.p.penalty = 0; });
  const top = max ? list.filter(x => x.n === max).map(x => x.p) : [];
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

  const shown = list.filter(x => x.n > 0 || x.anul).slice(0, 8);
  render(`
    <p class="eyebrow">Resultado</p>
    <h2>${esc(G.cur.pregunta)}</h2>
    <div class="bars">${shown.map(x => `<div class="bar ${x.n === max ? "top" : ""}">${avatar(x.p)}<div class="track"><div class="fill" data-w="${max ? (x.n / max) * 100 : 0}"></div><div class="lbl"><span>${esc(x.p.name)}${hunch[x.p.id] ? ` <img class="mini" src="img/carta_presentimiento.webp" alt="usó presentimiento">` : ""}</span><span>${x.anul ? "anulado" : x.n}${x.pen ? ` <small>(+${x.pen})</small>` : ""}</span></div></div></div>`).join("")}</div>
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
    notes.forEach(t => html += `<div class="note pop"><span>${esc(t)}</span></div>`);
    if (saved.length) { mystic(); html += `<div class="note good pop"><img src="img/carta_presentimiento.webp" alt=""><span><b>¡${names(saved)} lo ${saved.length > 1 ? "vieron" : "vio"} venir!</b> Usó su presentimiento y se salva.</span></div>`; }
    if (failed.length) html += `<div class="note bad pop"><img src="img/carta_presentimiento.webp" alt=""><span><b>${names(failed)} falló el presentimiento.</b> La próxima ronda empieza con +${PENALTY} votos.</span></div>`;
    if (!accusedGroup.length) html += `<div class="banner pop"><h2>¡Nadie paga esta ronda!</h2></div><button class="btn" data-act="skip">Continuar</button>`;
    else if (accusedGroup.length > 1) { beep(330, 0.3, "sawtooth"); html += `<div class="banner pop"><h2>¡Empate!</h2><p class="muted">${names(accusedGroup).replace(/, | y /g, " vs ")}</p></div><button class="btn gold" data-act="duel">¡Al duelo!</button>`; }
    else { if (!saved.length) fanfare(); html += `<div class="banner pop"><h2>${saved.length ? "Le toca a " : "¡"}${esc(accusedGroup[0].name)}${saved.length ? "" : "!"}</h2></div><button class="btn" data-act="acc">Continuar</button>`; }
    el.innerHTML = html;
  }, 1300);
}

// ---------- duelos ----------
// Duelos en el celular. "dos": pantalla dividida, solo para 2. "turnos" y "bomba": pasando el celular, para 2 o más.
const DUELOS_CEL = {
  reflejos: { tipo: "dos", nombre: "Reflejos", texto: "Pongan el celular en la mesa entre los dos. Cuando la franja del medio se ponga verde, toquen su lado. Si tocan antes, pierden." },
  toques: { tipo: "dos", nombre: "Carrera de toques", texto: "Pongan el celular en la mesa entre los dos. Cuando empiece, toquen su lado lo más rápido posible durante 5 segundos." },
  tira: { tipo: "dos", nombre: "Tira y afloja", texto: "Celular en la mesa entre los dos. Cada toque tira la cuerda hacia tu lado. Gana quien se quede con toda la pantalla." },
  colores: { tipo: "dos", nombre: "Colores trampa", texto: "En el medio aparecen nombres de colores pintados de otro color. Toquen su lado solo cuando la palabra y el color coincidan. Si tocas mal, pierdes." },
  distinto: { tipo: "dos", nombre: "¿Cuál es distinto?", texto: "Cada uno tiene la misma grilla de dibujos. Hay uno distinto: el primero que lo toca gana. Si tocas uno equivocado, pierdes." },
  memoria: { tipo: "turnos", nombre: "Memoria", texto: "Por turnos, cada uno mira una secuencia de colores y la repite. Cada vez es más larga. Pierde quien recuerde la secuencia más corta." },
  cronometro: { tipo: "turnos", nombre: "Cronómetro ciego", texto: "Por turnos: toca «Iniciar», cuenta 7 segundos en tu cabeza y toca «Parar». Pierde quien quede más lejos de 7 segundos." },
  pulso: { tipo: "turnos", nombre: "Pulso firme", texto: "Por turnos: mantén el dedo sobre el círculo mientras se mueve. Si lo sueltas o te sales, termina tu turno. Pierde quien menos aguante." },
  mimica: { tipo: "turnos", nombre: "Mímica rápida", texto: "Por turnos: el celular te muestra una palabra en secreto y la actúas para el grupo, sin hablar. Pierde quien tarde más en que se la adivinen." },
  bomba: { tipo: "bomba", nombre: "Bomba de tiempo", texto: "Se pasan el celular. Quien lo tiene toca «Pasar» y se lo da al siguiente. En algún momento explota: pierde quien la tenga en la mano." }
};
function duel(ids, ctx, force) {
  const ps = ids.map(P);
  const two = ps.length === 2;
  const cel = Object.keys(DUELOS_CEL).filter(k => two || DUELOS_CEL[k].tipo !== "dos");
  const fisicos = D.duelosFisicos.filter(f => two || !f.max);
  const useCel = force ? !!DUELOS_CEL[force] : Math.random() < (two ? 0.6 : 0.45);
  const kind = useCel ? (force || pick(cel)) : null;
  const info = kind ? DUELOS_CEL[kind] : (force ? D.duelosFisicos.find(f => f.nombre === force) : pick(fisicos));
  render(`
    <p class="eyebrow">Duelo${kind ? " en el celular" : ""}</p>
    <h1>${esc(info.nombre)}</h1>
    <div class="row" style="justify-content:center">${ps.map(p => `<div class="banner">${avatar(p, "lg")}<b>${esc(p.name)}</b></div>`).join("")}</div>
    <p>${esc(info.texto)}</p>
    <div class="grow"></div>
    <button class="btn gold" data-act="go">¡Empezar!</button>
  `, {
    go: () => {
      if (!kind) return physicalDuel(ps, info, ctx);
      ({ reflejos: reflexDuel, toques: tapDuel, tira: ropeDuel, colores: colorDuel, distinto: oddDuel, bomba: bombDuel }[kind] || ((a, c) => turnDuel(a, kind, c)))(ps, ctx);
    }
  });
}

// --- pantalla dividida (2 jugadores) ---
function ropeDuel(ps, ctx) {
  duelBoard(ps, "Preparados…");
  const dz = document.getElementById("dz");
  let pos = 0, on = false; const WIN = 12;
  const draw = () => dz.style.gridTemplateRows = `${50 - pos * 3.6}fr auto ${50 + pos * 3.6}fr`;
  [0, 1].forEach(i => document.getElementById("h" + i).addEventListener("pointerdown", () => {
    if (!on) return;
    pos += i === 0 ? -1 : 1; draw(); beep(i ? 520 : 440, 0.03, "square", 0.04);
    if (Math.abs(pos) >= WIN) { on = false; const loser = pos < 0 ? 1 : 0; document.getElementById("mid").textContent = `¡${ps[1 - loser].name} gana!`; fanfare(); later(() => duelEnd(ps, ps[loser].id, ctx), 1200); }
  }));
  ["3", "2", "1"].forEach((t, k) => later(() => { document.getElementById("mid").textContent = t; beep(520); }, k * 800));
  later(() => { on = true; document.getElementById("mid").textContent = "¡TIREN!"; beep(1100, 0.2); }, 2400);
}
function colorDuel(ps, ctx) {
  const C = [["ROJO", "#ff5a4e"], ["AZUL", "#3d7bff"], ["VERDE", "#3bd16f"], ["AMARILLO", "#e6b800"], ["VIOLETA", "#a066ff"]];
  duelBoard(ps, "Atentos…");
  const mid = document.getElementById("mid"); mid.style.background = "#fff"; mid.style.fontSize = "2.4rem";
  let match = false, done = false, n = 0;
  const end = (loser, msg) => { if (done) return; done = true; clearTimers(); mid.textContent = msg; later(() => duelEnd(ps, ps[loser].id, ctx), 1300); };
  [0, 1].forEach(i => document.getElementById("h" + i).addEventListener("pointerdown", () => {
    if (done || !n) return;
    if (match) { fanfare(); end(1 - i, `¡${ps[i].name} acertó!`); } else { beep(200, 0.4, "sawtooth"); end(i, `¡${ps[i].name} se equivocó!`); }
  }));
  const step = () => {
    n++;
    match = n > 3 && Math.random() < 0.3;
    const w = pick(C); const c = match ? w : pick(C.filter(x => x !== w));
    mid.textContent = w[0]; mid.style.color = c[1];
    later(step, Math.max(650, 1100 - n * 25));
  };
  later(step, 1200);
}
function oddDuel(ps, ctx) {
  const pairs = [["🐶", "🐱"], ["🍋", "🍌"], ["⭐", "🌟"], ["🚗", "🚕"], ["🌲", "🌵"], ["😎", "🤓"], ["🍎", "🍅"], ["🐸", "🐢"], ["🎈", "🎀"], ["🦊", "🐻"]];
  const [a, b] = pick(pairs); const N = 20; const odd = rnd(N);
  const grid = `<div class="odd">${Array.from({ length: N }, (_, k) => `<button data-k="${k}">${k === odd ? b : a}</button>`).join("")}</div>`;
  render(`<div class="duel" id="dz">
    <div class="half p1" id="h0"><div><small>${esc(ps[0].name)}</small>${grid}</div></div>
    <div class="mid" id="mid">¡Busquen el distinto!</div>
    <div class="half p2" id="h1"><div><small>${esc(ps[1].name)}</small>${grid}</div></div></div>`);
  let done = false;
  [0, 1].forEach(i => document.getElementById("h" + i).addEventListener("pointerdown", e => {
    const t = e.target.closest("[data-k]"); if (!t || done) return; done = true;
    const ok = +t.dataset.k === odd; t.classList.add(ok ? "hit" : "miss");
    ok ? fanfare() : beep(200, 0.4, "sawtooth");
    document.getElementById("mid").textContent = ok ? `¡${ps[i].name} lo encontró!` : `¡${ps[i].name} se equivocó!`;
    later(() => duelEnd(ps, ps[ok ? 1 - i : i].id, ctx), 1300);
  }));
}

// --- bomba (2 o más, pasando el celular) ---
function bombDuel(ps, ctx) {
  let i = rnd(ps.length), exploded = false;
  const fuse = 9000 + rnd(12000), t0 = Date.now();
  const draw = () => {
    const cur = ps[i], next = ps[(i + 1) % ps.length];
    render(`
      <div class="grow"></div>
      <div class="banner"><p class="eyebrow">Tiene la bomba</p>${avatar(cur, "xl shake")}<h1>${esc(cur.name)}</h1></div>
      <div class="bomb pop">💣</div>
      <div class="grow"></div>
      <button class="btn" data-act="pass">¡Pasar a ${esc(next.name)}!</button>
    `, { pass: () => { if (exploded) return; i = (i + 1) % ps.length; draw(); } });
    tickTock();
    later(boom, Math.max(0, fuse - (Date.now() - t0)));
  };
  const tickTock = () => { const el = Date.now() - t0; beep(el > fuse * 0.7 ? 1000 : 700, 0.05, "square", 0.06); later(tickTock, el > fuse * 0.7 ? 220 : 480); };
  const boom = () => {
    exploded = true; clearTimers();
    [90, 70, 50].forEach((f, k) => setTimeout(() => beep(f, 0.4, "sawtooth", 0.25), k * 120));
    if (navigator.vibrate) navigator.vibrate([300, 80, 300]);
    render(`<div class="grow"></div><div class="banner"><div class="bomb boom">💥</div><h1>¡BUM!</h1><p class="muted">Explotó en las manos de ${esc(ps[i].name)}.</p></div><div class="grow"></div><button class="btn" data-act="ok">Continuar</button>`, { ok: () => duelEnd(ps, ps[i].id, ctx) });
  };
  draw();
}

// --- por turnos (2 o más, pasando el celular) ---
function turnDuel(ps, kind, ctx, orig = ps) {
  const info = DUELOS_CEL[kind]; const scores = {};
  const lowerWins = kind === "cronometro" || kind === "mimica";
  const fmt = v => kind === "memoria" ? `${v} colores` : kind === "pulso" ? `${v.toFixed(1)} s` : kind === "cronometro" ? `${v.toFixed(2)} s de error` : `${v.toFixed(1)} s`;
  const next = k => {
    if (k >= ps.length) return finish();
    const p = ps[k];
    render(`
      <p class="eyebrow">${esc(info.nombre)} · turno ${k + 1} de ${ps.length}</p>
      <div class="grow"></div>
      <div class="banner"><p class="eyebrow">Pásale el celular a</p>${avatar(p, "xl pop")}<h1>${esc(p.name)}</h1></div>
      <div class="grow"></div>
      <button class="btn gold" data-act="go">Soy ${esc(p.name)}, ¡listo!</button>
    `, { go: () => TURNOS[kind](p, v => { scores[p.id] = v; next(k + 1); }) });
  };
  const finish = () => {
    const vals = ps.map(p => scores[p.id]);
    const worst = lowerWins ? Math.max(...vals) : Math.min(...vals);
    const losers = ps.filter(p => scores[p.id] === worst);
    const sorted = ps.slice().sort((a, b) => lowerWins ? scores[a.id] - scores[b.id] : scores[b.id] - scores[a.id]);
    render(`
      <p class="eyebrow">${esc(info.nombre)}</p><h2>Resultados</h2>
      <div class="plist">${sorted.map(p => `<div class="pitem">${avatar(p)}<span class="name">${esc(p.name)}</span><b>${fmt(scores[p.id])}</b></div>`).join("")}</div>
      ${losers.length > 1 ? `<p class="muted">Empate en el último lugar: desempatan ${names(losers)}.</p>` : ""}
      <div class="grow"></div>
      <button class="btn" data-act="ok">${losers.length > 1 ? "Desempate" : "Continuar"}</button>
    `, { ok: () => losers.length > 1 ? turnDuel(losers, kind, ctx, orig) : duelEnd(orig, losers[0].id, ctx) });
  };
  next(0);
}
const TURNOS = {
  cronometro(p, done) {
    let t0 = 0;
    render(`
      <p class="eyebrow">${esc(p.name)}</p><div class="grow"></div>
      <h1 style="text-align:center">Cuenta 7 segundos</h1><p class="muted" style="text-align:center">Toca «Iniciar», cuenta en tu cabeza y toca «Parar» cuando creas que pasaron 7 segundos.</p>
      <div class="grow"></div><button class="btn gold" data-act="go" id="cb">Iniciar</button>
    `, {
      go: (_, b) => {
        if (!t0) { t0 = performance.now(); b.textContent = "Parar"; b.classList.remove("gold"); return; }
        const t = (performance.now() - t0) / 1000, err = Math.abs(t - 7);
        render(`<div class="grow"></div><div class="banner pop"><p class="eyebrow">${esc(p.name)}</p><h1>${t.toFixed(2)} s</h1><p class="muted">${err < 0.3 ? "¡Casi perfecto!" : err < 1 ? "Muy cerca." : "Lejos…"} ${err.toFixed(2)} s de diferencia.</p></div><div class="grow"></div><button class="btn" data-act="ok">Siguiente</button>`, { ok: () => done(err) });
      }
    });
  },
  memoria(p, done) {
    const cols = ["#ff5a4e", "#3d7bff", "#3bd16f", "#ffcf4a"], tones = [330, 440, 554, 659];
    const seq = []; let pos = 0, input = false;
    render(`
      <p class="eyebrow">${esc(p.name)} · Memoria</p>
      <h2 id="mm" style="text-align:center">Mira…</h2>
      <div class="simon">${cols.map((c, k) => `<button data-k="${k}" style="background:${c}" aria-label="Color ${k + 1}"></button>`).join("")}</div>
      <div class="grow"></div>
    `);
    const pads = [...document.querySelectorAll(".simon button")];
    const flash = k => { pads[k].classList.add("lit"); beep(tones[k], 0.3, "sine", 0.15); setTimeout(() => pads[k].classList.remove("lit"), 320); };
    const round = () => {
      seq.push(rnd(4)); pos = 0; input = false;
      document.getElementById("mm").textContent = `Mira… (${seq.length})`;
      seq.forEach((k, j) => later(() => flash(k), 700 + j * 600));
      later(() => { input = true; document.getElementById("mm").textContent = "¡Repite!"; }, 700 + seq.length * 600);
    };
    pads.forEach((b, k) => b.addEventListener("pointerdown", () => {
      if (!input) return; flash(k);
      if (k !== seq[pos]) {
        input = false; beep(150, 0.5, "sawtooth"); const score = seq.length - 1;
        later(() => render(`<div class="grow"></div><div class="banner pop"><p class="eyebrow">${esc(p.name)}</p><h1>${score} colores</h1><p class="muted">Se equivocó en la secuencia de ${seq.length}.</p></div><div class="grow"></div><button class="btn" data-act="ok">Siguiente</button>`, { ok: () => done(score) }), 600);
        return;
      }
      if (++pos === seq.length) { input = false; if (seq.length >= 20) return done(20); later(round, 700); }
    }));
    seq.push(rnd(4), rnd(4)); round();
  },
  pulso(p, done) {
    render(`<div class="pulse-area" id="pa"><p class="eyebrow">${esc(p.name)} · Pulso firme</p><p id="pm">Pon el dedo en el círculo</p><div class="dot" id="dot"></div><div class="count" id="pt"></div></div>`);
    const area = document.getElementById("pa"), dot = document.getElementById("dot");
    let x = 0.5, y = 0.55, vx = 0, vy = 0, holding = false, t0 = 0, over = false, raf;
    const place = () => { dot.style.left = (x * 100) + "%"; dot.style.top = (y * 100) + "%"; };
    place();
    const R = () => dot.offsetWidth * 0.75;
    const stop = () => {
      if (over) return; over = true; cancelAnimationFrame(raf); beep(200, 0.4, "sawtooth");
      const t = holding ? (performance.now() - t0) / 1000 : 0;
      render(`<div class="grow"></div><div class="banner pop"><p class="eyebrow">${esc(p.name)}</p><h1>${t.toFixed(1)} s</h1><p class="muted">Aguantó ${t.toFixed(1)} segundos.</p></div><div class="grow"></div><button class="btn" data-act="ok">Siguiente</button>`, { ok: () => done(t) });
    };
    const loop = () => {
      const el = (performance.now() - t0) / 1000, sp = 0.0009 + el * 0.00012;
      vx += (Math.random() - 0.5) * sp * 2; vy += (Math.random() - 0.5) * sp * 2;
      vx *= 0.97; vy *= 0.97; x += vx; y += vy;
      if (x < 0.12 || x > 0.88) vx = -vx, x = Math.min(0.88, Math.max(0.12, x));
      if (y < 0.2 || y > 0.85) vy = -vy, y = Math.min(0.85, Math.max(0.2, y));
      place(); document.getElementById("pt").textContent = el.toFixed(1);
      if (el >= 30) return stop();
      raf = requestAnimationFrame(loop);
    };
    dot.addEventListener("pointerdown", e => { if (holding || over) return; holding = true; t0 = performance.now(); dot.classList.add("held"); document.getElementById("pm").textContent = "¡No lo sueltes!"; try { dot.releasePointerCapture(e.pointerId); } catch {} raf = requestAnimationFrame(loop); });
    area.addEventListener("pointermove", e => { if (!holding) return; const r = dot.getBoundingClientRect(); if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) > R()) stop(); });
    area.addEventListener("pointerup", () => holding && stop());
    area.addEventListener("pointercancel", () => holding && stop());
  },
  mimica(p, done) {
    const word = pick(D.mimica);
    render(`<p class="eyebrow">${esc(p.name)} · Mímica</p><div class="grow"></div><h2 style="text-align:center">Que nadie más mire la pantalla</h2><div class="grow"></div><button class="btn gold" data-act="see">Ver mi palabra</button>`, {
      see: () => render(`<p class="eyebrow">${esc(p.name)}, tu palabra es</p><div class="grow"></div><div class="prenda pop" style="font-size:2rem">${esc(word)}</div><div class="grow"></div><button class="btn" data-act="go">¡Empezar la mímica!</button>`, {
        go: () => {
          const t0 = performance.now();
          render(`<p class="eyebrow">${esc(p.name)} actúa</p><div class="grow"></div><div class="count" id="mt" style="text-align:center">0.0</div><p class="muted" style="text-align:center">Sin hablar. El grupo adivina en voz alta.</p><div class="grow"></div><button class="btn gold" data-act="ok">¡Adivinado!</button><button class="btn ghost" data-act="give">Nadie lo adivina (60 s)</button>`, {
            ok: () => fin((performance.now() - t0) / 1000), give: () => fin(60)
          });
          const tk = () => { const t = (performance.now() - t0) / 1000; const el = document.getElementById("mt"); if (!el) return; el.textContent = t.toFixed(1); if (t >= 60) return fin(60); later(tk, 100); };
          tk();
          const fin = t => render(`<div class="grow"></div><div class="banner pop"><p class="eyebrow">${esc(p.name)} · era «${esc(word)}»</p><h1>${t >= 60 ? "Nadie lo adivinó" : t.toFixed(1) + " s"}</h1></div><div class="grow"></div><button class="btn" data-act="ok">Siguiente</button>`, { ok: () => done(Math.min(60, t)) });
        }
      })
    });
  }
};
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
  if (ps.length >= 2 && !ctx.noRev && loser.cards.includes("revancha")) {
    return render(`
      <div class="grow"></div>
      <div class="banner">${avatar(loser, "lg shake")}<h2>${esc(loser.name)} pierde el duelo…</h2><p class="muted">Pero tiene una carta de Revancha.</p></div>
      ${cardHtml("revancha", null, "big pop")}
      <div class="grow"></div>
      <button class="btn gold" data-act="rev">¡Usar Revancha!</button>
      <button class="btn ghost" data-act="no">Aceptar la derrota</button>
    `, {
      rev: () => { spend(loser, "revancha"); saveGame(); fanfare(); duel(ps.map(p => p.id), { ...ctx, noRev: false }); },
      no: () => duelEnd(ps, loserId, { ...ctx, noRev: true })
    });
  }
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
  const p = P(id); p.accused++;
  if (G.cur.accRound !== G.round) { G.prevAccused = G.lastAccused; G.lastAccused = id; G.cur.accRound = G.round; }
  G.cur.freeDuel = Math.random() < 0.25; // a veces el reto a duelo es gratis
  saveGame();
  showAccused(p);
}
function showAccused(p) {
  const jury = G.players.length - 1;
  const retoFree = G.cur.freeDuel, canReto = (retoFree || (p.retos || 0) > 0) && active().length > 1;
  render(`
    <p class="eyebrow" style="text-align:center">Le toca a</p>
    <div class="banner">${avatar(p, "xl shake")}<h1>${esc(p.name)}</h1><p class="muted">${esc(G.cur.pregunta)}</p></div>
    ${cardsOf(p, "prenda").length ? `<p class="eyebrow">Cartas de ${esc(p.name)}</p><div class="cards">${cardsOf(p, "prenda").map(t => cardHtml(t, canUse(t, p) ? "use" : null)).join("")}</div>` : ""}
    <div class="grow"></div>
    <p class="eyebrow">¿Cómo te defiendes?</p>
    <button class="option" data-act="def">
      <span><b>Discurso de defensa</b>
      20 segundos para convencer al grupo. Más de la mitad (${Math.floor(jury / 2) + 1} de ${jury}): <em class="ok">te salvas</em>. Menos de un tercio: <em class="ko">1 tomatazo seguro</em> y la prenda.</span>
    </button>
    ${canReto ? `<button class="option reto" data-act="reto">
      <img src="img/carta_reto.webp" alt="">
      <span><b>Retar a duelo ${retoFree ? `<i class="tag">¡Gratis esta ronda!</i>` : `<i class="tag">Te ${p.retos > 1 ? `quedan ${p.retos}` : "queda 1"}</i>`}</b>
      Eliges a un rival. Si ganas, <em class="ok">la prenda pasa a él</em>. Si pierdes, <em class="ko">1 tomatazo seguro</em> y la prenda.</span>
    </button>` : ""}
    <button class="btn" data-act="accept">Aceptar la prenda</button>
  `, {
    use: t => useCard(p, t),
    def: () => defense(p),
    reto: () => chooseRival(p, retoFree),
    accept: () => punish(p.id, 0)
  });
}
function chooseRival(p, free) {
  const list = active().filter(o => o.id !== p.id);
  render(`
    <p class="eyebrow">Reto a duelo</p><h2>${esc(p.name)}, ¿a quién retas?</h2>
    <div class="vgrid">${list.map(o => `<button class="vcard" data-act="ch" data-arg="${o.id}">${avatar(o)}<span>${esc(o.name)}</span></button>`).join("")}</div>
    <div class="grow"></div><button class="btn ghost" data-act="back">Mejor no</button>
  `, {
    back: () => showAccused(p),
    ch: id => {
      const r = P(id);
      if (!free) p.retos--;
      G.cur.freeDuel = false; saveGame(); fanfare();
      render(`
        <div class="grow"></div>
        <div class="banner pop"><img src="img/carta_reto.webp" alt="" style="width:150px;border-radius:14px"><h1>¡${esc(p.name)} reta a ${esc(r.name)}!</h1>
        <p class="muted">Si gana ${esc(p.name)}, la prenda es para ${esc(r.name)}. Si gana ${esc(r.name)}, ${esc(p.name)} recibe un tomatazo seguro y además hace la prenda.</p></div>
        <div class="grow"></div><button class="btn gold" data-act="go">¡Al duelo!</button>
      `, { go: () => duel([p.id, r.id], { giveCard: false, onLoser: l => { if (l !== p.id) p.retoWins = (p.retoWins || 0) + 1; punish(l, l === p.id ? 1 : 0); } }) });
    }
  });
}
function defense(p, lawyer) {
  let secs = 20;
  const sp = lawyer || p;
  render(`
    <p class="eyebrow" style="text-align:center">${lawyer ? `Abogado defensor de ${esc(p.name)}` : "Defensa"}</p>
    <div class="banner">${avatar(sp, "lg")}<h2>${esc(sp.name)}, convence al grupo</h2><p class="muted">${esc(G.cur.pregunta)}</p></div>
    <div class="grow"></div>
    <div class="count" id="tm" style="text-align:center">20</div>
    <div class="grow"></div>
    <button class="btn" data-act="end">Terminé</button>
  `, { end: () => juryVote(p, lawyer) });
  const t = () => {
    const el = document.getElementById("tm"); if (!el) return;
    el.textContent = secs > 0 ? secs : "¡Tiempo!";
    if (secs <= 3 && secs > 0) beep(700);
    if (secs-- > 0) later(t, 1000); else { beep(300, 0.5, "sawtooth"); later(() => juryVote(p, lawyer), 900); }
  };
  t();
}
function juryVote(p, lawyer) {
  const jury = G.players.length - 1 - (lawyer ? 1 : 0); let n = 0;
  const draw = () => render(`
    <p class="eyebrow" style="text-align:center">Veredicto</p>
    <div class="banner">${avatar(lawyer || p, "lg")}<h2>¿Los convenció ${esc((lawyer || p).name)}?</h2>
    <p class="muted">Levanten la mano los que le creen. Cuenta las manos.</p></div>
    <div class="bigcounter"><button data-act="dn" aria-label="Menos">−</button><b>${n}</b><span>de ${jury}</span><button data-act="up" aria-label="Más">+</button></div>
    <div class="grow"></div>
    <button class="btn" data-act="go">Ver veredicto</button>
  `, {
    up: () => { n = Math.min(jury, n + 1); draw(); },
    dn: () => { n = Math.max(0, n - 1); draw(); },
    go: () => {
      if (n * 2 > jury) {
        (lawyer || p).defWins = ((lawyer || p).defWins || 0) + 1; saveGame(); fanfare();
        return render(`<div class="grow"></div><div class="banner pop">${avatar(p, "xl")}<h1>¡Absuelto!</h1><p class="muted">${n} de ${jury} le creyeron. ${esc(p.name)} se salva.</p></div><div class="grow"></div><button class="btn" data-act="ok">Continuar</button>`, { ok: afterRound });
      }
      const bad = n * 3 < jury;
      beep(200, 0.5, "sawtooth");
      if (lawyer && bad) { lawyer.coal++; if (G.settings.maxCoal && lawyer.coal >= G.settings.maxCoal) lawyer.out = true; saveGame(); }
      render(`<div class="grow"></div><div class="banner pop">${avatar(p, "xl shake")}<h1>${bad ? "¡Defensa desastrosa!" : "No alcanzó"}</h1><p class="muted">Solo ${n} de ${jury} le creyeron. ${bad ? `Un tomatazo seguro y además la prenda.${lawyer ? ` El abogado ${esc(lawyer.name)} también se lleva un tomatazo.` : ""}` : "Le toca la prenda."}</p></div><div class="grow"></div><button class="btn" data-act="ok">A la prenda</button>`, { ok: () => punish(p.id, bad ? 1 : 0) });
    }
  });
  draw();
}
function canUse(t, p) {
  if (t === "robo") return G.players.some(o => o.id !== p.id && o.cards.length);
  if (["rebote", "papa", "complice", "abogado", "doble_nada"].includes(t)) return active().length > 1;
  return true;
}
const spend = (p, t) => p.cards.splice(p.cards.indexOf(t), 1);
const cardsOf = (p, cuando) => p.cards.filter(t => D.trampas[t] && D.trampas[t].cuando === cuando);
function chooseOther(p, t, filter, then) {
  const list = G.players.filter(o => o.id !== p.id && filter(o));
  render(`
    <p class="eyebrow">${esc(D.trampas[t].nombre)}</p><h2>${{ robo: "¿A quién le robas?", complice: "¿Quién es tu cómplice?", abogado: "¿Quién te defiende?" }[t] || "¿A quién le pasas la prenda?"}</h2>
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
    spend(p, t); return reveal(`¡Vuela hacia ${esc(target.name)}!`, () => punish(target.id, 0));
  }
  if (t === "papa") return chooseOther(p, t, o => !o.out, v => { spend(p, t); reveal(`${esc(p.name)} se salva y le pasa la papa caliente a ${esc(v.name)}`, () => punish(v.id, 0)); });
  if (t === "complice") return chooseOther(p, t, o => !o.out, c => { spend(p, t); saveGame(); punish(p.id, 0, { partner: c.id }); });
  if (t === "abogado") return chooseOther(p, t, o => !o.out, l => { spend(p, t); saveGame(); defense(p, l); });
  if (t === "light") { spend(p, t); saveGame(); return punish(p.id, 0, { light: true }); }
  if (t === "ruleta") {
    spend(p, t); saveGame();
    const pool = active(), chosen = pick(pool);
    render(`<div class="grow"></div><div class="banner"><img class="spin" src="img/carta_ruleta.webp" alt="" style="width:140px;border-radius:14px"><p class="eyebrow">La ruleta gira…</p><div id="rl">${avatar(pool[0], "xl")}</div><h1 id="rn"></h1></div><div class="grow"></div><button class="btn" id="rb" data-act="ok" hidden>A la prenda</button>`, { ok: () => punish(chosen.id, 0) });
    let k = 0; const steps = 16 + rnd(6);
    const spinStep = () => {
      const q = k < steps ? pool[k % pool.length] : chosen;
      document.getElementById("rl").innerHTML = avatar(q, "xl"); document.getElementById("rn").textContent = q.name; beep(500 + (k % 5) * 80, 0.04, "square", 0.05);
      if (k++ < steps) later(spinStep, 70 + k * 12); else { fanfare(); document.getElementById("rb").hidden = false; }
    };
    return spinStep();
  }
  if (t === "doble_nada") {
    const prev = G.prevAccused && P(G.prevAccused);
    const rival = prev && !prev.out && prev.id !== p.id ? prev : pick(active().filter(o => o.id !== p.id));
    spend(p, t); saveGame();
    return reveal(`¡${esc(p.name)} se juega todo contra ${esc(rival.name)}!`, () => duel([p.id, rival.id], { giveCard: false, onLoser: l => l === rival.id ? giveTomato(rival, 2, `Perdió el Doble o Nada contra ${p.name}`) : punish(p.id, 2) }));
  }
  if (t === "robo") return chooseOther(p, t, o => o.cards.length > 0, v => {
    const s = pick(v.cards); v.cards.splice(v.cards.indexOf(s), 1); spend(p, t); p.cards.push(s); saveGame(); fanfare();
    render(`<div class="grow"></div><div class="banner pop"><p class="eyebrow">${esc(p.name)} le robó a ${esc(v.name)}</p>${cardHtml(s, null, "big")}</div><div class="grow"></div><button class="btn" data-act="ok">Volver</button>`, { ok: () => showAccused(p) });
  });
}

// ---------- prendas y tomatazos ----------
// Mazos de prendas: cada prenda sale una sola vez hasta que se usan todas; recién ahí se vuelve a mezclar.
function prendasActivas(kind) {
  if (kind === "light") return D.prendasLight.map(t => ({ t }));
  const base = kind === "ronda" ? D.prendasRonda : (kind === "grupo" ? D.prendasGrupo : D.prendas).map(t => ({ t }));
  const all = [...base, ...custom.prendas[kind].map(t => ({ t }))];
  const on = all.filter(x => !custom.off.includes(x.t));
  if (!on.length && kind === "ronda") return []; // se pueden apagar todas las de ronda
  return on.length ? on : all;
}
function drawPrenda(kind) {
  const src = prendasActivas(kind);
  G.decks = G.decks || {};
  let deck = G.decks[kind];
  const ok = new Set(src.map(x => x.t));
  if (deck) while (deck.length && !ok.has(deck[deck.length - 1])) deck.pop(); // quita las que se desactivaron
  if (!deck || !deck.length) deck = G.decks[kind] = shuffle(src.map(x => x.t));
  const t = deck.pop(); saveGame();
  return src.find(x => x.t === t) || { t };
}
// sure: tomatazos seguros por haber perdido una apuesta (defensa desastrosa o reto perdido).
// Cumplir la prenda no da tomatazo; no cumplirla, uno más.
function punish(id, sure = 0, opt = {}) {
  const p = P(id), partner = opt.partner && P(opt.partner);
  const ronda = !opt.light && !partner && prendasActivas("ronda").length > 0 && Math.random() < 0.4;
  const pr = drawPrenda(opt.light ? "light" : ronda ? "ronda" : "normal");
  const tom = n => n === 1 ? "1 tomatazo" : `${n} tomatazos`;
  render(`
    <div class="banner">${partner ? `<div class="row" style="justify-content:center">${avatar(p, "lg")}${avatar(partner, "lg")}</div><h2>${esc(p.name)} y ${esc(partner.name)}, les toca:</h2>` : `${avatar(p, "lg")}<h2>${esc(p.name)}, te toca:</h2>`}</div>
    ${opt.light ? `<p class="eyebrow" style="text-align:center">Prenda Light: sin tomatazo pase lo que pase</p>` : ""}
    ${ronda ? `<p class="eyebrow" style="text-align:center">Prenda de ronda: se cumple durante toda la próxima ronda</p>` : ""}
    <div class="prenda pop">${esc(pr.t)}</div>
    <div class="rules-mini">
      ${sure ? `<span>Por perder la apuesta: <b class="ko">${tom(sure)} seguro${sure > 1 ? "s" : ""}</b></span>` : ""}
      <span>${ronda ? "Si la aceptas" : "Si la cumples"}: <b class="ok">${sure ? "nada más" : "te salvas del tomatazo"}</b></span>
      <span>${ronda ? "Si no la aceptas" : "Si no la cumples"}: <b class="ko">${opt.light ? "tampoco hay tomatazo" : partner ? "+1 tomatazo para quien la hizo peor" : "+1 tomatazo"}</b></span>
      ${ronda ? `<span>Si la rompes durante la ronda: <b class="ko">+1 tomatazo</b></span>` : ""}
    </div>
    <div class="grow"></div>
    ${opt.changed ? `<p class="small muted" style="text-align:center">Ya se cambió la prenda una vez.</p>` : `<button class="btn gold" data-act="other">Cambiar prenda (una sola vez)</button>`}
    <div class="row"><button class="btn ghost" data-act="fail">No la ${ronda ? "acepta" : "cumplió"}</button><button class="btn" data-act="done">${ronda ? "¡Acepto!" : "¡Hecho!"}</button></div>
  `, {
    other: () => punish(id, sure, { ...opt, changed: true }),
    fail: () => {
      if (opt.light) { toast("Prenda Light: sin tomatazo."); return afterRound(); }
      if (partner) return pickPlayer("¿Quién la hizo peor? Decide el grupo", [p, partner], w => giveTomato(w, (w === p ? sure : 0) + 1, `${w.name} la hizo peor`), () => punish(id, sure, opt));
      giveTomato(p, sure + 1, `${p.name} no ${ronda ? "aceptó" : "cumplió"} la prenda`);
    },
    done: () => {
      p.done = (p.done || 0) + 1;
      if (ronda) { G.activeP = G.activeP || []; G.activeP.push({ k: uid(), pid: p.id, t: pr.t, voto2: !!pr.voto2, round: G.round + 1 }); }
      saveGame();
      if (sure) return giveTomato(p, sure, "Por perder la apuesta");
      fanfare();
      render(`<div class="grow"></div><div class="banner pop">${avatar(p, "xl")}<h1>¡Cumplió!</h1><p class="muted">${partner ? `${esc(p.name)} y ${esc(partner.name)} hicieron la prenda y se salvan del tomatazo.` : `${esc(p.name)} ${ronda ? "aceptó la prenda de ronda" : "hizo la prenda"} y se salva del tomatazo.`}${ronda ? " Ojo: si la rompe, tomatazo." : ""}</p></div><div class="grow"></div><button class="btn" data-act="ok">Siguiente ronda</button>`, { ok: afterRound });
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
  if (G.mode === "equipos") return nextRound();
  const zero = active().filter(p => !G.cur.votes[p.id]);
  if (Math.random() < 0.35 && active().length) {
    const lucky = pick(zero.length ? zero : active());
    const roll = Math.random();
    const isHunch = G.settings.hunch > 0 && roll < 0.25, isReto = !isHunch && roll < 0.45;
    const t = isHunch ? "presentimiento" : isReto ? "reto" : pick(Object.keys(D.trampas));
    isHunch ? lucky.hunch++ : isReto ? (lucky.retos = (lucky.retos || 0) + 1) : lucky.cards.push(t);
    saveGame(); fanfare();
    return render(`
      <p class="eyebrow" style="text-align:center">Golpe de suerte</p>
      <div class="banner">${avatar(lucky, "lg pop")}<h2>¡${isHunch ? "Un presentimiento extra" : isReto ? "Un reto a duelo" : "Carta trampa"} para ${esc(lucky.name)}!</h2></div>
      ${cardHtml(t, null, "big pop")}
      <p class="small muted" style="text-align:center">${isHunch ? "Lo puede usar al votar." : isReto ? "Lo puede usar cuando le toque la prenda." : "La puede usar cuando le toque la prenda."}</p>
      <div class="grow"></div><button class="btn" data-act="ok">Siguiente ronda</button>
    `, { ok: nextRound });
  }
  nextRound();
}

// ---------- final ----------
function finalScreen() {
  if (G.mode === "equipos") return teamFinal();
  const ps = G.players.slice();
  const top = f => ps.slice().sort((a, b) => f(b) - f(a))[0];
  const best = ps.slice().sort((a, b) => a.out - b.out || a.coal - b.coal || a.votes - b.votes)[0];
  const hit = top(p => p.coal), sus = top(p => p.votes), duelist = top(p => p.duelWins), seer = top(p => p.hunchHits), lawyer = top(p => p.defWins || 0), retador = top(p => p.retoWins || 0);
  const award = (p, t, d) => `<div class="award">${avatar(p)}<div><b>${t}</b><span>${esc(p.name)} · ${d}</span></div></div>`;
  del(KEY_GAME); fanfare();
  render(`
    <p class="eyebrow" style="text-align:center">Fin de la partida</p>
    <div class="banner">${avatar(best, "xl pop")}<h1>${esc(best.name)}</h1><p class="muted">El Intocable: el que menos tomatazos recibió.</p></div>
    <div class="podium">
      ${hit.coal ? award(hit, "El Más Tomateado", `${hit.coal} tomatazos`) : ""}
      ${sus.votes ? award(sus, "El Más Sospechoso", `${sus.votes} votos en total`) : ""}
      ${seer.hunchHits ? award(seer, "El Adivino", `${seer.hunchHits} presentimiento${seer.hunchHits === 1 ? "" : "s"} acertado${seer.hunchHits === 1 ? "" : "s"}`) : ""}
      ${duelist.duelWins ? award(duelist, "El Duelista", `${duelist.duelWins} duelo${duelist.duelWins === 1 ? "" : "s"} ganado${duelist.duelWins === 1 ? "" : "s"}`) : ""}
      ${lawyer.defWins ? award(lawyer, "El Abogado", `${lawyer.defWins} defensa${lawyer.defWins === 1 ? "" : "s"} ganada${lawyer.defWins === 1 ? "" : "s"}`) : ""}
      ${retador.retoWins ? award(retador, "El Retador", `${retador.retoWins} reto${retador.retoWins === 1 ? "" : "s"} ganado${retador.retoWins === 1 ? "" : "s"}`) : ""}
    </div>
    <div class="grow"></div>
    <button class="btn" data-act="again">Revancha</button>
    <button class="btn ghost" data-act="home">Inicio</button>
  `, { again: () => { newGame(); nextRound(); }, home: () => { G = null; home(); } });
}


// ---------- prendas y preguntas: elegir y agregar ----------
const TABS = [["normal", "Prendas"], ["ronda", "De ronda"], ["grupo", "De equipo"], ["sit", "Situaciones"], ["preg", "Preguntas propias"]];
function contentScreen(tab) {
  const tabs = `<div class="seg tabs">${TABS.map(([k, l]) => `<button data-act="tab" data-arg="${k}" aria-pressed="${tab === k}">${l}</button>`).join("")}</div>`;
  const addBox = (ph, act) => `<div class="add"><div class="line"><input type="text" id="nw" placeholder="${ph}" maxlength="140" autocomplete="off" enterkeyhint="done"></div><button class="btn gold sm" style="width:100%" data-act="${act}">Agregar</button></div>`;
  const acts = { _keep: true, back: home, tab: t => { window.scrollTo(0, 0); contentScreen(t); } };
  let body = "";
  if (["normal", "ronda", "grupo"].includes(tab)) {
    const base = tab === "ronda" ? D.prendasRonda.map(x => x.t) : tab === "grupo" ? D.prendasGrupo : D.prendas;
    const mine = custom.prendas[tab];
    const all = [...mine.map(t => ({ t, mine: true })), ...base.map(t => ({ t }))];
    const on = all.filter(x => !custom.off.includes(x.t)).length;
    body = `
      <p class="muted">${tab === "ronda" ? "Se cumplen durante toda la ronda siguiente." : tab === "grupo" ? "Las hace todo el equipo en el modo por equipos." : "Las hace el acusado en el momento."} <b>${on} de ${all.length} activas.</b></p>
      ${addBox(tab === "grupo" ? "Nueva prenda para un equipo" : "Nueva prenda", "add")}
      <div class="row"><button class="btn ghost sm" data-act="all" data-arg="1">Activar todas</button><button class="btn ghost sm" data-act="all" data-arg="0">Desactivar todas</button></div>
      <div class="tlist">${all.map((x, i) => `<div class="trow"><button class="tog" data-act="tg" data-arg="${i}" aria-pressed="${!custom.off.includes(x.t)}"><span class="box"></span><span>${esc(x.t)}${x.mine ? ` <i class="tag">Propia</i>` : ""}</span></button>${x.mine ? `<button class="x" data-act="del" data-arg="${i}" aria-label="Borrar">✕</button>` : ""}</div>`).join("")}</div>`;
    Object.assign(acts, {
      tg: i => { const t = all[i].t; custom.off = custom.off.includes(t) ? custom.off.filter(x => x !== t) : [...custom.off, t]; saveCustom(); contentScreen(tab); },
      del: i => { custom.prendas[tab] = mine.filter(t => t !== all[i].t); custom.off = custom.off.filter(x => x !== all[i].t); saveCustom(); contentScreen(tab); },
      all: v => { const ts = all.map(x => x.t); custom.off = v === "1" ? custom.off.filter(x => !ts.includes(x)) : [...new Set([...custom.off, ...ts])]; saveCustom(); contentScreen(tab); },
      add: () => { const el = document.getElementById("nw"); let t = el.value.trim(); if (!t) return el.focus(); if (!/[.!?»]$/.test(t)) t += "."; if (all.some(x => x.t === t)) return toast("Esa prenda ya existe."); custom.prendas[tab] = [t, ...mine]; saveCustom(); fanfare(); contentScreen(tab); }
    });
  } else if (tab === "sit") {
    const on = D.situaciones.filter(x => !custom.offSit.includes(x.id)).length;
    body = `
      <p class="muted">Cada situación trae 20 preguntas. <b>${on} de ${D.situaciones.length} activas.</b></p>
      <div class="row"><button class="btn ghost sm" data-act="all" data-arg="1">Activar todas</button><button class="btn ghost sm" data-act="all" data-arg="0">Desactivar todas</button></div>
      <div class="tlist">${D.situaciones.map((x, i) => `<div class="trow"><button class="tog sit" data-act="tg" data-arg="${i}" aria-pressed="${!custom.offSit.includes(x.id)}"><span class="box"></span><img src="img/${x.id}.webp" alt=""><span>${esc(x.titulo)}</span></button></div>`).join("")}</div>`;
    Object.assign(acts, {
      tg: i => { const id = D.situaciones[i].id; custom.offSit = custom.offSit.includes(id) ? custom.offSit.filter(x => x !== id) : [...custom.offSit, id]; saveCustom(); contentScreen(tab); },
      all: v => { custom.offSit = v === "1" ? [] : D.situaciones.map(x => x.id); saveCustom(); contentScreen(tab); }
    });
  } else {
    const sec = (k, titulo, ph) => `
      <h3>${titulo}</h3>
      <div class="add"><div class="line"><input type="text" id="nw_${k}" placeholder="${ph}" maxlength="140" autocomplete="off"></div><button class="btn gold sm" style="width:100%" data-act="add" data-arg="${k}">Agregar</button></div>
      <div class="tlist">${custom.preguntas[k].map((q, i) => `<div class="trow"><span class="qtext">${esc(q)}</span><button class="x" data-act="del" data-arg="${k}:${i}" aria-label="Borrar">✕</button></div>`).join("") || `<p class="small muted">Todavía no hay preguntas propias.</p>`}</div>`;
    body = `<p class="muted">Se mezclan con las preguntas de las situaciones.</p>
      ${sec("indiv", "Para jugar individual", "¿Quién…? Ej: ¿Quién llegaría tarde a su boda?")}
      ${sec("grupo", "Para jugar por equipos", "¿Qué equipo…? Ej: ¿Qué equipo ganaría un concurso de baile?")}`;
    Object.assign(acts, {
      add: k => { const el = document.getElementById("nw_" + k); let q = el.value.trim(); if (!q) return el.focus(); if (!q.startsWith("¿")) q = "¿" + q; if (!q.endsWith("?")) q += "?"; custom.preguntas[k] = [q, ...custom.preguntas[k]]; saveCustom(); fanfare(); contentScreen(tab); },
      del: a => { const [k, i] = a.split(":"); custom.preguntas[k].splice(+i, 1); saveCustom(); contentScreen(tab); }
    });
  }
  render(`
    <div class="topbar"><button class="btn ghost sm" data-act="back">← Listo</button></div>
    <h2>Prendas y preguntas</h2>
    ${tabs}
    ${body}
  `, acts);
  const nw = document.getElementById("nw"); if (nw) nw.addEventListener("keydown", e => { if (e.key === "Enter") actions.add(); });
}

// ---------- equipos: armado ----------
const TEAM_NAMES = ["Los Tomates", "Los Dragones", "Las Llamas", "Los Ninjas", "Los Piratas"];
function ensureTeams() {
  if (!teams || !teams.length) teams = [0, 1].map(i => ({ id: uid(), name: TEAM_NAMES[i], members: [] }));
  const ids = new Set(players.map(p => p.id));
  teams.forEach(t => t.members = t.members.filter(id => ids.has(id)));
}
function teamsError() {
  ensureTeams();
  if (teams.length < 2) return "Hacen falta al menos 2 equipos.";
  const bad = teams.find(t => t.members.length < 2 || t.members.length > 3);
  if (bad) return `«${bad.name}» tiene que tener 2 o 3 jugadores.`;
  return "";
}
function teamSummary() {
  ensureTeams();
  const err = teamsError();
  return err ? `Falta armar los equipos: ${esc(err)}` : teams.map(t => `${esc(t.name)} (${t.members.length})`).join(" · ");
}
function teamsScreen(sel) {
  ensureTeams(); sel = Math.min(sel, teams.length - 1);
  const teamOf = id => teams.findIndex(t => t.members.includes(id));
  const err = teamsError();
  render(`
    <div class="topbar"><button class="btn ghost sm" data-act="back">← Listo</button><span class="pill">${teams.length} de 5 equipos</span></div>
    <h2>Armar equipos</h2>
    <p class="muted">Elige un equipo y toca a los jugadores para sumarlos o sacarlos. Cada equipo: 2 o 3 jugadores. Quien no tenga equipo vota, pero no lo pueden votar.</p>
    <div class="teams">${teams.map((t, i) => `
      <div class="team ${i === sel ? "sel" : ""}" data-act="sel" data-arg="${i}">
        <div class="tname"><input type="text" id="tn${i}" value="${esc(t.name)}" maxlength="20" aria-label="Nombre del equipo">${teams.length > 2 ? `<button class="x" data-act="rmt" data-arg="${i}" aria-label="Quitar equipo">✕</button>` : ""}</div>
        <div class="tmem">${t.members.map(id => { const p = players.find(x => x.id === id); return p ? `${avatar(p)}` : ""; }).join("") || `<span class="small muted">Sin jugadores</span>`}</div>
        <span class="small ${t.members.length >= 2 && t.members.length <= 3 ? "muted" : "warn"}">${t.members.length} jugador${t.members.length === 1 ? "" : "es"}</span>
      </div>`).join("")}
      ${teams.length < 5 ? `<button class="team add-team" data-act="addt">+ Agregar equipo</button>` : ""}
    </div>
    <p class="eyebrow">Jugadores · toca para sumar a «${esc(teams[sel].name)}»</p>
    <div class="vgrid">${players.map(p => { const ti = teamOf(p.id); return `<button class="vcard" data-act="tp" data-arg="${p.id}" aria-pressed="${ti === sel}">${avatar(p)}<span>${esc(p.name)}</span><small class="muted">${ti >= 0 ? esc(teams[ti].name) : "Sin equipo"}</small></button>`; }).join("")}</div>
    ${err ? `<p class="small warn">${esc(err)}</p>` : ""}
    <div class="grow"></div>
    <button class="btn" data-act="back">${err ? "Volver" : "Listo"}</button>
  `, {
    _keep: true,
    back: setup,
    sel: i => teamsScreen(+i),
    addt: () => { teams.push({ id: uid(), name: TEAM_NAMES.find(n => !teams.some(t => t.name === n)) || "Equipo " + (teams.length + 1), members: [] }); saveTeams(); teamsScreen(teams.length - 1); },
    rmt: i => { teams.splice(+i, 1); saveTeams(); teamsScreen(0); },
    tp: id => {
      const t = teams[sel];
      if (t.members.includes(id)) t.members = t.members.filter(x => x !== id);
      else { if (t.members.length >= 3) return toast("Máximo 3 jugadores por equipo."); teams.forEach(o => o.members = o.members.filter(x => x !== id)); t.members.push(id); }
      saveTeams(); teamsScreen(sel);
    }
  });
  teams.forEach((t, i) => {
    const el = document.getElementById("tn" + i);
    el.addEventListener("click", e => e.stopPropagation());
    el.addEventListener("focus", () => { if (i !== sel) { teamsScreen(i); const again = document.getElementById("tn" + i); again.focus(); again.select(); } });
    el.addEventListener("change", () => { t.name = el.value.trim() || TEAM_NAMES[i] || "Equipo " + (i + 1); saveTeams(); });
  });
}

// ---------- partida por equipos ----------
const T = id => G.teams.find(t => t.id === id);
const activeTeams = () => G.teams.filter(t => !t.out);
const teamOfPlayer = pid => G.teams.find(t => t.members.includes(pid));
const teamFaces = t => `<div class="tfaces">${t.members.map(id => P(id) ? avatar(P(id)) : "").join("")}</div>`;
const teamCard = (t, act) => `<button class="vcard tcard2" ${act ? `data-act="${act}" data-arg="${t.id}"` : ""} aria-pressed="false">${teamFaces(t)}<span>${esc(t.name)}</span></button>`;
const teamTomatoes = t => `<span class="coals">${Array.from({ length: t.coal }, () => `<img src="img/tomate.webp" alt="tomatazo">`).join("")}</span>`;

function teamSecretVote(i, order) {
  if (i >= order.length) return teamResults();
  const v = P(order[i]);
  render(`
    <div class="topbar"><span class="pill">Voto ${i + 1} de ${order.length}</span></div>
    <div class="grow"></div>
    <div class="banner"><p class="eyebrow">Pásale el celular a</p>${avatar(v, "xl pop")}<h1>${esc(v.name)}</h1></div>
    <div class="grow"></div>
    <button class="btn" data-act="me">Soy ${esc(v.name)}, votar</button>
    <button class="btn ghost sm" style="width:100%" data-act="skip">No está, saltar</button>
  `, { me: () => teamBallot(v, () => teamSecretVote(i + 1, order)), skip: () => teamSecretVote(i + 1, order) });
}
function teamBallot(voter, done) {
  const mine = teamOfPlayer(voter.id);
  const cands = activeTeams().filter(t => t !== mine);
  let sel = null;
  render(`
    <p class="eyebrow">${esc(voter.name)} vota${mine ? ` · juega en ${esc(mine.name)}` : ""}</p>
    <div class="question" style="font-size:1.4rem">${esc(G.cur.pregunta)}</div>
    <div class="vgrid teamgrid">${cands.map(t => teamCard(t, "sel")).join("")}</div>
    <div class="grow"></div>
    <button class="btn" id="ok" data-act="ok" disabled>Elige un equipo</button>
  `, {
    sel: (id, el) => { sel = id; document.querySelectorAll(".vcard").forEach(b => b.setAttribute("aria-pressed", b === el)); const ok = document.getElementById("ok"); ok.disabled = false; ok.textContent = "Votar a " + T(id).name; },
    ok: () => { G.cur.votes[sel] = (G.cur.votes[sel] || 0) + 1; render(`<div class="grow"></div><div class="banner"><h1 class="pop">¡Voto secreto!</h1><p class="muted">Tapa la pantalla y pasa el celular.</p></div><div class="grow"></div><button class="btn" data-act="n">Siguiente</button>`, { n: done }); }
  });
}
function teamQuickVote() {
  const v = G.cur.votes;
  const draw = () => {
    const total = Object.values(v).reduce((a, b) => a + b, 0);
    render(`
      <p class="eyebrow">Votación rápida por equipos</p>
      <div class="question" style="font-size:1.4rem">${esc(G.cur.pregunta)}</div>
      <p class="small muted">A la cuenta de tres, todos señalan a un equipo que no sea el suyo. Anota los votos de cada equipo.</p>
      <div class="vgrid teamgrid">${activeTeams().map(t => `<div class="vcard tcard2">${teamFaces(t)}<span>${esc(t.name)}</span><div class="counter"><button data-act="dn" data-arg="${t.id}" aria-label="Quitar voto">−</button><b>${v[t.id] || 0}</b><button data-act="up" data-arg="${t.id}" aria-label="Sumar voto">+</button></div></div>`).join("")}</div>
      <div class="grow"></div>
      <button class="btn" data-act="ok" ${total ? "" : "disabled"}>Ver resultado (${total} votos)</button>
    `, { _keep: true, up: id => { v[id] = (v[id] || 0) + 1; draw(); }, dn: id => { v[id] = Math.max(0, (v[id] || 0) - 1); draw(); }, ok: teamResults });
  };
  draw();
}
function teamResults() {
  const v = G.cur.votes;
  const list = activeTeams().map(t => ({ t, n: v[t.id] || 0 })).sort((a, b) => b.n - a.n);
  const max = list[0] ? list[0].n : 0;
  if (!max) { toast("Nadie recibió votos. Vamos de nuevo."); return startVote(); }
  list.forEach(x => x.t.votes += x.n);
  const top = list.filter(x => x.n === max).map(x => x.t);
  saveGame();
  render(`
    <p class="eyebrow">Resultado</p>
    <h2>${esc(G.cur.pregunta)}</h2>
    <div class="bars">${list.filter(x => x.n > 0).map(x => `<div class="bar ${x.n === max ? "top" : ""}">${teamFaces(x.t)}<div class="track"><div class="fill" data-w="${(x.n / max) * 100}"></div><div class="lbl"><span>${esc(x.t.name)}</span><span>${x.n}</span></div></div></div>`).join("")}</div>
    <div class="grow"></div>
    <div id="verdict" class="verdict"></div>
  `, {
    duel: () => {
      const reps = top.map(t => pick(t.members.filter(id => P(id))));
      render(`<p class="eyebrow">Desempate</p><h2>Cada equipo manda a un representante</h2>
        <div class="vgrid">${reps.map(id => `<div class="vcard">${avatar(P(id))}<span>${esc(P(id).name)}</span><small class="muted">${esc(teamOfPlayer(id).name)}</small></div>`).join("")}</div>
        <div class="grow"></div><button class="btn gold" data-act="go">¡Al duelo!</button>`,
        { go: () => duel(reps, { giveCard: false, noRev: true, onLoser: id => teamAccused(teamOfPlayer(id)) }) });
    },
    acc: () => teamAccused(top[0])
  });
  drumroll(1100);
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll(".fill").forEach(f => f.style.width = f.dataset.w + "%")));
  later(() => {
    const el = document.getElementById("verdict");
    if (top.length > 1) { beep(330, 0.3, "sawtooth"); el.innerHTML = `<div class="banner pop"><h2>¡Empate!</h2><p class="muted">${top.map(t => esc(t.name)).join(" vs ")}</p></div><button class="btn gold" data-act="duel">Desempatar</button>`; }
    else { fanfare(); el.innerHTML = `<div class="banner pop"><h2>¡${esc(top[0].name)}!</h2></div><button class="btn" data-act="acc">Continuar</button>`; }
  }, 1300);
}
function teamAccused(t) {
  t.accused++; saveGame();
  const jury = G.players.length - t.members.length;
  render(`
    <p class="eyebrow" style="text-align:center">Le toca al equipo</p>
    <div class="banner">${teamFaces(t)}<h1>${esc(t.name)}</h1><p class="muted">${esc(G.cur.pregunta)}</p></div>
    <div class="grow"></div>
    <p class="eyebrow">¿Cómo se defienden?</p>
    <button class="option" data-act="def"><span><b>Discurso del equipo</b>30 segundos para convencer a los demás. Más de la mitad (${Math.floor(jury / 2) + 1} de ${jury}): <em class="ok">se salvan</em>. Menos de un tercio: <em class="ko">1 tomatazo seguro</em> y la prenda.</span></button>
    <button class="btn" data-act="accept">Aceptar la prenda de equipo</button>
  `, { def: () => teamDefense(t), accept: () => teamPunish(t, 0) });
}
function teamDefense(t) {
  let secs = 30;
  render(`
    <p class="eyebrow" style="text-align:center">Defensa del equipo</p>
    <div class="banner">${teamFaces(t)}<h2>${esc(t.name)}, convenzan al resto</h2><p class="muted">${esc(G.cur.pregunta)}</p></div>
    <div class="grow"></div><div class="count" id="tm" style="text-align:center">30</div><div class="grow"></div>
    <button class="btn" data-act="end">Terminamos</button>
  `, { end: () => teamJury(t) });
  const tk = () => { const el = document.getElementById("tm"); if (!el) return; el.textContent = secs > 0 ? secs : "¡Tiempo!"; if (secs <= 3 && secs > 0) beep(700); if (secs-- > 0) later(tk, 1000); else { beep(300, 0.5, "sawtooth"); later(() => teamJury(t), 900); } };
  tk();
}
function teamJury(t) {
  const jury = G.players.length - t.members.length; let n = 0;
  const draw = () => render(`
    <p class="eyebrow" style="text-align:center">Veredicto</p>
    <div class="banner">${teamFaces(t)}<h2>¿Los convenció ${esc(t.name)}?</h2><p class="muted">Levanten la mano los que les creen (los del equipo no votan).</p></div>
    <div class="bigcounter"><button data-act="dn" aria-label="Menos">−</button><b>${n}</b><span>de ${jury}</span><button data-act="up" aria-label="Más">+</button></div>
    <div class="grow"></div><button class="btn" data-act="go">Ver veredicto</button>
  `, {
    up: () => { n = Math.min(jury, n + 1); draw(); }, dn: () => { n = Math.max(0, n - 1); draw(); },
    go: () => {
      if (n * 2 > jury) { t.defWins++; saveGame(); fanfare(); return render(`<div class="grow"></div><div class="banner pop">${teamFaces(t)}<h1>¡Absueltos!</h1><p class="muted">${n} de ${jury} les creyeron. ${esc(t.name)} se salva.</p></div><div class="grow"></div><button class="btn" data-act="ok">Siguiente ronda</button>`, { ok: nextRound }); }
      const bad = n * 3 < jury; beep(200, 0.5, "sawtooth");
      render(`<div class="grow"></div><div class="banner pop">${teamFaces(t)}<h1>${bad ? "¡Defensa desastrosa!" : "No alcanzó"}</h1><p class="muted">Solo ${n} de ${jury} les creyeron. ${bad ? "Un tomatazo seguro y además la prenda." : "Les toca la prenda."}</p></div><div class="grow"></div><button class="btn" data-act="ok">A la prenda</button>`, { ok: () => teamPunish(t, bad ? 1 : 0) });
    }
  });
  draw();
}
function teamPunish(t, sure = 0, changed = false) {
  const pr = drawPrenda("grupo");
  render(`
    <div class="banner">${teamFaces(t)}<h2>${esc(t.name)}, les toca:</h2></div>
    <div class="prenda pop">${esc(pr.t)}</div>
    <div class="rules-mini">
      ${sure ? `<span>Por perder la apuesta: <b class="ko">1 tomatazo seguro</b></span>` : ""}
      <span>Si la cumplen: <b class="ok">${sure ? "nada más" : "se salvan del tomatazo"}</b></span>
      <span>Si no la cumplen: <b class="ko">+1 tomatazo para el equipo</b></span>
    </div>
    <div class="grow"></div>
    ${changed ? `<p class="small muted" style="text-align:center">Ya se cambió la prenda una vez.</p>` : `<button class="btn gold" data-act="other">Cambiar prenda (una sola vez)</button>`}
    <div class="row"><button class="btn ghost" data-act="fail">No la cumplieron</button><button class="btn" data-act="done">¡Hecho!</button></div>
  `, {
    other: () => teamPunish(t, sure, true),
    fail: () => teamTomato(t, sure + 1, `${t.name} no cumplió la prenda`),
    done: () => {
      t.done++; saveGame();
      if (sure) return teamTomato(t, sure, "Por perder la apuesta");
      fanfare();
      render(`<div class="grow"></div><div class="banner pop">${teamFaces(t)}<h1>¡Cumplieron!</h1><p class="muted">${esc(t.name)} hizo la prenda y se salva del tomatazo.</p></div><div class="grow"></div><button class="btn" data-act="ok">Siguiente ronda</button>`, { ok: nextRound });
    }
  });
}
function teamTomato(t, n, why) {
  t.coal += n;
  const max = G.settings.maxCoal, out = max && t.coal >= max && !t.out;
  if (out) t.out = true;
  saveGame(); beep(180, 0.5, "sawtooth");
  render(`
    <div class="grow"></div>
    <div class="banner"><img class="pop splat" src="img/tomate.webp" alt="Tomatazo">
    <h2>¡${n > 1 ? n + " tomatazos" : "Tomatazo"} para ${esc(t.name)}!</h2><p class="muted">${esc(why)}.</p>${teamTomatoes(t)}
    ${out ? `<p class="prenda">¡${esc(t.name)} queda fuera! Sus jugadores siguen votando.</p>` : max ? `<p class="muted">Con ${max} tomatazos el equipo queda fuera.</p>` : ""}</div>
    <div class="grow"></div><button class="btn" data-act="ok">Siguiente ronda</button>
  `, { ok: nextRound });
}
function teamScoreboard() {
  const list = G.teams.slice().sort((a, b) => a.out - b.out || a.coal - b.coal);
  render(`
    <div class="topbar"><button class="btn ghost sm" data-act="back">← Volver</button></div>
    <h2>Tomatazos por equipo</h2>
    <div class="plist">${list.map(t => `<div class="pitem">${teamFaces(t)}<span class="name">${esc(t.name)}${t.out ? " · fuera" : ""}<br><span class="small muted">${t.done} prenda${t.done === 1 ? "" : "s"} cumplida${t.done === 1 ? "" : "s"}</span></span>${teamTomatoes(t)}</div>`).join("")}</div>
  `, { back: gameMenu });
}
function teamFinal() {
  const list = G.teams.slice().sort((a, b) => a.out - b.out || a.coal - b.coal || a.votes - b.votes);
  const best = list[0];
  const top = f => G.teams.slice().sort((a, b) => f(b) - f(a))[0];
  const hit = top(t => t.coal), sus = top(t => t.votes), law = top(t => t.defWins);
  const award = (t, ti, d) => `<div class="award">${teamFaces(t)}<div><b>${ti}</b><span>${esc(t.name)} · ${d}</span></div></div>`;
  del(KEY_GAME); fanfare();
  render(`
    <p class="eyebrow" style="text-align:center">Fin de la partida</p>
    <div class="banner pop">${teamFaces(best)}<h1>${esc(best.name)}</h1><p class="muted">El equipo intocable: el que menos tomatazos recibió.</p></div>
    <div class="plist">${list.map((t, i) => `<div class="pitem"><b class="rank">${i + 1}</b>${teamFaces(t)}<span class="name">${esc(t.name)}</span>${teamTomatoes(t)}</div>`).join("")}</div>
    <div class="podium">
      ${hit.coal ? award(hit, "El Más Tomateado", `${hit.coal} tomatazos`) : ""}
      ${sus.votes ? award(sus, "El Más Sospechoso", `${sus.votes} votos en total`) : ""}
      ${law.defWins ? award(law, "Los Abogados", `${law.defWins} defensa${law.defWins === 1 ? "" : "s"} ganada${law.defWins === 1 ? "" : "s"}`) : ""}
    </div>
    <div class="grow"></div>
    <button class="btn" data-act="again">Revancha</button>
    <button class="btn ghost" data-act="home">Inicio</button>
  `, { again: () => { newGame(); nextRound(); }, home: () => { G = null; home(); } });
}

// Solo para pruebas automáticas: abrir con #test
if (location.hash === "#test") window.__qhTest = { duel: (n, kind) => { G = null; players = ["Ana", "Beto", "Caro", "Dani"].slice(0, Math.max(3, n)).map((x, i) => ({ id: "t" + i, name: x, photo: null })); newGame(); G.round = 1; G.cur = drawSituation(); G.cur.votes = {}; G.cur.hunch = {}; duel(G.players.slice(0, n).map(p => p.id), { giveCard: true, onLoser: id => render(`<h1 id="loser">${esc(P(id).name)}</h1>`) }, kind); } };

home();
})();
