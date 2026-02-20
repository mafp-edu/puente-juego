/**
 * CutscenePreBoss.js
 * Cutscene dramática de transición: El Profesor advierte a Novo sobre Pólux.
 * Se lanza cuando el jugador completa el circuito (META) en GameScene.
 * Estilo IntroScene: portrait + texto + botón "¡A LUCHAR!" → BossScene.
 */

import { COLORES } from '../config.js';

export default class CutscenePreBoss extends Phaser.Scene {
  constructor() {
    super({ key: 'CutscenePreBoss' });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  init(data) {
    this._stats = data || {};
    this._yendo = false;
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Fondo (sala de servidores o degradado de emergencia) ─────────────────
    if (this.textures.exists('bossFondo1')) {
      this.add.image(W / 2, H / 2, 'bossFondo1').setDisplaySize(W, H).setDepth(-1);
    } else {
      const bg = this.add.graphics().setDepth(-1);
      bg.fillGradientStyle(0x0D0008, 0x0D0008, 0x1A0010, 0x1A0010, 1);
      bg.fillRect(0, 0, W, H);
    }

    // ─ Música: arrancar musicaFin aquí (escenario final) ─
    const musFin = this.sound.get('musicaFin');
    if (musFin) {
      if (!musFin.isPlaying) musFin.play({ loop: true });
    } else {
      this.sound.add('musicaFin', { loop: true, volume: 0.45 }).play();
    }

    // Overlay oscuro para que el panel se lea bien
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.45);

    // ── Panel central ────────────────────────────────────────────────────────
    const panelW = Math.min(370, W - 20);
    const panelH = 340;
    const panelX = W / 2 - panelW / 2;
    const panelY = H / 2 - panelH / 2;

    const panel = this.add.graphics();
    // Fondo
    panel.fillStyle(0x0A0012, 0.95);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    // Borde rojo
    panel.lineStyle(2, 0xFF2244, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    // Cabecera oscura
    panel.fillStyle(0x1A0010, 1);
    panel.fillRect(panelX + 2, panelY + 2, panelW - 4, 36);
    // Línea divisoria
    panel.fillStyle(0xFF2244, 1);
    panel.fillRect(panelX + 2, panelY + 37, panelW - 4, 2);

    // Título del panel
    this.add.text(W / 2, panelY + 19, '⚠  ALERTA  ⚠', {
      fontSize:   '14px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#FF4444',
      stroke:     '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    // ── Portrait del Profesor ────────────────────────────────────────────────
    const portW = 72, portH = 94;
    const portPad = 14;
    const portX = panelX + portPad;
    const portCY = panelY + panelH / 2 + 14;

    this.add.image(portX + portW / 2, portCY, 'profesor')
      .setDisplaySize(portW, portH);

    const borde = this.add.graphics();
    borde.lineStyle(2, 0xFF2244, 0.7);
    borde.strokeRect(portX, portCY - portH / 2, portW, portH);

    this.add.text(portX + portW / 2, portCY + portH / 2 + 10, 'El Profesor', {
      fontSize: '10px', fontFamily: 'Arial', color: '#CC8888'
    }).setOrigin(0.5);

    // ── Texto con efecto máquina de escribir ─────────────────────────────────
    const txtX = portX + portW + 10;
    const txtW = panelW - (portW + portPad + 18);

    let nombre = 'Novo';
    try {
      const raw = localStorage.getItem('jugadorActual');
      if (raw) nombre = JSON.parse(raw).nombre || 'Novo';
    } catch (_) {}

    const mensaje =
      `¡${nombre}! Has debilitado las defensas de Pólux ` +
      `y liberado a nuestros compañeros del campus.\n\n` +
      `Pero la IA está furiosa. Viene en persona a destruirte.\n\n` +
      `Esta es la batalla final. Salta cuatro veces sobre Pólux para derrotarlo.\n\n` +
      `¡El futuro de la universidad depende de ti!`;

    this._txtCuerpo = this.add.text(txtX, panelY + 50, '', {
      fontSize:    '13px',
      fontFamily:  'Rajdhani, Arial',
      color:       '#DDEEFF',
      wordWrap:    { width: txtW - 4 },
      lineSpacing: 4
    });

    // ── Botón ────────────────────────────────────────────────────────────────
    this._txtBoton = this.add.text(W / 2, panelY + panelH + 40, '⚔  ¡A LUCHAR!', {
      fontSize:   '16px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#FF4444',
      stroke:     '#000000',
      strokeThickness: 3
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    this._txtBoton.on('pointerover',  () => this._txtBoton.setStyle({ color: '#FFFFFF' }));
    this._txtBoton.on('pointerout',   () => this._txtBoton.setStyle({ color: '#FF4444' }));
    this._txtBoton.on('pointerdown',  () => this._irAlBoss());

    // Pulsar espacio/enter también funciona cuando el botón ya está visible
    this.input.keyboard?.on('keydown-SPACE', () => { if (!this._txtBoton.alpha) return; this._irAlBoss(); });
    this.input.keyboard?.on('keydown-ENTER', () => { if (!this._txtBoton.alpha) return; this._irAlBoss(); });

    // ── Efecto de entrada ────────────────────────────────────────────────────
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Iniciar typewriter tras breve pausa
    this.time.delayedCall(600, () => {
      this._iniciarTypewriter(mensaje, this._txtCuerpo, 22, () => {
        this.tweens.add({ targets: this._txtBoton, alpha: 1, duration: 400 });
      });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  _iniciarTypewriter(texto, campo, velocidadMs, alTerminar) {
    let idx = 0;
    campo.setText('');
    const timer = this.time.addEvent({
      delay: velocidadMs,
      callback: () => {
        idx++;
        campo.setText(texto.slice(0, idx));
        if (idx >= texto.length) {
          timer.remove();
          if (alTerminar) alTerminar();
        }
      },
      loop: true
    });
  }

  _irAlBoss() {
    if (this._yendo) return;
    this._yendo = true;
    this.cameras.main.fade(400, 0, 0, 0, false, (_cam, progress) => {
      if (progress === 1) this.scene.start('BossScene', this._stats);
    });
  }
}
