/**
 * Player.js
 * Clase que representa a Novo, el protagonista.
 * Gestiona movimiento, salto doble, animaciones y vidas.
 * Usa el sprite placeholder 'jugador' (rectángulo azul 32×50).
 */

import { MUNDO, COLORES } from '../config.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene   – escena propietaria
   * @param {number}       x       – posición X inicial
   * @param {number}       y       – posición Y inicial
   */
  constructor(scene, x, y) {
    const texInicial = scene.textures.exists('novoIdle') ? 'novoIdle' : 'jugador';
    super(scene, x, y, texInicial);

    // Añadir a la escena y al sistema de física
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // ─ Configuración física ─
    this.setCollideWorldBounds(false); // permitir caer al vacío
    this.body.setSize(26, 44);         // hitbox ajustada
    this.body.setOffset(3, 6);

    // ─ Estado del jugador ─
    this.vidas         = MUNDO.vidasIniciales;
    this.monedas       = 0;
    this.puntaje       = 0;
    this.enemigosDerrotados = 0;
    this.saltosDisp    = 2;   // doble salto
    this.estaVivo      = true;
    this.invencible    = false; // frames de invencibilidad tras daño

    // ─ Controles de teclado (con null-check para dispositivos sin teclado) ─
    this._teclas = null;
    if (scene.input.keyboard) {
      this._teclas = scene.input.keyboard.addKeys({
        izq:    Phaser.Input.Keyboard.KeyCodes.LEFT,
        der:    Phaser.Input.Keyboard.KeyCodes.RIGHT,
        salto:  Phaser.Input.Keyboard.KeyCodes.SPACE,
        arriba: Phaser.Input.Keyboard.KeyCodes.UP,
        a:      Phaser.Input.Keyboard.KeyCodes.A,
        d:      Phaser.Input.Keyboard.KeyCodes.D
      });
    }

    // Evitar disparar salto múltiple en la misma pulsación
    this._saltoPresionado = false;

    // ─ Estado de entrada táctil (D-pad virtual) ─
    this.touchIzq            = false;  // mantenido por GameScene
    this.touchDer            = false;
    this.touchJumpActivo     = false;  // true mientras el dedo está en el botón
    this._touchJumpAnterior  = false;  // para detectar flanco de subida

    // ─ Crear animaciones placeholder (usando la textura estática) ─
    this._crearAnimaciones(scene);
  }

  // ── Animaciones ─────────────────────────────────────────────────────────────

  _crearAnimaciones(scene) {
    this._estado = 'idle';
    this._tieneSprites = scene.textures.exists('novoIdle') &&
                         scene.textures.exists('novoWalk') &&
                         scene.textures.exists('novoJump');

    if (!this._tieneSprites) return;

    // Idle: 4 frames, 6 fps, loop
    if (!scene.anims.exists('novo_idle')) {
      scene.anims.create({
        key:       'novo_idle',
        frames:    scene.anims.generateFrameNumbers('novoIdle', { start: 0, end: 3 }),
        frameRate: 6,
        repeat:    -1
      });
    }
    // Walk: 4 frames, 10 fps, loop
    if (!scene.anims.exists('novo_walk')) {
      scene.anims.create({
        key:       'novo_walk',
        frames:    scene.anims.generateFrameNumbers('novoWalk', { start: 0, end: 3 }),
        frameRate: 10,
        repeat:    -1
      });
    }
    // Jump: 3 frames, 8 fps, sin loop (queda en último frame)
    if (!scene.anims.exists('novo_jump')) {
      scene.anims.create({
        key:       'novo_jump',
        frames:    scene.anims.generateFrameNumbers('novoJump', { start: 0, end: 2 }),
        frameRate: 8,
        repeat:    0
      });
    }

    // Arrancar animación inicial de inmediato
    this.play('novo_idle');
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  /** Llamado en el update de GameScene */
  update() {
    if (!this.estaVivo || !this.active) return;

    // Obtener estado de teclas (puede ser null en móvil sin teclado)
    const izq    = this._teclas?.izq;
    const der    = this._teclas?.der;
    const salto  = this._teclas?.salto;
    const arriba = this._teclas?.arriba;
    const a      = this._teclas?.a;
    const d      = this._teclas?.d;

    const enSuelo = this.body.blocked.down;

    // Restablecer saltos al tocar el suelo
    if (enSuelo) {
      this.saltosDisp = 2;
    }

    // ─ Movimiento horizontal (teclado O táctil) ─
    if ((izq?.isDown) || (a?.isDown) || this.touchIzq) {
      this.setVelocityX(-MUNDO.velocidadJugador);
      this.setFlipX(true);
      this._estado = 'run';
    } else if ((der?.isDown) || (d?.isDown) || this.touchDer) {
      this.setVelocityX(MUNDO.velocidadJugador);
      this.setFlipX(false);
      this._estado = 'run';
    } else {
      this.setVelocityX(0);
      this._estado = enSuelo ? 'idle' : 'jump';
    }

    // ─ Salto (teclado O flanco de subida del botón táctil) ─
    const touchJumpJustPressed = this.touchJumpActivo && !this._touchJumpAnterior;
    this._touchJumpAnterior    = this.touchJumpActivo;

    const teclasSalto = salto  ? Phaser.Input.Keyboard.JustDown(salto)  : false;
    const teclasArr   = arriba ? Phaser.Input.Keyboard.JustDown(arriba) : false;
    const quiereSaltar = teclasSalto || teclasArr || touchJumpJustPressed;

    if (quiereSaltar && this.saltosDisp > 0) {
      this.setVelocityY(-MUNDO.fuerzaSalto);
      this.saltosDisp--;
      this._estado = 'jump';
      this.scene.sound.play('sfxSalto', { volume: 0.5 });
      // Pequeño efecto visual de escala al saltar
      this.scene.tweens.add({
        targets:  this,
        scaleY:   1.2,
        scaleX:   0.85,
        duration: 80,
        yoyo:     true
      });
    }

    // ─ Feedback visual por estado ─
    this._actualizarVisual(enSuelo);
  }

  /** Actualiza la animación según el estado actual */
  _actualizarVisual(enSuelo) {
    if (this.invencible) return;
    if (this._tieneSprites) {
      const animMap = { idle: 'novo_idle', run: 'novo_walk', jump: 'novo_jump' };
      const animKey = animMap[this._estado] || 'novo_idle';
      // Solo cambiar animación cuando sea distinta (evita reiniciar frames)
      if (this.anims.currentAnim?.key !== animKey) {
        this.play(animKey);
      }
      this.clearTint();
    } else {
      // Fallback placeholder con tint
      const tints = { idle: 0xFFFFFF, run: 0xDDEEFF, jump: 0xAADDFF };
      this.setTint(tints[this._estado] || 0xFFFFFF);
    }
  }

  // ── Acciones ─────────────────────────────────────────────────────────────────

  /** Recoger moneda: suma puntos y actualiza contador */
  recogerMoneda(valor = 10) {
    this.monedas++;
    this.puntaje += valor;
  }

  /** Recoger libro: suma puntos extra */
  recogerLibro(valor = 25) {
    this.puntaje += valor;
  }

  /** Derrotar enemigo saltando encima */
  derrotarEnemigo(valor = 50) {
    this.enemigosDerrotados++;
    this.puntaje += valor;
    // Pequeño rebote tras derrotar
    this.setVelocityY(-350);
  }

  /** Sumar puntos de pregunta correcta */
  respuestaCorrecta(valor = 100) {
    this.puntaje += valor;
  }

  /** Ganar una vida (por rescatar 3 compañeros). Máximo 5. */
  ganarVida() {
    if (this.vidas >= 5) return false; // tope de vidas
    this.vidas++;
    // Efecto visual: breve destello verde
    this.scene.tweens.add({
      targets:  this,
      tint:     { from: 0x00FF88, to: 0xFFFFFF },
      duration: 600,
    });
    return true;
  }

  /** Perder una vida (con invencibilidad temporal) */
  perderVida() {
    if (this.invencible || !this.estaVivo) return false;

    this.vidas--;
    if (this.vidas <= 0) {
      this.morir();
      return true; // game over
    }

    // Activar invencibilidad por 1.5 segundos con parpadeo
    this.invencible = true;
    this.scene.tweens.add({
      targets:  this,
      alpha:    0.2,
      duration: 100,
      yoyo:     true,
      repeat:   7,
      onComplete: () => {
        this.setAlpha(1);
        this.invencible = false;
      }
    });

    return false;
  }

  /** Animación de muerte */
  morir() {
    this.estaVivo = false;
    this.setTint(0xFF0000);
    this.setVelocityX(0);
    this.setVelocityY(-300);
    this.body.allowGravity = true;

    this.scene.tweens.add({
      targets:  this,
      alpha:    0,
      angle:    180,
      duration: 600,
      onComplete: () => {
        this.setActive(false).setVisible(false);
      }
    });
  }

  /** Respawn en posición dada tras perder vida (no game over) */
  respawn(x, y) {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.setAlpha(1);
    this.estaVivo = true;
    this._estado = 'idle';
  }

  /** Calcula puntaje total incluyendo bonus de tiempo */
  calcularPuntajeFinal(tiempoSegundos, preguntasCorrectas) {
    const bonusTiempo = Math.max(0, 1000 - tiempoSegundos * 2);
    return (preguntasCorrectas * 100)
         + (this.enemigosDerrotados * 50)
         + (this.monedas * 10)
         + bonusTiempo;
  }
}
