# ¿Quién Haría? — Edición Navidad

Juego party para la familia, en un solo celular que se pasa de mano en mano y sin internet.

- Aparece una situación absurda ilustrada y una pregunta («¿Quién se escondería primero?»).
- Todos votan: en secreto pasando el celular, o a mano alzada con el anfitrión anotando.
- Si hay empate, los empatados se enfrentan en un duelo (reflejos, carrera de toques, piedra papel o tijera, duelo de miradas…).
- El acusado se defiende, paga una prenda y recibe un carbón. Las cartas trampa lo pueden salvar.
- Los jugadores se agregan con una foto y su nombre, también en medio de la partida.

Las ilustraciones de `www/img/` se generaron con Meshy (texto a imagen).

## Estructura

- `www/index.html`: punto de entrada de la app.
- `www/app.js`: lógica del juego.
- `www/data.js`: situaciones, preguntas, prendas, cartas trampa y duelos.
- `www/style.css`, `www/fonts/`, `www/img/`: estilo, tipografías e imágenes (todo local, funciona sin internet).

## Probar en la computadora

```
cd www && python3 -m http.server 8000
```

y abrir http://localhost:8000 (mejor en modo celular del navegador).
