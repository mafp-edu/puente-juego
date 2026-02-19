/**
 * DialogoScene.js
 * Escena superpuesta que muestra el diálogo de El Profesor
 * con la pregunta del hito correspondiente.
 * Se lanza con scene.launch() sobre GameScene pausada.
 *
 * Datos recibidos via init(data):
 *   data.hitoIdx   – índice del hito (0, 1, 2)
 *   data.gameScene – referencia a la GameScene para emitir eventos
 */

import { COLORES, HITOS } from '../config.js';

export default class DialogoScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DialogoScene' });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  init(data) {
    this._hitoIdx   = data.hitoIdx   || 0;
    this._gameScene = data.gameScene || null;
    this._hito      = HITOS[this._hitoIdx];
    this._respondidoCorrectamente = false;
    this._typewriterTimer = null;
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ─ Overlay oscuro ─
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.72);
    overlay.fillRect(0, 0, W, H);

    // ─ Panel principal (adaptado a retrato) ─
    const panelW = Math.min(740, W - 16);
    const panelH = 490;
    const panelX = W / 2 - panelW / 2;
    const panelY = H / 2 - panelH / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x0A1428, 0.98);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(2, 0xCC2200, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    // Cabecera azul oscura
    panel.fillStyle(0x152444, 1);
    panel.fillRect(panelX + 2, panelY + 2, panelW - 4, 44);
    // Línea de acento roja bajo cabecera
    panel.fillStyle(0xCC2200, 1);
    panel.fillRect(panelX + 2, panelY + 44, panelW - 4, 2);

    // ─ Título del hito ─
    this.add.text(W / 2, panelY + 12,
      `HITO ${this._hitoIdx + 1}  ·  ${this._hito.lugar}`, {
      fontSize: '10px', fontFamily: 'Rajdhani, Arial', color: '#6688AA'
    }).setOrigin(0.5);
    this.add.text(W / 2, panelY + 28, this._hito.tema, {
      fontSize: '13px', fontFamily: 'Orbitron, Arial Black', color: '#FFD700'
    }).setOrigin(0.5);

    // ─ Portrait del Profesor (izquierda, tamaño adaptado) ─
    const portW = Math.min(72, Math.floor(panelW * 0.18));
    const portH = Math.round(portW * 1.28);
    const portX = panelX + 10;
    const portY = panelY + 52;
    this.add.image(portX + portW / 2, portY + portH / 2, 'profesor')
      .setDisplaySize(portW, portH);
    const bordeP = this.add.graphics();
    bordeP.lineStyle(2, COLORES.dorado, 0.7);
    bordeP.strokeRect(portX, portY, portW, portH);
    this.add.text(portX + portW / 2, portY + portH + 10, 'El Profesor', {
      fontSize: '9px', fontFamily: 'Arial', color: '#88CCAA'
    }).setOrigin(0.5);

    // ─ Área de contenido (derecha del portrait) ─
    const textoX = portX + portW + 10;
    const textoW = panelX + panelW - textoX - 10;

    // Pregunta
    this.add.text(textoX, panelY + 54, this._hito.pregunta, {
      fontSize:    '14px',
      fontFamily:  'Rajdhani, Arial',
      color:       '#FFFFFF',
      wordWrap:    { width: textoW },
      lineSpacing: 4
    });

    // Separador
    const gSep = this.add.graphics();
    gSep.lineStyle(1, 0xCC2200, 0.5);
    gSep.lineBetween(panelX + 10, panelY + 196, panelX + panelW - 10, panelY + 196);
    this.add.text(panelX + 12, panelY + 202, 'Elige la respuesta correcta:', {
      fontSize: '11px', fontFamily: 'Rajdhani, Arial', color: '#6688AA'
    });

    // ─ Botones de opciones — ancho completo del panel ─
    this._mostrarBotonesOpciones(panelX + 10, panelY, panelW - 10);

    // ─ Feedback ─
    this._txtFeedback = this.add.text(W / 2, panelY + panelH - 10, '', {
      fontSize:   '12px',
      fontFamily: 'Rajdhani, Arial',
      color:      '#FFFFFF',
      align:      'center',
      wordWrap:   { width: panelW - 24 }
    }).setOrigin(0.5, 1);  // ancla en el borde inferior → crece hacia arriba

    // ─ Animación de entrada ─
    panel.setAlpha(0);
    this.tweens.add({ targets: panel, alpha: 1, duration: 250 });
  }

  // ── Typewriter ───────────────────────────────────────────────────────────────

  /**
   * Efecto typewriter: agrega una letra cada 'velocidad' ms.
   * @param {string}   texto     – texto completo a mostrar
   * @param {Phaser.GameObjects.Text} campo – objeto texto destino
   * @param {number}   velocidad – ms por caracter
   * @param {Function} alTerminar – callback cuando termina
   */
  _iniciarTypewriter(texto, campo, velocidad, alTerminar) {
    let idx = 0;
    campo.setText('');

    if (this._typewriterTimer) {
      this._typewriterTimer.remove();
    }

    this._typewriterTimer = this.time.addEvent({
      delay:    velocidad,
      callback: () => {
        idx++;
        campo.setText(texto.slice(0, idx));
        if (idx >= texto.length) {
          this._typewriterTimer.remove();
          if (alTerminar) alTerminar();
        }
      },
      loop: true
    });
  }

  // ── Botones de opciones ──────────────────────────────────────────────────────

  _mostrarBotonesOpciones(textoX, panelY, textoW) {
    const btnAlto  = 50;
    const gap      = 6;
    const inicioY  = panelY + 216;
    const btnAncho = textoW - 10;
    const letras   = ['A', 'B', 'C'];

    this._botonesOpciones = [];

    this._hito.opciones.forEach((opcion, i) => {
      const btn = this._crearBotonOpcion(
        textoX,
        inicioY + i * (btnAlto + gap),
        btnAncho, btnAlto, letras[i], opcion, i
      );
      this._botonesOpciones.push(btn);
    });
  }

  _crearBotonOpcion(x, y, w, h, letra, texto, idx) {
    const contenedor = this.add.container(x, y);

    // Fondo
    const bg = this.add.graphics();
    bg.fillStyle(0x1A2A4A, 1);
    bg.fillRoundedRect(0, 0, w, h, 6);
    bg.lineStyle(2, 0x334488, 1);
    bg.strokeRoundedRect(0, 0, w, h, 6);

    // Letra (A, B, C)
    const txtLetra = this.add.text(16, h / 2, letra, {
      fontSize:   '16px',
      fontFamily: 'Arial Black',
      color:      '#FFD700'
    }).setOrigin(0, 0.5);

    // Separador
    const sep = this.add.graphics();
    sep.lineStyle(1, 0x334488, 0.7);
    sep.lineBetween(34, 8, 34, h - 8);

    // Texto de la opción
    const txtOpc = this.add.text(44, h / 2, texto, {
      fontSize:   '12px',
      fontFamily: 'Rajdhani, Arial',
      color:      '#FFFFFF',
      wordWrap:   { width: w - 54 },
      lineSpacing: 2
    }).setOrigin(0, 0.5);

    contenedor.add([bg, txtLetra, sep, txtOpc]);

    // ─ Interactividad ─
    const zona = this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive();
    this.input.setTopOnly(false);

    zona.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x003087, 1);
      bg.fillRoundedRect(0, 0, w, h, 6);
      bg.lineStyle(2, COLORES.dorado, 1);
      bg.strokeRoundedRect(0, 0, w, h, 6);
      this.input.setDefaultCursor('pointer');
    });

    zona.on('pointerout', () => {
      if (this._respondidoCorrectamente) return;
      bg.clear();
      bg.fillStyle(0x1A2A4A, 1);
      bg.fillRoundedRect(0, 0, w, h, 6);
      bg.lineStyle(2, 0x334488, 1);
      bg.strokeRoundedRect(0, 0, w, h, 6);
      this.input.setDefaultCursor('default');
    });

    zona.on('pointerdown', () => {
      this._evaluarRespuesta(idx, bg, w, h, txtOpc);
    });

    return { contenedor, bg, zona, w, h };
  }

  // ── Evaluación de respuesta ──────────────────────────────────────────────────

  _evaluarRespuesta(idxElegido, bg, w, h, txtOpc) {
    // Deshabilitar todos los botones temporalmente
    this._botonesOpciones.forEach(b => b.zona.disableInteractive());

    const esCorrecta = idxElegido === this._hito.correcta;

    if (esCorrecta) {
      this._respondidoCorrectamente = true;
      // Resaltar en verde
      bg.clear();
      bg.fillStyle(0x00AA44, 1);
      bg.fillRoundedRect(0, 0, w, h, 6);
      bg.lineStyle(2, 0x00FF88, 1);
      bg.strokeRoundedRect(0, 0, w, h, 6);

      // Flash verde en el panel
      this.cameras.main.flash(300, 0, 200, 80);
      this.sound.play('sfxCorrecto', { volume: 0.7 });

      // Feedback con typewriter
      this._txtFeedback.setStyle({ color: '#00FF88' });
      this._iniciarTypewriter(
        `✅  ${this._hito.feedbackCorrecto}`,
        this._txtFeedback, 20,
        () => {
          // Cerrar diálogo tras 1.5 segundos
          this.time.delayedCall(1500, () => {
            this._cerrarDialogo(true);
          });
        }
      );
    } else {
      // Resaltar en rojo
      bg.clear();
      bg.fillStyle(0xAA0022, 1);
      bg.fillRoundedRect(0, 0, w, h, 6);
      bg.lineStyle(2, 0xFF2244, 1);
      bg.strokeRoundedRect(0, 0, w, h, 6);

      // Flash rojo
      this.cameras.main.flash(300, 200, 0, 40);
      this.sound.play('sfxIncorrecto', { volume: 0.7 });

      // Notificar a GameScene: pierde una vida
      if (this._gameScene) {
        this._gameScene.events.emit('dialogoVidaPerdida');
      }

      // Feedback de error
      this._txtFeedback.setStyle({ color: '#FF6688' });
      this._iniciarTypewriter(
        `❌  ${this._hito.feedbackIncorrecto}`,
        this._txtFeedback, 22,
        () => {
          // Restaurar y permitir reintentar después de 1.5 s
          this.time.delayedCall(1500, () => {
            // Resetear color del botón equivocado
            bg.clear();
            bg.fillStyle(0x1A2A4A, 1);
            bg.fillRoundedRect(0, 0, w, h, 6);
            bg.lineStyle(2, 0x334488, 1);
            bg.strokeRoundedRect(0, 0, w, h, 6);

            this._txtFeedback.setText('');
            // Rehabilitar botones para reintento
            this._botonesOpciones.forEach(b => b.zona.setInteractive());

            // Emitir evento para GameScene (sin penalización)
            if (this._gameScene) {
              this._gameScene.events.emit('dialogoIncorrecto');
            }
          });
        }
      );
    }
  }

  // ── Cerrar diálogo ────────────────────────────────────────────────────────────

  _cerrarDialogo(correcto) {
    // Animación de salida
    this.cameras.main.fade(300, 0, 0, 0, false, (cam, progress) => {
      if (progress === 1) {
        // Emitir evento a GameScene
        if (this._gameScene && correcto) {
          this._gameScene.events.emit('dialogoCorrecto', this._hitoIdx);
        }
        this.scene.stop('DialogoScene');
      }
    });
  }

  // ── Limpieza ─────────────────────────────────────────────────────────────────

  shutdown() {
    if (this._typewriterTimer) {
      this._typewriterTimer.remove();
    }
    this.input.setDefaultCursor('default');
  }
}
