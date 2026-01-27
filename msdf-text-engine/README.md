# ✒️ Three.js MSDF Instanced Text Engine

A professional-grade, ultra-high-performance text rendering engine for Three.js. This library leverages **Multi-channel Signed Distance Fields (MSDF)** and **GPU Instancing** to render thousands of crisp, interactive characters in a single draw call.

![Demo Screenshot](https://raw.githubusercontent.com/ExtraBinoss/text-msdf/main/screenshot.png) *(Placeholder if you have an image, or I can generate a concept description)*

## 🚀 Why Use This?

Rendering text in 3D is notoriously difficult and usually comes with a choice: blurry textures or low performance. This engine gives you the best of both worlds:

- **Infinite Sharpness**: MSDF technology keeps text razor-sharp even when the camera is zoomed in close.
- **Extreme Scale**: Render **up to 1,000,000 characters** in a single scene. Every glyph is a GPU instance, meaning zero CPU overhead for layout updates.
- **Real-time Interactivity**: A built-in `TextEditor` provides a native-feeling experience with carats, arrow key navigation, and word wrapping.

## ⚙️ How It Works: The Performance Pillars

This engine achieves its extreme scale (1M+ characters) through two specialized technologies working in tandem:

### 1. MSDF (Multi-channel Signed Distance Fields)
Unlike standard text textures that get blurry when scaled, MSDF encodes distance information into three color channels (RGB).
- **Resolution Independent**: Text stays perfectly sharp at any zoom level or resolution.
- **Fast Rendering**: The heavy lifting of edge smoothing is done in a simple fragment shader, making it much lighter than high-resolution font atlases.

### 2. Extreme GPU Instancing
Traditional Three.js text creates unique geometry for every character, which kills performance via "Draw Call Overhead." 
- **Single Draw Call**: This engine uses a single `THREE.InstancedMesh`. Every character in the scene—even if there are a million—is rendered in **one single draw call**.
- **GPU-Side Layout**: We only send raw position and UV data to the GPU. The GPU then replicates the character quad a million times instantly.
- **Zero Memory Waste**: The engine uses a "Tight Fit" buffer strategy with 20% headroom, ensuring we use only as much VRAM as absolutely necessary.

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
- **Instances**: 1,000,000+ glyphs
- **Draw Calls**: 2 (1 for all text, 1 for all backgrounds)
- **CPU Time**: Updates are processed on the GPU via instances.

## 📜 License

This project is open-source and available under the **MIT License**.
