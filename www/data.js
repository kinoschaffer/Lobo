// Contenido del juego. Las situaciones están en data_situaciones.js (generado por tools/situaciones.py).
// Las imágenes están en img/ y se generaron con Meshy.
window.QH_DATA = {
  situaciones: window.QH_SITUACIONES,

  prendas: [
    "Canta el estribillo de una canción con voz de ópera.",
    "Imita a alguien del grupo hasta que adivinen quién es.",
    "Baila 15 segundos sin música.",
    "Di tres cosas lindas de la persona a tu derecha.",
    "Habla como robot hasta la próxima ronda.",
    "Cuenta un chiste. Si nadie se ríe, cuenta otro.",
    "Haz tu mejor risa de villano durante 10 segundos.",
    "Camina como pingüino hasta la puerta y vuelve.",
    "Ponte algo en la cabeza como sombrero hasta la próxima ronda.",
    "Di el abecedario lo más rápido que puedas.",
    "Quédate como estatua durante 20 segundos mientras te hacen reír.",
    "Cuenta la anécdota más vergonzosa que te animes.",
    "Recita un poema improvisado sobre la comida que más te gusta.",
    "Imita a un animal y que el resto adivine cuál es.",
    "Dale un abrazo de oso a la persona más votada después de ti.",
    "Habla con acento extranjero hasta la próxima ronda.",
    "Haz 10 sentadillas mientras cantas la canción que elija el grupo.",
    "Agradece por algo a cada persona del grupo en una frase.",
    "Da una vuelta a la mesa caminando como modelo de pasarela.",
    "Inventa un brindis épico para el grupo.",
    "Haz tu mejor cara de sorpresa abriendo un regalo imaginario.",
    "Narra los próximos 20 segundos como si fueras locutor de fútbol.",
    "Di un trabalenguas: «Tres tristes tigres tragaban trigo en un trigal».",
    "Deja que la persona a tu izquierda te despeine.",
    "Vende un objeto de la mesa como si fuera un comercial de la tele.",
    "Habla solo con preguntas hasta la próxima ronda.",
    "Imita a un famoso y que adivinen quién es.",
    "Haz una declaración de amor dramática a una silla.",
    "Cuenta del 10 al 1 en otro idioma (o inventado).",
    "Haz la mímica de una película y que la adivinen."
  ],

  trampas: {
    escudo: { nombre: "Escudo", img: "carta_escudo", texto: "Te salvas: ni prenda ni tomatazo." },
    rebote: { nombre: "Bumerán", img: "carta_rebote", texto: "La prenda y el tomatazo vuelan al segundo más votado." },
    duelo:  { nombre: "Duelo de Almohadas", img: "carta_duelo", texto: "Retas a quien quieras a un duelo. Si ganas, le toca a él." },
    papa:   { nombre: "Papa Caliente", img: "carta_papa", texto: "Te salvas y eliges a quién le toca la prenda (sin tomatazo)." },
    robo:   { nombre: "Mano Traviesa", img: "carta_robo", texto: "Le robas una carta a otro jugador." }
  },

  presentimiento: { nombre: "Presentimiento", img: "carta_presentimiento",
    texto: "Si crees que te van a votar a ti, úsalo al votar. Si aciertas, te salvas. Si fallas, la próxima ronda empiezas con +2 votos." },

  // Duelos físicos: la app cuenta y el anfitrión marca quién perdió. Sirven para 2 o más.
  duelosFisicos: [
    { nombre: "Piedra, papel o tijera", texto: "A la cuenta de tres, todos juegan a la vez. Si hay más de dos, pierde quien quede solo con la jugada que pierde.", cuenta: ["Piedra…", "Papel…", "¡Tijera!"] },
    { nombre: "Duelo de miradas", texto: "Mírense fijo a los ojos. El primero que se ríe o aparta la vista pierde.", cuenta: ["Prepárense…", "Miren…", "¡Ya!"] },
    { nombre: "Último en tocarse la nariz", texto: "Cuando aparezca «¡Nariz!», tóquense la nariz. El último pierde.", cuenta: ["Atentos…", "…", "¡Nariz!"] },
    { nombre: "Equilibrio", texto: "Párense en un pie con los brazos abiertos. El primero que apoya el otro pie pierde.", cuenta: ["Un pie arriba…", "Brazos abiertos…", "¡Ya!"] },
    { nombre: "Canción sin reír", texto: "Canten una canción que todos sepan mirándose a los ojos. El primero que se ríe pierde.", cuenta: ["Afinen…", "Respiren…", "¡A cantar!"] },
    { nombre: "Trabalenguas", texto: "Por turnos, digan rápido: «Pablito clavó un clavito en la calva de un calvito». El primero que se traba pierde.", cuenta: ["Lengua lista…", "…", "¡Ya!"] },
    { nombre: "Palabra prohibida", texto: "Por turnos, digan palabras de una categoría (animales, comidas, países…). Quien repite o tarda más de 3 segundos pierde.", cuenta: ["Piensen…", "Categoría lista…", "¡Ya!"] }
  ]
};
