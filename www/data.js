// Contenido del juego. Las imágenes están en img/ y se generaron con Meshy.
window.QH_DATA = {
  situaciones: [
    { id: "dragon", titulo: "¡Un dragón entra a la cocina en plena cena!", preguntas: ["¿Quién se escondería primero?", "¿Quién intentaría domarlo?", "¿Quién le sacaría una foto antes de huir?"] },
    { id: "apagon", titulo: "Se corta la luz en Nochebuena", preguntas: ["¿Quién gritaría primero?", "¿Quién aprovecharía para comerse el postre?", "¿Quién se quedaría dormido en la oscuridad?"] },
    { id: "abuela_tiktok", titulo: "Hay que grabar un baile para las redes", preguntas: ["¿Quién se haría viral?", "¿Quién se negaría hasta el final?", "¿Quién bailaría peor?"] },
    { id: "pavo", titulo: "¡El pavo de la cena está vivo y se escapa!", preguntas: ["¿Quién saldría a perseguirlo?", "¿Quién lo adoptaría como mascota?", "¿Quién seguiría comiendo como si nada?"] },
    { id: "chimenea", titulo: "Papá Noel se quedó atorado en la chimenea", preguntas: ["¿Quién lo ayudaría a salir?", "¿Quién le revisaría la bolsa de regalos?", "¿Quién llamaría a los bomberos?"] },
    { id: "sueter", titulo: "Te regalan el suéter navideño más feo del mundo", preguntas: ["¿Quién fingiría que le encanta?", "¿Quién lo usaría con orgullo todo el año?", "¿Quién lo regalaría a otro el año que viene?"] },
    { id: "isla", titulo: "La familia naufraga en una isla desierta", preguntas: ["¿Quién sería el líder?", "¿Quién duraría menos?", "¿Quién se haría amigo de los monos?"] },
    { id: "zombis", titulo: "Apocalipsis zombi en el barrio", preguntas: ["¿Quién sería el primero en caer?", "¿Quién sobreviviría a todo?", "¿Quién intentaría negociar con los zombis?"] },
    { id: "ovni", titulo: "Un ovni aterriza en el patio", preguntas: ["¿Quién se iría con los extraterrestres?", "¿Quién les ofrecería comida?", "¿Quién diría «yo sabía que existían»?"] },
    { id: "postre", titulo: "Queda una sola porción de postre", preguntas: ["¿Quién se la comería a escondidas?", "¿Quién la compartiría con todos?", "¿Quién armaría una pelea por ella?"] },
    { id: "karaoke", titulo: "Noche de karaoke familiar", preguntas: ["¿Quién no soltaría el micrófono?", "¿Quién cantaría peor?", "¿Quién lloraría con una balada?"] },
    { id: "reno", titulo: "Un reno se mete al living y se come el arbolito", preguntas: ["¿Quién intentaría montarlo?", "¿Quién le pondría nombre?", "¿Quién se subiría a una silla del susto?"] },
    { id: "loteria", titulo: "¡La familia gana la lotería!", preguntas: ["¿Quién lo gastaría todo en un día?", "¿Quién lo escondería debajo del colchón?", "¿Quién se lo contaría a todo el barrio?"] },
    { id: "tiempo", titulo: "Aparece una máquina del tiempo en el garaje", preguntas: ["¿Quién viajaría a ver dinosaurios?", "¿Quién rompería la máquina?", "¿Quién se quedaría a vivir en el pasado?"] },
    { id: "fantasma", titulo: "Hay un fantasma navideño en el baño", preguntas: ["¿Quién gritaría más fuerte?", "¿Quién se haría amigo del fantasma?", "¿Quién no volvería a entrar nunca?"] },
    { id: "perro", titulo: "El perro de la familia empieza a hablar", preguntas: ["¿Quién se desmayaría?", "¿De quién contaría más secretos el perro?", "¿Quién lo llevaría a la tele para hacerse famoso?"] }
  ],

  prendas: [
    "Canta el estribillo de un villancico con voz de ópera.",
    "Imita a alguien de la familia hasta que adivinen quién es.",
    "Baila 15 segundos sin música.",
    "Di tres cosas lindas de la persona a tu derecha.",
    "Habla como robot hasta la próxima ronda.",
    "Cuenta un chiste. Si nadie se ríe, cuenta otro.",
    "Haz tu mejor imitación de Papá Noel riéndose.",
    "Camina como pingüino hasta la puerta y vuelve.",
    "Ponte algo en la cabeza como sombrero hasta la próxima ronda.",
    "Di el abecedario lo más rápido que puedas.",
    "Haz una pose de estatua navideña durante 20 segundos.",
    "Cuenta la anécdota más vergonzosa que te animes.",
    "Recita un poema improvisado sobre el pan dulce.",
    "Imita a un animal y que el resto adivine cuál es.",
    "Dale un abrazo de oso a la persona más votada después de ti.",
    "Habla con acento extranjero hasta la próxima ronda.",
    "Haz 10 sentadillas mientras cantas «Jingle Bells».",
    "Agradece por algo a cada persona de la mesa en una frase.",
    "Haz de reno: con las manos de cuernos, da una vuelta a la mesa.",
    "Inventa un brindis épico para la familia.",
    "Haz tu mejor cara de sorpresa abriendo un regalo imaginario.",
    "Narra los próximos 20 segundos como si fueras locutor de fútbol.",
    "Di un trabalenguas: «Tres tristes tigres tragaban trigo en un trigal».",
    "Deja que la persona a tu izquierda te despeine."
  ],

  trampas: {
    escudo:  { nombre: "Escudo de Navidad", img: "carta_escudo", texto: "Te salvas: ni prenda ni carbón." },
    rebote:  { nombre: "Regalo Rebotador", img: "carta_rebote", texto: "La prenda y el carbón rebotan al segundo más votado." },
    duelo:   { nombre: "Duelo de Bastones", img: "carta_duelo", texto: "Retas a quien quieras a un duelo. Si ganas, le toca a él." },
    veneno:  { nombre: "Regalo Envenenado", img: "carta_veneno", texto: "Te salvas y eliges a quién le toca la prenda (sin carbón)." },
    robo:    { nombre: "Mano Traviesa", img: "carta_robo", texto: "Le robas una carta trampa a otro jugador." }
  },

  // Duelos físicos: la app cuenta y el anfitrión marca quién perdió. Sirven para 2 o más.
  duelosFisicos: [
    { nombre: "Piedra, papel o tijera", texto: "A la cuenta de tres, todos juegan a la vez. Si hay más de dos, pierde quien quede solo con la jugada que pierde.", cuenta: ["Piedra…", "Papel…", "¡Tijera!"] },
    { nombre: "Duelo de miradas", texto: "Mírense fijo a los ojos. El primero que se ríe o aparta la vista pierde.", cuenta: ["Prepárense…", "Miren…", "¡Ya!"] },
    { nombre: "Último en tocarse la nariz", texto: "Cuando aparezca «¡Nariz!», tóquense la nariz. El último pierde.", cuenta: ["Atentos…", "…", "¡Nariz!"] },
    { nombre: "Equilibrio navideño", texto: "Párense en un pie con los brazos abiertos como estrella. El primero que apoya el otro pie pierde.", cuenta: ["Un pie arriba…", "Brazos de estrella…", "¡Ya!"] },
    { nombre: "Villancico sin reír", texto: "Canten «Noche de paz» mirándose a los ojos. El primero que se ríe pierde.", cuenta: ["Afinen…", "Respiren…", "¡A cantar!"] },
    { nombre: "Trabalenguas", texto: "Por turnos, digan rápido: «Pablito clavó un clavito en la calva de un calvito». El primero que se traba pierde.", cuenta: ["Lengua lista…", "…", "¡Ya!"] }
  ]
};
