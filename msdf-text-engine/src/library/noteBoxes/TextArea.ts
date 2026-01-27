import * as THREE from 'three';
import type { FontData, Char } from '../font/FontData.ts';

export interface GlyphLayout {
    char: Char;
    x: number;
    y: number;
    color: THREE.Color;
    rotation?: number;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
}

export interface TextStyle {
    start: number;
    end: number;
    color?: THREE.Color;
    rotation?: number;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
}

/**
 * Agnostic Text Area manager. 
 * Handles layout, word wrapping, and bounds calculation.
 * Now extends Object3D to allow standard Three.js transformations.
 */
export class TextArea extends THREE.Object3D {
    public width: number = 800;
    public height: number = 600;
    public text: string = "";
    public wordWrap: boolean = true;
    public lineSpacing: number = 1.0;
    public styles: TextStyle[] = [];
    public placeholder: string = "";
    public placeholderColor: THREE.Color = new THREE.Color(1, 1, 1).multiplyScalar(0.4);
    public defaultColor: THREE.Color = new THREE.Color(1, 1, 1);
    
    // Caret state
    public caretIndex: number = 0;
    public lastCaretPos: { x: number, y: number } = { x: 0, y: 0 };
    
    public fontData: FontData;
    private charMap: Map<string, Char> = new Map();
    
    // Internal cache for interactive picking
    private visualMap: { index: number, x: number, y: number }[] = [];

    constructor(fontData: FontData) {
        super();
        this.fontData = fontData;
        fontData.chars.forEach(c => this.charMap.set(c.char, c));
    }

    /**
     * Calculates the layout of the current text within the defined bounds.
     * @returns Array of glyphs and their relative coordinates in font units.
     */
    computeLayout(): GlyphLayout[] {
        const glyphs: GlyphLayout[] = [];
        this.visualMap = [];
        
        const isPlaceholder = this.text.length === 0 && this.placeholder.length > 0;
        const text = isPlaceholder ? this.placeholder : this.text;
        
        const baseLineHeight = this.fontData.common.lineHeight * this.lineSpacing;
        const defaultColor = this.defaultColor;
        
        let cursorX = 0;
        let cursorY = 0;
        
        // Helper to update caret position
        const updateCaret = (index: number, x: number, y: number) => {
            if (index === this.caretIndex) {
                this.lastCaretPos = { x, y };
            }
        };

        // Pre-process styles if they exist to avoid heavy checks in the loop
        const hasStyles = !isPlaceholder && this.styles.length > 0;

        for (let i = 0; i <= text.length; i++) {
            // Newline and Wrap points: tokens are either whitespace blocks or words
            // We only check for wrapping at the start of a token or if a single char is too long
            const char = text[i];
            const isAtEnd = i === text.length;

            // Handle word wrap at the start of new tokens
            if (!isAtEnd && this.wordWrap && cursorX > 0 && char !== '\n') {
                const isStartOfToken = i === 0 || this.isWhitespace(text[i-1]) !== this.isWhitespace(char);
                if (isStartOfToken) {
                    const tokenWidth = this.getTokenWidth(text, i);
                    if (cursorX + tokenWidth > this.width) {
                        cursorX = 0;
                        cursorY -= baseLineHeight;
                    }
                }
            }

            // Record visual position for this index (including the virtual index at text.length)
            this.visualMap.push({ index: i, x: cursorX, y: cursorY });
            updateCaret(i, cursorX, cursorY);

            if (isAtEnd) break;

            if (char === '\n') {
                cursorX = 0;
                cursorY -= baseLineHeight;
                continue;
            }

            const charData = this.charMap.get(char);
            if (!charData) {
                // Skip unknown characters but record their position (already done above)
                continue;
            }

            // Character-level wrap (emergency fallback for very long words)
            if (this.wordWrap && cursorX > 0 && cursorX + charData.xadvance > this.width) {
                cursorX = 0;
                cursorY -= baseLineHeight;
                
                // Re-adjust the visual entry for this character to the new line
                const lastEntry = this.visualMap[this.visualMap.length - 1];
                lastEntry.x = cursorX;
                lastEntry.y = cursorY;
                updateCaret(i, cursorX, cursorY);
            }

            // Only push glyphs that are within the vertical bounds
            if (Math.abs(cursorY) <= this.height) {
                let charColor = isPlaceholder ? this.placeholderColor : defaultColor;
                let rotation = 0, scale = 1, offX = 0, offY = 0;

                if (hasStyles) {
                    // Apply styles - last one defined for this range wins
                    for (let sIdx = 0; sIdx < this.styles.length; sIdx++) {
                        const style = this.styles[sIdx];
                        if (i >= style.start && i < style.end) {
                            if (style.color) charColor = style.color;
                            if (style.rotation !== undefined) rotation = style.rotation;
                            if (style.scale !== undefined) scale = style.scale;
                            if (style.offsetX !== undefined) offX = style.offsetX;
                            if (style.offsetY !== undefined) offY = style.offsetY;
                        }
                    }
                }

                glyphs.push({
                    char: charData,
                    x: cursorX + offX,
                    y: cursorY + offY,
                    color: charColor,
                    rotation,
                    scale
                });
            }

            cursorX += charData.xadvance;
        }

        return glyphs;
    }

    private isWhitespace(char: string): boolean {
        return char === ' ' || char === '\t';
    }

    private getTokenWidth(text: string, startIndex: number): number {
        let width = 0;
        const startIsWhitespace = this.isWhitespace(text[startIndex]);
        for (let i = startIndex; i < text.length; i++) {
            const char = text[i];
            if (char === '\n' || this.isWhitespace(char) !== startIsWhitespace) break;
            const data = this.charMap.get(char);
            if (data) width += data.xadvance;
        }
        return width;
    }


    /**
     * Returns the total height consumed by the text layout.
     */
    getContentHeight(): number {
        if (this.visualMap.length === 0) return 0;
        let minY = 0;
        for (const entry of this.visualMap) {
            minY = Math.min(minY, entry.y);
        }
        return Math.abs(minY) + (this.fontData.common.lineHeight * this.lineSpacing);
    }

    /**
     * Returns the maximum width consumed by the text layout.
     */
    getContentWidth(): number {
        if (this.visualMap.length === 0) return 0;
        let maxX = 0;
        for (const entry of this.visualMap) {
            maxX = Math.max(maxX, entry.x);
        }
        return maxX;
    }

    /**
     * Finds the character index closest to a given local XY coordinate.
     * Uses the cached visualMap from the last computeLayout run.
     */
    getIndexAtPos(x: number, y: number): number {
        if (this.visualMap.length === 0) return 0;

        let bestIdx = 0;
        let minDistSq = Infinity;

        for (const entry of this.visualMap) {
            // Priority: Find correct line (Y) first
            const dy = y - entry.y;
            // Bias Y distance to prefer the line the mouse is actually over
            const yWeight = 10.0; 
            const distSq = (x - entry.x) ** 2 + (dy * yWeight) ** 2;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                bestIdx = entry.index;
            }
        }

        return Math.min(this.text.length, bestIdx);
    }

    /**
     * Moves the caret up or down by a logical line.
     * @param direction -1 for up, 1 for down
     */
    moveCaretVertical(direction: number) {
        if (this.visualMap.length === 0) return;
        
        const lh = this.fontData.common.lineHeight * this.lineSpacing;
        const targetY = this.lastCaretPos.y - (direction * lh);
        
        // Find the index at the target coordinate
        // We use the last known X to maintain horizontal column position
        this.caretIndex = this.getIndexAtPos(this.lastCaretPos.x, targetY);
    }

    /**
     * returns the layout transformed by the Object3D world matrix.
     * @param textScale The global text scale used by the engine.
     */
    getWorldLayout(textScale: number): any[] {
        const localGlyphs = this.computeLayout();
        this.updateWorldMatrix(true, false);
        
        return localGlyphs.map(g => {
            const v = new THREE.Vector3(g.x * textScale, g.y * textScale, 0);
            v.applyMatrix4(this.matrixWorld);
            return {
                ...g,
                x: v.x / textScale,
                y: v.y / textScale,
                z: v.z,
                rotation: this.rotation.z + (g.rotation || 0)
            };
        });
    }

    // --- Fluent API Helpers ---

    /** Sets the position of the text area. Chainable. */
    setPos(x: number, y: number, z: number): this {
        this.position.set(x, y, z);
        return this;
    }

    /** Sets the z-rotation (in radians) of the text area. Chainable. */
    setRot(radians: number): this {
        this.rotation.z = radians;
        return this;
    }

    /** Sets the scale of the text area. Chainable. */
    setScale(s: number): this {
        this.scale.set(s, s, s);
        return this;
    }

    /** Sets the default text color. Chainable. */
    setColor(hexOrColor: number | string | THREE.Color): this {
        if (hexOrColor instanceof THREE.Color) {
            this.defaultColor.copy(hexOrColor);
        } else {
            this.defaultColor.set(hexOrColor);
        }
        return this;
    }

    /** Sets the bounding box dimensions. Chainable. */
    setBoxSize(width: number, height: number): this {
        this.width = width;
        this.height = height;
        return this;
    }

    /** Adds a style range to the text. Chainable. */
    addStyle(start: number, end: number, style: Partial<Omit<TextStyle, 'start' | 'end'>>): this {
        this.styles.push({ start, end, ...style });
        return this;
    }

    /** Sets whether word wrapping is enabled. Chainable. */
    setWordWrap(enabled: boolean): this {
        this.wordWrap = enabled;
        return this;
    }
}
