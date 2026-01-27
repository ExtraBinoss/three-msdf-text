import * as THREE from 'three';
import type { FontData, Char } from './FontData.ts';

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
        const lines = this.text.split('\n');
        
        let cursorY = 0;
        const baseLineHeight = this.fontData.common.lineHeight * this.lineSpacing;
        
        // Track the current character's index in the original string
        let stringPointer = 0;
        
        // Reset caret pos to start of text
        this.lastCaretPos = { x: 0, y: 0 };
        if (this.caretIndex === 0) {
            this.lastCaretPos = { x: 0, y: 0 };
        }

        for (let l = 0; l < lines.length; l++) {
            const line = lines[l];
            const words = this.wordWrap ? line.split(/(\s+)/) : [line];
            let cursorX = 0;

            for (const word of words) {
                // Calculate word width
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
                    
                    const currentIndex = stringPointer + i;
                    
                    // Update Caret Position if we are at the caret index
                    if (currentIndex === this.caretIndex) {
                        this.lastCaretPos = { x: cursorX, y: cursorY };
                    }

                    if (charData) {
                        // Check bounds (simple efficient clipping)
                        if (Math.abs(cursorY) > this.height) {
                            // Even if clipped, still handle caret if it's beyond this point
                            return glyphs; 
                        }

                        // Determine color based on string index
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
                        cursorX += charData.xadvance;
                    }
                }
                
                stringPointer += word.length;
            }

            // End of line caret check
            if (stringPointer === this.caretIndex) {
                this.lastCaretPos = { x: cursorX, y: cursorY };
            }
            
            cursorX = 0;
            cursorY -= baseLineHeight;
            stringPointer += 1; // for '\n'

            if (stringPointer === this.caretIndex) {
                this.lastCaretPos = { x: 0, y: cursorY };
            }
        }

        return glyphs;
    }

    /**
     * Finds the character index closest to a given local XY coordinate.
     */
    getIndexAtPos(x: number, y: number): number {
        const lines = this.text.split('\n');
        let cursorY = 0;
        const baseLineHeight = this.fontData.common.lineHeight * this.lineSpacing;
        let stringPointer = 0;

        // Find the line first
        let lineIdx = 0;
        for (let l = 0; l < lines.length; l++) {
            if (y <= cursorY && y > cursorY - baseLineHeight) {
                lineIdx = l;
                break;
            }
            if (l === lines.length - 1) lineIdx = l; // Clamp to last
            cursorY -= baseLineHeight;
            stringPointer += lines[l].length + 1;
        }

        // Now find char in line
        cursorY = 0;
        stringPointer = 0;
        for(let l=0; l < lineIdx; l++) {
            stringPointer += lines[l].length + 1;
            cursorY -= baseLineHeight;
        }

        const line = lines[lineIdx];
        const words = this.wordWrap ? line.split(/(\s+)/) : [line];
        let cursorX = 0;
        let bestIdx = stringPointer;
        let minXDist = Infinity;

        // Simplified: Check every character in the line's layout
        // Re-simulate horizontal positioning for this line
        for (const word of words) {
            let wordWidth = 0;
            for (const charStr of word) {
                const charData = this.charMap.get(charStr);
                if (charData) wordWidth += charData.xadvance;
            }

            if (this.wordWrap && cursorX + wordWidth > this.width && cursorX > 0) {
                // If the word wrapped, check if our 'y' is now in this new wrapped line
                // This is a bit complex for a simple lookup but essential for word wrap
                cursorX = 0;
                cursorY -= baseLineHeight;
            }

            // Only check if we are in the right visual line (y)
            if (Math.abs(y - cursorY) < baseLineHeight * 0.8) {
                for (let i = 0; i < word.length; i++) {
                    const dist = Math.abs(x - cursorX);
                    if (dist < minXDist) {
                        minXDist = dist;
                        bestIdx = stringPointer + i;
                    }
                    const charData = this.charMap.get(word[i]);
                    if (charData) cursorX += charData.xadvance;
                }
            }
            stringPointer += word.length;
        }

        // Final check for end of line
        if (Math.abs(y - cursorY) < baseLineHeight * 0.8) {
            const dist = Math.abs(x - cursorX);
            if (dist < minXDist) bestIdx = stringPointer;
        }

        return Math.min(this.text.length, Math.max(0, bestIdx));
    }
}
