# TextEffects API

The `TextEffects` class provides advanced per-character effects for MSDF text rendering.

## Installation

```typescript
import { TextEffects } from './TextEffects.ts';

const textEffects = new TextEffects(textManager);
```

## Core Concept

TextEffects works by identifying character ranges using **start and end indices**. Each effect is assigned a unique ID for later removal or modification.

## API Methods

### `gradient(id, startIndex, endIndex, colors)`

Apply a color gradient across a range of characters.

**Parameters:**
- `id: string` - Unique identifier for this effect
- `startIndex: number` - Starting character index (inclusive)
- `endIndex: number` - Ending character index (exclusive)
- `colors: THREE.Color[]` - Array of colors to interpolate between

**Example:**
```typescript
// Pink to cyan to green gradient
textEffects.gradient('my-gradient', 0, 10, [
    new THREE.Color(0xff0080),
    new THREE.Color(0x00ffff),
    new THREE.Color(0x80ff00)
]);
```

---

### `color(id, startIndex, endIndex, color)`

Apply a solid color to a range of characters.

**Parameters:**
- `id: string` - Unique identifier for this effect
- `startIndex: number` - Starting character index (inclusive)
- `endIndex: number` - Ending character index (exclusive)
- `color: THREE.Color` - Color to apply

**Example:**
```typescript
// Make characters 5-15 red
textEffects.color('red-text', 5, 15, new THREE.Color(0xff0000));
```

---

### `rainbow(id, startIndex, endIndex, speed?, offset?)`

Apply an animated rainbow effect to a range of characters.

**Parameters:**
- `id: string` - Unique identifier for this effect
- `startIndex: number` - Starting character index (inclusive)
- `endIndex: number` - Ending character index (exclusive)
- `speed: number` - Animation speed (default: 1.0)
- `offset: number` - Phase offset (default: 0)

**Example:**
```typescript
// Animated rainbow on title
textEffects.rainbow('rainbow-title', 0, 20, 0.5);
```

---

### `scale(id, startIndex, endIndex, scale)`

Apply dynamic scaling to a range of characters.

**Parameters:**
- `id: string` - Unique identifier for this effect
- `startIndex: number` - Starting character index (inclusive)
- `endIndex: number` - Ending character index (exclusive)
- `scale: number` - Scale multiplier (1.0 = normal size)

**Example:**
```typescript
// Make characters 2x larger
textEffects.scale('big-text', 0, 10, 2.0);
```

---

### `scramble(id, startIndex, endIndex)`

Enable character scrambling (hacker/glitch effect).

**Parameters:**
- `id: string` - Unique identifier for this effect
- `startIndex: number` - Starting character index (inclusive)
- `endIndex: number` - Ending character index (exclusive)

**Example:**
```typescript
textEffects.scramble('hacker', 0, 50);
```

**Note:** For scrambling to work, you need to call `applyScrambleToText()` before rendering:
```typescript
const scrambledText = textEffects.applyScrambleToText(originalText);
textManager.setText(scrambledText);
```

---

### `remove(id)`

Remove a specific effect by ID.

**Parameters:**
- `id: string` - ID of the effect to remove

**Example:**
```typescript
textEffects.remove('my-gradient');
```

---

### `clear()`

Remove all effects.

**Example:**
```typescript
textEffects.clear();
```

---

### `update(deltaTime?)`

Update and apply all effects. **Call this every frame** for animated effects.

**Parameters:**
- `deltaTime: number` - Time since last frame in seconds (default: 0.016)

**Example:**
```typescript
function animate() {
    const deltaTime = clock.getDelta();
    textEffects.update(deltaTime);
    requestAnimationFrame(animate);
}
```

---

## Complete Example

```typescript
import * as THREE from 'three';
import { TextManager } from './TextManager.ts';
import { TextEffects } from './TextEffects.ts';

const textManager = new TextManager(scene);
const textEffects = new TextEffects(textManager);

// Load font and setup text
await textManager.load('/font.json', '/font.png');
textManager.setText("Hello World! This is AMAZING!");

// Apply gradient to "Hello"
textEffects.gradient('hello', 0, 5, [
    new THREE.Color(0xff0000),
    new THREE.Color(0x00ff00)
]);

// Rainbow on "World"
textEffects.rainbow('world', 6, 11, 1.0);

// Solid color on "AMAZING"
textEffects.color('amazing', 22, 29, new THREE.Color(0xff00ff));

// Animation loop
let lastTime = performance.now();
function animate() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    textEffects.update(deltaTime);
    
    requestAnimationFrame(animate);
}
animate();
```

---

## Character Index Calculation

When working with multiple text areas (like NoteBox), you need to calculate the correct indices:

```typescript
const note1 = new NoteBox(textManager, boxManager);
note1.titleArea.text = "Title 1";
note1.bodyArea.text = "Body 1";

const note2 = new NoteBox(textManager, boxManager);
note2.titleArea.text = "Title 2";
note2.bodyArea.text = "Body 2";

// Calculate indices
const note1CharCount = note1.titleArea.text.length + note1.bodyArea.text.length;
const note2TitleStart = note1CharCount;
const note2TitleEnd = note2TitleStart + note2.titleArea.text.length;
const note2BodyStart = note2TitleEnd;

// Apply effect to note2 title
textEffects.rainbow('note2-title', note2TitleStart, note2TitleEnd);

// Find specific word in body
const bodyText = note2.bodyArea.text;
const wordStart = note2BodyStart + bodyText.indexOf('WORD');
const wordEnd = wordStart + 'WORD'.length;
textEffects.gradient('word', wordStart, wordEnd, [color1, color2]);
```

---

## Performance Notes

- Effects are applied per-frame, so keep the number of active effects reasonable
- Rainbow effects are the most expensive due to HSL calculations
- Gradient and solid color effects are very cheap
- Scale effects require matrix decomposition/recomposition (moderate cost)
- Scramble effects modify the text string itself

---

## Tips & Tricks

1. **Layering Effects**: Multiple effects can overlap, but the last one applied wins for colors
2. **Dynamic Updates**: Change effect parameters by calling the method again with the same ID
3. **Smooth Transitions**: Use gradients with similar colors for subtle effects
4. **Performance**: Remove unused effects with `remove(id)` instead of keeping them active
5. **Rainbow Speed**: Values between 0.3-1.0 work best for readability
