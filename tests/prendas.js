// Prendas: no se repiten hasta agotar el mazo y se pueden cambiar una sola vez.
// Uso: (cd www && python3 -m http.server 8765) y luego: node tests/prendas.js
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ ...devices['Pixel 7'] })).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(URL);
  await pg.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('qh_players_v1', JSON.stringify(['Ana', 'Beto', 'Caro'].map((n, i) => ({ id: 'p' + i, name: n, photo: null }))));
    localStorage.setItem('qh_settings_v2', JSON.stringify({ vote: 'quick', maxCoal: 0, rounds: 0, hunch: 0 }));
  });
  await pg.reload(); await pg.click('text=Nueva partida'); await pg.click('text=¡Empezar!');
  const seen = []; let changeOk = true;
  for (let r = 0; r < 25; r++) {
    await pg.click('text=¡A votar!');
    await pg.click('.vcard:has-text("Ana") [data-act=up]');
    await pg.click('text=Ver resultado'); await pg.waitForTimeout(1400); await pg.click('#verdict .btn');
    await pg.click('text=Aceptar la prenda');
    seen.push(await pg.textContent('.prenda'));
    if (!(await pg.$('text=Cambiar prenda'))) changeOk = false;
    await pg.click('text=Cambiar prenda');
    seen.push(await pg.textContent('.prenda'));
    if (await pg.$('text=Cambiar prenda')) changeOk = false;
    await pg.click('[data-act=done]');
    for (let k = 0; k < 6 && !(await pg.$('text=¡A votar!')); k++) { const e = await pg.$('button:has-text("Siguiente ronda")'); if (e) await e.click(); await pg.waitForTimeout(200); }
  }
  const dup = seen.filter((t, i) => seen.indexOf(t) !== i);
  console.log(`${dup.length ? 'MAL' : 'OK '} ${seen.length} prendas mostradas, repetidas: ${dup.length}${dup.length ? ' → ' + dup.join(' | ') : ''}`);
  console.log(`${changeOk ? 'OK ' : 'MAL'} «Cambiar prenda» aparece una sola vez por prenda`);
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
