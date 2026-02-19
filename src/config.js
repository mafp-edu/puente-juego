/**
 * config.js
 * Configuración global del juego "El Camino del Buen Líder"
 * Incluye dimensiones, física, colores institucionales y datos de partida.
 */

// ─── Paleta "La Casa de Papel × Terminator" ───────────────────────────────────
export const COLORES = {
  // Estructura / UI
  negro:       0x0A0A0A,
  negroPanel:  0x111118,
  grisAcero:   0x1E1E2A,
  grisPlata:   0x8A8A9A,
  // Acento principal
  rojoPolux:   0xCC0000,   // rojo amenaza
  rojoBrillo:  0xFF2222,   // rojo vivo
  rojoOscuro:  0x660000,   // rojo apagado
  // Acento secundario (emergencia / datos)
  cyanComp:    0x00E5FF,
  cyanOscuro:  0x007799,
  // Dorado (marca UDD — se mantiene pero solo para elementos de logro)
  dorado:      0xFFD700,
  doradoTenue: 0x886600,
  // Colores funcionales
  verdeLibre:  0x00FF88,   // liberación de compañeros
  blancoUDD:   0xFFFFFF,
  naranjaHUD:  0xFF6600,
  // Alias de compatibilidad
  azulUDD:     0x1A0000,   // reemplazado por negro rojizo
  grisOscuro:  0x111118,
  marron:      0x3A1A0A,
  verdeBosque: 0x0A1A0A,
};

// ─── Datos de las preguntas de los 3 hitos ────────────────────────────────────
export const HITOS = [
  {
    id: 1,
    lugar: 'La Plaza de la Innovación',
    tema:  'FILOSOFÍA – John Locke',
    pregunta: '¿Cuál es el origen legítimo del poder político según John Locke?',
    opciones: [
      'La tradición y la herencia',
      'La fuerza del más capaz',
      'El consentimiento de los gobernados'
    ],
    correcta: 2,
    feedbackCorrecto:
      '¡Correcto, Novo! Sin consentimiento no hay autoridad legítima.\nPólux es un experimento sin control — exactamente lo contrario.',
    feedbackIncorrecto:
      'Locke enseñó que el poder nace de quienes son gobernados.\nUna máquina nunca podrá entender eso. Intenta de nuevo.',
    pista:
      'Locke sostenía que ningún gobernante tiene autoridad real si la población no la ha aceptado libremente.'
  },
  {
    id: 2,
    lugar: 'La Biblioteca del Saber',
    tema:  'ECONOMÍA – Adam Smith',
    pregunta: '¿De dónde proviene la riqueza de las naciones según Adam Smith?',
    opciones: [
      'Del oro y el comercio exterior',
      'De la intervención del Estado',
      'De la división del trabajo'
    ],
    correcta: 2,
    feedbackCorrecto:
      '¡Exacto! La cooperación humana crea riqueza.\nPólux controla, pero no puede cooperar. ¡Sigues adelante!',
    feedbackIncorrecto:
      'Smith miró las fábricas, no los cofres del tesoro.\nLos robots de Pólux no entienden el trabajo humano. Piénsalo mejor.',
    pista:
      'Smith visitó fábricas donde cada obrero hacía una tarea específica y la producción se multiplicó enormemente.'
  },
  {
    id: 3,
    lugar: 'El Auditorio Central',
    tema:  'POLÍTICA – Maquiavelo',
    pregunta: '¿Qué cualidad es clave para gobernar según Maquiavelo?',
    opciones: [
      'Ser amado a cualquier costo',
      'Aplicar la ley con rigidez',
      'Combinar fuerza y astucia'
    ],
    correcta: 2,
    feedbackCorrecto:
      '¡Brillante! Pólux solo tiene fuerza bruta de máquina.\nTú tienes fuerza Y astucia. ¡La meta está cerca!',
    feedbackIncorrecto:
      'Maquiavelo no elegía uno u otro — necesitaba ambos.\nUn alumno recién ingresado puede superar a cualquier IA. Intenta de nuevo.',
    pista:
      'El Príncipe de Maquiavelo debía actuar como el león y como la zorra a la vez: ni solo fuerza, ni solo ingenio.'
  }
];

// ─── Frases de liderazgo para los libros/documentos ──────────────────────────
export const FRASES_LIDERAZGO = [
  'Un líder es aquel que conoce el camino, anda el camino y muestra el camino.',
  'La función del liderazgo es producir más líderes, no más seguidores.',
  'El mejor líder es aquel que inspira a los demás a ser mejores.',
  'Liderar es servir antes que mandar.',
  'La innovación distingue a un líder de un seguidor.',
  'Un buen líder lleva a la gente a donde quiere ir.',
  'El coraje no es la ausencia del miedo; es actuar a pesar de él.'
];

// ─── Configuración de física y mundo ─────────────────────────────────────────
export const MUNDO = {
  ancho:        7000,  // ~18 pantallas en portrait
  alto:         700,
  gravedad:     800,
  velocidadJugador: 220,
  fuerzaSalto:      500,
  vidasIniciales:   2
};

// ─── Configuración principal de Phaser ───────────────────────────────────────
export const GAME_CONFIG = {
  type:            Phaser.AUTO,
  width:           390,
  height:          700,
  backgroundColor: '#0D1B3E',
  input: {
    activePointers: 4   // soporta hasta 4 toques simultáneos
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: MUNDO.gravedad },
      debug:   false
    }
  },
  scale: {
    mode:             Phaser.Scale.FIT,
    autoCenter:       Phaser.Scale.CENTER_HORIZONTALLY,
    width:            390,
    height:           700
  }
};
