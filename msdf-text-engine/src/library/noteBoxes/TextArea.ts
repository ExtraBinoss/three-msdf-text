import * as THREE from 'three';
import type { FontData, Char } from '../font/FontData.ts';

export interface GlyphLayout {
    char: Char;
    x: number;
    y: number;
    color: THREE.Color;
}

export interface TextStyle {
    start: number;
    end: number;
    color?: THREE.Color;
}

/**
 * Agnostic Text Area manager. 
 * Handles layout, word wrapping, and bounds calculation without being tied to a specific renderer.
 */
export class TextArea {
    public width: number = 800;
    public height: number = 600;
    public text: string = "";
    public wordWrap: boolean = true;
    public lineSpacing: number = 1.0;
    public styles: TextStyle[] = [];
    
    // Caret state
    public caretIndex: number = 0;
    public lastCaretPos: { x: number, y: number } = { x: 0, y: 0 };
    
    public fontData: FontData;
    private charMap: Map<string, Char> = new Map();
    
    // Internal cache for interactive picking
    private visualMap: { index: number, x: number, y: number }[] = [];

    constructor(fontData: FontData) {
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
        const lines = this.text.split('\n');
        
        let cursorY = 0;
        const baseLineHeight = this.fontData.common.lineHeight * this.lineSpacing;
        
        let stringPointer = 0;
        
        // Initial caret pos
        this.lastCaretPos = { x: 0, y: 0 };

        for (let l = 0; l < lines.length; l++) {
            const line = lines[l];
            const words = this.wordWrap ? line.split(/(\s+)/) : [line];
            let cursorX = 0;

            for (const word of words) {
                let wordWidth = 0;
                for (const charStr of word) {
                    const charData = this.charMap.get(charStr);
                    if (charData) wordWidth += charData.xadvance;
                }

                // Word wrap check
                if (this.wordWrap && cursorX + wordWidth > this.width && cursorX > 0) {
                    cursorX = 0;
                    cursorY -= baseLineHeight;
                }
                // Add characters to layout
                for (let i = 0; i < word.length; i++) {
                    const charStr = word[i];
                    const charData = this.charMap.get(charStr);
                    
                    // Character-level wrap (for long words or non-spaced strings)
                    if (this.wordWrap && charData && cursorX + charData.xadvance > this.width && cursorX > 0) {
                        cursorX = 0;
                        cursorY -= baseLineHeight;
                    }

                    const currentIndex = stringPointer + i;
                    
                    // Cache the visual position for every index (including spaces)
                    this.visualMap.push({ index: currentIndex, x: cursorX, y: cursorY });

                    if (currentIndex === this.caretIndex) {
                        this.lastCaretPos = { x: cursorX, y: cursorY };
                    }

                    if (charData) {
                        if (Math.abs(cursorY) <= this.height) {
                            let charColor = new THREE.Color(1, 1, 1);
                            for (const style of this.styles) {
                                if (currentIndex >= style.start && currentIndex < style.end) {
                                    if (style.color) charColor = style.color;
                                }
                            }

                            glyphs.push({
                                char: charData,
                                x: cursorX,
                                y: cursorY,
                                color: charColor
                            });
                        }
                        cursorX += charData.xadvance;
                    }
                }
                stringPointer += word.length;
            }

            // End of full string index check (special case for end of line/string)
            if (stringPointer === this.caretIndex) {
                this.lastCaretPos = { x: cursorX, y: cursorY };
            }
            // Add a point for the newline character index itself
            this.visualMap.push({ index: stringPointer, x: cursorX, y: cursorY });

            cursorX = 0;
            cursorY -= baseLineHeight;
            stringPointer += 1; // for '\n'
        }
        
        // Final catch-all for caret at the very end of everything
        if (stringPointer === this.caretIndex) {
            this.lastCaretPos = { x: 0, y: cursorY };
        }
        this.visualMap.push({ index: stringPointer, x: 0, y: cursorY });

        return glyphs;
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
            const yWeight = 2.0; 
            const distSq = (x - entry.x) ** 2 + (dy * yWeight) ** 2;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                bestIdx = entry.index;
            }
        }

        return Math.min(this.text.length, bestIdx);
    }
}
