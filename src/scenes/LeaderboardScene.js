/**
 * LeaderboardScene.js
 * Muestra el TOP 5 de puntajes. Carga desde Firebase Firestore;
 * si falla o está vacío, usa localStorage como respaldo.
 * Botones nativos de Phaser (sin HTML) para evitar problemas de escalado.
 */

import { obtenerTop5 } from '../firebase.js';

export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  async create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ─ Fondo azul medianoche (original) ─
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x060D22, 0x060D22, 0x0D1B3E, 0x0D1B3E, 1);
    bg.fillRect(0, 0, W, H);

    // ─ Título ─
    this.add.text(W / 2, 28, 'TABLA DE LÍDERES', {
      fontSize: '22px',
      fontFamily: 'Orbitron, Arial Black',
      color: '#FFD700',
      stroke: '#0D1B3E',
      strokeThickness: 5
    }).setOrigin(0.5);

    this.add.text(W / 2, 54, 'El Camino del Buen Líder  —  UDD', {
      fontSize: '12px',
      fontFamily: 'Rajdhani, Arial',
      color: '#6688AA'
    }).setOrigin(0.5);

    // ─ Datos del jugador actual ─
    const jugadorRaw    = localStorage.getItem('jugadorActual');
    const jugadorActual = jugadorRaw ? JSON.parse(jugadorRaw) : null;

    if (jugadorActual) {
      this.add.text(W / 2, 82, `AGENTE: ${jugadorActual.nombreCompleto}`, {
        fontSize: '12px',
        fontFamily: 'Rajdhani, monospace',
        color: '#00E5FF'
      }).setOrigin(0.5);
    }

    // ─ Texto de carga ─
    const txtCargando = this.add.text(W / 2, 160, 'Cargando ranking...', {
      fontSize:   '13px',
      fontFamily: 'Rajdhani, Arial',
      color:      '#6688AA'
    }).setOrigin(0.5);

    // ─ Obtener datos desde Firebase; respaldo en localStorage si falla ─
    let leaderboard = await obtenerTop5();
    if (!leaderboard || leaderboard.length === 0) {
      leaderboard = this._obtenerLeaderboard();
    }

    // Destruir texto de carga
    txtCargando.destroy();

    // ─ Panel del leaderboard (diseño original) ─
    const panelW = Math.min(480, W - 16);
    const panelH = 260;
    const panelX = W / 2 - panelW / 2;
    const panelY = 105;
    const colPuntos = panelX + panelW - 80;

    const panel = this.add.graphics();
    panel.fillStyle(0x0A1428, 0.95);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(2, 0xFFD700, 0.6);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);

    // ─ Encabezado ─
    this.add.text(panelX + 14,  panelY + 14, '#',       { fontSize: '12px', color: '#6688AA', fontFamily: 'Orbitron, monospace' });
    this.add.text(panelX + 46,  panelY + 14, 'JUGADOR', { fontSize: '12px', color: '#6688AA', fontFamily: 'Orbitron, monospace' });
    this.add.text(colPuntos,     panelY + 14, 'PUNTOS',  { fontSize: '12px', color: '#6688AA', fontFamily: 'Orbitron, monospace' });

    const lineaDivision = this.add.graphics();
    lineaDivision.lineStyle(1, 0x333366, 1);
    lineaDivision.lineBetween(panelX + 10, panelY + 34, panelX + panelW - 10, panelY + 34);

    if (leaderboard.length === 0) {
      this.add.text(W / 2, panelY + panelH / 2 + 10,
        'Aun no hay registros.\n¡Sé el primero en jugar!', {
          fontSize: '14px',
          fontFamily: 'Arial',
          color: '#666688',
          align: 'center'
        }).setOrigin(0.5);
    } else {
      const numeros     = ['1', '2', '3', '4', '5'];
      const coloresFila = [0xFFD700, 0xC0C0C0, 0xCD7F32, 0xFFFFFF, 0xFFFFFF];

      leaderboard.slice(0, 5).forEach((entrada, i) => {
        const filaY   = panelY + 50 + i * 38;
        const esActual = jugadorActual &&
          (entrada.nombreCompleto === jugadorActual.nombreCompleto ||
           entrada.nombre === jugadorActual.nombre);

        if (esActual) {
          const filaFondo = this.add.graphics();
          filaFondo.fillStyle(0x0D2A4A, 0.8);
          filaFondo.fillRoundedRect(panelX + 8, filaY - 8, panelW - 16, 34, 4);
          filaFondo.lineStyle(1, 0xFFD700, 0.5);
          filaFondo.strokeRoundedRect(panelX + 8, filaY - 8, panelW - 16, 34, 4);
        }

        this.add.text(panelX + 18, filaY + 4, numeros[i], {
          fontSize: '15px',
          fontFamily: 'Arial Black',
          color: `#${coloresFila[i].toString(16).padStart(6, '0')}`
        }).setOrigin(0.5, 0.5);

        const nombre = entrada.nombreCompleto
          || [entrada.nombre, entrada.apellido].filter(Boolean).join(' ')
          || '???';
        const nombreCorto = nombre.length > 22 ? nombre.slice(0, 20) + '…' : nombre;
        this.add.text(panelX + 46, filaY, nombreCorto, {
          fontSize: '14px',
          fontFamily: 'Rajdhani, Arial',
          color: esActual ? '#00E5FF' : '#CCCCCC',
          fontStyle: esActual ? 'bold' : 'normal'
        });

        this.add.text(colPuntos, filaY, String(entrada.puntaje), {
          fontSize: '15px',
          fontFamily: 'Orbitron, Arial Black',
          color: '#FFD700'
        });
      });
    }

    // ─ Botones ─
    const btnW = Math.min(300, W - 30);
    this._crearBotonPhaser(W / 2, H - 76, btnW, 44, '▶  JUGAR', 0xCC2200, '#FFD700', () => {
      this.scene.start('GameScene');
    });

    this._crearBotonPhaser(W / 2, H - 26, btnW, 44, 'CAMBIAR JUGADOR', 0x0A1428, '#AACCFF', () => {
      this.scene.start('RegistroScene');
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Lee y ordena el leaderboard desde localStorage (respaldo offline) */
  _obtenerLeaderboard() {
    try {
      const raw  = localStorage.getItem('leaderboard');
      const data = raw ? JSON.parse(raw) : [];
      return data
        .filter(e => e && typeof e.puntaje === 'number' && (e.nombreCompleto || e.nombre))
        .sort((a, b) => b.puntaje - a.puntaje);
    } catch {
      return [];
    }
  }

  _crearBotonPhaser(cx, cy, w, h, texto, bgColor, textColor, callback) {
    const fondo = this.add.graphics();

    const dibujarFondo = (hover) => {
      fondo.clear();
      fondo.fillStyle(hover ? 0x0055AA : bgColor, 1);
      fondo.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
      fondo.lineStyle(2, 0xFFD700, 1);
      fondo.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
    };
    dibujarFondo(false);

    this.add.text(cx, cy, texto, {
      fontSize:   '14px',
      fontFamily: 'Arial Black, Arial',
      color:      textColor,
      align:      'center'
    }).setOrigin(0.5);

    const zona = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
    zona.on('pointerover',  () => dibujarFondo(true));
    zona.on('pointerout',   () => dibujarFondo(false));
    zona.on('pointerdown',  () => {
      dibujarFondo(true);
      callback();
    });
  }

  shutdown() {
    // Sin elementos DOM que limpiar
  }
}
