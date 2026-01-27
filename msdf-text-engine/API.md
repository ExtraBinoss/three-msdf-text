# MSDF Text Engine API Documentation

## TextManager

The `TextManager` class is the core component for rendering MSDF text using Three.js `InstancedMesh`. It handles efficient batching of characters.

### Constructor

```typescript
const textManager = new TextManager(scene: THREE.Scene, maxChars: number = 1000);
```

-   **scene**: The Three.js scene where the text mesh will be added.
-   **maxChars**: The maximum number of characters that can be displayed at once. This sets the size of the instance buffer. Default is `1000`.

### Properties

#### `textScale: number`
Controls the overall size of the rendered text. Maps pixel-based font metrics to world units. Default is `0.01`.

### Methods

#### `load(fontUrl: string, textureUrl: string): Promise<void>`

Loads the necessary MSDF font assets.

-   **fontUrl**: URL to the MSDF JSON file (e.g., `/font.json`).
-   **textureUrl**: URL to the MSDF texture atlas (e.g., `/font.png`).
-   **Returns**: A `Promise` that resolves when assets are loaded.

```typescript
await textManager.load('/assets/font.json', '/assets/font.png');
```

#### `setText(text: string): void`

Updates the text displayed by the mesh.

-   **text**: The string of text to render. It supports newlines `\n`.

```typescript
textManager.setText("Hello World!\nmultiline text");
```

#### `getProfile(): object`

Returns an object containing internal profiling statistics.

-   **visibleCharacters**: Number of characters currently rendered.
-   **bufferCapacity**: Maximum capacity of the instance buffer.
-   **geometryVertices**: Total vertices (visible * 4).
-   **lastUpdateDuration**: Time taken for the last `setText` update in milliseconds.

```typescript
const stats = textManager.getProfile();
console.log(`Rendering ${stats.visibleCharacters} chars in ${stats.lastUpdateDuration}ms`);
```

## Performance & Rendering Info

The engine uses a single draw call per `TextManager` instance (via `InstancedMesh`).
-   **Draw Calls**: 1 (plus background/other scene objects).
-   **Triangles**: 2 * `instanceCount` (each character is a quad).
-   **Shaders**: Uses custom MSDF shaders with supersampling for high-quality rendering at all scales.

## Usage Example

```typescript
import * as THREE from 'three';
import { TextManager } from './TextManager';

// Setup Three.js scene...
const scene = new THREE.Scene();

// Initialize TextManager
const textManager = new TextManager(scene, 5000);

// Load assets and set text
textManager.load('/font.json', '/font.png').then(() => {
    textManager.setText("Initial Text");
});
```
