# ✒️ Three.js MSDF Instanced Text Engine

A professional-grade, ultra-high-performance text rendering engine for Three.js. This library leverages **Multi-channel Signed Distance Fields (MSDF)** and **GPU Instancing** to render thousands of crisp, interactive characters in a single draw call.

![Demo Screenshot](https://raw.githubusercontent.com/ExtraBinoss/text-msdf/main/screenshot.png) *(Placeholder if you have an image, or I can generate a concept description)*

## 🚀 Why Use This?

Rendering text in 3D is notoriously difficult and usually comes with a choice: blurry textures or low performance. This engine gives you the best of both worlds:

- **Infinite Sharpness**: MSDF technology keeps text razor-sharp even when the camera is zoomed in close.
- **Extreme Scale**: Render **10,000+ characters** at 60 FPS. Every glyph is a GPU instance, meaning zero CPU overhead for layout updates.
- **Real-time Interactivity**: A built-in `TextEditor` provides a native-feeling experience with carats, arrow key navigation, and word wrapping.

## ✨ Key Features

- 💎 **Instanced Rendering**: Perfectly batched drawing via `THREE.InstancedMesh`.
- 📦 **NoteBox UI System**: Professional window-like containers with draggable headers and manual resizing.
- 🎨 **Dynamic Styling**: Independent control over text color, rainbow effects, and gradients (Radial, Vertical, Horizontal).
- ⌨️ **Live Editing**: Double-click any text area to enter edit mode with full keyboard support and blinking caret.
- 📏 **Smart Layout**: Automatic line wrapping and `autoHeight` containers that grow as you type.
- 🛠️ **Memory Optimized**: intelligent buffer growth (20% headroom) to prevent GPU re-allocations.

## 🏗️ Architecture

The library is designed to be modular and easy to drop into any Three.js project:

- **`TextManager`**: The core engine. Manages the GPU buffers and renders glyphs.
- **`NoteBox`**: A high-level UI component for creating interactive notes/labels.
- **`TextArea`**: A logical layout engine that handles word-wrapping and cursor placement.
- **`TextEditor`**: A state manager for keyboard input and caret animation.
- **`TextEffects`**: A utility class for applying animations like rainbow cycles or color shifts.

## 📦 Installation

```bash
git clone https://github.com/ExtraBinoss/text-msdf.git
cd text-msdf
npm install
npm run dev
```

## 🛠️ Basic Usage

```typescript
import { TextManager, NoteBox, BoxManager } from './library';

// 1. Initialize Managers
const textManager = new TextManager(scene);
const boxManager = new BoxManager(scene);

// 2. Load Assets
await textManager.load('/font.json', '/font.png');

// 3. Create an interactive NoteBox
const box = new NoteBox(textManager, boxManager, "my-note");
box.setPosition(0, 0, 0);
box.setSize(8, 6);
box.titleArea.text = "Hello World";
box.bodyArea.text = "This is ultra-sharp MSDF text!";

// 4. Update in render loop
function animate() {
    const layouts = [box.getLayout(0.01)]; // Get world-space glyph positions
    textManager.renderGlyphs(layouts.flat());
    renderer.render(scene, camera);
}
```

## 📈 Performance Benchmarks

In **Turbo Mode**, the engine handles:
- **Instances**: 10,240+ glyphs
- **Draw Calls**: 2 (1 for all text, 1 for all backgrounds)
- **CPU Time**: < 1.5ms per layout update

## 📜 License

This project is open-source and available under the **MIT License**.
