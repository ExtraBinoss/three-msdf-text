import type { FontData, Char } from './FontData.ts';

export interface GlyphLayout {
    char: Char;
    x: number;
    y: number;
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
    
    private fontData: FontData;
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

        for (const line of lines) {
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
                for (const charData of wordChars) {
                    glyphs.push({
                        char: charData,
                        x: cursorX,
                        y: cursorY
                    });
                    cursorX += charData.xadvance;
                }
            }
            
            // Move to next line after processing all words in a line
            cursorX = 0;
            cursorY -= baseLineHeight;
        }

        return glyphs;
    }
}
