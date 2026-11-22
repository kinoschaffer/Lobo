// Prueba de las cartas. Uso: (cd www && python3 -m http.server 8765) y luego: node tests/cartas.js
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:8765/';
process.on('unhandledRejection', e => { console.log(global.__res.join('\n')); console.log('FALLÓ:', e.message.split('\n')[0]); process.exit(1); });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const errs = [], res = global.__res = [];
  const ok = (cond, label, extra = '') => res.push(`${cond ? 'OK ' : 'MAL'} ${label}${extra ? ' — ' + extra : ''}`);
  const newPage = async (vote, cards) => {
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(URL);
    await pg.evaluate(vote => {
      localStorage.clear();
      localStorage.setItem('qh_players_v1', JSON.stringify(['Ana', 'Beto', 'Caro', 'Dani'].map((n, i) => ({ id: 'p' + i, name: n, photo: null }))));
      localStorage.setItem('qh_settings_v2', JSON.stringify({ vote, maxCoal: 0, rounds: 0, hunch: 0 }));
    }, vote);
    await pg.reload(); await pg.click('text=Nueva partida'); await pg.click('text=¡Empezar!');
    await pg.evaluate(cards => { const g = JSON.parse(localStorage.getItem('qh_game_v2')); g.players.forEach((p, i) => p.cards = cards[i] || []); localStorage.setItem('qh_game_v2', JSON.stringify(g)); }, cards);
    await pg.reload(); await pg.click('text=Continuar partida');
    return pg;
  };
  const state = pg => pg.evaluate(() => JSON.parse(localStorage.getItem('qh_game_v2')).players.reduce((o, p) => (o[p.name] = { coal: p.coal, cards: p.cards.join(',') }, o), {}));
  const setRand = (pg, v) => pg.evaluate(v => { window.__r = window.__r || Math.random; Math.random = v === null ? window.__r : () => v; }, v);
  const toNext = async pg => { for (let k = 0; k < 8; k++) { if (await pg.$('text=¡A votar!')) return; for (const l of ['Siguiente ronda', 'Continuar', 'Volver al juego']) { const e = await pg.$('button:has-text("' + l + '")'); if (e) { await e.click(); break; } } await pg.waitForTimeout(250); } };
  const accuseQuick = async (pg, who) => {
    await pg.click('text=¡A votar!');
    if (await pg.$('text=Antes de votar')) await pg.click('[data-act=go]');
    await pg.click(`.vcard:has-text("${who}") [data-act=up]`);
    await pg.click('text=Ver resultado'); await pg.waitForTimeout(1500); await pg.click('#verdict .btn');
    await pg.waitForSelector('text=¿Cómo te defiendes?');
  };
  // el tipo de duelo se elige al mostrar la pantalla del duelo: fijar el azar antes del clic que la abre
  const physicalLoser = async (pg, loser) => { await pg.click('button:has-text("¡Empezar!")'); await pg.waitForSelector('text=¿Quién perdió?'); await pg.click(`.vcard:has-text("${loser}")`); };

  // ---- A. Cartas de votación (secreta) ----
  let pg = await newPage('secret', [['voto_doble'], ['voto_robado'], ['espejo'], ['anulador']]);
  const plan = { Ana: ['Dani', 'voto_doble'], Beto: ['Caro', 'voto_robado'], Caro: ['Dani', 'espejo'], Dani: ['Caro', 'anulador'] };
  await pg.click('text=¡A votar!');
  for (let i = 0; i < 4; i++) {
    const who = (await pg.textContent('h1')).trim(); await pg.click('[data-act=me]');
    const [to, card] = plan[who];
    await pg.click(`.vcard:has-text("${to}")`); await pg.click(`.chip[data-arg=${card}]`); await pg.click('#ok');
    if (card === 'voto_robado') await pg.click('.vcard:has-text("Ana")');
    await pg.click('text=Siguiente');
  }
  await pg.waitForTimeout(1700);
  const bars = (await pg.textContent('.bars')).replace(/\s+/g, ' ');
  const verdict = (await pg.textContent('#verdict')).replace(/\s+/g, ' ');
  ok(/Caro ?4/.test(bars), 'Voto Doble + Voto Robado: Caro suma 4 (1 de Beto + 2 robados de Ana + 1 de Dani)', bars);
  ok(/Ana ?1/.test(bars) && /Beto ?1/.test(bars), 'Espejo de Caro: Ana y Beto reciben 1 voto cada uno');
  ok(verdict.includes('robó el voto a Ana') && verdict.includes('Espejo de Caro') && verdict.includes('Dani usó el Anulador, pero no era'), 'Avisos de cartas de voto', verdict.slice(0, 160));
  ok(verdict.includes('¡Caro!'), 'Le toca a Caro');
  const st = await state(pg); ok(!st.Ana.cards && !st.Beto.cards && !st.Caro.cards && !st.Dani.cards, 'Las 4 cartas de voto se gastaron');
  await pg.close();

  // Anulador en votación rápida: Dani es el más votado y se anula -> le toca a Ana
  pg = await newPage('quick', [[], [], [], ['anulador']]);
  await pg.click('text=¡A votar!'); await pg.click('.vcard:has-text("Dani") >> nth=0'); await pg.click('[data-act=go]');
  for (let i = 0; i < 3; i++) await pg.click('.vcard:has-text("Dani") [data-act=up]');
  await pg.click('.vcard:has-text("Ana") [data-act=up]');
  await pg.click('text=Ver resultado'); await pg.waitForTimeout(1600);
  const v2 = (await pg.textContent('#verdict')).replace(/\s+/g, ' ');
  ok(v2.includes('Dani usó el Anulador y sus votos no cuentan') && v2.includes('¡Ana!'), 'Anulador (votación rápida): Dani se salva y le toca a Ana', v2.slice(0, 120));
  await pg.close();

  // ---- B. Cartas de prenda ----
  pg = await newPage('quick', [['complice', 'light', 'abogado', 'ruleta', 'doble_nada', 'revancha'], [], [], []]);
  let s0 = await state(pg);
  await accuseQuick(pg, 'Ana'); await pg.click('.tcard:has-text("Cómplice")'); await pg.click('.vcard:has-text("Beto")');
  ok((await pg.textContent('h2')).includes('Ana y Beto, les toca'), 'Cómplice: hacen la prenda juntos');
  await pg.click('[data-act=fail]'); await pg.click('.vcard:has-text("Beto")');
  let s1 = await state(pg); ok(s1.Beto.coal === 1 && s1.Ana.coal === 0, 'Cómplice: no la cumplen y el tomatazo va a quien la hizo peor (Beto)');
  await toNext(pg);

  await accuseQuick(pg, 'Ana'); await pg.click('.tcard:has-text("Prenda Light")');
  ok(await pg.$('text=Prenda Light: sin tomatazo') !== null, 'Prenda Light: muestra prenda fácil');
  await pg.click('[data-act=fail]'); s1 = await state(pg); ok(s1.Ana.coal === 0, 'Prenda Light: no cumplirla no da tomatazo');
  await toNext(pg);

  await accuseQuick(pg, 'Ana'); await pg.click('.tcard:has-text("Abogado Defensor")'); await pg.click('.vcard:has-text("Caro")');
  ok((await pg.textContent('h2')).includes('Caro, convence al grupo'), 'Abogado: habla Caro');
  await pg.click('text=Terminé'); await pg.click('text=Ver veredicto');
  ok((await pg.textContent('main')).includes('El abogado Caro también se lleva un tomatazo'), 'Abogado: defensa desastrosa avisa del tomatazo del abogado');
  await pg.click('button:has-text("A la prenda")'); await setRand(pg, 0.9); await setRand(pg, null); await pg.click('[data-act=done]');
  s1 = await state(pg); ok(s1.Caro.coal === 1 && s1.Ana.coal === 1, 'Abogado desastroso: Ana 1 seguro y Caro 1', JSON.stringify({ Ana: s1.Ana.coal, Caro: s1.Caro.coal }));
  await toNext(pg);

  await accuseQuick(pg, 'Ana'); await pg.click('.tcard:has-text("Ruleta")'); await pg.waitForSelector('#rb:not([hidden])', { timeout: 8000 });
  const elegido = await pg.textContent('#rn'); await pg.click('#rb');
  ok((await pg.textContent('h2')).includes(elegido), 'Ruleta: le toca la prenda a ' + elegido);
  await pg.click('[data-act=done]'); await toNext(pg);

  // Doble o nada: el acusado anterior fue Ana misma -> rival al azar. Ana pierde, usa Revancha, y luego pierde el rival
  await accuseQuick(pg, 'Ana'); s0 = await state(pg);
  await pg.click('.tcard:has-text("Doble o Nada")'); const dn = await pg.textContent('h2'); const rival = dn.match(/contra (\w+)/)[1];
  await setRand(pg, 0.99); await pg.click('text=Continuar'); await setRand(pg, null); await physicalLoser(pg, 'Ana');
  ok(await pg.$('text=¡Usar Revancha!') !== null, 'Revancha: aparece al perder el duelo');
  await setRand(pg, 0.99); await pg.click('text=¡Usar Revancha!'); await setRand(pg, null); await physicalLoser(pg, rival);
  await pg.click('text=Continuar').catch(() => {});
  s1 = await state(pg); ok(s1[rival].coal === s0[rival].coal + 2 && s1.Ana.coal === s0.Ana.coal, `Doble o Nada ganado tras Revancha: ${rival} +2, Ana +0`);
  ok(!s1.Ana.cards.includes('revancha') && !s1.Ana.cards.includes('doble_nada'), 'Doble o Nada y Revancha se gastaron');
  await toNext(pg); await pg.close();

  // ---- C. Cartas de cualquier momento ----
  pg = await newPage('quick', [['intercambio'], ['limpieza', 'castigo', 'silencio'], ['escudo', 'robo'], []]);
  await pg.evaluate(() => { const g = JSON.parse(localStorage.getItem('qh_game_v2')); g.players[1].coal = 2; localStorage.setItem('qh_game_v2', JSON.stringify(g)); });
  await pg.reload(); await pg.click('text=Continuar partida');
  ok(await pg.$('text=Usar carta') !== null, 'Botón «Usar carta» en la ronda');
  await pg.click('text=Usar carta'); await pg.click('.tcard[data-arg=limpieza]'); await pg.click('text=Volver al juego');
  s1 = await state(pg); ok(s1.Beto.coal === 1, 'Limpieza: Beto pasa de 2 a 1 tomatazo');
  await pg.click('text=Usar carta'); await pg.click('.tcard[data-arg=castigo]'); await pg.click('.vcard:has-text("Caro")'); await pg.click('[data-act=pr] >> nth=0'); await pg.click('text=Volver al juego');
  await pg.click('text=Usar carta'); await pg.click('.tcard[data-arg=silencio]'); await pg.click('.vcard:has-text("Dani")'); await pg.click('text=Volver al juego');
  const bar = (await pg.textContent('#activebar')).replace(/\s+/g, ' ');
  ok(bar.includes('Caro:') && bar.includes('Dani: No puede hablar'), 'Castigo y Silencio aparecen como prendas activas', bar.slice(0, 120));
  await pg.click('text=Usar carta'); await pg.click('.tcard[data-arg=intercambio]'); await pg.click('.vcard:has-text("Caro")'); await pg.click('text=Volver al juego');
  s1 = await state(pg); ok(s1.Ana.cards === 'escudo,robo' && s1.Caro.cards === '', 'Intercambio: Ana se queda con las cartas de Caro', JSON.stringify({ Ana: s1.Ana.cards, Caro: s1.Caro.cards }));
  await pg.close();

  console.log(res.join('\n'));
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
