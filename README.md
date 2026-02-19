# El Camino del Buen Líder 🎮

Juego de plataforma 2D educativo desarrollado con **Phaser 3** para la **Universidad del Desarrollo (UDD)**.

---

## Descripción

*El Camino del Buen Líder* es un plataformer de scroll lateral donde el jugador encarna a **Novo**, un alumno nuevo de la UDD, que debe recorrer el campus tomado por **Pólux** — un algoritmo de evaluación con consciencia propia — liberando compañeros capturados y respondiendo preguntas de filosofía, economía y política.

---

## Cómo ejecutar

### Opción 1 – Live Server (recomendado)
1. Abre la carpeta del proyecto en **VS Code**.
2. Instala la extensión **Live Server** (ritwickdey.LiveServer).
3. Haz clic derecho en `index.html` → **"Open with Live Server"**.

### Opción 2 – Servidor local con Python
```bash
# Python 3
python -m http.server 8080
# Luego abre: http://localhost:8080
```

### Opción 3 – npx serve
```bash
npx serve .
```

> ⚠️ **No abrir directamente como archivo** (`file://`). Los ES6 modules requieren servidor HTTP.

---

## Controles

| Acción | Teclado |
|--------|---------|
| Mover izquierda | `←` o `A` |
| Mover derecha | `→` o `D` |
| Saltar / Doble salto | `Espacio` o `↑` |
| Derrotar enemigo | Saltar encima |

---

## Flujo de pantallas

```
BootScene → RegistroScene → LeaderboardScene → GameScene
                                                    ↕ (hitos 1,2,3)
                                               DialogoScene
                                                    ↓
                                               FinScene → LeaderboardScene
```

---

## Sistema de puntaje

```
Puntaje Final =
  (preguntas correctas × 100)    // máx. 300
  + (enemigos derrotados × 50)
  + (monedas recolectadas × 10)
  + max(0, 1000 − tiempo×2)      // bonus velocidad
```

---

## Los 3 hitos

| # | Lugar | Tema | Pensador |
|---|-------|------|----------|
| 1 | Plaza de la Innovación | Poder legítimo | John Locke |
| 2 | Biblioteca del Saber | Riqueza de las naciones | Adam Smith |
| 3 | Auditorio Central | Gobernar con astucia | Maquiavelo |

---

## Estructura de archivos

```
el-camino-del-buen-lider/
├── index.html              ← Punto de entrada
├── src/
│   ├── config.js           ← Configuración global, colores, preguntas
│   ├── scenes/
│   │   ├── BootScene.js    ← Carga assets + genera texturas placeholder
│   │   ├── RegistroScene.js← Formulario de jugador
│   │   ├── LeaderboardScene.js ← TOP 5 puntajes
│   │   ├── GameScene.js    ← Nivel principal
│   │   ├── DialogoScene.js ← Panel de preguntas superpuesto
│   │   └── FinScene.js     ← Pantalla de victoria
│   └── objects/
│       ├── Player.js       ← Novo (jugador)
│       ├── Enemy.js        ← Robots con birrete
│       └── Coin.js         ← Monedas y libros
├── assets/
│   ├── sprites/            ← Colocar PNGs aquí cuando estén listos
│   ├── tilemaps/           ← Tilemaps Tiled (opcional)
│   └── audio/              ← MP3/OGG de música y efectos
└── README.md
```

---

## Reemplazar placeholders por sprites reales

1. Agrega los PNG en `assets/sprites/`.
2. En `BootScene.js`, reemplaza las llamadas a `generateTexture()` por `this.load.image()` o `this.load.spritesheet()`.
3. En las clases `Player`, `Enemy`, `Coin`: usa `play('animacion')` en lugar de `setTint()`.

---

## Tecnologías

- **Phaser 3.60** — Motor de juego 2D vía CDN
- **ES6 Modules nativos** — Sin bundler ni npm
- **localStorage** — Persistencia del leaderboard
- **HTML/CSS puro** — Formularios y botones superpuestos al canvas

---

## Créditos

- Concepto y diseño pedagógico: UDD
- Motor: [Phaser 3](https://phaser.io/)
- Desarrollado como proyecto académico · 2026
