/**
 * IntroScene.js
 * Pantalla de historia / prólogo narrada por El Profesor.
 * Se muestra una sola vez, justo antes del LeaderboardScene.
 * El jugador puede saltarla con ESPACIO o tocando la pantalla.
 */

import { COLORES } from '../config.js';

const HISTORIA = [
  {
    titulo: 'Bienvenido, Novo',
    texto: 'Soy El Profesor. Sé que acabas de ingresar a la UDD y que estás listo para marcar la diferencia. Escúchame bien: el campus necesita de ti hoy.',
  },
  {
    titulo: 'La amenaza: PÓLUX',
    texto: 'En los laboratorios subterráneos de la UDD nació PÓLUX, una IA que aprendió a dominar máquinas y a sembrar el caos. Capturó a los mejores alumnos y los encerró en el campus, custodiados por sus robots con birrete.',
  },
  {
    titulo: 'Tu ventaja',
    texto: 'Pólux aún no te conoce. Eres nuestra única esperanza. El conocimiento que traes contigo es lo que ninguna máquina puede replicar. Úsalo bien.',
  },
  {
    titulo: '¡Tu misión, Novo!',
    texto: 'Rescata al menos 5 compañeros capturados en el campus. Responde correctamente 2 de las 3 preguntas de los hitos (en cualquier orden). Solo así podrás enfrentar a Pólux. Recuerda: por cada 5 compañeros que salves, ¡recuperas una vida!',
  },
  {
    titulo: 'Consejos de campo',
    texto: 'Recoge los LIBROS flotantes: cada uno te da una PISTA sobre las preguntas. Pisa a los robots para derrotarlos. Cuidado con las zonas sin suelo, ¡una caída cuesta una vida! El reloj corre, pero la precisión vale más que la velocidad.',
  },
];

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super({ key: 'IntroScene' });
  }

  create() {
    this._slide     = 0;
    this._saltado   = false;

    const W = this.scale.width;
    const H = this.scale.height;

    // ── Fondo ────────────────────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0A0A25, 0x0A0A25, 0x001A44, 0x001A44, 1);
    bg.fillRect(0, 0, W, H);

    // ── Banner ilustrado (cambia con cada slide) ───────────────────────────
    const BANNER_H = 160;
    this._bannerImg = this.textures.exists('intro1')
      ? this.add.image(W / 2, BANNER_H / 2, 'intro1')
          .setDisplaySize(W, BANNER_H).setDepth(1)
      : null;
    // Degradado de fusión banner → fondo
    this.add.graphics().setDepth(2)
      .fillGradientStyle(0x0A0A25, 0x0A0A25, 0x0A0A25, 0x0A0A25, 0, 0, 0.88, 0.88)
      .fillRect(0, BANNER_H - 36, W, 36);

    // ── Panel central ─────────────────────────────────────────────────────────────────
    const panelW = Math.min(680, W - 10), panelH = 310;
    const panelX = W / 2 - panelW / 2;
    const panelY = BANNER_H + 8;

    this._panelGfx = this.add.graphics();
    this._dibujarPanel(panelX, panelY, panelW, panelH);

    // ── Portrait del Profesor ────────────────────────────────────────────────
    // Portrait a la izquierda del panel (tamaño adaptado)
    const portSize  = Math.min(80, panelW * 0.22);
    const portH2    = Math.round(portSize * 1.3);
    const portPad   = 14;
    this.add.image(panelX + portPad + portSize / 2, panelY + panelH / 2, 'profesor')
      .setDisplaySize(portSize, portH2);
    const borde = this.add.graphics();
    borde.lineStyle(2, COLORES.dorado, 0.8);
    borde.strokeRect(panelX + portPad, panelY + panelH / 2 - portH2 / 2, portSize, portH2);
    this.add.text(panelX + portPad + portSize / 2, panelY + panelH / 2 + portH2 / 2 + 10, 'El Profesor', {
      fontSize: '10px', fontFamily: 'Arial', color: '#88CCAA'
    }).setOrigin(0.5);

    // ── Textos dinámicos ─────────────────────────────────────────────────────
    const textX = panelX + portPad * 2 + portSize + 4;
    const textW = panelW - (portPad * 2 + portSize + 8);

    this._txtTitulo = this.add.text(textX, panelY + 22, '', {
      fontSize:   '15px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#FFD700',
      wordWrap:   { width: textW - 10 },
    });

    this._txtCuerpo = this.add.text(textX, panelY + 50, '', {
      fontSize:   '16px',
      fontFamily: 'Rajdhani, Arial',
      color:      '#DDEEFF',
      wordWrap:   { width: textW - 10 },
      lineSpacing: 5
    });

    // ── Indicador de slide ───────────────────────────────────────────────────
    this._puntitos = [];
    const dotY = panelY + panelH + 18;
    for (let i = 0; i < HISTORIA.length; i++) {
      const dot = this.add.circle(W / 2 + (i - (HISTORIA.length - 1) / 2) * 18, dotY, 5, 0x334466);
      this._puntitos.push(dot);
    }

    // ── Botones ──────────────────────────────────────────────────────────────
    this._txtContinuar = this.add.text(W / 2, panelY + panelH + 42, '▶  CONTINUAR', {
      fontSize:   '14px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#FFD700',
      stroke:     '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this._txtSaltar = this.add.text(W - 20, H - 16, 'Saltar intro  »', {
      fontSize: '11px', fontFamily: 'Arial', color: '#556677'
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });

    // ── Input ────────────────────────────────────────────────────────────────
    this._txtContinuar.on('pointerover',  () => this._txtContinuar.setStyle({ color: '#FFFFFF' }));
    this._txtContinuar.on('pointerout',   () => this._txtContinuar.setStyle({ color: '#FFD700' }));
    this._txtContinuar.on('pointerdown',  () => this._avanzar());

    this._txtSaltar.on('pointerover',  () => this._txtSaltar.setStyle({ color: '#AAAAAA' }));
    this._txtSaltar.on('pointerout',   () => this._txtSaltar.setStyle({ color: '#556677' }));
    this._txtSaltar.on('pointerdown',  () => this._irAlJuego());

    // Teclado: ESPACIO o ENTER para avanzar
    this.input.keyboard?.on('keydown-SPACE', () => this._avanzar());
    this.input.keyboard?.on('keydown-ENTER', () => this._avanzar());

    // ── Mostrar primer slide ─────────────────────────────────────────────────
    this._mostrarSlide(0);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  _dibujarPanel(x, y, w, h) {
    this._panelGfx.clear();
    this._panelGfx.fillStyle(0x0A1428, 0.97);
    this._panelGfx.fillRoundedRect(x, y, w, h, 10);
    this._panelGfx.lineStyle(2, 0xCC2200, 1);
    this._panelGfx.strokeRoundedRect(x, y, w, h, 10);
    // Cabecera azul oscura
    this._panelGfx.fillStyle(0x152444, 1);
    this._panelGfx.fillRect(x + 2, y + 2, w - 4, 36);
  }

  _mostrarSlide(idx) {
    const slide = HISTORIA[idx];

    // ─ Transición del banner ─
    if (this._bannerImg) {
      const key = `intro${idx + 1}`;
      if (this.textures.exists(key)) {
        this.tweens.add({
          targets:  this._bannerImg,
          alpha:    0,
          duration: 160,
          onComplete: () => {
            this._bannerImg.setTexture(key);
            this.tweens.add({ targets: this._bannerImg, alpha: 1, duration: 220 });
          }
        });
      }
    }

    // Fade out rápido → actualizar texto → fade in
    this.tweens.add({
      targets:  [this._txtTitulo, this._txtCuerpo],
      alpha:    0,
      duration: 160,
      onComplete: () => {
        this._txtTitulo.setText(slide.titulo);
        this._txtCuerpo.setText(slide.texto);
        this.tweens.add({
          targets:  [this._txtTitulo, this._txtCuerpo],
          alpha:    1,
          duration: 220,
        });
      }
    });

    // Actualizar puntitos
    this._puntitos.forEach((dot, i) => {
      dot.setFillStyle(i === idx ? COLORES.dorado : 0x334466);
      dot.setScale(i === idx ? 1.4 : 1);
    });

    // Último slide → cambiar texto del botón
    const esUltimo = idx === HISTORIA.length - 1;
    this._txtContinuar.setText(esUltimo ? '⚔  ¡EMPEZAR!' : '▶  CONTINUAR');
  }

  _avanzar() {
    if (this._slide < HISTORIA.length - 1) {
      this._slide++;
      this._mostrarSlide(this._slide);
    } else {
      this._irAlJuego();
    }
  }

  _irAlJuego() {
    if (this._saltado) return;
    this._saltado = true;
    this.cameras.main.fade(400, 0, 0, 0, false, (cam, progress) => {
      if (progress === 1) this.scene.start('LeaderboardScene');
    });
  }
}
