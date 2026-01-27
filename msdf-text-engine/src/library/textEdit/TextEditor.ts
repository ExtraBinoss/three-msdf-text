import * as THREE from 'three';
import { TextArea } from '../noteBoxes/TextArea.ts';

/**
 * Agnostic Text Editor.
 * Listens for DOM keyboard events and updates an active TextArea.
 */
export class TextEditor {
    private activeArea: TextArea | null = null;
    private caretMesh: THREE.Mesh;
    private blinkClock: number = 0;
    private isFocused: boolean = false;

    constructor(scene: THREE.Scene) {
        // Create a simple quad for the caret
        const geometry = new THREE.PlaneGeometry(0.06, 1.0); // Slightly wider quad
        geometry.translate(0, -0.5, 0); // Origin at top, hangs down
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00d4ff, 
            transparent: true,
            opacity: 0.9,
            depthTest: false,
            depthWrite: false
        });
        this.caretMesh = new THREE.Mesh(geometry, material);
        this.caretMesh.visible = false;
        this.caretMesh.renderOrder = 9999;
        scene.add(this.caretMesh);

        // Global key listeners
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keypress', (e) => this.handleKeyPress(e));
    }

    setColor(color: number | THREE.Color) {
        const material = this.caretMesh.material as THREE.MeshBasicMaterial;
        material.color.set(color);
    }

    focus(area: TextArea | null, index?: number) {
        this.activeArea = area;
        this.isFocused = !!area;
        this.caretMesh.visible = this.isFocused;
        if (area) {
            area.caretIndex = index !== undefined ? index : area.text.length;
        }
    }

    update(deltaTime: number) {
        if (!this.activeArea || !this.isFocused) {
            this.caretMesh.visible = false;
            return;
        }

        // Blink logic
        this.blinkClock += deltaTime;
        this.caretMesh.visible = Math.floor(this.blinkClock * 2) % 2 === 0;

        // Position the caret based on the active area's metrics
        // (Positioning logic usually happens in the main loop where we know the world offsets)
    }

    /**
     * Set the caret world position. 
     * Call this in your render loop after layout is computed.
     */
    setCaretPosition(worldX: number, worldY: number, worldZ: number, fontHeight: number) {
        this.caretMesh.position.set(worldX, worldY, worldZ);
        this.caretMesh.scale.y = fontHeight;
        this.caretMesh.updateMatrix();
    }

    private handleKeyDown(e: KeyboardEvent) {
        if (!this.activeArea || !this.isFocused) return;

        // Clipboard Paste
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            navigator.clipboard.readText().then(text => {
                if (text) this.insertText(text);
            }).catch(err => {
                console.error('Failed to read clipboard:', err);
            });
            return;
        }

        if (e.key === 'Backspace') {
            const text = this.activeArea.text;
            const idx = this.activeArea.caretIndex;
            if (idx > 0) {
                this.activeArea.text = text.slice(0, idx - 1) + text.slice(idx);
                this.activeArea.caretIndex = Math.max(0, idx - 1);
            }
            e.preventDefault();
        } else if (e.key === 'Delete') {
            const text = this.activeArea.text;
            const idx = this.activeArea.caretIndex;
            if (idx < text.length) {
                this.activeArea.text = text.slice(0, idx) + text.slice(idx + 1);
            }
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            this.activeArea.caretIndex = Math.max(0, this.activeArea.caretIndex - 1);
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            this.activeArea.caretIndex = Math.min(this.activeArea.text.length, this.activeArea.caretIndex + 1);
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            (this.activeArea as any).moveCaretVertical(-1);
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            (this.activeArea as any).moveCaretVertical(1);
            e.preventDefault();
        } else if (e.key === 'Enter') {
             this.insertText('\n');
             e.preventDefault();
        } else if (e.key === 'Escape') {
            this.focus(null);
        }
        
        this.blinkClock = 0; // Stick to visible when typing
    }

    private handleKeyPress(e: KeyboardEvent) {
        if (!this.activeArea || !this.isFocused) return;
        
        // Keypress is better for character input as it handles modifiers correctly
        if (e.key.length === 1) {
            this.insertText(e.key);
            e.preventDefault();
        }
        this.blinkClock = 0;
    }

    private insertText(char: string) {
        if (!this.activeArea) return;
        const text = this.activeArea.text;
        const idx = this.activeArea.caretIndex;
        this.activeArea.text = text.slice(0, idx) + char + text.slice(idx);
        this.activeArea.caretIndex = idx + char.length;
    }
}
