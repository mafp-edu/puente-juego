/**
 * BossScene.js
 * Arena de la batalla final contra Pólux.
 * El jugador debe saltar encima del boss 3 veces para derrotarlo.
 * Recibe estadísticas de GameScene vía init(data) y las pasa a FinScene al ganar.
 *
 * Controles: D-pad virtual (izq/der/salto) idéntico a GameScene.
 * Mecánica: stomp (caer sobre el boss) × 3 = victoria.
 *           contacto lateral = pierde vida. Sin vidas = Game Over → Leaderboard.
 */

import { MUNDO }          from '../config.js';
import Player             from '../objects/Player.js';
import { guardarPuntaje } from '../firebase.js';

export default class BossScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BossScene' });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  init(data) {
    this._stats          = data || {};
    this._bossHP         = 4;
    this._bossInvencible = false;
    this._bossDir        = -1;   // empieza yendo a la izquierda
    this._bossVel        = 85;
    this._juegoActivo    = false; // se activa tras la animación de entrada del boss
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  create() {
    const W = this.scale.width;   // 390
    const H = this.scale.height;  // 700

    // ─ Física: limitar el mundo al tamaño del canvas ─
    this.physics.world.setBounds(0, 0, W, H + 200);

    // ─ Fondos ────────────────────────────────────────────────────────────────
    if (this.textures.exists('bossFondo1')) {
      this.add.image(W / 2, H / 2, 'bossFondo1').setDisplaySize(W, H).setDepth(-3);
    } else {
      // Degradado de emergencia: sala de servidores oscura
      const bg = this.add.graphics().setDepth(-3);
      bg.fillGradientStyle(0x0D0008, 0x0D0008, 0x180008, 0x180010, 1);
      bg.fillRect(0, 0, W, H);
      // Simular racks de servidores con líneas
      bg.lineStyle(1, 0x440011, 0.5);
      for (let y = 80; y < H - 80; y += 22) bg.lineBetween(0, y, W, y);
      for (let x = 20; x < W; x += 30) bg.lineBetween(x, 80, x, H - 80);
      // LEDs rojos
      for (let i = 0; i < 12; i++) {
        const lx = 15 + (i % 3) * 30 + (i < 6 ? 0 : W - 100);
        const ly = 100 + Math.floor(i / 3) * 80;
        bg.fillStyle(0xFF2200, 0.9);
        bg.fillCircle(lx, ly, 3);
      }
    }

    if (this.textures.exists('bossFondo2')) {
      this.add.image(W / 2, H / 2, 'bossFondo2').setDisplaySize(W, H).setDepth(-2);
    }

    // ─ Plataformas ───────────────────────────────────────────────────────────
    this._plataformas = this.physics.add.staticGroup();
    const suelo = H - 62;
    this._suelo = suelo;
    this._crearArena(W, H, suelo);

    // ─ Jugador (3 vidas extra para la batalla final) ─────────────────────────
    this._jugador = new Player(this, 60, suelo - 55);
    this._jugador.vidas = 3;
    this._jugador.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, W, H + 200);

    this.physics.add.collider(this._jugador, this._plataformas);

    // ─ Cámara estática ───────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, W, H);

    // ─ Boss ──────────────────────────────────────────────────────────────────
    this._crearBoss(W, H, suelo);

    this.physics.add.collider(this._boss, this._plataformas);
    this.physics.add.overlap(
      this._jugador, this._boss,
      this._onContactoBoss, null, this
    );

    // ─ HUD ───────────────────────────────────────────────────────────────────
    this._crearHUD(W, H);

    // ─ Controles táctiles ────────────────────────────────────────────────────
    this._crearControlesMovil(W, H);

    // ─ Fade-in ───────────────────────────────────────────────────────────────
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  update() {
    if (!this._juegoActivo) return;

    this._jugador.update();

    // ─ Boss AI ─
    if (this._boss?.active) {
      // Chequeo de límites: siempre activo (incluso durante invencibilidad)
      if (this._boss.x >= this._bossArenaMax) {
        this._bossDir = -1;
        this._boss.setFlipX(true);
        this._boss.setX(this._bossArenaMax);
      } else if (this._boss.x <= this._bossArenaMin) {
        this._bossDir = 1;
        this._boss.setFlipX(false);
        this._boss.setX(this._bossArenaMin);
      }

      // Aplicar velocidad solo cuando no está en modo invencible
      if (!this._bossInvencible) {
        this._boss.setVelocityX(this._bossVel * this._bossDir);
      }
    }

    // ─ Nombre flotante sobre el boss ─
    if (this._txtBossNombre && this._boss?.active) {
      this._txtBossNombre.setPosition(this._boss.x, this._boss.y - 54);
    }

    // ─ Caída al vacío ─
    if (this._jugador.y > this.scale.height + 60) {
      const gameOver = this._jugador.perderVida();
      this._actualizarHUD();
      if (gameOver) {
        this._gameOver();
      } else {
        this._jugador.respawn(this.scale.width / 2, this._suelo - 80);
      }
    }
  }

  // ── Construcción del nivel ───────────────────────────────────────────────────

  _crearArena(W, H, suelo) {
    // Suelo completo
    this._addPlat(0, suelo, W, 32);

    // Plataformas elevadas (para el jugador, no el boss)
    this._addPlat(20,       suelo - 160,  80, 14);  // izquierda
    this._addPlat(W - 100,  suelo - 160,  80, 14);  // derecha
    this._addPlat(W / 2 - 55, suelo - 295, 110, 14); // centro-alto

    // Título de batalla
    this.add.text(W / 2, 26, '⚔  BATALLA FINAL  —  PÓLUX  ⚔', {
      fontSize:   '12px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#FF4444',
      stroke:     '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    // Línea decorativa inferior del título
    this.add.graphics()
      .lineStyle(1, 0xFF2244, 0.6)
      .lineBetween(20, 40, W - 20, 40)
      .setScrollFactor(0)
      .setDepth(10);
  }

  _addPlat(x, y, w, h) {
    const p = this._plataformas.create(x + w / 2, y + h / 2, 'plataforma');
    p.setDisplaySize(w, h).refreshBody();
  }

  _crearBoss(W, H, suelo) {
    const bossX = W / 2;
    const bossY = suelo - 50;

    // Preferir spritesheet animado si fue cargado; fallback a placeholder estático
    const texKey = this.textures.exists('poluxWalk') ? 'poluxWalk' : 'polux';
    this._boss = this.physics.add.sprite(bossX, bossY, texKey);
    this._boss.setDisplaySize(64, 82);
    this._boss.body.setSize(56, 72).setOffset(4, 5);
    this._boss.body.setGravityY(400);
    this._boss.setCollideWorldBounds(true);  // nunca sale del mundo

    // Arrancar animación de caminata si el spritesheet fue cargado
    if (texKey === 'poluxWalk' && this.anims.exists('polux_walk')) {
      this._boss.play('polux_walk');
    }

    this._bossArenaMin = 45;
    this._bossArenaMax = W - 45;

    // Nombre flotante sobre el boss
    this._txtBossNombre = this.add.text(bossX, bossY - 54, 'PÓLUX', {
      fontSize:   '13px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#FF4444',
      stroke:     '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(12);

    // Animación de entrada: el boss aparece con flash
    this._boss.setAlpha(0);
    this._txtBossNombre.setAlpha(0);

    this.time.delayedCall(700, () => {
      this.cameras.main.flash(300, 255, 0, 0);
      this.tweens.add({
        targets:  [this._boss, this._txtBossNombre],
        alpha:    1,
        duration: 350,
        onComplete: () => { this._juegoActivo = true; }
      });
    });
  }

  // ── HUD ─────────────────────────────────────────────────────────────────────

  _crearHUD(W, H) {
    // ─ Caja de HP del boss (parte superior) ─
    const bgHUD = this.add.graphics().setScrollFactor(0).setDepth(150);
    bgHUD.fillStyle(0x000000, 0.78);
    bgHUD.fillRoundedRect(W / 2 - 120, 46, 240, 44, 6);
    bgHUD.lineStyle(1, 0xFF2244, 0.7);
    bgHUD.strokeRoundedRect(W / 2 - 120, 46, 240, 44, 6);

    // Nombre del boss
    this.add.text(W / 2, 55, 'PÓLUX — JEFE FINAL', {
      fontSize:   '11px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#FF4444',
      stroke:     '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(151);

    // Barra gráfica de HP (4 segmentos)
    this._bossHPBarGfx = this.add.graphics().setScrollFactor(0).setDepth(151);
    this._bossHPTotal  = this._bossHP; // guarda el máximo para el redibujado

    // ─ Vidas del jugador ─
    this._txtVidas = this.add.text(8, 48, '', {
      fontSize:   '13px',
      fontFamily: 'Orbitron',
      color:      '#FFD700',
      stroke:     '#000000',
      strokeThickness: 2
    }).setScrollFactor(0).setDepth(151);
    this._actualizarHUD();

    // ─ Instrucción (parte inferior) ─
    this.add.text(W / 2, H - 18, '¡Salta cuatro veces sobre Pólux para derrotarlo!', {
      fontSize:   '10px',
      fontFamily: 'Rajdhani, Arial',
      color:      '#888888'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(150);
  }

  /** Dibuja los 4 segmentos del HP bar del boss */
  _dibujarBossHPBar(W) {
    const g = this._bossHPBarGfx;
    if (!g) return;
    g.clear();

    const total  = this._bossHPTotal || 4;
    const segW   = 42;
    const segH   = 13;
    const gap    = 5;
    const barW   = total * segW + (total - 1) * gap;
    const startX = W / 2 - barW / 2;
    const y      = 67;

    for (let i = 0; i < total; i++) {
      const active = i < this._bossHP;
      const x = startX + i * (segW + gap);

      // Ranura vacía
      g.fillStyle(0x222222, 0.9);
      g.fillRoundedRect(x, y, segW, segH, 3);

      if (active) {
        // Color según HP restante: amarillo→naranja→rojo
        const color = this._bossHP >= 3 ? 0xFF3333
                    : this._bossHP === 2  ? 0xFF7700
                    : 0xFF0000;
        g.fillStyle(color, 1);
        g.fillRoundedRect(x + 1, y + 1, segW - 2, segH - 2, 2);
        // Brillo superior
        g.fillStyle(0xFFFFFF, 0.25);
        g.fillRoundedRect(x + 3, y + 2, segW - 6, 4, 1);
      }
    }
  }

  _actualizarHUD() {
    if (this._txtVidas) this._txtVidas.setText(`VIDAS: ${this._jugador.vidas}`);
    this._dibujarBossHPBar(this.scale.width);
  }

  // ── Controles táctiles (D-pad idéntico a GameScene) ─────────────────────────

  _crearControlesMovil(W, H) {
    const R     = 30;
    const PAD   = 12;
    const ALF   = 0.55;
    const DEPTH = 90;

    const crearBtn = (cx, cy, icono, onDown, onUp) => {
      const g = this.add.graphics()
        .setScrollFactor(0).setDepth(DEPTH).setAlpha(ALF);

      const dibujar = (presionado) => {
        g.clear();
        g.fillStyle(presionado ? 0x0055CC : 0x003087, 1);
        g.fillCircle(cx, cy, R);
        g.lineStyle(2, presionado ? 0xFFD700 : 0x4488FF, 1);
        g.strokeCircle(cx, cy, R);
      };
      dibujar(false);

      const txt = this.add.text(cx, cy, icono, {
        fontSize: '20px', fontFamily: 'Arial Black', color: '#FFFFFF'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(ALF);

      const zona = this.add.zone(cx, cy, R * 2 + 10, R * 2 + 10)
        .setScrollFactor(0).setDepth(DEPTH + 2).setInteractive();

      zona.on('pointerdown', () => {
        dibujar(true); g.setAlpha(0.9); txt.setAlpha(0.9); onDown();
      });
      const soltar = () => {
        dibujar(false); g.setAlpha(ALF); txt.setAlpha(ALF); onUp();
      };
      zona.on('pointerup',  soltar);
      zona.on('pointerout', soltar);
    };

    // Izquierda
    crearBtn(
      PAD + R, H - PAD - R, '←',
      () => { if (this._jugador) this._jugador.touchIzq = true; },
      () => { if (this._jugador) this._jugador.touchIzq = false; }
    );
    // Derecha
    crearBtn(
      PAD + R * 3 + 12, H - PAD - R, '→',
      () => { if (this._jugador) this._jugador.touchDer = true; },
      () => { if (this._jugador) this._jugador.touchDer = false; }
    );
    // Salto
    crearBtn(
      W - PAD - R, H - PAD - R, '↑',
      () => { if (this._jugador) this._jugador.touchJumpActivo = true; },
      () => { if (this._jugador) this._jugador.touchJumpActivo = false; }
    );
  }

  // ── Lógica de combate ────────────────────────────────────────────────────────

  _onContactoBoss(jugador, boss) {
    if (!this._juegoActivo || this._bossInvencible) return;

    // ¿Stomp? El jugador cae desde arriba
    if (jugador.body.velocity.y > 60 && jugador.y < boss.y - 10) {
      this._golpearBoss();
      jugador.setVelocityY(-520); // rebote hacia arriba
    } else if (!jugador.invencible) {
      // Contacto lateral → jugador pierde vida y rebota
      const dir = jugador.x < boss.x ? -1 : 1;
      jugador.setVelocityX(dir * 280);
      jugador.setVelocityY(-210);
      const gameOver = jugador.perderVida();
      this._actualizarHUD();
      if (gameOver) {
        this.time.delayedCall(800, () => this._gameOver());
      }
    }
  }

  _golpearBoss() {
    this._bossHP--;
    this._bossInvencible = true;
    this._boss.setVelocityX(0);  // detener mientras está invencible

    // Flash rojo en el boss
    this._boss.setTint(0xFFFFFF);
    this.time.delayedCall(80, () => this._boss?.setTint(0xFF4444));

    this.cameras.main.shake(220, 0.018);
    this.sound.play('sfxIncorrecto', { volume: 0.55 });
    this._actualizarHUD();

    if (this._bossHP <= 0) {
      this._matarBoss();
      return;
    }

    // Cambio de fase
    // Doblar velocidad en golpes 1 y 2 (HP 4→3 y HP 3→2): 85 → 170 → 340
    // Al tercer golpe (HP 2→1) la velocidad se congela en 340
    if (this._bossHP >= 2) {
      this._bossVel *= 2;
    }

    if (this._bossHP === 3) {
      this._mostrarMensajeBoss('¡¡ESTO NO PUEDE SER!!', '#FFAA00');
    } else if (this._bossHP === 2) {
      this._boss.setTint(0xFF8800);
      this._mostrarMensajeBoss('¡¡IMPOSIBLE!!', '#FF8800');
    } else if (this._bossHP === 1) {
      this._boss.setTint(0xFF0000);
      this._mostrarMensajeBoss('¡¡ACABARÉ CONTIGO!!', '#FF4444');
    }

    // Invencibilidad temporal
    this.time.delayedCall(650, () => { this._bossInvencible = false; });
  }

  _matarBoss() {
    this._juegoActivo    = false;
    this._bossInvencible = true;
    if (this._boss.body) this._boss.body.enable = false;

    // Detener música de juego (musicaFin sigue sonando desde CutscenePreBoss)
    const musJuego = this.sound.get('musicaJuego');
    if (musJuego?.isPlaying) musJuego.stop();

    this.cameras.main.shake(700, 0.022);
    this.cameras.main.flash(500, 255, 60, 0);

    // Animación de muerte del boss
    this.tweens.add({
      targets:  [this._boss, this._txtBossNombre],
      scaleX:   2.5,
      scaleY:   0.1,
      alpha:    0,
      duration: 600,
      ease:     'Back.easeIn',
      onComplete: () => {
        if (this._boss)         this._boss.destroy();
        if (this._txtBossNombre) this._txtBossNombre.destroy();
        this._victoria();
      }
    });
  }

  _victoria() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Overlay de victoria
    const ov = this.add.graphics().setScrollFactor(0).setDepth(200);
    ov.fillStyle(0x000000, 0.65);
    ov.fillRect(0, 0, W, H);

    this.add.text(W / 2, H / 2 - 54, '¡PÓLUX HA SIDO DERROTADO!', {
      fontSize:   '19px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#FFD700',
      stroke:     '#000000',
      strokeThickness: 5,
      align:      'center',
      wordWrap:   { width: W - 40 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.add.text(W / 2, H / 2 + 4, '¡El campus universitario es libre!', {
      fontSize: '14px', fontFamily: 'Rajdhani, Arial', color: '#00E5FF'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.add.text(W / 2, H / 2 + 30, '¡Gracias, Novo!', {
      fontSize: '13px', fontFamily: 'Arial', color: '#AACCFF'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    // Calcular puntuación final con bonus del boss
    const statsBase = this._stats || {};
    const bonusBoss  = 500;
    const puntajeFinal = (statsBase.puntajeFinal || 0) + bonusBoss;

    // Guardar en leaderboard
    this._guardarPuntaje(puntajeFinal);

    // Ir a FinScene tras la fanfarria
    const statsFinales = {
      ...statsBase,
      puntajeFinal,
      bossVencido: true
    };

    this.time.delayedCall(3200, () => {
      this.cameras.main.fade(400, 0, 0, 0, false, (_c, p) => {
        if (p === 1) this.scene.start('FinScene', statsFinales);
      });
    });
  }

  _gameOver() {
    this._juegoActivo = false;
    const W = this.scale.width;
    const H = this.scale.height;

    // Detener música
    const musJuego = this.sound.get('musicaJuego');
    if (musJuego?.isPlaying) musJuego.stop();
    const musFin = this.sound.get('musicaFin');
    if (musFin?.isPlaying) musFin.stop();

    // Guardar puntaje sin bonus de boss
    this._guardarPuntaje(this._stats?.puntajeFinal || 0);

    const ov = this.add.graphics().setScrollFactor(0).setDepth(200);
    ov.fillStyle(0x000000, 0.78);
    ov.fillRect(0, 0, W, H);

    this.add.text(W / 2, H / 2 - 30, 'GAME OVER', {
      fontSize:   '42px',
      fontFamily: 'Arial Black',
      color:      '#FF2244',
      stroke:     '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.add.text(W / 2, H / 2 + 20, 'Volviendo al ranking...', {
      fontSize: '16px', fontFamily: 'Arial', color: '#AAAAAA'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.time.delayedCall(2600, () => {
      this.scene.start('LeaderboardScene');
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Banner de texto flotante sobre el boss */
  _mostrarMensajeBoss(msg, color) {
    const W = this.scale.width;
    const txt = this.add.text(W / 2, 90, msg, {
      fontSize:   '16px',
      fontFamily: 'Orbitron, Arial Black',
      color,
      stroke:     '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(180);

    this.tweens.add({
      targets: txt,
      y:       55,
      alpha:   0,
      duration: 1300,
      onComplete: () => txt.destroy()
    });
  }

  /** Guarda el puntaje en Firebase y en localStorage */
  _guardarPuntaje(puntaje) {
    try {
      const raw = localStorage.getItem('jugadorActual');
      if (!raw) return;
      const jugador = JSON.parse(raw);

      // Firebase (fire-and-forget)
      guardarPuntaje({
        nombre:    jugador.nombre,
        apellido:  jugador.apellido,
        celular:   jugador.celular || '',
        puntaje,
        preguntas: this._stats?.preguntasCorrectas || 0,
        enemigos:  this._stats?.enemigosDerrotados || 0,
        monedas:   this._stats?.monedas || 0,
        tiempo:    this._stats?.tiempoSegundos || 0
      }).then(ok => {
        if (ok) console.log('\u2705 Puntaje boss guardado en Firebase:', puntaje);
        else    console.warn('\u26a0 Firebase fall\u00f3 en BossScene. Respaldo en localStorage.');
      });

      const lb = JSON.parse(localStorage.getItem('leaderboard') || '[]');

      const entrada = {
        nombreCompleto: jugador.nombreCompleto,
        nombre:         jugador.nombre   || '???',
        apellido:       jugador.apellido || '',
        puntaje,
        fecha:     new Date().toLocaleDateString('es-CL')
      };

      lb.push(entrada);
      lb.sort((a, b) => b.puntaje - a.puntaje);
      if (lb.length > 20) lb.splice(20);
      localStorage.setItem('leaderboard', JSON.stringify(lb));
    } catch (err) {
      console.warn('[BossScene] Error guardando puntaje:', err);
    }
  }

  // ── Limpieza ─────────────────────────────────────────────────────────────────

  shutdown() {
    if (this._jugador) {
      this._jugador.touchIzq        = false;
      this._jugador.touchDer        = false;
      this._jugador.touchJumpActivo = false;
    }
  }
}
