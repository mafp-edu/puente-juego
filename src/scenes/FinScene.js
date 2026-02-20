/**
 * FinScene.js
 * Pantalla final de victoria.
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
    this._preguntasCorrectas = data.preguntasCorrectas || 0;
    this._enemigosDerrotados = data.enemigosDerrotados || 0;
    this._monedas            = data.monedas            || 0;
    this._tiempoSegundos     = data.tiempoSegundos     || 0;
    this._bossVencido        = data.bossVencido        || false;
    this._typewriterTimer    = null;

    // Calcular puntaje con la fórmula estándar
    const bonusTiempo = Math.max(0, 1000 - this._tiempoSegundos * 2);
    this._puntajeFinal = (this._preguntasCorrectas * 100)
                       + (this._enemigosDerrotados * 50)
                       + (this._monedas            * 10)
                       + bonusTiempo;

    // Si se recibió un puntajeFinal explícito mayor (p.ej. bonus del boss), usarlo
    if (data.puntajeFinal && data.puntajeFinal > this._puntajeFinal) {
      this._puntajeFinal = data.puntajeFinal;
    }
  }

  // ── Create (async para guardar en Firebase) ──────────────────────────────────

  async create() {
    const W = this.scale.width;   // 390
    const H = this.scale.height;  // 700

    // ─ Leer jugador desde localStorage ─
    let jugador = { nombre: 'Estudiante', apellido: '', celular: '' };
    try {
      const raw = localStorage.getItem('jugadorActual');
      if (raw) jugador = { ...jugador, ...JSON.parse(raw) };
    } catch { /* silencioso */ }

    // ─ Guardar en Firebase (sin bloquear el visual) ─
    guardarPuntaje({
      nombre:    jugador.nombre,
      apellido:  jugador.apellido,
      celular:   jugador.celular,
      puntaje:   this._puntajeFinal,
      preguntas: this._preguntasCorrectas,
      enemigos:  this._enemigosDerrotados,
      monedas:   this._monedas,
      tiempo:    this._tiempoSegundos
    }).then(ok => {
      if (ok) {
        console.log('✅ Puntaje guardado en Firebase:', this._puntajeFinal);
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
            puntaje:        this._puntajeFinal,
            fecha:          new Date().toLocaleDateString('es-CL')
          });
          lb.sort((a, b) => b.puntaje - a.puntaje);
          if (lb.length > 5) lb.splice(5);
          localStorage.setItem('leaderboard', JSON.stringify(lb));
        } catch { /* silencioso */ }
      }
    });

    // ── VISUAL ORIGINAL intacto desde aquí ────────────────────────────────────

    // ─ Fondo ─
    this.add.graphics()
      .fillGradientStyle(0x060D22, 0x060D22, 0x0D1A0A, 0x0D1A0A, 1)
      .fillRect(0, 0, W, H);

    this._lanzarConfeti();

    // ─ Banner de celebración (franja superior) ─
    const CEL_H = 180;
    const tieneCelebracion = this.textures.exists('celebracion');
    if (tieneCelebracion) {
      this.add.image(W / 2, CEL_H / 2, 'celebracion')
        .setDisplaySize(W, CEL_H).setDepth(1);
      this.add.graphics().setDepth(2)
        .fillGradientStyle(0x0A1428, 0x0A1428, 0x0A1428, 0x0A1428, 0, 0, 0.92, 0.92)
        .fillRect(0, CEL_H - 36, W, 36);
    }

    // ─ Panel ─
    const PAD    = 8;
    const panelX = PAD;
    const panelW = W - PAD * 2;
    const panelY = tieneCelebracion
      ? CEL_H - 16
      : Math.round((H - 116 - 400) / 2);
    const panelH = H - panelY - 116;

    const panel = this.add.graphics().setDepth(2);
    panel.fillStyle(0x0A1428, 1);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(2, 0xFFD700, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.fillStyle(0x152444, 1);
    panel.fillRect(panelX + 2, panelY + 2, panelW - 4, 30);
    panel.fillStyle(0xFFD700, 0.5);
    panel.fillRect(panelX + 2, panelY + 31, panelW - 4, 1);

    // ─ Título ─
    this.add.text(W / 2, panelY + 16, '🏆  ¡VICTORIA!  🏆', {
      fontSize: '14px', fontFamily: 'Orbitron, Arial Black',
      color: '#FFD700', stroke: '#0D1B3E', strokeThickness: 3
    }).setOrigin(0.5).setDepth(3);

    // ─ Portrait del Profesor ─
    const portW  = 54, portH = 70;
    const portCY = panelY + 38 + portH / 2;
    const portrait = this.add.image(W / 2, portCY, 'profesor')
      .setDisplaySize(portW, portH).setDepth(3).setAlpha(0);
    this.add.graphics().setDepth(3)
      .lineStyle(1, 0xFFD700, 0.5)
      .strokeRect(W / 2 - portW / 2, portCY - portH / 2, portW, portH);
    this.add.text(W / 2, portCY + portH / 2 + 8, 'El Profesor', {
      fontSize: '9px', fontFamily: 'Arial', color: '#886644'
    }).setOrigin(0.5).setDepth(3);
    this.tweens.add({ targets: portrait, alpha: 1, duration: 500, delay: 200 });

    // ─ Texto del mensaje ─
    const msgY   = portCY + portH / 2 + 22;
    const msgPad = 14;

    const mensajeFinal =
      `Lo lograste, ${jugador.nombre}. Hoy no solo liberaste a tus compañeros — ` +
      `liberaste tu propio criterio.\n\n` +
      `Un buen líder no controla: inspira. Sirve antes que manda ` +
      `y muestra el camino con el ejemplo.\n\n` +
      `Bienvenido a la Universidad del Desarrollo.`;

    this._txtMensaje = this.add.text(W / 2, msgY, '', {
      fontSize:    '14px',
      fontFamily:  'Rajdhani, Arial',
      color:       '#DDEEFF',
      wordWrap:    { width: panelW - msgPad * 2 },
      lineSpacing: 3,
      align:       'center'
    }).setOrigin(0.5, 0).setDepth(3);

    // ─ Línea divisora ─
    const divY = msgY + 94;
    this.add.graphics().setDepth(3)
      .lineStyle(1, 0x334466, 0.8)
      .lineBetween(panelX + 12, divY, panelX + panelW - 12, divY);

    // ─ Botones ─
    this._crearBotones(W, H);

    // ─ Typewriter → desglose al terminar ─
    this.time.delayedCall(500, () => {
      this._iniciarTypewriter(mensajeFinal, this._txtMensaje, 18, () => {
        this._mostrarDesglosePuntaje(panelX, divY + 12, panelW);
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

  _mostrarDesglosePuntaje(panelX, scoreY, panelW) {
    const W    = this.scale.width;
    const colW = (panelW - 16) / 2;
    const dgH  = 142;

    const bonusTiempo = Math.max(0, 1000 - this._tiempoSegundos * 2);

    const datos = [
      { label: '📚 Preguntas',  val: this._preguntasCorrectas * 100, sub: `${this._preguntasCorrectas}/3 correctas` },
      { label: '⚔️ Enemigos',   val: this._enemigosDerrotados * 50,  sub: `×${this._enemigosDerrotados}` },
      { label: '🪙 Monedas',    val: this._monedas * 10,             sub: `×${this._monedas}` },
      { label: '⚡ Velocidad',  val: bonusTiempo,                    sub: `${this._tiempoSegundos}s` },
    ];

    const dg = this.add.graphics().setDepth(3).setAlpha(0);
    dg.fillStyle(0x060D20, 0.88);
    dg.fillRoundedRect(panelX + 8, scoreY - 4, panelW - 16, dgH, 6);
    this.tweens.add({ targets: dg, alpha: 1, duration: 300 });

    datos.forEach((d, i) => {
      const cx = panelX + 8 + (i % 2) * colW + colW / 2;
      const cy = scoreY + 4 + Math.floor(i / 2) * 62;
      const col = this.add.container(cx, cy + 10).setAlpha(0).setDepth(4);

      col.add([
        this.add.text(0,  0, d.label,     { fontSize: '11px', fontFamily: 'Arial', color: '#AACCFF', align: 'center' }).setOrigin(0.5, 0),
        this.add.text(0, 16, `+${d.val}`, { fontSize: '16px', fontFamily: 'Arial Black', color: '#FFD700', align: 'center' }).setOrigin(0.5, 0),
        this.add.text(0, 36, d.sub,       { fontSize: '11px', fontFamily: 'Arial', color: '#667799', align: 'center' }).setOrigin(0.5, 0),
      ]);

      this.tweens.add({
        targets:  col,
        alpha:    1,
        y:        cy,
        delay:    i * 100,
        duration: 280,
        ease:     'Back.easeOut'
      });
    });

    const totalY = scoreY + dgH + 6;
    const totalTxt = this.add.text(W / 2, totalY, `TOTAL: ${this._puntajeFinal.toLocaleString('es-CL')} pts`, {
      fontSize:        '17px',
      fontFamily:      'Orbitron, Arial Black',
      color:           '#FFD700',
      stroke:          '#000033',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0).setDepth(4);

    this.tweens.add({ targets: totalTxt, alpha: 1, duration: 400, delay: 450 });
  }

  // ── Confeti ────────────────────────────────────────────────────────────────────

  _lanzarConfeti() {
    const W = this.scale.width;
    const tiposConfeti = ['confeti_oro', 'confeti_rosa', 'confeti_cyan'];

    for (let i = 0; i < 50; i++) {
      const tipo = Phaser.Utils.Array.GetRandom(tiposConfeti);
      const x    = Phaser.Math.Between(0, W);
      const c    = this.add.image(x, -10, tipo);

      this.tweens.add({
        targets:  c,
        y:        Phaser.Math.Between(300, 500),
        x:        x + Phaser.Math.Between(-60, 60),
        angle:    Phaser.Math.Between(-360, 360),
        alpha:    { from: 1, to: 0 },
        duration: Phaser.Math.Between(1200, 2500),
        delay:    Phaser.Math.Between(0, 1500),
        ease:     'Linear',
        onComplete: () => c.destroy()
      });
    }

    this.time.delayedCall(2000, () => {
      for (let i = 0; i < 40; i++) {
        const tipo = Phaser.Utils.Array.GetRandom(tiposConfeti);
        const x    = Phaser.Math.Between(0, W);
        const c    = this.add.image(x, -10, tipo);

        this.tweens.add({
          targets:  c,
          y:        Phaser.Math.Between(250, 480),
          x:        x + Phaser.Math.Between(-80, 80),
          angle:    Phaser.Math.Between(-360, 360),
          alpha:    { from: 1, to: 0 },
          duration: Phaser.Math.Between(1500, 2800),
          delay:    Phaser.Math.Between(0, 1000),
          ease:     'Linear',
          onComplete: () => c.destroy()
        });
      }
    });
  }

  // ── Botones ──────────────────────────────────────────────────────────────────

  _crearBotones(W, H) {
    const btnW = Math.min(340, W - 20);

    this._crearBotonPhaser(W / 2, H - 90, btnW, 44, 'VER RANKING', 0x003087, '#FFD700', () => {
      this.scene.start('LeaderboardScene');
    });

    this._crearBotonPhaser(W / 2, H - 40, btnW, 44, 'JUGAR DE NUEVO', 0x1A1A2E, '#00E5FF', () => {
      this.scene.start('RegistroScene');
    });
  }

  _crearBotonPhaser(cx, cy, w, h, texto, bgColor, textColor, callback) {
    const fondo = this.add.graphics();

    const dibujar = (hover) => {
      fondo.clear();
      fondo.fillStyle(hover ? 0x0055AA : bgColor, 1);
      fondo.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
      fondo.lineStyle(2, 0xFFD700, 1);
      fondo.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
    };
    dibujar(false);

    this.add.text(cx, cy, texto, {
      fontSize:   '14px',
      fontFamily: 'Arial Black, Arial',
      color:      textColor,
      align:      'center'
    }).setOrigin(0.5);

    const zona = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
    zona.on('pointerover',  () => dibujar(true));
    zona.on('pointerout',   () => dibujar(false));
    zona.on('pointerdown',  () => {
      dibujar(true);
      callback();
    });
  }

  // ── Limpieza ─────────────────────────────────────────────────────────────────

  shutdown() {
    if (this._typewriterTimer) this._typewriterTimer.remove();
  }
}
