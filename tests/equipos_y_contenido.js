// Menú de prendas y preguntas + modo por equipos.
// Uso: (cd www && python3 -m http.server 8765) y luego: node tests/equipos_y_contenido.js
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:8765/';
const res = [];
process.on('unhandledRejection', e => { console.log(res.join('\n')); console.log('FALLÓ:', e.message.split('\n')[0]); process.exit(1); });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const errs = [];
  const ok = (c, l, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${l}${x ? ' — ' + x : ''}`);
  const S = '/tmp/claude-0/-home-user/2ca8692d-badf-58fe-aaba-0ca8e98d88db/scratchpad/shots/eq_';
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(URL);
  await pg.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('qh_players_v1', JSON.stringify(['Ana', 'Beto', 'Caro', 'Dani', 'Eva', 'Fito', 'Gus'].map((n, i) => ({ id: 'p' + i, name: n, photo: null }))));
    localStorage.setItem('qh_settings_v2', JSON.stringify({ vote: 'quick', maxCoal: 2, rounds: 0, hunch: 0, modo: 'indiv' }));
  });
  await pg.reload();

  // ---- Contenido ----
  await pg.click('text=Prendas y preguntas'); await pg.waitForTimeout(300); await pg.screenshot({ path: S + '1content.png' });
  await pg.click('[data-act=all][data-arg="0"]');
  ok((await pg.textContent('main')).includes('0 de 29 activas'), 'Desactivar todas las prendas normales');
  await pg.fill('#nw', 'Haz la voz de un pato durante 10 segundos'); await pg.click('[data-act=add]');
  ok((await pg.textContent('main')).includes('1 de 30 activas') && (await pg.textContent('.tlist')).includes('Propia'), 'Agregar prenda propia (queda activa)');
  await pg.click('[data-act=tab][data-arg=ronda]'); await pg.click('[data-act=all][data-arg="0"]');
  ok((await pg.textContent('main')).includes('0 de 21 activas'), 'Desactivar todas las prendas de ronda');
  await pg.click('[data-act=tab][data-arg=sit]'); await pg.click('[data-act=all][data-arg="0"]'); await pg.click('.tog.sit >> nth=0');
  ok((await pg.textContent('main')).includes('1 de 73 activas'), 'Dejar una sola situación (el dragón)');
  await pg.click('[data-act=tab][data-arg=preg]');
  await pg.fill('#nw_indiv', 'quién se olvidaría su propio cumpleaños'); await pg.click('[data-act=add][data-arg=indiv]');
  await pg.fill('#nw_grupo', '¿Qué equipo ganaría una guerra de almohadas?'); await pg.click('[data-act=add][data-arg=grupo]');
  ok((await pg.textContent('main')).includes('¿quién se olvidaría su propio cumpleaños?'), 'Pregunta propia: agrega ¿ y ?');
  await pg.screenshot({ path: S + '2preguntas.png' });
  await pg.click('text=← Listo');

  // Partida individual: solo dragón o la pregunta propia, y la prenda propia
  await pg.click('text=Nueva partida'); await pg.click('text=¡Empezar!');
  const titles = new Set(); let prenda = '';
  for (let r = 0; r < 6; r++) {
    titles.add((await pg.textContent('h2')).trim());
    await pg.click('text=¡A votar!'); if (await pg.$('text=Antes de votar')) await pg.click('[data-act=go]');
    await pg.click('.vcard:has-text("Ana") [data-act=up]'); await pg.click('text=Ver resultado'); await pg.waitForTimeout(1400); await pg.click('#verdict .btn');
    await pg.click('text=Aceptar la prenda'); prenda = await pg.textContent('.prenda');
    ok(prenda.includes('voz de un pato') && !(await pg.$('text=Prenda de ronda')), `Ronda ${r + 1}: sale la prenda propia y nunca una de ronda`, prenda);
    await pg.click('[data-act=done]');
    for (let k = 0; k < 6 && !(await pg.$('text=¡A votar!')); k++) { const e = await pg.$('button:has-text("Siguiente ronda")'); if (e) await e.click(); await pg.waitForTimeout(200); }
  }
  ok([...titles].every(t => t.includes('dragón') || t.includes('Pregunta del grupo')), 'Solo aparecen la situación activa y la pregunta propia', [...titles].join(' | '));
  await pg.click('text=Menú'); await pg.click('text=Terminar partida'); await pg.click('text=Sí, terminar'); await pg.click('text=Inicio');
  // restaurar contenido
  await pg.evaluate(() => { localStorage.setItem('qh_custom_v1', JSON.stringify({ off: [], offSit: [], prendas: { normal: [], ronda: [], grupo: [] }, preguntas: { indiv: [], grupo: ['¿Qué equipo ganaría una guerra de almohadas?'] } })); });
  await pg.reload();

  // ---- Equipos ----
  await pg.click('text=Nueva partida'); await pg.click('[data-act=set][data-arg="modo:equipos"]');
  ok((await pg.textContent('main')).includes('Falta armar los equipos'), 'Modo equipos avisa que faltan equipos');
  await pg.click('text=Armar equipos');
  await pg.click('[data-act=tp][data-arg=p0]'); await pg.click('[data-act=tp][data-arg=p1]');
  await pg.click('[data-act=sel][data-arg="1"]'); await pg.click('[data-act=tp][data-arg=p2]'); await pg.click('[data-act=tp][data-arg=p3]'); await pg.click('[data-act=tp][data-arg=p4]');
  await pg.click('[data-act=tp][data-arg=p5]');
  ok((await pg.textContent('[data-act=sel][data-arg="1"]')).includes('4 jugadores'), 'Un equipo puede tener más de 3 jugadores');
  await pg.click('[data-act=tp][data-arg=p5]'); // lo saca para seguir con equipos de 2, 3 y 2
  await pg.click('[data-act=addt]'); await pg.click('[data-act=tp][data-arg=p5]'); await pg.click('[data-act=tp][data-arg=p6]');
  await pg.fill('#tn2', 'Los Cracks'); await pg.press('#tn2', 'Tab');
  await pg.screenshot({ path: S + '3teams.png', fullPage: true });
  await pg.click('text=Listo');
  const resumen = (await pg.textContent('main')).replace(/\s+/g, ' '); ok(resumen.includes('Los Tomates (2) · Los Dragones (3) · Los Cracks (2)'), 'Resumen de equipos en la configuración', resumen.slice(0, 200));
  await pg.click('text=¡Empezar!'); await pg.waitForTimeout(300);
  const q1 = await pg.textContent('.question'); ok(q1.startsWith('¿Qué equipo') || q1.startsWith('¿De qué equipo') || q1.startsWith('¿A qué equipo'), 'Preguntas convertidas a equipos', q1);
  await pg.screenshot({ path: S + '4round.png' });

  // Ronda 1 (rápida): Los Dragones más votados -> aceptan y no cumplen -> 1 tomatazo
  await pg.click('text=¡A votar!'); await pg.click('.vcard:has-text("Los Dragones") [data-act=up]'); await pg.click('.vcard:has-text("Los Dragones") [data-act=up]');
  await pg.click('text=Ver resultado'); await pg.waitForTimeout(1400); await pg.click('#verdict .btn');
  await pg.screenshot({ path: S + '5accused.png' });
  await pg.click('text=Aceptar la prenda de equipo');
  const pg1 = await pg.textContent('.prenda'); await pg.click('text=Cambiar prenda'); const pg2 = await pg.textContent('.prenda');
  ok(pg1 !== pg2 && !(await pg.$('text=Cambiar prenda')), 'Prenda de equipo: cambio una sola vez', pg2);
  await pg.click('[data-act=fail]'); ok((await pg.textContent('h2')).includes('Tomatazo para Los Dragones'), 'Tomatazo al equipo que no cumple');
  await pg.click('text=Siguiente ronda');
  // Ronda 2: empate Tomates vs Cracks -> duelo de representantes
  await pg.click('text=¡A votar!'); await pg.click('.vcard:has-text("Los Tomates") [data-act=up]'); await pg.click('.vcard:has-text("Los Cracks") [data-act=up]');
  await pg.click('text=Ver resultado'); await pg.waitForTimeout(1400); await pg.click('text=Desempatar');
  ok((await pg.textContent('main')).includes('representante'), 'Empate: representantes de cada equipo');
  await pg.evaluate(() => { window.__r = Math.random; Math.random = () => 0.99; }); await pg.click('text=¡Al duelo!'); await pg.evaluate(() => { Math.random = window.__r; });
  await pg.click('button:has-text("¡Empezar!")'); await pg.waitForSelector('text=¿Quién perdió?'); await pg.click('[data-act=lose] >> nth=0'); await pg.click('text=Continuar');
  const acc2 = await pg.textContent('h1'); ok(['Los Tomates', 'Los Cracks'].includes(acc2.trim()), 'El equipo del que perdió el duelo es el acusado', acc2);
  // defensa del equipo absuelta
  await pg.click('[data-act=def]'); await pg.click('text=Terminamos'); for (let i = 0; i < 5; i++) await pg.click('[data-act=up]'); await pg.click('text=Ver veredicto');
  ok((await pg.textContent('h1')).includes('Absueltos'), 'Defensa de equipo absuelta');
  await pg.click('text=Siguiente ronda');
  // Ronda 3 (Los Dragones de nuevo, defensa desastrosa + cumple => 1 seguro => 2 => fuera)
  await pg.click('text=¡A votar!'); await pg.click('.vcard:has-text("Los Dragones") [data-act=up]'); await pg.click('text=Ver resultado'); await pg.waitForTimeout(1400); await pg.click('#verdict .btn');
  await pg.click('[data-act=def]'); await pg.click('text=Terminamos'); await pg.click('text=Ver veredicto'); await pg.click('button:has-text("A la prenda")'); await pg.click('[data-act=done]');
  ok((await pg.textContent('main')).includes('Los Dragones queda fuera'), 'Equipo eliminado al llegar a 2 tomatazos');
  await pg.click('text=Siguiente ronda'); await pg.waitForTimeout(300);
  const votable = await pg.click('text=¡A votar!').then(() => pg.$$eval('.vcard span', a => a.map(x => x.textContent)));
  ok(!votable.includes('Los Dragones'), 'El equipo eliminado ya no se puede votar', votable.join(','));
  await pg.click('text=Ver resultado').catch(() => {});
  // terminar y ver premios
  await pg.goto(URL); await pg.click('text=Continuar partida'); await pg.click('text=Menú'); await pg.click('text=Ver tomatazos y cartas');
  ok((await pg.textContent('main')).includes('Tomatazos por equipo'), 'Marcador por equipos');
  await pg.click('text=← Volver'); await pg.click('text=Terminar partida'); await pg.click('text=Sí, terminar');
  const fin = (await pg.textContent('main')).replace(/\s+/g, ' ');
  ok(fin.includes('equipo intocable') && fin.includes('El Más Tomateado') && fin.includes('Los Dragones'), 'Pantalla final por equipos', fin.slice(0, 140));
  await pg.screenshot({ path: S + '6final.png' });
  console.log(res.join('\n'));
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
