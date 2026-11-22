// Contenido del juego. Las situaciones están en data_situaciones.js (generado por tools/situaciones.py).
// Las imágenes están en img/ y se generaron con Meshy.
window.QH_DATA = {
  situaciones: window.QH_SITUACIONES,

  prendas: [
    "Canta el estribillo de una canción con voz de ópera.",
    "Imita a alguien del grupo hasta que adivinen quién es.",
    "Cuenta un chiste. Si nadie se ríe, cuenta otro.",
    "Haz tu mejor risa de villano durante 10 segundos.",
    "Camina como pingüino hasta la puerta y vuelve.",
    "Di el abecedario lo más rápido que puedas.",
    "Quédate como estatua durante 20 segundos mientras te hacen reír.",
    "Cuenta la anécdota más vergonzosa que te animes.",
    "Recita un poema improvisado sobre la comida que más te gusta.",
    "Imita a un animal y que el resto adivine cuál es.",
    "Haz 10 sentadillas mientras cantas la canción que elija el grupo.",
    "Da una vuelta a la mesa caminando como modelo de pasarela.",
    "Narra los próximos 20 segundos como si fueras locutor de fútbol.",
    "Di un trabalenguas: «Tres tristes tigres tragaban trigo en un trigal».",
    "Deja que la persona a tu izquierda te despeine.",
    "Vende un objeto de la mesa como si fuera un comercial de la tele.",
    "Imita a un famoso y que adivinen quién es.",
    "Haz una declaración de amor dramática a una silla.",
    "Cuenta del 10 al 1 en otro idioma (o inventado).",
    "Haz la mímica de una película y que la adivinen.",
    "Haz 10 saltos de tijera contando en voz alta en otro idioma (o inventado).",
    "Canta una canción cambiando todas las vocales por «i».",
    "Imita la risa de tres personas del grupo.",
    "Haz de presentador de noticias y anuncia lo que pasó en esta ronda.",
    "Di 5 palabras que rimen con «tomate» en 15 segundos.",
    "Camina hasta la puerta y vuelve en cámara lenta.",
    "Haz una pose de superhéroe y mantenla 15 segundos.",
    "Cuenta un cuento de 30 segundos que empiece con «Había una vez un tomate…».",
    "Haz de estatua viviente en la pose que elija el grupo durante 15 segundos.",
    "Recita los meses del año al revés.",
    "Haz tu mejor imitación de un bebé llorando.",
    "Habla como pirata durante 30 segundos contando qué desayunaste.",
    "Narra una carrera imaginaria entre dos personas del grupo como locutor.",
    "Inventa una palabra nueva y explica qué significa.",
    "Imita a un mosquito molestando al grupo durante 10 segundos.",
    "Haz el sonido de 5 animales distintos sin parar.",
    "Mantén un objeto en equilibrio sobre la cabeza durante 15 segundos.",
    "Explica cómo hacer un sándwich como si fuera una película de acción.",
    "Deletrea tu nombre completo al revés.",
    "Entrevista a la persona de tu izquierda como periodista de chimentos."
  ],

  // Prendas de ronda: se cumplen durante toda la ronda siguiente. Si la rompe, tomatazo.
  prendasRonda: [
    { t: "Habla como robot." },
    { t: "Lleva algo en la cabeza como sombrero." },
    { t: "Habla con acento extranjero." },
    { t: "Habla solo con preguntas." },
    { t: "Termina cada frase diciendo «¡y punto!»." },
    { t: "Habla en tercera persona: «Fulano opina que…»." },
    { t: "No puedes decir «sí» ni «no»." },
    { t: "Habla susurrando." },
    { t: "Habla como narrador de documental de animales." },
    { t: "Antes de hablar, levanta la mano y espera a que alguien te dé la palabra." },
    { t: "Cada vez que alguien diga tu nombre, grita «¡Presente!»." },
    { t: "Quédate de pie toda la ronda." },
    { t: "Usa la mano contraria para todo." },
    { t: "Cada vez que alguien se ría, aplaude." },
    { t: "Imita los gestos de la persona a tu derecha, como un espejo." },
    { t: "Lleva un objeto en el hombro sin dejarlo caer." },
    { t: "Eres el mayordomo: alcánzale a cualquiera lo que pida." },
    { t: "Elige un «jefe»: no puedes hablar ni votar sin su permiso." },
    { t: "Eres el eco: repite la última palabra de todo lo que diga el grupo." },
    { t: "Tu voto vale doble, pero tienes que votar en voz alta.", voto2: true },
    { t: "No puedes mirar a nadie a los ojos." }
  ],

  // Cartas. «cuando»: voto (al votar en secreto), prenda (cuando te toca), siempre (desde «Usar carta»), duelo (al perder un duelo).
  trampas: {
    escudo:      { cuando: "prenda", nombre: "Escudo", img: "carta_escudo", texto: "Te salvas de la prenda." },
    rebote:      { cuando: "prenda", nombre: "Bumerán", img: "carta_rebote", texto: "La prenda vuela al segundo más votado." },
    papa:        { cuando: "prenda", nombre: "Papa Caliente", img: "carta_papa", texto: "Te salvas y eliges a quién le toca la prenda." },
    robo:        { cuando: "prenda", nombre: "Mano Traviesa", img: "carta_robo", texto: "Le robas una carta a otro jugador." },
    complice:    { cuando: "prenda", nombre: "Cómplice", img: "carta_complice", texto: "Haces la prenda con alguien que elijas. Si no la cumplen, el grupo decide quién se lleva el tomatazo." },
    abogado:     { cuando: "prenda", nombre: "Abogado Defensor", img: "carta_abogado", texto: "Otro jugador da el discurso de defensa por ti. Si es un desastre, él también se lleva un tomatazo." },
    light:       { cuando: "prenda", nombre: "Prenda Light", img: "carta_light", texto: "Cambias tu prenda por una fácil. No hay tomatazo aunque no la cumplas." },
    ruleta:      { cuando: "prenda", nombre: "Ruleta", img: "carta_ruleta", texto: "La app elige a alguien al azar (puedes ser tú otra vez) y le toca la prenda." },
    doble_nada:  { cuando: "prenda", nombre: "Doble o Nada", img: "carta_doble_nada", texto: "Duelo contra el acusado de la ronda anterior. Si ganas, te salvas y él recibe 2 tomatazos. Si pierdes, 2 tomatazos seguros y la prenda." },
    voto_doble:  { cuando: "voto", nombre: "Voto Doble", img: "carta_voto_doble", texto: "Al votar: tu voto cuenta 2. Solo en votación secreta." },
    voto_robado: { cuando: "voto", nombre: "Voto Robado", img: "carta_voto_robado", texto: "Al votar: eliges a alguien y su voto pasa a quien votaste tú. Solo en votación secreta." },
    anulador:    { cuando: "voto", nombre: "Anulador", img: "carta_anulador", texto: "Si quedas como el más votado de la ronda, tus votos se anulan. Si no, la pierdes igual." },
    espejo:      { cuando: "voto", nombre: "Espejo", img: "carta_espejo", texto: "Cada voto que recibas esta ronda también se le suma a quien te votó. Solo en votación secreta." },
    limpieza:    { cuando: "siempre", nombre: "Limpieza", img: "carta_limpieza", texto: "Te sacas 1 tomatazo de encima." },
    castigo:     { cuando: "siempre", nombre: "Castigo", img: "carta_castigo", texto: "Le das a otro jugador la prenda de ronda que elijas, para esta ronda." },
    silencio:    { cuando: "siempre", nombre: "Silencio", img: "carta_silencio", texto: "Eliges a alguien que no puede hablar en esta ronda. Si habla, tomatazo." },
    intercambio: { cuando: "siempre", nombre: "Intercambio", img: "carta_intercambio", texto: "Cambias todas tus cartas por todas las de otro jugador." },
    revancha:    { cuando: "duelo", nombre: "Revancha", img: "carta_revancha", texto: "Cuando pierdes un duelo, lo repites." }
  },

  // Prendas fáciles para la carta Prenda Light
  prendasLight: [
    "Di tu nombre al revés.", "Aplaude 5 veces.", "Haz la mueca más graciosa que puedas.", "Di «Pepe pecas pica papas» tres veces.",
    "Saluda como reina o rey durante 5 segundos.", "Imita el sonido de una gallina.", "Di tu comida favorita con voz de bebé.",
    "Haz una reverencia al grupo.", "Guiña el ojo a alguien del grupo.", "Di «¡Soy inocente!» con voz dramática."
  ],


  presentimiento: { nombre: "Presentimiento", img: "carta_presentimiento",
    texto: "Si crees que te van a votar a ti, úsalo al votar. Si aciertas, te salvas. Si fallas, la próxima ronda empiezas con +2 votos." },

  reto: { nombre: "Reto a duelo", img: "carta_reto",
    texto: "Cuando te toque la prenda, reta a quien quieras. Si ganas, la prenda pasa a él; si pierdes, tomatazo seguro y prenda." },

  // Duelos físicos: la app cuenta y el anfitrión marca quién perdió. Sirven para 2 o más.
  duelosFisicos: [
    { nombre: "Piedra, papel o tijera", texto: "A la cuenta de tres, todos juegan a la vez. Si hay más de dos, pierde quien quede solo con la jugada que pierde.", cuenta: ["Piedra…", "Papel…", "¡Tijera!"] },
    { nombre: "Duelo de miradas", texto: "Mírense fijo a los ojos. El primero que se ríe o aparta la vista pierde.", cuenta: ["Prepárense…", "Miren…", "¡Ya!"] },
    { nombre: "Equilibrio", texto: "Párense en un pie con los brazos abiertos. El primero que apoya el otro pie pierde.", cuenta: ["Un pie arriba…", "Brazos abiertos…", "¡Ya!"] },
    { nombre: "Trabalenguas", texto: "Por turnos, digan rápido: «Pablito clavó un clavito en la calva de un calvito». El primero que se traba pierde.", cuenta: ["Lengua lista…", "…", "¡Ya!"] },
    { nombre: "Palabra prohibida", texto: "Por turnos, digan palabras de una categoría (animales, comidas, países…). Quien repite o tarda más de 3 segundos pierde.", cuenta: ["Piensen…", "Categoría lista…", "¡Ya!"] },
    { nombre: "Lucha de pulgares", max: 2, texto: "Tómense de la mano con los dedos enganchados. Pierde al que le atrapen el pulgar durante 3 segundos.", cuenta: ["Manos listas…", "Pulgares arriba…", "¡A luchar!"] },
    { nombre: "Sin parpadear", texto: "Mírense fijo. El primero que parpadea pierde.", cuenta: ["Ojos abiertos…", "Miren…", "¡Ya!"] },
    { nombre: "Abecedario de nombres", texto: "Por turnos, digan nombres de personas en orden alfabético: Ana, Bruno, Carla… Pierde quien se traba o tarda más de 3 segundos.", cuenta: ["Piensen…", "A…", "¡Ya!"] },
    { nombre: "Estatua", texto: "Quédense quietos como estatuas. El resto del grupo intenta hacerlos reír sin tocarlos. Pierde el primero que se mueve o se ríe.", cuenta: ["Posición…", "Congelados…", "¡Ya!"] }
  ],

  // Palabras para la mímica rápida
  mimica: ["Astronauta", "Pingüino", "Bombero", "Dentista", "Surfista", "Pizza", "Elefante", "Paraguas", "Karaoke", "Boxeador",
    "Mago", "Cocodrilo", "Malabarista", "Cocinero", "Zombi", "Bailarina", "Pescador", "Fotógrafo", "Gorila", "Helicóptero",
    "Dormir", "Lavarse los dientes", "Andar en bici", "Pescar", "Escalar", "Tocar la batería", "Ordeñar una vaca", "Patinar",
    "Pirata", "Robot", "Jardinero", "Cajero", "Mosquito", "Canguro", "Payaso", "Futbolista", "Jirafa", "Ninja", "Mimo", "Vampiro"]
};
