# 📖 MSDF Text Engine API Reference

This document provides a detailed overview of the core classes and methods available in the MSDF Text Engine library.

## 🏗️ Core Rendering

### `TextManager`
The central engine that manages the GPU `InstancedMesh`.

- `constructor(scene: THREE.Scene, initialCapacity: number = 100)`
  - Initializes the engine. Buffer grows dynamically with 20% headroom.
- `async load(fontUrl: string, textureUrl: string): Promise<void>`
  - Loads the MSDF font data and texture atlas.
- `renderGlyphs(glyphs: GlyphLayout[])`
  - Re-fetches all glyph positions into the GPU buffer.
  - **Note**: Call this once per frame with a flattened array of all layouts.
- `getProfile()`
  - Returns performance metrics (instance count, buffer capacity, GPU update time).

---

## 📦 UI Components

### `BoxManager`
Manages the rectangular backgrounds for NoteBoxes using a highly optimized "Stable ID" system.

- `addBox(pos, scale, col1, col2, alpha, mode): number`
  - Returns a `logicalId` that is stable even when other boxes are deleted.
- `removeBox(logicalId: number)`
  - O(1) removal using swap-with-last strategy.
- `updateBox(logicalId, ...)`
  - Updates an existing box's properties.

### `NoteBox`
A high-level container combining backgrounds and text areas.

- `constructor(textManager, boxManager, id?: string)`
  - `id` is a stable string for easy referencing.
- `setSize(w, h)`
  - Resizes the box. Support `autoHeight` for dynamic expansion.
- `getLayout(scale): GlyphLayout[]`
  - Returns transformed glyphs for the `TextManager`.
- `getCaretWorldPosition(part, scale)`
  - Translates caret index to 3D coordinates.
- `getLocalPoint(part, worldPoint, scale)`
  - Translates hit points to local character indices.

### `TextArea`
The layout engine for word-wrapping and style application.

- `computeLayout(): GlyphLayout[]`
  - Runs the logical layout algorithm.
- `getIndexAtPos(x, y): number`
  - Returns character index under a local coordinate.
- `styles: TextStyle[]`
  - Array of color/style overrides per range.

---

## ✨ Effects & Interactions

### `TextEffects`
Utility class for animating glyph colors.

- `updateRainbow(area, start, end, speed)`
  - Cycles colors in the specified range.
- `applyColor(area, start, end, color)`
  - Static color override for a range.

### `TextEditor`
Handles global keyboard events and manages the blinking caret.

- `focus(area: TextArea | null, index?: number)`
  - Activates text input for a specific area.
- `setColor(color)`
  - Sets caret color.
- `update(deltaTime)`
  - Handles the blink timer.
