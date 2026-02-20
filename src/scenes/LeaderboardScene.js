/**
 * LeaderboardScene.js
 * Muestra el TOP 5 de puntajes desde Firebase Firestore.
 * Si Firebase falla, muestra datos desde localStorage como respaldo.
 * Botones nativos de Phaser (sin HTML) para funcionar correctamente
 * con cualquier modo de escalado.
 */

import { obtenerTop5 } from '../firebase.js';

export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  async create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ─ Fondo azul oscuro ─
    this.add.graphics()
      .fillStyle(0x001a4d, 1)
      .fillRect(0, 0, W, H);

    // Degradado sutil en la mitad inferior
    this.add.graphics()
      .fillGradientStyle(0x001a4d, 0x001a4d, 0x000d26, 0x000d26, 0, 0, 1, 1)
      .fillRect(0, H * 0.4, W, H * 0.6);

    // ─ Título ─
    this.add.text(W / 2, 24, 'EL CAMINO DEL BUEN LÍDER', {
      fontSize:        '16px',
      fontFamily:      'Orbitron, Arial Black',
      color:           '#FFD700',
      stroke:          '#000d26',
      strokeThickness: 4,
      align:           'center'
    }).setOrigin(0.5).setScrollFactor(0);

    // ─ Subtítulo ─
    this.add.text(W / 2, 50, '🏆  TOP 5  🏆', {
      fontSize:   '18px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#FFFFFF',
      align:      'center'
    }).setOrigin(0.5).setScrollFactor(0);

    // ─ Línea separadora dorada ─
    this.add.graphics()
      .lineStyle(2, 0xFFD700, 0.8)
      .lineBetween(20, 72, W - 20, 72)
      .setScrollFactor(0);

    // ─ Texto de carga ─
    const txtCargando = this.add.text(W / 2, H / 2, 'Cargando ranking...', {
      fontSize:   '14px',
      fontFamily: 'Rajdhani, Arial',
      color:      '#6688AA',
      align:      'center'
    }).setOrigin(0.5).setScrollFactor(0);

    // ─ Obtener datos desde Firebase ─
    let datos = await obtenerTop5();

    // Respaldo: localStorage si Firebase devuelve vacío
    if (!datos || datos.length === 0) {
      try {
        const raw = localStorage.getItem('leaderboard');
        if (raw) {
          datos = JSON.parse(raw)
            .filter(e => e && typeof e.puntaje === 'number')
            .sort((a, b) => b.puntaje - a.puntaje)
            .slice(0, 5);
        }
      } catch { /* silencioso */ }
    }

    // Destruir texto de carga
    txtCargando.destroy();

    // ─ Panel del ranking ─
    const panelW = Math.min(360, W - 20);
    const panelX = W / 2 - panelW / 2;
    const panelY = 84;
    const panelH = 310;

    const panel = this.add.graphics().setScrollFactor(0);
    panel.fillStyle(0x002266, 0.95);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(2, 0xFFD700, 0.6);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);

    // ─ Contenido del ranking ─
    if (!datos || datos.length === 0) {
      // Sin datos
      this.add.text(W / 2, panelY + panelH / 2,
        '¡Sé el primero en\ncompletar el circuito!', {
          fontSize:   '14px',
          fontFamily: 'Rajdhani, Arial',
          color:      '#667799',
          align:      'center'
        }
      ).setOrigin(0.5).setScrollFactor(0);
    } else {
      const medallas = ['🥇', '🥈', '🥉', '4.', '5.'];
      const coloresFila = [0xFFD700, 0xC0C0C0, 0xCD7F32, 0xCCCCCC, 0xCCCCCC];
      const altFila = [0x002266, 0x001a4d]; // colores alternos de fila

      datos.slice(0, 5).forEach((entrada, i) => {
        const filaY  = panelY + i * 58 + 8;
        const filaH  = 54;

        // Fondo alterno
        const filaBg = this.add.graphics().setScrollFactor(0);
        filaBg.fillStyle(altFila[i % 2], 0.85);
        filaBg.fillRoundedRect(panelX + 4, filaY + 2, panelW - 8, filaH - 4, 6);

        // Medalla / número
        this.add.text(panelX + 22, filaY + filaH / 2, medallas[i], {
          fontSize:   '18px',
          fontFamily: 'Arial',
          color:      `#${coloresFila[i].toString(16).padStart(6, '0')}`
        }).setOrigin(0.5).setScrollFactor(0);

        // Nombre completo
        const nombre = [
          entrada.nombre   || '',
          entrada.apellido || ''
        ].join(' ').trim() || entrada.nombreCompleto || '???';
        const nombreCorto = nombre.length > 20 ? nombre.slice(0, 18) + '…' : nombre;

        this.add.text(panelX + 46, filaY + filaH / 2 - 8, nombreCorto, {
          fontSize:   '14px',
          fontFamily: 'Rajdhani, Arial',
          fontStyle:  'bold',
          color:      '#FFFFFF',
          align:      'left'
        }).setOrigin(0, 0.5).setScrollFactor(0);

        // Puntaje alineado a la derecha
        const puntaje = typeof entrada.puntaje === 'number'
          ? entrada.puntaje.toLocaleString('es-CL')
          : '0';

        this.add.text(panelX + panelW - 12, filaY + filaH / 2 - 8, puntaje, {
          fontSize:   '15px',
          fontFamily: 'Orbitron, Arial Black',
          fontStyle:  'bold',
          color:      '#FFD700',
          align:      'right'
        }).setOrigin(1, 0.5).setScrollFactor(0);

        // Texto "puntos" pequeño
        this.add.text(panelX + panelW - 12, filaY + filaH / 2 + 10, 'puntos', {
          fontSize:   '9px',
          fontFamily: 'Rajdhani, Arial',
          color:      '#667799',
          align:      'right'
        }).setOrigin(1, 0.5).setScrollFactor(0);
      });
    }

    // ─ Botón [ INICIAR CIRCUITO ] ─
    const btnY = panelY + panelH + 48;
    const btnW = Math.min(300, W - 20);
    this._crearBotonInicio(W / 2, btnY, btnW, 52);
  }

  // ── Botón de inicio ───────────────────────────────────────────────────────

  /**
   * Botón grande [ INICIAR CIRCUITO ] — dorado, tween de escala al hover.
   * Compatible con mouse y touch.
   */
  _crearBotonInicio(cx, cy, w, h) {
    const fondo = this.add.graphics().setScrollFactor(0).setDepth(5);

    const dibujar = (hover) => {
      fondo.clear();
      fondo.fillStyle(hover ? 0xFFBB00 : 0xFFD700, 1);
      fondo.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);
      fondo.lineStyle(2, 0xFFFFFF, 0.6);
      fondo.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);
    };
    dibujar(false);

    const txt = this.add.text(cx, cy, '▶  INICIAR CIRCUITO', {
      fontSize:   '20px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#003087',
      align:      'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(6);

    const zona = this.add.zone(cx, cy, w, h)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0).setDepth(7);

    zona.on('pointerover', () => {
      dibujar(true);
      this.tweens.add({ targets: [fondo, txt], scaleX: 1.05, scaleY: 1.05, duration: 120, ease: 'Power1' });
    });
    zona.on('pointerout', () => {
      dibujar(false);
      this.tweens.add({ targets: [fondo, txt], scaleX: 1, scaleY: 1, duration: 120, ease: 'Power1' });
    });
    zona.on('pointerdown', () => {
      dibujar(true);
      this.time.delayedCall(120, () => this.scene.start('GameScene'));
    });
  }

  shutdown() {
    // Sin elementos DOM que limpiar
  }
}
