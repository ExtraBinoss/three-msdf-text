# 🛠️ Developer Documentation

This document explains the internal architecture and APIs of the MSDF Text Engine.

## 📁 Project Structure

- `src/library/`: Core engine code.
  - `base/TextManager.ts`: Direct GPU interface. Handles `InstancedMesh` and UV mapping.
  - `noteBoxes/`: High-level UI components.
    - `NoteBox.ts`: The main container class.
    - `TextArea.ts`: Handles text wrapping and index calculation.
    - `BoxManager.ts`: Manages background boxes (headers/bodies).
  - `textEdit/TextEditor.ts`: Handles keyboard input and carats.
  - `effects/TextEffects.ts`: Utility for per-glyph animations.
- `src/demo/`: Playground/Exhibit code.
  - `SceneSetup.ts`: Three.js boilerplate.
  - `Exhibits.ts`: Individual demo configurations.
  - `InteractionHandler.ts`: Mouse picking and controls.

---

## 🚀 Core Components

### 1. `TextManager`
The `TextManager` is the most important class. Every character you see is rendered by a single `InstancedMesh` managed here.

- **Dynamic Growth**: The engine starts with a small buffer and grows it by 20% + 500 characters whenever you exceed capacity. This minimizes expensive GPU re-allocations.
- **Batching**: Never call `renderGlyphs` multiple times per frame. Instead, collect all layouts from your NoteBoxes and pass them in one final call.

### 2. `NoteBox`
A `NoteBox` is a composite of three `BoxManager` instances (Header, Body, Resize Handle) and two `TextArea` instances (Title, Body).

- **`getLayout(scale)`**: Returns a flattened array of glyph positions in world-space.
- **`getLocalPoint(part, worldPoint)`**: Utility to convert a 3D intersection point back into local character-space (fundamental for click-to-focus).

### 3. `TextArea`
The logical "brain" of the text. It doesn't know about rendering; it only knows about character dimensions and line breaks.

- **Word Wrapping**: Implements a Greedy Line Breaking algorithm.
- **Picking**: `getIndexAtPos(x, y)` provides the character index closest to a local coordinate.

---

## 🎨 Styling API

Styles are applied per character range.

```typescript
area.styles.push({
    start: 0,
    end: 5,
    color: new THREE.Color(0x00ff00)
});
```

You can then use `TextEffects` to animate these ranges (e.g., `updateRainbow` simply shifts the colors in a range every frame).

## ⌨️ Interaction Lifecycle

1. **Detection**: `InteractionHandler` uses a `Raycaster` on the `BoxManager.getMesh()`.
2. **Identification**: `noteBox.getPart(instanceId)` identifies if you hit a header, body or resize handle.
3. **Focus**: `textEditor.focus(area, index)` activates the keyboard listeners for that specific `TextArea`.
4. **Drawing**: The `animate` loop in `main.ts` collects all layouts and syncs the caret's world position.

## 🏗️ Building & Extending

To add a new effect:
1. Open `src/library/effects/TextEffects.ts`.
2. Add a method that modifies the `color` property of glyphs within a `TextArea`'s layout.
3. Call it in `main.ts` during the animation phase.
