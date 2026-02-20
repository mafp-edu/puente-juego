/**
 * FinScene.js
 * Pantalla final de victoria de "El Camino del Buen Líder".
 *
 * Flujo:
 *  1. Lee jugadorActual y statsPartida desde localStorage.
 *  2. Calcula el puntaje final.
 *  3. Guarda en Firebase (guardarPuntaje). Si falla → respaldo en localStorage.
 *  4. Muestra portrait del Profesor + mensaje con efecto typewriter.
 *  5. Tras el typewriter muestra el desglose de puntaje.
 *  6. Botones: [VER RANKING] y [JUGAR DE NUEVO].
 */

import { guardarPuntaje } from '../firebase.js';

export default class FinScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FinScene' });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  init(data) {
    // Datos opcionales recibidos desde BossScene o GameScene
    this._dataEntrada     = data || {};
    this._typewriterTimer = null;
  }

  // ── Create (async para await guardarPuntaje) ──────────────────────────────────

  async create() {
    const W = this.scale.width;   // 390
    const H = this.scale.height;  // 700

    // ─ 1. Recuperar datos del jugador desde localStorage ─
    let jugador = { nombre: 'Estudiante', apellido: '', celular: '' };
    try {
      const raw = localStorage.getItem('jugadorActual');
      if (raw) jugador = { ...jugador, ...JSON.parse(raw) };
    } catch { /* silencioso */ }

    // ─ 2. Recuperar estadísticas de la partida ─
    // Prioridad: data recibida > localStorage statsPartida > ceros
    let stats = { preguntas: 0, enemigos: 0, monedas: 0, tiempo: 0 };
    try {
      const rawStats = localStorage.getItem('statsPartida');
      if (rawStats) stats = { ...stats, ...JSON.parse(rawStats) };
    } catch { /* silencioso */ }

    // Datos del data de escena tienen precedencia
    if (this._dataEntrada.preguntasCorrectas !== undefined) stats.preguntas = this._dataEntrada.preguntasCorrectas;
    if (this._dataEntrada.enemigosDerrotados !== undefined) stats.enemigos  = this._dataEntrada.enemigosDerrotados;
    if (this._dataEntrada.monedas            !== undefined) stats.monedas   = this._dataEntrada.monedas;
    if (this._dataEntrada.tiempoSegundos     !== undefined) stats.tiempo    = this._dataEntrada.tiempoSegundos;

    // ─ 3. Calcular puntaje final ─
    const bonusTiempo  = Math.max(0, 1000 - stats.tiempo * 2);
    const puntajeFinal = (stats.preguntas * 100)
                       + (stats.enemigos  * 50)
                       + (stats.monedas   * 10)
                       + bonusTiempo;

    // ─ 4. Guardar en Firebase ─
    const ok = await guardarPuntaje({
      nombre:    jugador.nombre,
      apellido:  jugador.apellido,
      celular:   jugador.celular,
      puntaje:   puntajeFinal,
      preguntas: stats.preguntas,
      enemigos:  stats.enemigos,
      monedas:   stats.monedas,
      tiempo:    stats.tiempo
    });

    if (ok) {
      console.log('✅ Puntaje guardado en Firebase:', puntajeFinal);
    } else {
      // Respaldo en localStorage (máx. 5 entradas ordenadas desc)
      console.warn('⚠ Firebase falló. Guardando en localStorage.');
      try {
        const lb = JSON.parse(localStorage.getItem('leaderboard') || '[]');
        lb.push({
          nombre:         jugador.nombre,
          apellido:       jugador.apellido,
          nombreCompleto: `${jugador.nombre} ${jugador.apellido}`.trim(),
          celular:        jugador.celular,
          puntaje:        puntajeFinal,
          fecha:          new Date().toLocaleDateString('es-CL')
        });
        lb.sort((a, b) => b.puntaje - a.puntaje);
        if (lb.length > 5) lb.splice(5);
        localStorage.setItem('leaderboard', JSON.stringify(lb));
      } catch { /* silencioso */ }
    }

    // ────────────────────────────────────────────────────────────────────────────
    // VISUAL
    // ────────────────────────────────────────────────────────────────────────────

    // ─ Fondo azul UDD ─
    this.add.graphics()
      .fillStyle(0x003087, 1)
      .fillRect(0, 0, W, H);

    // Degradado sutil en la parte inferior
    this.add.graphics()
      .fillGradientStyle(0x003087, 0x003087, 0x001a4d, 0x001a4d, 0, 0, 1, 1)
      .fillRect(0, H * 0.5, W, H * 0.5);

    // ─ Confeti ─
    this._lanzarConfeti();

    // ─ Título ─
    this.add.text(W / 2, 22, '🏆  ¡VICTORIA!  🏆', {
      fontSize:        '15px',
      fontFamily:      'Orbitron, Arial Black',
      color:           '#FFD700',
      stroke:          '#001a4d',
      strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3);

    // ─ Línea dorada bajo el título ─
    this.add.graphics().setDepth(3)
      .lineStyle(2, 0xFFD700, 0.7)
      .lineBetween(20, 40, W - 20, 40);

    // ─ Portrait del Profesor (placeholder verde oscuro 128×128) ─
    const portW = 128;
    const portH = 128;
    const portX = W / 2;
    const portY = 52 + portH / 2;

    const portGfx = this.add.graphics().setDepth(3).setScrollFactor(0);
    portGfx.fillStyle(0x1a4d1a, 1);
    portGfx.fillRoundedRect(portX - portW / 2, portY - portH / 2, portW, portH, 8);
    portGfx.lineStyle(2, 0xFFD700, 0.8);
    portGfx.strokeRoundedRect(portX - portW / 2, portY - portH / 2, portW, portH, 8);

    this.add.text(portX, portY, 'PROFESOR', {
      fontSize:   '14px',
      fontFamily: 'Orbitron, Arial Black',
      color:      '#AAFFAA',
      align:      'center'
    }).setOrigin(0.5).setDepth(4).setScrollFactor(0);

    // Nombre del jugador bajo el portrait
    this.add.text(portX, portY + portH / 2 + 10, jugador.nombre, {
      fontSize:   '11px',
      fontFamily: 'Rajdhani, Arial',
      color:      '#AACCFF'
    }).setOrigin(0.5).setDepth(4).setScrollFactor(0);

    // ─ Panel del mensaje ─
    const panelY = portY + portH / 2 + 28;
    const panelH = 200;
    const padX   = 14;

    const panel = this.add.graphics().setDepth(3).setScrollFactor(0);
    panel.fillStyle(0x001a4d, 0.85);
    panel.fillRoundedRect(padX, panelY, W - padX * 2, panelH, 8);
    panel.lineStyle(1, 0xFFD700, 0.5);
    panel.strokeRoundedRect(padX, panelY, W - padX * 2, panelH, 8);

    // ─ Mensaje del Profesor (typewriter, 35ms/carácter) ─
    const mensajeFinal =
      `Lo lograste, ${jugador.nombre}.\n` +
      `Hoy no solo liberaste a tus compañeros,\n` +
      `liberaste algo más importante: tu propio criterio.\n\n` +
      `Un buen líder no necesita controlar a los demás.\n` +
      `Necesita conocerse a sí mismo, inspirar con el ejemplo\n` +
      `y servir antes que mandar.\n\n` +
      `Eso eres tú.\n` +
      `Bienvenido a la Universidad del Desarrollo.`;

    this._txtMensaje = this.add.text(
      W / 2,
      panelY + 12,
      '',
      {
        fontSize:    '13px',
        fontFamily:  'Rajdhani, Arial',
        color:       '#DDEEFF',
        wordWrap:    { width: W - padX * 2 - 20 },
        lineSpacing: 4,
        align:       'center'
      }
    ).setOrigin(0.5, 0).setDepth(4).setScrollFactor(0);

    // ─ Desglose aparece 500ms después de terminar el typewriter ─
    const desgloseY = panelY + panelH + 10;

    this.time.delayedCall(300, () => {
      this._iniciarTypewriter(mensajeFinal, this._txtMensaje, 35, () => {
        this.time.delayedCall(500, () => {
          this._mostrarDesglosePuntaje(
            padX, desgloseY, W - padX * 2,
            stats, bonusTiempo, puntajeFinal
          );
        });
      });
    });
  }

  // ── Typewriter ───────────────────────────────────────────────────────────────

  _iniciarTypewriter(texto, campo, velocidad, alTerminar) {
    let idx = 0;
    campo.setText('');

    if (this._typewriterTimer) this._typewriterTimer.remove();

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

  // ── Desglose de puntaje ──────────────────────────────────────────────────────

  _mostrarDesglosePuntaje(x, y, w, stats, bonusTiempo, puntajeFinal) {
    const W    = this.scale.width;
    const colW = (w - 8) / 2;

    const filas = [
      { icono: '📚', label: 'Preguntas correctas', valor: stats.preguntas * 100, detalle: `${stats.preguntas} × 100 pts` },
      { icono: '🤖', label: 'Enemigos derrotados',  valor: stats.enemigos  * 50,  detalle: `${stats.enemigos} × 50 pts`  },
      { icono: '🪙', label: 'Monedas recolectadas', valor: stats.monedas   * 10,  detalle: `${stats.monedas} × 10 pts`   },
      { icono: '⏱️', label: 'Bonus de velocidad',   valor: bonusTiempo,           detalle: `${stats.tiempo}s de juego`   },
    ];

    // Fondo del desglose
    const bgH = 150;
    const bg  = this.add.graphics().setDepth(3).setAlpha(0).setScrollFactor(0);
    bg.fillStyle(0x001040, 0.92);
    bg.fillRoundedRect(x, y, w, bgH, 8);
    bg.lineStyle(1, 0xFFD700, 0.4);
    bg.strokeRoundedRect(x, y, w, bgH, 8);
    this.tweens.add({ targets: bg, alpha: 1, duration: 300 });

    // Filas en grid 2×2
    filas.forEach((f, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx  = x + col * colW + colW / 2 + 4;
      const cy  = y + 12 + row * 66;

      const cont = this.add.container(cx, cy + 10)
        .setAlpha(0).setDepth(5).setScrollFactor(0);

      cont.add([
        this.add.text(0,  0,  `${f.icono} ${f.label}`, { fontSize: '10px', fontFamily: 'Rajdhani, Arial', color: '#AACCFF', align: 'center' }).setOrigin(0.5, 0),
        this.add.text(0,  14, `+${f.valor} pts`,         { fontSize: '16px', fontFamily: 'Orbitron, Arial Black', color: '#FFD700', align: 'center' }).setOrigin(0.5, 0),
        this.add.text(0,  36, f.detalle,                  { fontSize: '10px', fontFamily: 'Rajdhani, Arial', color: '#667799', align: 'center' }).setOrigin(0.5, 0),
      ]);

      this.tweens.add({
        targets:  cont,
        alpha:    1,
        y:        cy,
        delay:    i * 120,
        duration: 260,
        ease:     'Back.easeOut'
      });
    });

    // ─ Línea divisora ─
    const lineaY = y + bgH + 6;
    const linea  = this.add.graphics().setDepth(4).setAlpha(0).setScrollFactor(0);
    linea.lineStyle(2, 0xFFD700, 0.6);
    linea.lineBetween(x + 10, lineaY, x + w - 10, lineaY);
    this.tweens.add({ targets: linea, alpha: 1, duration: 300, delay: 500 });

    // ─ Total en grande, color dorado ─
    const totalTxt = this.add.text(
      W / 2,
      lineaY + 10,
      `TOTAL: ${puntajeFinal.toLocaleString('es-CL')} pts`,
      {
        fontSize:        '18px',
        fontFamily:      'Orbitron, Arial Black',
        color:           '#FFD700',
        stroke:          '#001040',
        strokeThickness: 4
      }
    ).setOrigin(0.5, 0).setAlpha(0).setDepth(5).setScrollFactor(0);

    this.tweens.add({ targets: totalTxt, alpha: 1, duration: 400, delay: 550 });

    // ─ Botones aparecen tras el desglose ─
    const botonesY = lineaY + 44;
    this._crearBotones(W, botonesY);
  }

  // ── Confeti (graphics rectangulares, sin dependencia de texturas) ────────────

  _lanzarConfeti() {
    const W = this.scale.width;
    const colores = [0xFFD700, 0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0xF7DC6F, 0xFFFFFF];

    const lanzar = (cantidad, delayBase) => {
      for (let i = 0; i < cantidad; i++) {
        const x   = Phaser.Math.Between(0, W);
        const col = Phaser.Utils.Array.GetRandom(colores);
        const sz  = Phaser.Math.Between(4, 9);
        const c   = this.add.graphics().setDepth(2);
        c.fillStyle(col, 1);
        c.fillRect(0, 0, sz, sz);
        c.setPosition(x, -10);

        this.tweens.add({
          targets:  c,
          y:        Phaser.Math.Between(300, 550),
          x:        x + Phaser.Math.Between(-70, 70),
          angle:    Phaser.Math.Between(-360, 360),
          alpha:    { from: 1, to: 0 },
          duration: Phaser.Math.Between(1400, 2800),
          delay:    delayBase + Phaser.Math.Between(0, 1200),
          ease:     'Linear',
          onComplete: () => c.destroy()
        });
      }
    };

    lanzar(45, 0);
    this.time.delayedCall(2200, () => lanzar(35, 0));
  }

  // ── Botones ──────────────────────────────────────────────────────────────────

  _crearBotones(W, y) {
    const btnW = Math.min(340, W - 20);

    // [ VER RANKING ] — texto azul UDD sobre fondo dorado
    this._crearBoton(
      W / 2, y,
      btnW, 44,
      '🏆  VER RANKING',
      0xFFD700, '#003087', 0xFFBB00,
      () => this.scene.start('LeaderboardScene')
    );

    // [ JUGAR DE NUEVO ] — texto dorado sobre fondo azul UDD
    this._crearBoton(
      W / 2, y + 52,
      btnW, 44,
      '▶  JUGAR DE NUEVO',
      0x003087, '#FFD700', 0x0044AA,
      () => this.scene.start('RegistroScene')
    );
  }

  _crearBoton(cx, cy, w, h, texto, bgColor, textColor, hoverColor, callback) {
    const fondo = this.add.graphics().setDepth(6).setScrollFactor(0);

    const dibujar = (hover) => {
      fondo.clear();
      fondo.fillStyle(hover ? hoverColor : bgColor, 1);
      fondo.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
      fondo.lineStyle(2, 0xFFD700, 1);
      fondo.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
    };
    dibujar(false);

    this.add.text(cx, cy, texto, {
      fontSize:   '14px',
      fontFamily: 'Orbitron, Arial Black, Arial',
      color:      textColor,
      align:      'center'
    }).setOrigin(0.5).setDepth(7).setScrollFactor(0);

    const zona = this.add.zone(cx, cy, w, h)
      .setInteractive({ useHandCursor: true })
      .setDepth(8).setScrollFactor(0);

    zona.on('pointerover',  () => dibujar(true));
    zona.on('pointerout',   () => dibujar(false));
    zona.on('pointerdown',  () => { dibujar(true); this.time.delayedCall(120, callback); });
  }

  // ── Limpieza ─────────────────────────────────────────────────────────────────

  shutdown() {
    if (this._typewriterTimer) this._typewriterTimer.remove();
  }
}
