// Prueba de regresión: cada camino del acusado y cuántos tomatazos deja.
// Uso: (cd www && python3 -m http.server 8765) y luego: node tests/regresion_acusado.js
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ ...devices['Pixel 7'] })).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(process.env.URL || 'http://localhost:8765/');
  await pg.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('qh_players_v1', JSON.stringify(['Ana', 'Beto', 'Caro', 'Dani', 'Eva'].map((n, i) => ({ id: 'p' + i, name: n, photo: null }))));
    localStorage.setItem('qh_settings_v2', JSON.stringify({ vote: 'quick', maxCoal: 0, rounds: 0, hunch: 0 }));
  });
  await pg.reload();
  await pg.click('text=Nueva partida'); await pg.click('text=¡Empezar!');
  const tomatoes = () => pg.evaluate(() => JSON.parse(localStorage.getItem('qh_game_v2')).players.reduce((o, p) => (o[p.name] = p.coal, o), {}));
  const accuse = async who => {
    await pg.waitForSelector('text=¡A votar!'); await pg.click('text=¡A votar!');
    await pg.click(`.vcard:has-text("${who}") [data-act=up]`);
    await pg.click('text=Ver resultado'); await pg.waitForTimeout(1500); await pg.click('#verdict .btn');
    await pg.waitForSelector('text=¿Cómo te defiendes?');
  };
  // fuerza prenda normal (r=0.9) o de ronda (r=0.1) justo antes de que se elija
  const setRand = v => pg.evaluate(v => { window.__r = window.__r || Math.random; Math.random = v === null ? window.__r : () => v; }, v);
  const prenda = async (kind, action) => {
    await pg.waitForSelector('[data-act=done]', { timeout: 4000 }).catch(async e => { console.log('PANTALLA:', (await pg.textContent('main')).replace(/\s+/g, ' ').slice(0, 300)); throw e; });
    const isRonda = !!(await pg.$('text=Prenda de ronda'));
    const mini = (await pg.textContent('.rules-mini')).replace(/\s+/g, ' ').trim();
    await pg.click(action === 'fail' ? '[data-act=fail]' : '[data-act=done]');
    return { isRonda, mini };
  };
  const toNextRound = async () => { for (let k = 0; k < 8; k++) { if (await pg.$('text=¡A votar!')) return; for (const l of ['Siguiente ronda', 'Continuar']) { const e = await pg.$('text=' + l); if (e) { await e.click(); break; } } await pg.waitForTimeout(250); } };
  const res = [];
  const check = async (label, who, expect, before) => { const t = await tomatoes(); const d = t[who] - (before[who] || 0); res.push(`${d === expect ? 'OK ' : 'MAL'} ${label}: ${who} +${d} (esperado +${expect})`); };

  let before = await tomatoes();
  // 1. Acepta y cumple prenda normal -> 0
  await accuse('Ana'); await setRand(0.9); await pg.click('text=Aceptar la prenda'); await setRand(null);
  let r = await prenda('normal', 'done'); await check('acepta y cumple', 'Ana', 0, before); res.push('   ' + r.mini); await toNextRound();
  // 2. Acepta y NO cumple -> 1
  before = await tomatoes(); await accuse('Beto'); await setRand(0.9); await pg.click('text=Aceptar la prenda'); await setRand(null);
  await prenda('normal', 'fail'); await check('no cumple', 'Beto', 1, before); await toNextRound();
  // 3. Defensa absuelto -> 0
  before = await tomatoes(); await accuse('Caro'); await pg.click('[data-act=def]'); await pg.click('text=Terminé');
  for (let i = 0; i < 3; i++) await pg.click('[data-act=up]'); await pg.click('text=Ver veredicto');
  res.push('   veredicto: ' + await pg.textContent('h1')); await check('defensa absuelto', 'Caro', 0, before); await toNextRound();
  // 4. Defensa en el medio + cumple -> 0
  before = await tomatoes(); await accuse('Dani'); await pg.click('[data-act=def]'); await pg.click('text=Terminé');
  for (let i = 0; i < 2; i++) await pg.click('[data-act=up]'); await setRand(0.9); await pg.click('text=Ver veredicto'); res.push('   veredicto: ' + await pg.textContent('h1'));
  await pg.click('button:has-text("A la prenda")'); await setRand(null); await prenda('normal', 'done'); await check('defensa media + cumple', 'Dani', 0, before); await toNextRound();
  // 5. Defensa desastrosa + cumple -> 1
  before = await tomatoes(); await accuse('Eva'); await pg.click('[data-act=def]'); await pg.click('text=Terminé');
  await setRand(0.9); await pg.click('text=Ver veredicto'); res.push('   veredicto: ' + await pg.textContent('h1'));
  await pg.click('button:has-text("A la prenda")'); await setRand(null); r = await prenda('normal', 'done'); res.push('   ' + r.mini); await check('defensa desastrosa + cumple', 'Eva', 1, before); await toNextRound();
  // 6. Defensa desastrosa + no cumple -> 2
  before = await tomatoes(); await accuse('Eva'); await pg.click('[data-act=def]'); await pg.click('text=Terminé');
  await setRand(0.9); await pg.click('text=Ver veredicto'); await pg.click('button:has-text("A la prenda")'); await setRand(null);
  await prenda('normal', 'fail'); await check('defensa desastrosa + no cumple', 'Eva', 2, before); await toNextRound();
  // 7. Reto ganado -> rival hace prenda y cumple -> 0 para los dos
  const reto = async (who, rival, loser, action) => {
    await accuse(who);
    if (!(await pg.$('[data-act=reto]'))) { res.push(`   (sin reto para ${who})`); await pg.click('text=Aceptar la prenda'); await prenda('normal', 'done'); return false; }
    await pg.click('[data-act=reto]'); await pg.click(`.vcard:has-text("${rival}")`);
    await setRand(0.99); await pg.click('text=¡Al duelo!'); await setRand(null);
    await pg.click('text=¡Empezar!'); await pg.waitForSelector('text=¿Quién perdió?'); await pg.click(`.vcard:has-text("${loser}")`);
    await setRand(0.9); await pg.click('text=Continuar'); await setRand(null);
    r = await prenda('normal', action); res.push('   ' + r.mini); return true;
  };
  before = await tomatoes();
  if (await reto('Ana', 'Beto', 'Beto', 'done')) { await check('reto ganado (rival cumple)', 'Beto', 0, before); await check('reto ganado (retador)', 'Ana', 0, before); }
  await toNextRound();
  // 8. Reto perdido + cumple -> 1
  before = await tomatoes();
  if (await reto('Caro', 'Dani', 'Caro', 'done')) await check('reto perdido + cumple', 'Caro', 1, before);
  await toNextRound();
  // 9. Prenda de ronda aceptada -> 0, luego la rompe -> 1
  before = await tomatoes(); await accuse('Dani'); await setRand(0.1); await pg.click('text=Aceptar la prenda'); await setRand(null);
  r = await prenda('ronda', 'done'); res.push('   ronda: ' + r.isRonda + ' | ' + r.mini); await check('prenda de ronda aceptada', 'Dani', 0, before);
  await toNextRound(); before = await tomatoes();
  await pg.click('[data-broke]'); await check('rompe la prenda de ronda', 'Dani', 1, before);
  console.log(res.join('\n'));
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
