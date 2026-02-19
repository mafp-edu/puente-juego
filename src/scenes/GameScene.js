/**
 * GameScene.js
 * Escena principal del juego "El Camino del Buen Líder".
 * Contiene el nivel completo con scroll lateral, plataformas,
 * enemigos, coleccionables, compañeros capturados, HUD y 3 hitos.
 */

import { COLORES, MUNDO, HITOS } from '../config.js';
import Player  from '../objects/Player.js';
import Enemy   from '../objects/Enemy.js';
import Coin    from '../objects/Coin.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  init() {
    // Reiniciar estado entre partidas
    this._tiempoSegundos  = 0;
    this._hitoActual      = 0;        // índice del próximo hito (0, 1, 2)
    this._hitosCompletados = 0;
    this._preguntasCorrectas = 0;
    this._companerosSalvados = 0;     // contador global de compañeros rescatados
    this._juegoActivo     = true;
    this._respawnX        = 100;
    this._respawnY        = 300;
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  create() {
    console.log('[GameScene] create() START');
    const W = MUNDO.ancho;
    const H = MUNDO.alto;

    // ─ Música: detener musicaFin si volvemos desde el final; arrancar musicaJuego ─
    const musFin = this.sound.get('musicaFin');
    if (musFin?.isPlaying) musFin.stop();
    const musJuego = this.sound.get('musicaJuego');
    if (musJuego) { if (!musJuego.isPlaying) musJuego.play(); }
    else { this.sound.add('musicaJuego', { loop: true, volume: 0.31 }).play(); }

    // ─ Límites del mundo ─
    this.physics.world.setBounds(0, 0, W, H + 200);
    console.log('[GameScene] physics bounds OK');

    // ─ Parallax ─
    this._crearFondoParallax(W, H);
    console.log('[GameScene] parallax OK');

    // ─ Plataformas ─
    try {
      this._plataformasEstaticas = this.physics.add.staticGroup();
      console.log('[GameScene] staticGroup OK');
      this._plataformasMoviles   = this.physics.add.group();
      console.log('[GameScene] group OK');
      this._crearNivel(W, H);
      console.log('[GameScene] nivel OK');
    } catch (err) {
      console.error('[GameScene] CRASH en nivel:', err.message);
      console.error(err.stack);
      return;
    }

    // ─ Jugador ─
    this._jugador = new Player(this, 80, H - 120);
    console.log('[GameScene] jugador OK');

    // ─ Cámara ─
    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.startFollow(this._jugador, true, 0.1, 0.1);
    console.log('[GameScene] cámara OK');

    // ─ Colisiones jugador con plataformas ─
    this.physics.add.collider(this._jugador, this._plataformasEstaticas);
    this.physics.add.collider(this._jugador, this._plataformasMoviles);

    // ─ Colisiones enemigos con plataformas ─
    this.physics.add.collider(this._enemigos, this._plataformasEstaticas);
    this.physics.add.collider(this._enemigos, this._plataformasMoviles);

    // ─ Solape jugador con monedas/libros ─
    this.physics.add.overlap(
      this._jugador, this._coleccionables,
      this._onRecogerColeccionable, null, this
    );

    // ─ Solape jugador con compañeros ─
    this.physics.add.overlap(
      this._jugador, this._companeros,
      this._onLiberarCompanero, null, this
    );

    // ─ Colisión con enemigos ─
    this.physics.add.overlap(
      this._jugador, this._enemigos,
      this._onContactoEnemigo, null, this
    );

    // ─ Solape jugador con hitos ─
    this.physics.add.overlap(
      this._jugador, this._hitosGroup,
      this._onHito, null, this
    );

    // ─ HUD (fijo a la cámara) ─
    this._crearHUD();
    console.log('[GameScene] HUD OK');

    // ─ Controles táctiles (D-pad virtual) ─
    this._crearControlesMovil();
    console.log('[GameScene] controles OK');

    // ─ Cronómetro ─
    this._timer = this.time.addEvent({
      delay:    1000,
      callback: () => {
        if (this._juegoActivo) {
          this._tiempoSegundos++;
          this._actualizarHUD();
        }
      },
      loop: true
    });

    // ─ Escuchar eventos desde DialogoScene ─
    this.events.on('dialogoCorrecto', (hitoIdx) => {
      this._preguntasCorrectas++;
      this._jugador.respuestaCorrecta(100);
      this._hitosCompletados++;
      this._actualizarHUD();
      this.scene.resume('GameScene');
      this._marcarHitoCompleto(hitoIdx);

      const falta = Math.max(0, 2 - this._preguntasCorrectas);
      if (falta === 0) {
        this._mostrarBanner('✅ ¡2 preguntas respondidas! Ya puedes llegar a la META', '#00E5FF');
      } else {
        this._mostrarBanner(`✅ Pregunta correcta  — te falta ${falta} más para la META`, '#FFD700');
      }
    });

    this.events.on('dialogoIncorrecto', () => {
      // Vida ya fue descontada por dialogoVidaPerdida
    });

    this.events.on('dialogoVidaPerdida', () => {
      if (!this._jugador) return;
      const gameOver = this._jugador.perderVida();
      this._actualizarHUD();
      if (gameOver) {
        // Cerrar diálogo y terminar partida tras breve pausa
        this.time.delayedCall(800, () => {
          this.scene.stop('DialogoScene');
          this._juegoActivo = true; // permitir que _finJuego corra
          this._finJuego(false);
        });
      }
    });

    console.log('[GameScene] create() DONE — juego activo:', this._juegoActivo);
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  update() {
    if (!this._juegoActivo) return;

    // Parallax: mover el offset del tile segun la camara
    const camX = this.cameras.main.scrollX;
    if (this._bg2) this._bg2.tilePositionX = camX * 0.2;
    if (this._bg3) this._bg3.tilePositionX = camX * 0.5;

    // Actualizar jugador
    this._jugador.update();

    // Actualizar enemigos
    this._enemigos.getChildren().forEach(e => e.update && e.update());

    // Actualizar plataformas móviles
    this._actualizarPlataformasMoviles();

    // ─ Detectar caída al vacío ─
    if (this._jugador.y > MUNDO.alto + 50) {
      this._jugadorCayoAlVacio();
    }

    // ─ Actualizar progreso del circuito ─
    const progreso = Math.min(100,
      Math.floor((this._jugador.x / MUNDO.ancho) * 100));
    this._barraProgresoFill.width =
      Math.floor((this._barraProgresoW) * (progreso / 100));
    this._txtProgreso.setText(`${progreso}%`);
  }

  // ── Construcción del nivel ───────────────────────────────────────────────────

  _crearFondoParallax(W, H) {
    // Dimensiones de pantalla (no del mundo) para evitar texturas enormes
    const SW = this.scale.width;   // 800
    const SH = this.scale.height;  // 450

    // Capa 1 - cielo (completamente fijo)
    this._bg1 = this.add.tileSprite(0, 0, SW, SH, 'fondo1')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-3);

    // Capa 2 - edificios (parallax lento)
    this._bg2 = this.add.tileSprite(0, 0, SW, SH, 'fondo2')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-2);

    // Capa 3 - arboles (parallax medio)
    this._bg3 = this.add.tileSprite(0, 0, SW, SH, 'fondo3')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-1);
  }

  /**
   * Construye todas las plataformas, enemigos, coleccionables,
   * compañeros y hitos del nivel.
   */
  _crearNivel(W, H) {
    console.log('[GameScene] _crearNivel: creando grupos...');
    // Grupos (sin classType para evitar problemas con Phaser internals)
    this._enemigos       = this.physics.add.group();
    this._coleccionables = this.physics.add.group();
    this._companeros     = this.physics.add.staticGroup(); // staticGroup para companeros estáticos
    this._hitosGroup     = this.physics.add.staticGroup();
    this._platsMovData   = [];
    console.log('[GameScene] _crearNivel: grupos OK');

    const suelo = H - 32;

    // ─── SUELO BASE (en tramos) ──────────────────────────────────────────────
    this._addPlat(0,    suelo, 1200, 32);   // inicio
    this._addPlat(1300, suelo,  400, 32);   // brecha 1
    this._addPlat(1800, suelo,  600, 32);   // sección 2
    this._addPlat(2500, suelo,  300, 32);   // brecha 2
    this._addPlat(2900, suelo,  600, 32);   // sección 3
    this._addPlat(3600, suelo,  400, 32);   // brecha 3
    this._addPlat(4100, suelo,  450, 32);   // sección 4
    this._addPlat(4650, suelo,  500, 32);   // brecha 4
    this._addPlat(5250, suelo,  600, 32);   // sección 5
    this._addPlat(5950, suelo,  400, 32);   // brecha 5
    this._addPlat(6450, suelo,  480, 32);   // zona final
    // META en su propia plataforma elevada, bien visible
    this._addPlat(6950, suelo - 80, 180, 32); // plataforma de la meta
    console.log('[GameScene] _crearNivel: suelo OK');

    // ─── PLATAFORMAS ELEVADAS ────────────────────────────────────────────────
    this._addPlat(200,  suelo - 80,  96, 16);
    this._addPlat(380,  suelo - 140, 96, 16);
    this._addPlat(550,  suelo - 200, 128, 16);
    this._addPlat(700,  suelo - 100, 96, 16);
    this._addPlat(820,  suelo - 160, 128, 16);
    this._addPlat(940,  suelo - 220, 160, 16);
    this._addPlat(1300, suelo - 120, 96,  16);
    this._addPlat(1450, suelo - 190, 128, 16);
    this._addPlat(1600, suelo - 260, 96,  16);
    this._addPlat(1750, suelo - 180, 128, 16);
    this._addPlat(1900, suelo - 130, 128, 16);
    this._addPlat(2050, suelo - 200, 96,  16);
    this._addPlat(2200, suelo - 160, 160, 16);
    this._addPlat(2400, suelo - 100, 64,  16);
    this._addPlat(2520, suelo - 170, 64,  16);
    this._addPlat(2640, suelo - 240, 64,  16);
    this._addPlat(2850, suelo - 120, 128, 16);
    this._addPlat(2980, suelo - 200, 128, 16);
    this._addPlat(3100, suelo - 160, 192, 16);
    this._addPlat(3300, suelo - 100, 256, 16);
    // Zona 3600-5000
    this._addPlat(3620, suelo - 130, 128, 16);
    this._addPlat(3800, suelo - 200,  96, 16);
    this._addPlat(3960, suelo - 140, 160, 16);
    this._addPlat(4160, suelo - 210,  96, 16);
    this._addPlat(4320, suelo - 140, 128, 16);
    this._addPlat(4500, suelo - 200, 128, 16);
    this._addPlat(4680, suelo - 150, 160, 16);
    this._addPlat(4870, suelo - 100, 128, 16);
    // Zona 5000-7000 — plataformas distribuidas asimétricamente para evitar "ruta del techo".
    // Se alterna entre alturas bajas, medias y altas con anchos pequeños.
    this._addPlat(5050, suelo - 110,  64, 16);  // escalonada baja
    this._addPlat(5170, suelo - 180,  64, 16);  // sube
    this._addPlat(5310, suelo - 260,  80, 16);  // cumbre zona 1 — alta
    this._addPlat(5430, suelo - 170,  64, 16);  // baja
    this._addPlat(5560, suelo - 120, 128, 16);  // ancha media
    this._addPlat(5740, suelo - 230,  64, 16);  // salta arriba
    this._addPlat(5860, suelo - 300,  64, 16);  // muy alta (trampolín)
    this._addPlat(5960, suelo - 200,  80, 16);  // baja desde cumbre
    this._addPlat(6080, suelo - 120,  64, 16);  // aterrizaje
    this._addPlat(6200, suelo - 200,  64, 16);  // sube de nuevo
    this._addPlat(6310, suelo - 290,  64, 16);  // otra cumbre
    this._addPlat(6420, suelo - 200,  80, 16);  // baja
    this._addPlat(6530, suelo - 130,  96, 16);  // ancha para respiro
    this._addPlat(6660, suelo - 220,  64, 16);  // sube escalonado
    this._addPlat(6760, suelo - 310,  64, 16);  // muy alta final
    this._addPlat(6870, suelo - 200,  80, 16);  // descenso hacia META
    console.log('[GameScene] _crearNivel: plataformas elevadas OK');

    // ─── PLATAFORMAS MÓVILES ─────────────────────────────────────────────────
    this._addPlatMov(1250, suelo - 100, 96, 14, 'v', 50, 1.2);
    this._addPlatMov(1700, suelo - 150, 96, 14, 'h', 80, 0.8);
    this._addPlatMov(2450, suelo - 100, 80, 14, 'v', 60, 1.0);
    this._addPlatMov(2760, suelo - 80,  80, 14, 'h', 60, 1.4);
    this._addPlatMov(3540, suelo - 100, 80, 14, 'h', 70, 1.0);
    this._addPlatMov(3880, suelo - 150, 80, 14, 'v', 60, 1.2);
    this._addPlatMov(4390, suelo - 120, 80, 14, 'h', 80, 0.9);
    this._addPlatMov(4770, suelo - 100, 80, 14, 'v', 55, 1.3);
    this._addPlatMov(5180, suelo - 120, 80, 14, 'h', 75, 1.1);
    this._addPlatMov(5450, suelo - 160, 80, 14, 'v', 65, 1.4);
    this._addPlatMov(5850, suelo - 100, 80, 14, 'h', 70, 1.2);
    this._addPlatMov(6100, suelo - 150, 80, 14, 'v', 60, 1.0);
    this._addPlatMov(6500, suelo - 120, 80, 14, 'h', 80, 1.3);
    this._addPlatMov(6750, suelo - 100, 80, 14, 'v', 50, 1.1);
    console.log('[GameScene] _crearNivel: plataformas moviles OK');

    // ─── ENEMIGOS ────────────────────────────────────────────────────────────
    const posEnemigos = [
      [300,  suelo - 40, 60],
      [600,  suelo - 48, 70],
      [850,  suelo - 48, 50],
      [1400, suelo - 40, 80],
      [1650, suelo - 48, 60],
      [1920, suelo - 48, 70],
      [2100, suelo - 48, 60],
      [2350, suelo - 40, 50],
      [2700, suelo - 40, 70],
      [2950, suelo - 48, 60],
      [3150, suelo - 48, 80],
      [3350, suelo - 48, 70],
      // Zona extendida
      [3680, suelo - 48, 70],
      [3900, suelo - 40, 60],
      [4080, suelo - 48, 80],
      [4350, suelo - 48, 70],
      [4580, suelo - 40, 60],
      [4800, suelo - 48, 80],
      [4960, suelo - 48, 60],
      // Zona 5000-7000
      [5150, suelo - 48, 70],
      [5380, suelo - 48, 60],
      [5600, suelo - 40, 80],
      [5820, suelo - 48, 70],
      [6050, suelo - 48, 60],
      [6280, suelo - 40, 80],
      [6500, suelo - 48, 70],
      [6720, suelo - 48, 60],
      [6900, suelo - 40, 80],
    ];
    posEnemigos.forEach(([x, y, rango]) => {
      const e = new Enemy(this, x, y, rango);
      this._enemigos.add(e);
    });

    // ─── ENEMIGOS EN PLATAFORMAS ELEVADAS ────────────────────────────────────
    // Y = plataforma_Y - 22  (para que queden parados sobre el borde superior)
    const enemigosEnPlataformas = [
      [428,  suelo - 162, 30],   // plat 380 @ suelo-140  (w=96)
      [614,  suelo - 222, 40],   // plat 550 @ suelo-200  (w=128)
      [1020, suelo - 242, 55],   // plat 940 @ suelo-220  (w=160)
      [1824, suelo - 202, 40],   // plat 1750 @ suelo-180 (w=128)
      [2280, suelo - 182, 55],   // plat 2200 @ suelo-160 (w=160)
      [3196, suelo - 182, 70],   // plat 3100 @ suelo-160 (w=192)
      [3428, suelo - 122, 90],   // plat 3300 @ suelo-100 (w=256)
      [4384, suelo - 162, 40],   // plat 4320 @ suelo-140 (w=128)
      [5364, suelo - 242, 40],   // plat 5300 @ suelo-220 (w=128)
      [5580, suelo - 172, 55],   // plat 5500 @ suelo-150 (w=160)
      [6264, suelo - 222, 40],   // plat 6200 @ suelo-200 (w=128)
      [6880, suelo - 162, 55],   // plat 6800 @ suelo-140 (w=160)
    ];
    enemigosEnPlataformas.forEach(([x, y, rango]) => {
      const e = new Enemy(this, x, y, rango);
      this._enemigos.add(e);
    });
    console.log('[GameScene] _crearNivel: enemigos OK');

    // ─── MONEDAS ─────────────────────────────────────────────────────────────
    const posMonedas = [
      220, 260, 300, 400, 460, 560, 610, 660,
      730, 820, 950, 1000,
      1350, 1460, 1620, 1800,
      1950, 2070, 2220, 2280,
      2420, 2540, 2660,
      2870, 2990, 3110, 3180, 3250,
      // Zona extendida
      3480, 3580, 3680, 3790, 3900,
      4010, 4120, 4250, 4380, 4490,
      4620, 4740, 4860, 4970,
      // Zona 5000-7000
      5100, 5220, 5350, 5480, 5600,
      5720, 5840, 5960, 6080, 6200,
      6320, 6440, 6560, 6680, 6800, 6920,
    ];
    posMonedas.forEach((x, i) => {
      const y = suelo - 60 - (i % 3) * 30;
      const c = new Coin(this, x, y, 'moneda');
      this._coleccionables.add(c);
      c.body.setAllowGravity(false);  // re-aplicar tras add() para garantizar estática
    });
    console.log('[GameScene] _crearNivel: monedas OK');

    // ─── LIBROS / DOCUMENTOS ─────────────────────────────────────────────────
    // Cada libro lleva una pista de una de las 3 preguntas (ciclando 0→1→2→0…)
    const posLibros = [480, 960, 1780, 2260, 3130, 3780, 4480, 4920, 5500, 6100, 6700];
    posLibros.forEach((x, i) => {
      const l = new Coin(this, x, suelo - 90, 'libro');
      l.pista     = HITOS[i % HITOS.length].pista;
      l.temaHito  = HITOS[i % HITOS.length].tema;
      this._coleccionables.add(l);
      l.body.setAllowGravity(false);  // re-aplicar tras add()
    });
    console.log('[GameScene] _crearNivel: libros OK');

    // ─── COMPAÑEROS CAPTURADOS (9 en total, repartidos por el mapa) ────────
    // Liberables directamente al tocarlos — sin dependencia de hitos/preguntas.
    // Rescatar 5+ es requisito para acceder a la META.
    const posCompaneros = [
      // Zona temprana (0-2000)
      [ 580, suelo - 280],   // sobre plataforma elevada 550
      [ 870, suelo - 120],   // zona suelo accesible
      [1650, suelo - 210],   // sobre plataforma 1600 @ suelo-260 (plat elevada)
      // Zona media-1 (2000-3500)
      [2210, suelo - 180],   // plataforma 2200
      [2990, suelo - 220],   // plataforma 2980
      [3330, suelo - 120],   // plataforma 3300 (ancha)
      // Zona media-2 / final (3500-7000)
      [3970, suelo - 160],   // plataforma 3960
      [5570, suelo - 140],   // plataforma 5560
      [6540, suelo - 150],   // plataforma 6530
    ];
    posCompaneros.forEach(([x, y]) => {
      const c = this._companeros.create(x, y, 'companero');
      c.liberado = false;
      c.body.setSize(36, 36);
      c.refreshBody();
      // Animación de parpadeo para hacerlos visibles
      this.tweens.add({ targets: c, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });
    });
    console.log('[GameScene] _crearNivel: companeros OK');

    // ─── HITOS ───────────────────────────────────────────────────────────────
    const posHitos = [
      [900,  suelo - 70, 0],
      [2650, suelo - 70, 1],  // hito 2 - mitad seccion 2500-2800
      [5050, suelo - 70, 2]   // hito 3 - entre plataformas elevadas
    ];
    posHitos.forEach(([x, y, idx]) => {
      const h = this._hitosGroup.create(x, y, 'hito');
      h.hitoIdx    = idx;
      h.activado   = false;
      h.body.setSize(28, 60);
      h.refreshBody();
      this.add.text(x, y - 46, `${idx + 1}`, {
        fontSize:   '12px',
        fontFamily: 'Arial Black',
        color:      '#FFD700',
        stroke:     '#000000',
        strokeThickness: 2
      }).setOrigin(0.5).setDepth(5);
      this.tweens.add({
        targets:  h,
        alpha:    0.5,
        duration: 600,
        yoyo:     true,
        repeat:   -1
      });
    });
    console.log('[GameScene] _crearNivel: hitos OK');

    // ─── META (hito idx=99 → lanza CutscenePreBoss) ────────────────────────
    const metaX = 6960;
    const metaY = suelo - 80 - 80;
    const hitMeta = this._hitosGroup.create(metaX, metaY, 'hito');
    hitMeta.hitoIdx  = 99;
    hitMeta.activado = false;
    hitMeta.setTint(0x00FF88);
    hitMeta.body.setSize(28, 60);
    hitMeta.refreshBody();
    this.add.text(metaX, metaY - 46, 'META', {
      fontSize: '14px', fontFamily: 'Arial Black',
      color: '#00FF88', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(5);
    this.tweens.add({
      targets: hitMeta, alpha: 0.4, duration: 500, yoyo: true, repeat: -1
    });
    console.log('[GameScene] _crearNivel: META OK');
  }

  // ── Helpers de construcción ──────────────────────────────────────────────────

  /** Agrega una plataforma estática (un solo cuerpo, no tiles) */
  _addPlat(x, y, w, h) {
    const p = this._plataformasEstaticas.create(x + w / 2, y + h / 2, 'plataforma');
    p.setDisplaySize(w, h).refreshBody();
  }

  /** Agrega suelo invisible (colisión activa, sin render) para dejar ver fondo3 */
  _addSuelo(x, y, w, h) {
    const tileW = 32;
    for (let tx = x; tx < x + w; tx += tileW) {
      const tw = Math.min(tileW, x + w - tx);
      const p = this._plataformasEstaticas.create(tx + tw / 2, y + h / 2, 'suelo');
      if (tw < tileW) p.setDisplaySize(tw, h);
      p.setAlpha(0);   // invisible — fondo3 actúa como suelo visual
      p.refreshBody();
    }
  }

  /**
   * Agrega una plataforma móvil (un solo sprite).
   * @param {string} eje  – 'h' = horizontal | 'v' = vertical
   */
  _addPlatMov(x, y, w, h, eje, rango, velocidad) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const sp = this.physics.add.image(cx, cy, 'plataformaMov');
    sp.setDisplaySize(w, h);
    sp.body.setAllowGravity(false);
    sp.body.setImmovable(true);
    this._plataformasMoviles.add(sp);
    this._platsMovData.push({ sp, origX: cx, origY: cy, eje, rango, velocidad, dir: 1, pos: 0 });
  }

  _actualizarPlataformasMoviles() {
    this._platsMovData.forEach(d => {
      d.pos += d.velocidad * d.dir * (1 / 60);
      if (Math.abs(d.pos) >= d.rango) d.dir *= -1;

      if (d.eje === 'h') {
        d.sp.x = d.origX + d.pos;
        d.sp.y = d.origY;
      } else {
        d.sp.x = d.origX;
        d.sp.y = d.origY + d.pos;
      }
      d.sp.body.reset(d.sp.x, d.sp.y);
    });
  }

  // ── D-pad virtual (controles móvil) ──────────────────────────────────────────

  /**
   * Crea 3 botones táctiles fijos a la cámara:
   * ← (izquierda), → (derecha) en la esquina inferior-izquierda
   * y un botón de salto en la esquina inferior-derecha.
   * Cada botón actualiza los flags touchIzq / touchDer / touchJumpActivo del jugador.
   */
  _crearControlesMovil() {
    const W   = this.scale.width;
    const H   = this.scale.height;
    const R   = 30;    // radio de cada botón
    const PAD = 12;    // separación del borde
    const ALF = 0.55;  // alfa en reposo
    const DEPTH = 90;

    // ─ Helper: crea un botón circular con icono ─
    const crearBtn = (cx, cy, icono, onDown, onUp) => {
      // Fondo del botón
      const g = this.add.graphics()
        .setScrollFactor(0)
        .setDepth(DEPTH)
        .setAlpha(ALF);

      const dibujar = (presionado) => {
        g.clear();
        g.fillStyle(presionado ? 0x0055CC : 0x003087, 1);
        g.fillCircle(cx, cy, R);
        g.lineStyle(2, presionado ? 0xFFD700 : 0x4488FF, 1);
        g.strokeCircle(cx, cy, R);
      };
      dibujar(false);

      // Texto del icono
      const txt = this.add.text(cx, cy, icono, {
        fontSize:   '20px',
        fontFamily: 'Arial Black',
        color:      '#FFFFFF'
      }).setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH + 1)
        .setAlpha(ALF);

      // Zona interactiva (cuadrado un poco más grande para mejor toque)
      const zona = this.add.zone(cx, cy, R * 2 + 10, R * 2 + 10)
        .setScrollFactor(0)
        .setDepth(DEPTH + 2)
        .setInteractive();

      zona.on('pointerdown', () => {
        dibujar(true);
        g.setAlpha(0.9);
        txt.setAlpha(0.9);
        onDown();
      });

      const soltar = () => {
        dibujar(false);
        g.setAlpha(ALF);
        txt.setAlpha(ALF);
        onUp();
      };
      zona.on('pointerup',   soltar);
      zona.on('pointerout',  soltar);

      return { g, txt, zona };
    };

    // ─ Botón IZQUIERDA ─
    const btnIzq = crearBtn(
      PAD + R,
      H - PAD - R,
      '←',
      () => { if (this._jugador) this._jugador.touchIzq = true; },
      () => { if (this._jugador) this._jugador.touchIzq = false; }
    );

    // ─ Botón DERECHA ─
    const btnDer = crearBtn(
      PAD + R * 3 + 8,
      H - PAD - R,
      '→',
      () => { if (this._jugador) this._jugador.touchDer = true; },
      () => { if (this._jugador) this._jugador.touchDer = false; }
    );

    // ─ Botón SALTO (más grande) ─
    const RJ = 36;  // radio del botón de salto
    const gJ = this.add.graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setAlpha(ALF);

    const dibujarJump = (presionado) => {
      gJ.clear();
      gJ.fillStyle(presionado ? 0xCC5500 : 0x884400, 1);
      gJ.fillCircle(W - PAD - RJ, H - PAD - RJ, RJ);
      gJ.lineStyle(2, presionado ? 0xFFD700 : 0xFFAA44, 1);
      gJ.strokeCircle(W - PAD - RJ, H - PAD - RJ, RJ);
    };
    dibujarJump(false);

    const txtJ = this.add.text(W - PAD - RJ, H - PAD - RJ, '↑', {
      fontSize:   '24px',
      fontFamily: 'Arial Black',
      color:      '#FFFFFF'
    }).setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setAlpha(ALF);

    const zonaJ = this.add.zone(W - PAD - RJ, H - PAD - RJ, RJ * 2 + 10, RJ * 2 + 10)
      .setScrollFactor(0)
      .setDepth(DEPTH + 2)
      .setInteractive();

    zonaJ.on('pointerdown', () => {
      dibujarJump(true);
      gJ.setAlpha(0.95);
      txtJ.setAlpha(0.95);
      if (this._jugador) this._jugador.touchJumpActivo = true;
    });

    const soltarJump = () => {
      dibujarJump(false);
      gJ.setAlpha(ALF);
      txtJ.setAlpha(ALF);
      if (this._jugador) this._jugador.touchJumpActivo = false;
    };
    zonaJ.on('pointerup',  soltarJump);
    zonaJ.on('pointerout', soltarJump);

    // Texto indicador (solo en pantallas táctiles)
    const esTactil = this.sys.game.device.input.touch;
    if (!esTactil) {
      // En escritorio mostrar controles con muy baja opacidad
      [btnIzq.g, btnIzq.txt, btnDer.g, btnDer.txt, gJ, txtJ]
        .forEach(o => o.setAlpha(0.18));
    }
  }

  // ── HUD ─────────────────────────────────────────────────────────────────────

  _crearHUD() {
    const W  = this.scale.width;
    const cam = this.cameras.main;

    // ─ Fondo del HUD ─
    this._hudBg = this.add.graphics()
      .setScrollFactor(0)
      .setDepth(50);
    this._hudBg.fillStyle(0x060D22, 0.88);
    this._hudBg.fillRect(0, 0, W, 36);
    // Línea roja inferior del HUD
    this._hudBg.fillStyle(0xCC2200, 1);
    this._hudBg.fillRect(0, 34, W, 2);

    // ─ Corazones (vidas) ─
    this._iconosVida = [];
    for (let i = 0; i < MUNDO.vidasIniciales; i++) {
      const ic = this.add.image(14 + i * 22, 18, 'corazon')
        .setScrollFactor(0)
        .setDepth(51)
        .setDisplaySize(16, 16);
      this._iconosVida.push(ic);
    }

    // ─ Contador de monedas ─
    this.add.image(66, 18, 'moneda')
      .setScrollFactor(0)
      .setDepth(51)
      .setDisplaySize(14, 14);
    this._txtMonedas = this.add.text(80, 18, 'x0', {
      fontSize:   '13px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#FFD700'
    }).setScrollFactor(0).setDepth(51).setOrigin(0, 0.5);

    // ─ Puntaje ─
    this._txtPuntaje = this.add.text(114, 18, 'PTS: 0', {
      fontSize:   '11px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#FFFFFF'
    }).setScrollFactor(0).setDepth(51).setOrigin(0, 0.5);

    // ─ Compañeros rescatados (debajo del HUD principal, segunda fila) ─
    this._hudBg2 = this.add.graphics().setScrollFactor(0).setDepth(50);
    this._hudBg2.fillStyle(0x060D22, 0.75);
    this._hudBg2.fillRect(0, 36, 220, 18);
    this._txtCompaneros = this.add.text(6, 45, '🤝 0/5  ❓ 0/2', {
      fontSize:   '10px',
      fontFamily: 'Orbitron, monospace',
      color:      '#AADDFF'
    }).setScrollFactor(0).setDepth(51).setOrigin(0, 0.5);

    // ─ Cronómetro (centro) ─
    this._txtTiempo = this.add.text(W / 2, 18, '00:00', {
      fontSize:   '13px',
      fontFamily: 'Orbitron, monospace',
      color:      '#00D4FF'
    }).setScrollFactor(0).setDepth(51).setOrigin(0.5, 0.5);

    // ─ Barra de progreso (derecha) ─
    const barX = W - 130, barY = 11, barW = 116, barH = 14;
    this._barraProgresoW = barW;
    this.add.rectangle(barX + barW / 2, barY + barH / 2, barW + 4, barH + 4, 0x0A1428)
      .setScrollFactor(0).setDepth(50);
    this.add.rectangle(barX + barW / 2, barY + barH / 2, barW, barH, 0x060D22)
      .setScrollFactor(0).setDepth(51);
    this._barraProgresoFill = this.add.rectangle(barX, barY + barH / 2, 0, barH, 0x00CC66)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(52);
    this._txtProgreso = this.add.text(barX + barW / 2, barY - 1, '0%', {
      fontSize: '10px', fontFamily: 'Orbitron, monospace', color: '#6688AA'
    }).setScrollFactor(0).setDepth(53).setOrigin(0.5, 0);
  }

  /** Refresca los valores del HUD */
  _actualizarHUD() {
    const j = this._jugador;

    // Vidas (ocultar corazones perdidos; ganarVida puede superar vidasIniciales)
    this._iconosVida.forEach((ic, i) => {
      ic.setAlpha(i < j.vidas ? 1 : 0.25);
    });
    // Si las vidas superan el número de iconos, mostrar el contador con +
    if (j.vidas > this._iconosVida.length) {
      this._iconosVida[this._iconosVida.length - 1].setAlpha(1);
    }

    this._txtMonedas.setText(`x${j.monedas}`);
    this._txtPuntaje.setText(`PTS: ${j.puntaje}`);
    const mm = String(Math.floor(this._tiempoSegundos / 60)).padStart(2, '0');
    const ss = String(this._tiempoSegundos % 60).padStart(2, '0');
    this._txtTiempo.setText(`${mm}:${ss}`);

    // Barra inferior de requisitos META
    const compColor = this._companerosSalvados >= 5 ? '#00FF88' : '#AADDFF';
    const pregColor = this._preguntasCorrectas  >= 2 ? '#00FF88' : '#AADDFF';
    this._txtCompaneros.setText(
      `🤝 ${this._companerosSalvados}/5  ❓ ${this._preguntasCorrectas}/2`
    );
    // color verde si cumplido, sino azulado
    const ambos = this._companerosSalvados >= 5 && this._preguntasCorrectas >= 2;
    this._txtCompaneros.setColor(ambos ? '#00FF88' : '#AADDFF');
  }

  // ── Callbacks de overlap/colisión ────────────────────────────────────────────

  /** Jugador toca moneda o libro */
  _onRecogerColeccionable(jugador, item) {
    if (!item.active) return;
    item.recoger(this, this.cameras.main);
    this._coleccionables.remove(item, false, false); // no quitar de escena: la animación debe verse
    // Actualizar contador según tipo de coleccionable
    if (item.tipo === 'moneda') {
      jugador.recogerMoneda(item.valor);
      this.sound.play('sfxMoneda', { volume: 0.6 });
    } else {
      jugador.recogerLibro(item.valor);
      this.sound.play('sfxMoneda', { volume: 0.4 });
    }
    this._actualizarHUD();
  }

  /** Jugador libera a un compañero */
  _onLiberarCompanero(jugador, companero) {
    if (companero.liberado) return;
    companero.liberado = true;
    this._companerosSalvados++;

    // ─ Por cada 3 compañeros → recuperar 1 vida ─
    if (this._companerosSalvados % 3 === 0) {
      const ganada = jugador.ganarVida();
      if (ganada) {
        this._mostrarBanner('💚 ¡+1 vida! (3 compañeros rescatados)', '#00FF88');
      }
      this._actualizarHUD();
    }

    // Animación de liberación
    this.tweens.add({
      targets:  companero,
      y:        companero.y - 50,
      alpha:    0,
      scaleX:   1.5,
      scaleY:   1.5,
      duration: 500,
      onComplete: () => companero.destroy()
    });

    // Efecto de destello
    const flash = this.add.circle(companero.x, companero.y, 30, 0x00E5FF, 0.5);
    this.tweens.add({
      targets: flash, alpha: 0, scale: 2, duration: 400,
      onComplete: () => flash.destroy()
    });

    // Mini-banner con progreso
    const falta = Math.max(0, 5 - this._companerosSalvados);
    const msg = falta > 0
      ? `🤝 Compañero rescatado (${this._companerosSalvados}/5 para META, ${falta} más)`
      : `🤝 ¡${this._companerosSalvados} compañeros rescatados! Ya puedes ir a la META`;
    this._mostrarBanner(msg, '#00E5FF');

    this._actualizarHUD();
  }

  /**
   * Contacto jugador-enemigo:
   * – Si el jugador cae encima → derrota el enemigo.
   * – Si el contacto es lateral → pierde vida.
   */
  _onContactoEnemigo(jugador, enemigo) {
    if (!enemigo.estaVivo || !jugador.estaVivo) return;

    const margenPisada = 12; // píxeles de margen para contar como "encima"
    const jugadorAbajo = jugador.body.velocity.y > 0;
    const topEnemigo   = enemigo.body.top;
    const botJugador   = jugador.body.bottom;

    if (jugadorAbajo && botJugador <= topEnemigo + margenPisada) {
      // ─ El jugador pisó al enemigo ─
      enemigo.destruir(this);
      this._enemigos.remove(enemigo, false, false);
      jugador.derrotarEnemigo(50);
      this._actualizarHUD();
    } else {
      // ─ Contacto lateral → pierde vida ─
      const gameOver = jugador.perderVida();
      this._actualizarHUD();
      if (gameOver) {
        this._finJuego(false);
      } else {
        // Rebote de alejamiento
        jugador.setVelocityX(jugador.x < enemigo.x ? -200 : 200);
      }
    }
  }

  /** Jugador llega a un hito */
  _onHito(jugador, hito) {
    if (hito.activado || !this._juegoActivo) return;
    hito.activado = true;

    // META (idx 99) → verificar preguntas + compañeros y lanzar CutscenePreBoss
    if (hito.hitoIdx === 99) {
      const faltanPreg = Math.max(0, 2 - this._preguntasCorrectas);
      const faltanComp = Math.max(0, 5 - this._companerosSalvados);
      if (faltanPreg > 0 || faltanComp > 0) {
        hito.activado = false; // permitir reintentar
        const msgs = [];
        if (faltanPreg > 0) msgs.push(`${faltanPreg} pregunta(s)`);
        if (faltanComp > 0) msgs.push(`${faltanComp} compañero(s)`);
        this._mostrarBanner(`⚠ Te faltan: ${msgs.join(' y ')}`, '#FF4444');
        return;
      }
      this._finJuego(true);
      return;
    }

    // Actualizar punto de respawn al hito actual
    this._respawnX = hito.x - 40;
    this._respawnY = MUNDO.alto - 120;

    // Pausar GameScene y lanzar DialogoScene superpuesta
    this._juegoActivo = false;
    this.scene.pause('GameScene');
    this.scene.launch('DialogoScene', {
      hitoIdx: hito.hitoIdx,
      gameScene: this
    });
  }

  /** Marca un hito como completado visualmente */
  _marcarHitoCompleto(hitoIdx) {
    this._juegoActivo = true;

    // Cambiar tinte de los sprites de hito correspondientes
    this._hitosGroup.getChildren().forEach(h => {
      if (h.hitoIdx === hitoIdx) {
        h.setTint(0x00FF88);
        this.tweens.add({
          targets: h, alpha: 0.3, duration: 800, yoyo: true, repeat: 2
        });
      }
    });
  }

  /** Muestra un banner centrado que desaparece sola */
  _mostrarBanner(mensaje, color = '#FFD700') {
    const W  = this.scale.width;
    const bg = this.add.graphics().setScrollFactor(0).setDepth(180);
    bg.fillStyle(0x000000, 0.65);
    bg.fillRoundedRect(W / 2 - 200, 48, 400, 36, 8);
    const txt = this.add.text(W / 2, 66, mensaje, {
      fontSize:   '15px',
      fontFamily: 'Arial Black',
      color,
      stroke:     '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(181);
    this.time.delayedCall(2200, () => {
      this.tweens.add({
        targets:  [bg, txt],
        alpha:    0,
        duration: 400,
        onComplete: () => { bg.destroy(); txt.destroy(); }
      });
    });
  }

  /** Jugador cayó al vacío */
  _jugadorCayoAlVacio() {
    const gameOver = this._jugador.perderVida();
    if (gameOver) {
      this._finJuego(false);
    } else {
      // Respawn en el último checkpoint conocido
      this._jugador.respawn(this._respawnX, this._respawnY);
      this.cameras.main.pan(this._respawnX, this._respawnY, 300);
    }
    // _respawnX ya se actualiza al tocar cada hito
  }

  // ── Fin del juego ────────────────────────────────────────────────────────────

  /** Finaliza la partida y va a la pantalla correspondiente */
  _finJuego(victoria) {
    if (!this._juegoActivo && !victoria) return;
    this._juegoActivo = false;
    this._timer.remove();

    const j = this._jugador;
    const puntajeFinal = j.calcularPuntajeFinal(
      this._tiempoSegundos,
      this._preguntasCorrectas
    );

    if (victoria) {
      // Victoria en el circuito → pasar a la cutscene del boss (BossScene guarda puntaje)
      const musJuego = this.sound.get('musicaJuego');
      if (musJuego?.isPlaying) musJuego.stop();
      this.time.delayedCall(600, () => {
        this.scene.stop('DialogoScene');
        this.scene.start('CutscenePreBoss', {
          puntajeFinal,
          preguntasCorrectas: this._preguntasCorrectas,
          enemigosDerrotados: j.enemigosDerrotados,
          monedas:            j.monedas,
          tiempoSegundos:     this._tiempoSegundos,
          companerosSalvados: this._companerosSalvados
        });
      });
    } else {
      // Game Over → mostrar mensaje y volver a Leaderboard
      this._mostrarGameOver();
      this.time.delayedCall(2500, () => {
        this.scene.stop('DialogoScene');
        this.scene.start('LeaderboardScene');
      });
    }
  }

  _mostrarGameOver() {
    const W = this.scale.width;
    const H = this.scale.height;

    const overlay = this.add.graphics().setScrollFactor(0).setDepth(200);
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, W, H);

    this.add.text(W / 2, H / 2 - 30, 'GAME OVER', {
      fontSize:   '42px',
      fontFamily: 'Arial Black',
      color:      '#FF2244',
      stroke:     '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.add.text(W / 2, H / 2 + 20, 'Volviendo al leaderboard...', {
      fontSize:   '16px',
      fontFamily: 'Arial',
      color:      '#AAAAAA'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
  }

  /** Guarda el puntaje en localStorage, manteniendo TOP 5 */
  _guardarPuntaje(puntaje) {
    try {
      const jugadorRaw = localStorage.getItem('jugadorActual');
      if (!jugadorRaw) return;

      const jugador = JSON.parse(jugadorRaw);
      const entrada = {
        nombreCompleto: jugador.nombreCompleto,
        nombre:         jugador.nombre,
        apellido:       jugador.apellido,
        puntaje,
        fecha: new Date().toLocaleDateString('es-CL')
      };

      let lb = [];
      try {
        lb = JSON.parse(localStorage.getItem('leaderboard') || '[]');
      } catch { lb = []; }

      lb.push(entrada);
      lb.sort((a, b) => b.puntaje - a.puntaje);
      lb = lb.slice(0, 5); // mantener solo TOP 5

      localStorage.setItem('leaderboard', JSON.stringify(lb));
    } catch (err) {
      console.warn('Error guardando puntaje:', err);
    }
  }

  // ── Limpieza ─────────────────────────────────────────────────────────────────

  shutdown() {
    this.events.removeAllListeners('dialogoCorrecto');
    this.events.removeAllListeners('dialogoIncorrecto');
    this.events.removeAllListeners('dialogoVidaPerdida');
  }
}
