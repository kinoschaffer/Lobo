# ¿Quién Haría?

Juego party para grupos y familias, en un solo celular que se pasa de mano en mano y sin internet.

- Aparece una situación absurda ilustrada y una pregunta («¿Quién se escondería primero?»).
- Todos votan: en secreto pasando el celular, o a mano alzada con el anfitrión anotando.
- Si hay empate, los empatados se enfrentan en un duelo (reflejos, carrera de toques, piedra papel o tijera, duelo de miradas…).
- Presentimiento: si crees que te van a votar a ti, úsalo al votar. Si aciertas te salvas y le toca al siguiente; si fallas, la próxima ronda empiezas con +2 votos.
- El acusado se defiende, paga una prenda y recibe un tomatazo. Las cartas trampa lo pueden salvar.
- Los jugadores se agregan con una foto y su nombre, también en medio de la partida.

Las ilustraciones de `www/img/` se generaron con Meshy (texto a imagen).

## Estructura

- `www/index.html`: punto de entrada de la app.
- `www/app.js`: lógica del juego.
- `www/data_situaciones.js`: las 73 situaciones con sus preguntas (generado por `tools/situaciones.py`).
- `www/data.js`: prendas, cartas trampa, presentimiento y duelos.
- `tools/situaciones.py`: fuente de las situaciones y de los prompts usados en Meshy.
- `www/style.css`, `www/fonts/`, `www/img/`: estilo, tipografías e imágenes (todo local, funciona sin internet).

## Probar en la computadora

```
cd www && python3 -m http.server 8000
```

y abrir http://localhost:8000 (mejor en modo celular del navegador).
