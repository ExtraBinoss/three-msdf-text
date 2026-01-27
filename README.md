# ✒️ MSDF Text Engine for Three.js

[![Deploy to GitHub Pages](https://github.com/ExtraBinoss/three-msdf-text/actions/workflows/deploy.yml/badge.svg)](https://github.com/ExtraBinoss/three-msdf-text/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A ultra-high-performance, professional-grade text rendering engine for Three.js. This library leverages **Multi-channel Signed Distance Fields (MSDF)** and **Hardware Instancing** to render millions of crisp, interactive characters in a single draw call.

## 🎮 [Live Interactive Demo](https://extrabinoss.github.io/three-msdf-text/)

## Install it 

```bash
npm i msdf-text-engine
```

This library is the base for the rendering of NoteBoxes in our Digital Art creation website [Nodl](https://www.nodl.dev)

---

## ✨ Key Features

*   **⚡ Extreme Performance**: Render up to **1,000,000+ characters** at a rock-solid 60 FPS in a single draw call.
*   **🎯 Infinite Precision**: MSDF technology ensures text remains razor-sharp from any distance or angle, eliminating blurry textures forever.
*   **⌨️ Native Interaction**: Full-featured text editing with carats, multi-line support, word wrapping, and 4-directional arrow key navigation.
*   **🌀 Kinetic Typography**: Built-in effects engine for Glitch, Wave, Pulse, Rotation, and Displacement animations—all processed on the GPU.
*   **🔋 VRAM Optimized**: Smart buffer management with real-time VRAM recovery when switching between scenes.
*   **🛠️ Modular Design**: Highly decoupled architecture featuring `TextManager`, `NoteBox`, and `TextEffects`.

---

> **_NOTE:_** For importing your own font, you will need to create your atlas of msdf, as this is not included in the library. You could do it via [Three-BMFont-text](https://www.npmjs.com/package/three-bmfont-text) or the online website by [Don McCurdy](https://msdf-bmfont.donmccurdy.com/)

## ⚙️ Technical Pillars

### 1. Multi-channel Signed Distance Fields (MSDF)
Unlike standard distance fields that struggle with sharp corners, MSDF encodes distance information into three color channels (RGB). This allows the fragment shader to reconstruct pixel-perfect edges and corners at any zoom level.

### 2. Hardware Instancing (Single Draw Call)
Traditional 3D text creates unique geometry for every character, leading to massive draw-call overhead. This engine uses a single `THREE.InstancedMesh`. Every glyph in the scene is an instance of a single shared quad, drastically reducing the CPU-to-GPU communication bottleneck.

### 3. Kinetic Animation Pipeline
Animations (Rotation, Scale, Offset) are applied per-character by updating the `instanceMatrix` in a tight loop. Because we only update the matrix data, we can animate thousands of characters with negligible CPU cost.

---

## � Quick Start

### Installation

```bash
git clone https://github.com/ExtraBinoss/three-msdf-text.git
cd three-msdf-text/msdf-text-engine
npm install
npm run dev
```

### Basic Usage

```typescript
import { TextManager, NoteBox, BoxManager } from 'msdf-text-engine';

// 1. Initialize the Rendering Core
const textManager = new TextManager(scene);
const boxManager = new BoxManager(scene); // Required for NoteBox backgrounds

// 2. Load Font Assets
await textManager.load('./inter-msdf.json', './inter-msdf.png');

// 3. Create Text with Fluent API
textManager.createTextArea("HELLO WORLD")
    .setPos(0, 5, 0)       // Standard coordinates
    .setScale(1.5)         // Global scaling
    .setColor(0x00d4ff)    // Hex color support
    .setBoxSize(10, 5)     // Word-wrapping bounds
    .setWordWrap(true);    // Enable wrapping

// 4. Create NoteBoxes (Advanced UI Components)
const noteBox = new NoteBox(textManager, boxManager, "ui-box-1")
    .setPos(0, 0, 0)
    .setBoxSize(8, 6)
    .setTitle("FLUENT API")
    .setBody("NoteBoxes support headers, bodies, gradients, and auto-wrapping text.")
    .setStyle({
        headerColor1: 0x0088ff,
        bodyColor1: 0x111111,
        bodyAlpha: 0.95
    });
    
// 5. Update Loop
function animate() {
    // Automatically computes layouts and batches all text into one draw call
    textManager.update();
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
```

---

## 🎨 Effects Gallery

The built-in `TextEffects` class provides high-performance animations:

*   **`updateGlitch()`**: Erratic spatial and color shifts for a digital-error aesthetic.
*   **`updateWave()`**: Smooth sinusoidal motion for fluid layouts.
*   **`updatePulseScale()`**: Rhythmic breathing/scaling for focus elements.
*   **`updateRotation()`**: Per-character spinning effects.

---

## 📈 Performance Comparison

| Feature | Standard Three.js Text | MSDF Instanced Engine |
| :--- | :--- | :--- |
| **Draw Calls (10k chars)** | 10,000 | **1** |
| **Sharpness** | Blurry when zoomed | **Infinite (Vector-like)** |
| **Memory Usage** | High (Geometry per char) | **Minimal (Instances)** |
| **Animation Cost** | CPU Intensive | **GPU Fast** |

---

## 🛠️ Deployment (GitHub Pages)

This repository includes a pre-configured GitHub Action for zero-config deployment.

1.  Push your changes to the `main` or `master` branch.
2.  Go to your Repository Settings > Pages.
3.  Set **Build and deployment** > **Source** to **GitHub Actions**.
4.  The workflow will automatically build the Vite project and deploy the `/dist` folder.

---

## 📜 License

MIT © [ExtraBinoss](https://github.com/ExtraBinoss)
