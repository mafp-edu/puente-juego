/**
 * RegistroScene.js
 * Pantalla de registro del jugador.
 * Muestra un formulario con nombre, apellido y celular.
 * Valida campos vacíos y guarda en localStorage como 'jugadorActual'.
 * Al confirmar, navega a LeaderboardScene.
 */

import { COLORES } from '../config.js';

export default class RegistroScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RegistroScene' });
  }

  create() {
    // Limpiar formulario previo si existe (por si se vuelve a esta escena)
    this._destruirFormulario();
    // Limpiar también cualquier form huérfano en el DOM
    const formViejo = document.getElementById('form-registro');
    if (formViejo) formViejo.remove();

    const W = this.scale.width;
    const H = this.scale.height;

    // ─ Fondo: imagen personalizada o degradado de respaldo ─
    if (this.textures.exists('fondoInicio') && this.textures.get('fondoInicio').key !== '__MISSING') {
      this.add.image(W / 2, H / 2, 'fondoInicio').setDisplaySize(W, H);
    } else {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x060D22, 0x060D22, 0x0D1B3E, 0x0D1B3E, 1);
      bg.fillRect(0, 0, W, H);
    }

    // ─ Panel central ─
    const panelW = Math.min(380, W - 10), panelH = 290;
    const panelX = W / 2 - panelW / 2;
    const panelY = H / 2 - panelH / 2 + 10;

    const panel = this.add.graphics();
    panel.fillStyle(0x0A1428, 0.97);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(2, 0xCC2200, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    // Cabecera
    panel.fillStyle(0x152444, 1);
    panel.fillRect(panelX + 2, panelY + 2, panelW - 4, 36);
    panel.fillStyle(0xCC2200, 1);
    panel.fillRect(panelX + 2, panelY + 36, panelW - 4, 2);

    this.add.text(W / 2, panelY + 18, 'Identificación de agente', {
      fontSize: '13px',
      fontFamily: 'Orbitron, monospace',
      color: '#FFD700'
    }).setOrigin(0.5).setVisible(false); // ocultado: el título vive dentro del form DOM

    // ─ Crear campos de formulario DOM ─
    this._crearFormularioDOM(W, H, panelY + 50);
  }

  /**
   * Crea elementos HTML superpuestos al canvas para los inputs.
   * Esto permite inputs táctiles reales en móviles.
   */
  _crearFormularioDOM(W, H, topOffset) {
    // Contenedor del formulario
    const form = document.createElement('div');
    form.id = 'form-registro';
    Object.assign(form.style, {
      position:   'fixed',
      top:        '65%',
      left:       '50%',
      transform:  'translate(-50%, -50%)',
      display:    'flex',
      flexDirection: 'column',
      gap:        '10px',
      width:      'min(320px, 88vw)',
      maxHeight:  '90dvh',
      overflowY:  'auto',
      WebkitOverflowScrolling: 'touch',
      zIndex:     '200'
    });

    // ─ Título dentro del form (evita colisión con capa Phaser) ─
    const titulo = document.createElement('div');
    titulo.textContent = 'IDENTIFICACIÓN DE AGENTE';
    Object.assign(titulo.style, {
      textAlign:    'center',
      fontSize:     '13px',
      fontFamily:   'Orbitron, Arial Black, sans-serif',
      color:        '#FFD700',
      letterSpacing:'1px',
      paddingBottom:'4px',
      borderBottom: '1px solid #CC2200',
      marginBottom: '2px'
    });
    form.appendChild(titulo);

    // ─ Helper para crear label + input ─
    const crearCampo = (id, label, type = 'text', placeholder = '') => {
      const wrapper = document.createElement('div');
      Object.assign(wrapper.style, {
        display:       'flex',
        flexDirection: 'column',
        gap:           '3px'
      });

      const lbl = document.createElement('label');
      lbl.textContent = label;
      Object.assign(lbl.style, {
        color:      '#AABBCC',
        fontSize:   '14px',
        fontFamily: 'Rajdhani, Arial, sans-serif',
        fontWeight: '600'
      });

      const inp = document.createElement('input');
      inp.type        = type;
      inp.id          = id;
      inp.placeholder = placeholder;
      if (id === 'inp-celular') inp.inputMode = 'numeric';
      Object.assign(inp.style, {
        padding:      '12px 14px',
        fontSize:     '16px',  // ≥16px evita zoom automático en iOS
        fontFamily:   'Rajdhani, Arial, sans-serif',
        borderRadius: '8px',
        border:       '2px solid #1A3A5A',
        background:   '#0A1428',
        color:        '#FFFFFF',
        outline:      'none',
        width:        '100%'
      });

      inp.addEventListener('focus', () => { inp.style.borderColor = '#FFD700'; });
      inp.addEventListener('blur',  () => { inp.style.borderColor = '#1A3A5A'; });

      wrapper.appendChild(lbl);
      wrapper.appendChild(inp);
      return wrapper;
    };

    form.appendChild(crearCampo('inp-nombre',   'Nombre',   'text', 'Ingresa tu nombre'));
    form.appendChild(crearCampo('inp-apellido',  'Apellido', 'text', 'Ingresa tu apellido'));
    form.appendChild(crearCampo('inp-celular',   'Celular',  'tel',  'Ej: 987654321'));

    // ─ Mensaje de error ─
    const error = document.createElement('p');
    error.id = 'error-registro';
    Object.assign(error.style, {
      color:      '#FF4466',
      fontSize:   '12px',
      fontFamily: 'Arial',
      minHeight:  '16px',
      margin:     '0'
    });
    form.appendChild(error);

    // ─ Botón Comenzar ─
    const btn = document.createElement('button');
    btn.textContent = '▶  COMENZAR';
    Object.assign(btn.style, {
      padding:       '15px',
      fontSize:      '17px',
      fontFamily:    'Orbitron, Arial Black, Arial',
      fontWeight:    'bold',
      background:    '#CC2200',
      color:         '#FFD700',
      border:        '2px solid #FFD700',
      borderRadius:  '8px',
      cursor:        'pointer',
      letterSpacing: '1px',
      transition:    'background 0.2s'
    });
    btn.addEventListener('mouseenter', () => { btn.style.background = '#FF3311'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#CC2200'; });

    // ─ Lógica al hacer click en Comenzar ─
    btn.addEventListener('click', () => {
      const nombre   = document.getElementById('inp-nombre').value.trim();
      const apellido = document.getElementById('inp-apellido').value.trim();
      const celular  = document.getElementById('inp-celular').value.trim();

      // Validación básica
      if (!nombre) {
        error.textContent = '⚠ Por favor ingresa tu nombre.';
        return;
      }
      if (!apellido) {
        error.textContent = '⚠ Por favor ingresa tu apellido.';
        return;
      }
      if (!celular) {
        error.textContent = '⚠ Por favor ingresa tu celular.';
        return;
      }
      if (!/^\d{7,15}$/.test(celular.replace(/[\s\-+]/g, ''))) {
        error.textContent = '⚠ Celular inválido. Solo números (7-15 dígitos).';
        return;
      }

      // Guardar en localStorage
      const jugador = { nombre, apellido, celular, nombreCompleto: `${nombre} ${apellido}` };
      localStorage.setItem('jugadorActual', JSON.stringify(jugador));

      // Eliminar formulario y avanzar
      this._destruirFormulario();
      this.scene.start('IntroScene');
    });

    form.appendChild(btn);
    document.body.appendChild(form);

    // Guardar referencia para limpieza
    this._formEl = form;
  }

  /** Elimina el formulario DOM al salir de la escena */
  _destruirFormulario() {
    if (this._formEl) {
      this._formEl.remove();
      this._formEl = null;
    }
  }

  // Asegurarse de limpiar si la escena se cierra por otra vía
  shutdown() {
    this._destruirFormulario();
  }
}
