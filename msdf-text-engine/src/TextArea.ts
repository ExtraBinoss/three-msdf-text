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

        for (let l = 0; l < lines.length; l++) {
            const line = lines[l];
            const words = this.wordWrap ? line.split(/(\s+)/) : [line];
            let cursorX = 0;

            for (const word of words) {
                // Calculate word width
                let wordWidth = 0;
                const wordChars: Char[] = [];
                
                for (const charStr of word) {
                    const charData = this.charMap.get(charStr);
                    if (charData) {
                        wordWidth += charData.xadvance;
                        wordChars.push(charData);
                    }
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
                    
                    if (charData) {
                        // Check bounds (simple efficient clipping)
                        if (Math.abs(cursorY) > this.height) {
                            return glyphs; 
                        }

                        // Determine color based on string index
                        let charColor = new THREE.Color(1, 1, 1);
                        const currentIndex = stringPointer + i;

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
                
                // Advance the string pointer by the length of the word (including whitespace)
                stringPointer += word.length;
            }
            
            // Move to next line and skip the newline character in the pointer
            cursorX = 0;
            cursorY -= baseLineHeight;
            stringPointer += 1; // For the '\n' we split on
        }

        return glyphs;
    }
}
