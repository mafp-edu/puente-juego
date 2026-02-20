/**
 * BootScene.js
 * Primera escena del juego. Carga todos los assets y muestra
 * una barra de progreso con el logo del juego.
 * Como usamos placeholders gráficos, aquí generamos texturas
 * programáticamente con Phaser.GameObjects.Graphics.
 */

import { COLORES } from '../config.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  // ── preload ──────────────────────────────────────────────────────────────────
  preload() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ─ Fondo inicial: degradado que se reemplaza con fondo_inicio.png en cuanto cargue ─
    const bgRect = this.add.rectangle(W / 2, H / 2, W, H, 0x0D1B3E).setDepth(0);
    // Franja inferior roja (Pólux)
    this.add.rectangle(W / 2, H, W, 8, 0xCC2200).setOrigin(0.5, 1).setDepth(2);

    // ─ Cargar fondoInicio PRIMERO ─
    this.load.image('fondoInicio', 'assets/sprites/fondo_inicio.png');
    this.load.once('filecomplete-image-fondoInicio', () => {
      bgRect.setVisible(false);
      this.add.image(W / 2, H / 2, 'fondoInicio').setDisplaySize(W, H).setDepth(0);
    });

    // ─ Título ─
    this.add.text(W / 2, H / 2 - 80, '', {
      fontSize: '22px',
      fontFamily: 'Orbitron, Arial Black',
      color: '#FFD700',
      stroke: '#0D1B3E',
      strokeThickness: 6,
      align: 'center'
    }).setOrigin(0.5).setDepth(2);

    this.add.text(W / 2, H / 2 - 34, '@Faro_UDD', {
      fontSize: '11px',
      fontFamily: 'Rajdhani, Arial',
      color: '#CC9900',
    }).setOrigin(0.5).setDepth(2);

    // ─ Barra de progreso (extremo inferior) ─
    const barW = Math.min(320, W - 60), barH = 16;
    const barX = W / 2 - barW / 2;
    const barY = H - 52;  // 52px desde el borde inferior

    this.add.rectangle(W / 2, barY + barH / 2, barW + 2, barH + 2, 0x152444).setDepth(2);
    const barBg   = this.add.rectangle(W / 2, barY + barH / 2, barW, barH, 0x0A1428).setDepth(2);
    const barFill = this.add.rectangle(barX, barY + barH / 2, 0, barH, 0xCC2200).setOrigin(0, 0.5).setDepth(2);

    const textoCarga = this.add.text(W / 2, barY + barH + 10, 'Cargando...', {
      fontSize: '12px',
      fontFamily: 'Rajdhani, Arial',
      color: '#6688AA'
    }).setOrigin(0.5).setDepth(2);

    // ─ Actualizar barra con eventos de progreso ─
    this.load.on('progress', (value) => {
      barFill.width = barW * value;
      textoCarga.setText(`Cargando... ${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      textoCarga.setText('¡Listo!');
    });

    // ─ Imagen real del Profesor ─
    this.load.image('profesor', 'assets/sprites/profesor_portrait.png');

    // ─ Fondos reales ─
    this.load.image('fondo1', 'assets/sprites/fondo1.png');
    this.load.image('fondo2', 'assets/sprites/fondo2.png');
    this.load.image('fondo3', 'assets/sprites/fondo3.png');

    // ─ Fondos de la arena de Pólux (BossScene) ─ opcionales con fallback ─
    this.load.image('bossFondo1', 'assets/sprites/boss_fondo1.png');
    this.load.image('bossFondo2', 'assets/sprites/boss_fondo2.png');

    // ─ Sprite animado de Pólux (256×82 → 4 frames × 64×82) ─
    this.load.spritesheet('poluxWalk', 'assets/sprites/polux_walk.png',
      { frameWidth: 64, frameHeight: 82 });

    // ─ Imagen de celebración (FinScene) ─ opcional con fallback ─
    this.load.image('celebracion', 'assets/sprites/celebracion.png');
    this.load.image('intro1', 'assets/sprites/inicio1.png');
    this.load.image('intro2', 'assets/sprites/inicio2.png');
    this.load.image('intro3', 'assets/sprites/inicio3.png');
    this.load.image('intro4', 'assets/sprites/inicio4.png');
    this.load.image('intro5', 'assets/sprites/inicio5.png');

    // ─ Sprites reales de personajes y decorados ─
    this.load.image('plataforma',  'assets/sprites/plataforma.png');   // 32×16 — reemplaza placeholder
    this.load.image('companero',   'assets/sprites/companero.png');    // 40×48 — reemplaza placeholder
    // enemigo_walk: 128×44 → 4 frames × 32×44
    this.load.spritesheet('enemigoWalk', 'assets/sprites/enemigo_walk.png',
      { frameWidth: 32, frameHeight: 44 });

    // ─ Sprites de Novo (spritesheets: 32×50 por frame) ─
    this.load.spritesheet('novoIdle', 'assets/sprites/novo_idle.png', { frameWidth: 32, frameHeight: 50 });
    this.load.spritesheet('novoWalk', 'assets/sprites/novo_walk.png', { frameWidth: 32, frameHeight: 50 });
    this.load.spritesheet('novoJump', 'assets/sprites/novo_jump.png', { frameWidth: 32, frameHeight: 50 });

    // ─ Efectos de sonido ─
    this.load.audio('sfxMoneda',     'assets/audio/sfx_moneda.mp3');
    this.load.audio('sfxSalto',      'assets/audio/sfx_salto.mp3');
    this.load.audio('sfxCorrecto',   'assets/audio/sfx_correcto.mp3');
    this.load.audio('sfxIncorrecto', 'assets/audio/sfx_incorrecto.mp3');
    this.load.audio('musicaFin',     'assets/audio/musica_fin.mp3');

    // ─ Música: arrancar en cuanto el MP3 termine de bajar ─
    this.load.once('filecomplete-audio-musicaJuego', () => {
      const musExistente = this.sound.get('musicaJuego');
      if (!musExistente) {
        this.sound.add('musicaJuego', { loop: true, volume: 0.31 }).play();
      } else if (!musExistente.isPlaying) {
        musExistente.play();
      }
    });

    // ─ Música de juego ─
    this.load.audio('musicaJuego', 'assets/audio/musica_juego.mp3');
  }

  // ── create ───────────────────────────────────────────────────────────────────
  create() {
    // Generar texturas placeholder (se omite si el PNG real fue cargado)
    this._crearTexturaJugador();
    // _crearTexturaEnemigo() reemplazada por spritesheet real si cargó
    if (!this.textures.exists('enemigoWalk')) {
      this._crearTexturaEnemigo();
    } else {
      this.anims.create({
        key:       'enemigo_walk',
        frames:    this.anims.generateFrameNumbers('enemigoWalk', { start: 0, end: 3 }),
        frameRate: 8,
        repeat:    -1
      });
    }
    this._crearTexturaMoneda();
    // plataforma.png real cargada → solo generar placeholder si falló la carga
    if (!this.textures.exists('plataforma')) this._crearTexturaPlatformaBase();
    this._crearTexturaPlatformaMov();
    // _crearTexturaProfesor() reemplazada por load.image en preload()
    // companero.png real cargada → solo generar placeholder si falló la carga
    if (!this.textures.exists('companero')) this._crearTexturaCompanero();
    this._crearTexturaCorazon();
    this._crearTexturaLibro();
    this._crearTexturaSuelo();
    // fondo1/2/3 se cargan como PNG reales en preload()
    this._crearTexturaHito();
    this._crearTexturaConfeti();
    this._crearTexturaBoss();

    // Animación de Pólux si el spritesheet fue cargado (4 frames × 64×82)
    if (this.textures.exists('poluxWalk') && !this.anims.exists('polux_walk')) {
      this.anims.create({
        key:       'polux_walk',
        frames:    this.anims.generateFrameNumbers('poluxWalk', { start: 0, end: 3 }),
        frameRate: 6,
        repeat:    -1
      });
    }

    // ─ Mostrar fondo_inicio 3 segundos, luego flash blanco → RegistroScene ─
    const W = this.scale.width;
    const H = this.scale.height;
    if (this.textures.exists('fondoInicio')) {
      this.add.image(W / 2, H / 2, 'fondoInicio').setDisplaySize(W, H).setDepth(0);
    }

    this.time.delayedCall(3000, () => {
      // Flash blanco brillante (600ms) luego avanzar
      this.cameras.main.flash(600, 255, 255, 255);
      this.time.delayedCall(650, () => {
        this.scene.start('RegistroScene');
      });
    });
  }

  // ── Helpers: generación de texturas ──────────────────────────────────────────

  /** Novo – mono rojo (La Casa de Papel) con casco de infiltración */
  _crearTexturaJugador() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Mono rojo completo
    g.fillStyle(0xCC0000, 1);
    g.fillRect(4, 16, 24, 28); // cuerpo
    g.fillRect(4, 42, 10, 8);  // pierna izq
    g.fillRect(18, 42, 10, 8); // pierna der
    // Cabeza con casco negro (infiltrado)
    g.fillStyle(0x111111, 1);
    g.fillRect(6, 2, 20, 16);  // casco
    // Visor naranja (Terminator)
    g.fillStyle(0xFF6600, 1);
    g.fillRect(8, 8, 16, 5);
    g.fillStyle(0xFF9900, 0.5);
    g.fillRect(9, 9, 14, 3);
    // Detalle del mono (cremallera)
    g.fillStyle(0x990000, 1);
    g.fillRect(14, 18, 4, 20);
    // Guantes negros
    g.fillStyle(0x222222, 1);
    g.fillRect(0, 28, 6, 8);
    g.fillRect(26, 28, 6, 8);
    g.generateTexture('jugador', 32, 50);
    g.destroy();
  }

  /** Enemigo – robot metálico oscuro con ojos rojos de Terminator */
  _crearTexturaEnemigo() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Cuerpo metálico oscuro
    g.fillStyle(0x222230, 1);
    g.fillRect(4, 10, 24, 22);
    // Reflejos metálicos
    g.fillStyle(0x3A3A4A, 1);
    g.fillRect(6, 12, 5, 18);
    // Cabeza robótica
    g.fillStyle(0x1A1A28, 1);
    g.fillRect(6, 2, 20, 10);
    // Visor rojo (Terminator)
    g.fillStyle(0xFF0000, 1);
    g.fillRect(7, 5, 18, 4);
    g.fillStyle(0xFF6666, 0.4);
    g.fillRect(8, 6, 16, 2);
    // Birrete académico (robot de Pólux)
    g.fillStyle(0x0A0A10, 1);
    g.fillRect(4, 0, 24, 4);
    g.fillRect(0, 3, 32, 3);
    g.fillStyle(0xFFD700, 1);
    g.fillRect(24, 3, 2, 7);
    // Piernas
    g.fillStyle(0x1A1A28, 1);
    g.fillRect(6, 32, 8, 6);
    g.fillRect(18, 32, 8, 6);
    // Detalles de circuito
    g.fillStyle(0xFF0000, 0.6);
    g.fillRect(10, 16, 2, 6);
    g.fillRect(20, 16, 2, 6);
    g.generateTexture('enemigo', 32, 44);
    g.destroy();
  }

  /** Moneda – chip de datos dorado/metálico */
  _crearTexturaMoneda() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Chip cuadrado (datos)
    g.fillStyle(0x222230, 1);
    g.fillRect(0, 2, 16, 12);
    // Núcleo dorado
    g.fillStyle(0xFFD700, 1);
    g.fillRect(3, 4, 10, 8);
    g.fillStyle(0xFFEE44, 1);
    g.fillRect(5, 6, 6, 4);
    // Pines del chip
    g.fillStyle(0x8A8A9A, 1);
    g.fillRect(0, 5, 2, 2); g.fillRect(0, 9, 2, 2);
    g.fillRect(14, 5, 2, 2); g.fillRect(14, 9, 2, 2);
    g.generateTexture('moneda', 16, 16);
    g.destroy();
  }

  /** Plataforma base – concreto del campus, borde dorado */
  _crearTexturaPlatformaBase() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Relleno blanco
    g.fillStyle(0xFFFFFF, 1);
    g.fillRect(0, 0, 32, 16);
    // Borde negro alrededor
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(0, 0, 32, 16);
    // Línea negra superior (superficie de pisada bien visible)
    g.fillStyle(0x000000, 1);
    g.fillRect(0, 0, 32, 2);
    g.generateTexture('plataforma', 32, 16);
    g.destroy();
  }

  /** Suelo – ladrillo gris seamless (32×32, tileado en _addSuelo) */
  _crearTexturaSuelo() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Mortero: gris oscuro de base
    g.fillStyle(0x555555, 1);
    g.fillRect(0, 0, 32, 32);
    // Fila 1 de ladrillos (y: 1–14)
    g.fillStyle(0x909090, 1);
    g.fillRect(1, 1, 13, 13);
    g.fillRect(16, 1, 15, 13);
    // Highlight borde superior fila 1
    g.fillStyle(0xBBBBBB, 1);
    g.fillRect(1, 1, 13, 1);
    g.fillRect(16, 1, 15, 1);
    // Sombra borde inferior fila 1
    g.fillStyle(0x6A6A6A, 1);
    g.fillRect(1, 13, 13, 1);
    g.fillRect(16, 13, 15, 1);
    // Fila 2 de ladrillos (y: 16–30) – offset para patrón alternado seamless
    g.fillStyle(0x909090, 1);
    g.fillRect(0,  16, 7,  14);  // medio ladrillo izq (continuado de tile anterior)
    g.fillRect(9,  16, 14, 14);  // ladrillo central
    g.fillRect(25, 16, 7,  14);  // medio ladrillo der (continúa en siguiente tile)
    // Highlights fila 2
    g.fillStyle(0xBBBBBB, 1);
    g.fillRect(0,  16, 7,  1);
    g.fillRect(9,  16, 14, 1);
    g.fillRect(25, 16, 7,  1);
    // Sombras fila 2
    g.fillStyle(0x6A6A6A, 1);
    g.fillRect(0,  29, 7,  1);
    g.fillRect(9,  29, 14, 1);
    g.fillRect(25, 29, 7,  1);
    g.generateTexture('suelo', 32, 32);
    g.destroy();
  }

  /** Plataforma móvil – franja naranja de advertencia */
  _crearTexturaPlatformaMov() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x1A1800, 1);
    g.fillRect(0, 0, 32, 14);
    // Franja naranja
    g.fillStyle(0xFF6600, 1);
    g.fillRect(0, 0, 32, 4);
    g.lineStyle(1, 0xFF8800, 0.8);
    g.strokeRect(0, 0, 32, 14);
    g.generateTexture('plataformaMov', 32, 14);
    g.destroy();
  }

  /** El Profesor – rectángulo verde oscuro con label */
  _crearTexturaProfesor() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Fondo portrait
    g.fillStyle(COLORES.verdeBosque, 1);
    g.fillRoundedRect(0, 0, 120, 160, 8);
    // Cuerpo
    g.fillStyle(0x334433, 1);
    g.fillRect(20, 80, 80, 70);
    // Cabeza
    g.fillStyle(0xFFCBA4, 1);
    g.fillRoundedRect(30, 20, 60, 60, 6);
    // Gafas
    g.lineStyle(3, 0x222222, 1);
    g.strokeRect(34, 40, 20, 14);
    g.strokeRect(66, 40, 20, 14);
    g.strokeRect(54, 47, 12, 2);
    g.generateTexture('profesor', 120, 160);
    g.destroy();
  }

  /** Compañero capturado – enjaulado con campo de energía rojo de Pólux */
  _crearTexturaCompanero() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Jaula energética rojiza
    g.fillStyle(0x330000, 0.6);
    g.fillCircle(20, 20, 18);
    g.lineStyle(2, 0xFF2222, 0.9);
    g.strokeCircle(20, 20, 18);
    // Barras de la jaula
    g.lineStyle(1, 0xFF2222, 0.5);
    g.lineBetween(20, 2, 20, 38);
    g.lineBetween(2, 20, 38, 20);
    // Personaje atrapado (silueta cyan — contrasta con la jaula roja)
    g.fillStyle(0x00E5FF, 1);
    g.fillRect(15, 13, 10, 14);  // cuerpo
    g.fillRect(17, 7, 6, 7);    // cabeza
    g.generateTexture('companero', 40, 40);
    g.destroy();
  }

  /** Ícono de vida – corazón rojo clásico (visible en HUD oscuro) */
  _crearTexturaCorazon() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xFF2255, 1);
    g.fillCircle(6, 5, 5);
    g.fillCircle(14, 5, 5);
    g.fillTriangle(0, 7, 20, 7, 10, 20);
    g.fillStyle(0xFF6688, 1);
    g.fillCircle(5, 4, 2);
    g.generateTexture('corazon', 20, 20);
    g.destroy();
  }

  /** Libro – dossier clasificado / expediente de inteligencia */
  _crearTexturaLibro() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Carpeta oscura
    g.fillStyle(0x1A1A1A, 1);
    g.fillRect(0, 0, 22, 24);
    // Sello rojo CONFIDENCIAL
    g.fillStyle(0xCC0000, 1);
    g.fillRect(2, 0, 4, 24);
    // Páginas internas
    g.fillStyle(0xCCCCCC, 1);
    g.fillRect(8, 2, 12, 20);
    // Líneas de texto
    g.fillStyle(0x333333, 1);
    g.fillRect(9, 5, 10, 1);
    g.fillRect(9, 8, 10, 1);
    g.fillRect(9, 11, 7, 1);
    g.fillRect(9, 14, 10, 1);
    g.fillRect(9, 17, 5, 1);
    // Sello de alerta
    g.fillStyle(0xFF2222, 0.8);
    g.fillRect(11, 7, 6, 6);
    g.generateTexture('libro', 22, 24);
    g.destroy();
  }

  /** Capa de fondo 1 – cielo azul nocturno con estrellas */
  _crearTexturaFondo1() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillGradientStyle(0x060D22, 0x060D22, 0x0D1B3E, 0x0D1B3E, 1);
    g.fillRect(0, 0, 390, 700);
    // Resplandor rojizo bajo (instalaciones de Pólux)
    g.fillGradientStyle(0x0D1B3E, 0x0D1B3E, 0x2A0800, 0x2A0800, 1);
    g.fillRect(0, 500, 390, 200);
    // Estrellas
    g.fillStyle(0xFFFFFF, 0.7);
    for (let i = 0; i < 60; i++) {
      const x = (i * 97 + 13) % 390;
      const y = (i * 53 + 7) % 400;
      g.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
    g.generateTexture('fondo1', 390, 700);
    g.destroy();
  }

  /** Capa de fondo 2 – edificios UDD en penumbra, algunas ventanas tomadas por Pólux */
  _crearTexturaFondo2() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Edificios altos para formato retrato (390×700)
    const edificios = [
      [0,   180, 80, 520], [90,  260, 65, 440], [165, 200, 75, 500],
      [250, 160, 70, 540], [330, 240, 60, 460]
    ];
    edificios.forEach(([x, y, w, h]) => {
      g.fillStyle(0x0A1428, 1);
      g.fillRect(x, y, w, h);
      g.lineStyle(1, 0x1A2E4A, 1);
      g.strokeRect(x, y, w, h);
      // Ventanas: mezcla doradas (libres) y rojas (Pólux)
      for (let wy = y + 10; wy < y + h - 10; wy += 18) {
        for (let wx = x + 8; wx < x + w - 8; wx += 16) {
          const seed = (wx * 7 + wy * 13) % 100;
          if (seed > 30) {
            const esRojo = seed > 60;
            g.fillStyle(esRojo ? 0xCC2200 : 0xFFAA00, esRojo ? 0.8 : 0.6);
            g.fillRect(wx, wy, 5, 7);
          }
        }
      }
    });
    g.generateTexture('fondo2', 390, 700);
    g.destroy();
  }

  /** Capa de fondo 3 – césped oscuro del campus, primer plano */
  _crearTexturaFondo3() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Suelo del campus (portrait 390×700)
    g.fillStyle(0x0A1A0A, 1);
    g.fillRect(0, 650, 390, 50);
    // Árboles del campus
    const arboles = [30, 105, 195, 275, 345];
    arboles.forEach((x) => {
      g.fillStyle(0x1A2A0A, 1);
      g.fillRect(x + 8, 610, 8, 44);
      g.fillStyle(0x0D220A, 1);
      g.fillTriangle(x, 612, x + 24, 612, x + 12, 568);
      g.fillTriangle(x + 3, 590, x + 21, 590, x + 12, 555);
    });
    g.generateTexture('fondo3', 390, 700);
    g.destroy();
  }

  /** Hito / checkpoint – portal dorado estilo UDD */
  _crearTexturaHito() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xFFD700, 0.25);
    g.fillRect(0, 0, 32, 64);
    g.lineStyle(3, 0xFFD700, 1);
    g.strokeRect(2, 2, 28, 60);
    // Bandera
    g.fillStyle(0xFFD700, 1);
    g.fillTriangle(8, 8, 8, 28, 28, 18);
    // Luz interior
    g.fillStyle(0xFFEE88, 0.3);
    g.fillRect(4, 4, 24, 56);
    g.generateTexture('hito', 32, 64);
    g.destroy();
  }

  /** Partícula de confeti */
  _crearTexturaConfeti() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(COLORES.dorado, 1);
    g.fillRect(0, 0, 6, 6);
    g.generateTexture('confeti_oro', 6, 6);
    g.destroy();

    const g2 = this.make.graphics({ x: 0, y: 0, add: false });
    g2.fillStyle(0xFF4488, 1);
    g2.fillRect(0, 0, 6, 6);
    g2.generateTexture('confeti_rosa', 6, 6);
    g2.destroy();

    const g3 = this.make.graphics({ x: 0, y: 0, add: false });
    g3.fillStyle(COLORES.cyanComp, 1);
    g3.fillRect(0, 0, 6, 6);
    g3.generateTexture('confeti_cyan', 6, 6);
    g3.destroy();
  }

  /** Pólux – robot jefe final, rojo masivo con ojos amenazantes */
  _crearTexturaBoss() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Cuerpo oscuro
    g.fillStyle(0x110011, 1);
    g.fillRect(6, 24, 52, 42);
    // Campo de energía rojo
    g.fillStyle(0xCC0022, 0.85);
    g.fillRect(4, 22, 56, 46);
    g.fillStyle(0x110011, 1);
    g.fillRect(8, 26, 48, 38);
    // Cabeza
    g.fillStyle(0x0D000D, 1);
    g.fillRect(10, 4, 44, 20);
    // Ojos rojos (grandes, amenazantes)
    g.fillStyle(0xFF0000, 1);
    g.fillRect(13, 8, 14, 10);
    g.fillRect(37, 8, 14, 10);
    g.fillStyle(0xFF9999, 1);
    g.fillRect(15, 9, 6, 5);
    g.fillRect(39, 9, 6, 5);
    // Bordes de energía
    g.lineStyle(3, 0xFF2244, 1);
    g.strokeRect(4, 22, 56, 46);
    g.lineStyle(2, 0xFF2244, 0.5);
    g.strokeRect(10, 4, 44, 20);
    // Líneas de circuito
    g.fillStyle(0xFF0000, 0.45);
    g.fillRect(12, 33, 40, 1);
    g.fillRect(12, 40, 40, 1);
    g.fillRect(12, 47, 40, 1);
    // Símbolo 'P' en el pecho (Pólux)
    g.fillStyle(0xFF4444, 1);
    g.fillRect(26, 29, 2, 14);
    g.fillRect(26, 29, 12, 2);
    g.fillRect(26, 36, 10, 2);
    g.fillRect(36, 29, 2, 9);
    // Piernas robóticas
    g.fillStyle(0x0D000D, 1);
    g.fillRect(11, 66, 19, 16);
    g.fillRect(34, 66, 19, 16);
    g.fillStyle(0xFF2244, 0.6);
    g.fillRect(11, 66, 19, 2);
    g.fillRect(34, 66, 19, 2);
    g.generateTexture('polux', 64, 82);
    g.destroy();
  }
}
