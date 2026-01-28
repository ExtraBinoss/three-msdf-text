import * as THREE from 'three';
import { TextArea } from '../noteBoxes/TextArea';

/**
 * Focus state change event data.
 * Used for notifying external systems about text editor focus changes.
 */
export interface TextEditorFocusEvent {
    /** Whether the text editor is now focused */
    focused: boolean;
    /** Source identifier for the event */
    source: string;
}

/**
 * Callback type for focus state changes.
 */
export type TextEditorFocusCallback = (event: TextEditorFocusEvent) => void;

/**
 * Agnostic Text Editor.
 * Listens for DOM keyboard events and updates an active TextArea.
 * 
 * This class is designed to be engine-agnostic. Use `onFocusChange` to
 * subscribe to focus state changes and forward them to your event system.
 */
export class TextEditor {
    private activeArea: TextArea | null = null;
    private caretMesh: THREE.Mesh;
    private blinkClock: number = 0;
    public isFocused: boolean = false;

    private focusElement: HTMLInputElement;
    
    /** Callbacks for focus state changes */
    private focusChangeCallbacks: TextEditorFocusCallback[] = [];

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

        // Create hidden focus element for capturing keyboard input
        // This element needs to receive actual DOM focus to capture keyboard events
        this.focusElement = document.createElement('input');
        this.focusElement.type = 'text';
        this.focusElement.style.position = 'fixed';
        this.focusElement.style.opacity = '0';
        this.focusElement.style.pointerEvents = 'none';
        this.focusElement.style.zIndex = '-1';
        this.focusElement.style.width = '1px';
        this.focusElement.style.height = '1px';
        this.focusElement.setAttribute('aria-label', 'Text editor input');
        this.focusElement.setAttribute('role', 'textbox');
        this.focusElement.setAttribute('tabindex', '-1');
        document.body.appendChild(this.focusElement);

        // Input key listeners
        this.focusElement.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.focusElement.addEventListener('keypress', (e) => this.handleKeyPress(e));
        this.focusElement.addEventListener('blur', () => this.handleBlur());
    }

    /**
     * Subscribe to focus state changes.
     * Returns an unsubscribe function.
     */
    onFocusChange(callback: TextEditorFocusCallback): () => void {
        this.focusChangeCallbacks.push(callback);
        return () => {
            const idx = this.focusChangeCallbacks.indexOf(callback);
            if (idx !== -1) this.focusChangeCallbacks.splice(idx, 1);
        };
    }

    /**
     * Notify all subscribers of a focus state change.
     */
    private notifyFocusChange(focused: boolean) {
        const event: TextEditorFocusEvent = {
            focused,
            source: 'text-editor'
        };
        for (const cb of this.focusChangeCallbacks) {
            try {
                cb(event);
            } catch (err) {
                console.error('[TextEditor] Error in focus change callback:', err);
            }
        }
    }

    setColor(color: number | THREE.Color) {
        const material = this.caretMesh.material as THREE.MeshBasicMaterial;
        material.color.set(color);
    }

    focus(area: TextArea | null, index?: number) {
        this.activeArea = area;
        
        if (area) {
            this.isFocused = true;
            area.caretIndex = index !== undefined ? index : area.text.length;
            this.caretMesh.visible = true;
            
            // Notify subscribers that editor is now focused
            this.notifyFocusChange(true);
            
            // Use setTimeout to ensure focus is applied after current event loop
            // to prevent browser from stealing it back immediately
            setTimeout(() => this.focusElement.focus(), 0);
        } else {
            this.isFocused = false;
            this.caretMesh.visible = false;
            
            // Notify subscribers that editor is no longer focused
            this.notifyFocusChange(false);
            
            this.focusElement.blur();
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


    public handleBlur() {
        if (this.isFocused) {
            // Notify subscribers that editor lost focus
            this.notifyFocusChange(false);
        }
        this.activeArea = null;
        this.isFocused = false;
        this.caretMesh.visible = false;
    }

    private handleKeyDown(e: KeyboardEvent) {
        if (!this.activeArea || !this.isFocused) return;
        
        // Stop propagation to prevent backend/frontend shortcuts
        e.stopPropagation();

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
        
        e.stopPropagation();

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

    dispose() {
        this.focusChangeCallbacks = [];
        if (this.focusElement && this.focusElement.parentNode) {
            this.focusElement.parentNode.removeChild(this.focusElement);
        }
    }
}
