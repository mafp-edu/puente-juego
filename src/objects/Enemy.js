/**
 * Enemy.js
 * Clase que representa a los robots-enemigos con birrete.
 * Patrullan de un lado a otro sobre las plataformas.
 * Se destruyen cuando el jugador salta encima de ellos.
 */

import { COLORES } from '../config.js';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene  – escena propietaria
   * @param {number}       x      – posición X inicial
   * @param {number}       y      – posición Y inicial
   * @param {number}       rangoX – distancia de patrullaje a cada lado (px)
   */
  constructor(scene, x, y, rangoX = 80) {
    // Preferir spritesheet real; fallback al placeholder estático
    const texKey = scene.textures.exists('enemigoWalk') ? 'enemigoWalk' : 'enemigo';
    super(scene, x, y, texKey);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // ─ Física ─
    this.body.setSize(26, 38);
    this.body.setOffset(3, 3);
    this.setCollideWorldBounds(false);

    // ─ Patrullaje ─
    this._origenX   = x;
    this._rangoX    = rangoX;
    this._velocidad = 80;
    this._direccion = 1; // 1 = derecha, -1 = izquierda

    this.setVelocityX(this._velocidad);
    this.estaVivo = true;

    // ─ Arrancar animación si el spritesheet real fue cargado ─
    if (texKey === 'enemigoWalk' && scene.anims.exists('enemigo_walk')) {
      this.play('enemigo_walk');
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  update() {
    if (!this.estaVivo || !this.active) return;

    // Invertir dirección al llegar al límite del rango
    if (this.x >= this._origenX + this._rangoX) {
      this._direccion = -1;
      this.setFlipX(true);
    } else if (this.x <= this._origenX - this._rangoX) {
      this._direccion = 1;
      this.setFlipX(false);
    }

    this.setVelocityX(this._velocidad * this._direccion);
  }

  // ── Acciones ─────────────────────────────────────────────────────────────────

  /** Animación de destrucción al ser pisado */
  destruir(escena) {
    this.estaVivo = false;
    this.body.enable = false;

    // Partículas de explosión simple con rectángulos
    const colores = [COLORES.rojoPolux, COLORES.dorado, 0xFF8800];
    for (let i = 0; i < 8; i++) {
      const angulo = (i / 8) * Math.PI * 2;
      const dist   = Phaser.Math.Between(20, 60);
      const px     = this.x + Math.cos(angulo) * 5;
      const py     = this.y + Math.sin(angulo) * 5;
      const color  = Phaser.Utils.Array.GetRandom(colores);

      const particula = escena.add.rectangle(px, py, 6, 6, color);
      escena.tweens.add({
        targets:  particula,
        x:        px + Math.cos(angulo) * dist,
        y:        py + Math.sin(angulo) * dist - 20,
        alpha:    0,
        duration: 350,
        ease:     'Power2',
        onComplete: () => particula.destroy()
      });
    }

    // Texto flotante de puntos
    const txtPuntos = escena.add.text(this.x, this.y - 10, '+50', {
      fontSize:   '16px',
      fontFamily: 'Arial Black',
      color:      '#FFD700',
      stroke:     '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    escena.tweens.add({
      targets:  txtPuntos,
      y:        this.y - 50,
      alpha:    0,
      duration: 700,
      onComplete: () => txtPuntos.destroy()
    });

    // Animación de aplastamiento
    escena.tweens.add({
      targets:  this,
      scaleY:   0.1,
      scaleX:   1.5,
      alpha:    0,
      duration: 200,
      onComplete: () => this.destroy()
    });
  }
}
