/**
 * Coin.js
 * Clase base para coleccionables: monedas y libros.
 * Las monedas tienen animación de rotación/pulso.
 * Los libros muestran tooltip con frase de liderazgo al recogerse.
 */

import { COLORES } from '../config.js';

export default class Coin extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene  – escena propietaria
   * @param {number}       x      – posición X
   * @param {number}       y      – posición Y
   * @param {string}       tipo   – 'moneda' | 'libro'
   */
  constructor(scene, x, y, tipo = 'moneda') {
    super(scene, x, y, tipo);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.tipo   = tipo;
    this.valor  = tipo === 'moneda' ? 10 : 25;

    // ─ Física estática (no cae) ─
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    if (tipo === 'moneda') {
      this.body.setSize(14, 14);
      this.body.setOffset(1, 1);
    } else {
      this.body.setSize(20, 22);
      this.body.setOffset(1, 1);
    }

    // ─ Animación idle ─
    this._animarIdle(scene);
  }

  // ── Animaciones ─────────────────────────────────────────────────────────────

  _animarIdle(scene) {
    if (this.tipo === 'moneda') {
      // Bob vertical
      scene.tweens.add({
        targets:  this,
        y:        this.y - 6,
        duration: 700,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut'
      });
      // Pulso de escala (sin aplastar)
      scene.tweens.add({
        targets:  this,
        scaleX:   1.15,
        scaleY:   1.15,
        duration: 500,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut'
      });
    } else {
      // Libro: flotación suave y brillo
      scene.tweens.add({
        targets:  this,
        y:        this.y - 6,
        duration: 900,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut'
      });
      scene.tweens.add({
        targets:  this,
        alpha:    0.7,
        duration: 600,
        yoyo:     true,
        repeat:   -1
      });
    }
  }

  // ── Recolección ─────────────────────────────────────────────────────────────

  /**
   * Animación al ser recogido. Muestra tooltip si es libro.
   * @param {Phaser.Scene} scene
   * @param {Phaser.GameObjects.Camera} cam – cámara principal (para posición tooltip)
   */
  recoger(scene, cam) {
    this.body.enable = false;

    if (this.tipo === 'moneda') {
      this._animacionMoneda(scene);
    } else {
      this._animacionLibro(scene, cam);
    }
  }

  _animacionMoneda(scene) {
    // Arco hacia arriba y desvanecimiento
    scene.tweens.add({
      targets:  this,
      y:        this.y - 40,
      alpha:    0,
      scaleX:   1.5,
      scaleY:   1.5,
      duration: 300,
      ease:     'Power2',
      onComplete: () => this.destroy()
    });

    // Texto flotante
    const txt = scene.add.text(this.x, this.y - 10, `+${this.valor}`, {
      fontSize:   '14px',
      fontFamily: 'Arial Black',
      color:      '#FFD700',
      stroke:     '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(100);

    scene.tweens.add({
      targets:  txt,
      y:        this.y - 50,
      alpha:    0,
      duration: 600,
      onComplete: () => txt.destroy()
    });
  }

  _animacionLibro(scene, cam) {
    // Destello brillante
    scene.tweens.add({
      targets:  this,
      alpha:    0,
      scaleX:   2,
      scaleY:   2,
      duration: 300,
      onComplete: () => this.destroy()
    });

    // Texto de puntos
    const txt = scene.add.text(this.x, this.y - 10, `+${this.valor}`, {
      fontSize:   '16px',
      fontFamily: 'Arial Black',
      color:      '#FFD700',
      stroke:     '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(100);

    scene.tweens.add({
      targets:  txt,
      y:        this.y - 55,
      alpha:    0,
      duration: 700,
      onComplete: () => txt.destroy()
    });

    // ─ Panel de pista ─
    const pista    = this.pista    || '¡Un buen líder siempre está aprendiendo!';
    const temaHito = this.temaHito || 'PISTA';
    this._mostrarPanelPista(scene, temaHito, pista);
  }

  /** Muestra un panel con la pista de la pregunta del hito relacionado */
  _mostrarPanelPista(scene, tema, pista) {
    const W   = scene.scale.width;
    const pad = 18;

    // ─ Texto del tema (encabezado pequeño) ─
    const txtTema = scene.add.text(W / 2, 56, `📖  ${tema}`, {
      fontSize:   '11px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#FFD700',
      align:      'center'
    })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(202);

    // ─ Texto de la pista ─
    const txtPista = scene.add.text(W / 2, 74, pista, {
      fontSize:   '14px',
      fontFamily: 'Rajdhani, Arial',
      color:      '#DDEEFF',
      align:      'center',
      wordWrap:   { width: W * 0.75 }
    })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(202);

    // ─ Calcular tamaño del panel con ambos textos ─
    const allBounds = txtPista.getBounds();
    const totalH    = (txtPista.y - 56) + allBounds.height + pad * 2 + 14;

    const bg = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(200);
    bg.fillStyle(0x0A1428, 0.94);
    bg.fillRoundedRect(W / 2 - W * 0.42, 46, W * 0.84, totalH, 10);
    bg.lineStyle(2, 0xFFD700, 0.9);
    bg.strokeRoundedRect(W / 2 - W * 0.42, 46, W * 0.84, totalH, 10);
    // Franja superior dorada
    bg.fillStyle(0xCC2200, 1);
    bg.fillRect(W / 2 - W * 0.42 + 2, 46, W * 0.84 - 4, 3);

    // ─ Etiqueta "PISTA" ─
    const badge = scene.add.text(W / 2 - W * 0.42 + 12, 51, '🔍 PISTA', {
      fontSize:   '10px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#CC2200'
    })
      .setScrollFactor(0)
      .setDepth(203);

    // ─ Auto-desvanecimiento tras 3.5 s ─
    const objetos = [bg, txtTema, txtPista, badge];
    scene.time.delayedCall(3500, () => {
      scene.tweens.add({
        targets:  objetos,
        alpha:    0,
        duration: 500,
        onComplete: () => objetos.forEach(o => o.destroy())
      });
    });
  }
}
