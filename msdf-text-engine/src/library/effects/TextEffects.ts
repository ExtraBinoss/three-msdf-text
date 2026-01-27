import * as THREE from 'three';
import { TextArea } from '../noteBoxes/TextArea.ts';

/**
 * TextEffects handles per-TextArea styling and animations.
 * Because effects are applied to the TextArea, they remain stable 
 * even when the text is clipped or moved within a buffer.
 */
export class TextEffects {
    private time: number = 0;

    /**
     * Apply a gradient to a specific TextArea
     * @param area The TextArea to affect
     * @param start Char index
     * @param end Char index
     * @param colors Array of colors
     */
    applyGradient(area: TextArea, start: number, end: number, colors: THREE.Color[]) {
        // Clear existing styles in this range to avoid overlap mess
        area.styles = area.styles.filter(s => s.end <= start || s.start >= end);
        
        // Add new styles per character for simple management (or as one range)
        for(let i = start; i < end; i++) {
            const t = (i - start) / Math.max(1, end - start - 1);
            const color = this.interpolateColors(colors, t);
            area.styles.push({ start: i, end: i + 1, color });
        }
    }

    /**
     * Apply an animated rainbow effect to a TextArea
     * Should be called in an update loop
     */
    updateRainbow(area: TextArea, start: number, end: number, speed: number = 1.0) {
        // Clear existing rainbow styles in this range
        area.styles = area.styles.filter(s => s.end <= start || s.start >= end);

        for(let i = start; i < end; i++) {
            const hue = ((i / 10) + this.time * speed) % 1.0;
            const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
            area.styles.push({ start: i, end: i + 1, color });
        }
    }

    /**
     * Set a solid color for a range
     */
    applyColor(area: TextArea, start: number, end: number, color: THREE.Color) {
        area.styles = area.styles.filter(s => s.end <= start || s.start >= end);
        area.styles.push({ start, end, color });
    }

    /**
     * Randomly scrambles a range of characters in a TextArea (Hacker effect)
     * Note: This modifies the source text of the area.
     */
    applyScramble(area: TextArea, start: number, end: number, probability: number = 0.5) {
        const chars = area.text.split('');
        const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        
        for (let i = start; i < Math.min(end, chars.length); i++) {
            if (chars[i] === ' ' || chars[i] === '\n') continue;
            if (Math.random() < probability) {
                chars[i] = glyphs[Math.floor(Math.random() * glyphs.length)];
            }
        }
        area.text = chars.join('');
    }

    /**
     * Apply an animated displacement (wave/bounce) effect to a range
     */
    updateDisplacement(area: TextArea, start: number, end: number, amp: number = 30, speed: number = 2.0) {
        // Find existing styles or keep offset-only ones
        area.styles = area.styles.filter(s => s.end <= start || s.start >= end || (s.color !== undefined));

        for (let i = start; i < end; i++) {
            const phase = (i * 0.5) + this.time * speed;
            const offsetY = Math.sin(phase) * amp;
            const offsetX = Math.cos(phase * 0.7) * (amp * 0.3);
            
            // Try to merge with existing color style if possible, or just add
            const existing = area.styles.find(s => s.start === i && s.end === i + 1);
            if (existing) {
                existing.offsetX = offsetX;
                existing.offsetY = offsetY;
            } else {
                area.styles.push({ start: i, end: i + 1, offsetX, offsetY });
            }
        }
    }

    /**
     * Apply animated rotation to a range
     */
    updateRotation(area: TextArea, start: number, end: number, amp: number = 0.5, speed: number = 1.0) {
        for (let i = start; i < end; i++) {
            const rot = Math.sin(i + this.time * speed) * amp;
            const existing = area.styles.find(s => s.start === i && s.end === i + 1);
            if (existing) {
                existing.rotation = rot;
            } else {
                area.styles.push({ start: i, end: i + 1, rotation: rot });
            }
        }
    }

    update(deltaTime: number = 0.016) {
        this.time += deltaTime;
    }

    private interpolateColors(colors: THREE.Color[], t: number): THREE.Color {
        if (colors.length === 1) return colors[0];
        const scaledT = t * (colors.length - 1);
        const index = Math.floor(scaledT);
        const localT = scaledT - index;
        const color1 = colors[Math.min(index, colors.length - 1)];
        const color2 = colors[Math.min(index + 1, colors.length - 1)];
        return new THREE.Color().lerpColors(color1, color2, localT);
    }
}
