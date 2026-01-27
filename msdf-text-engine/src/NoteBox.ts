import * as THREE from 'three';
import { TextArea } from './TextArea.ts';
import { TextManager } from './TextManager.ts';
import { BoxManager } from './BoxManager.ts';

/**
 * A UI component that manages a background box, a title bar, 
 * and two text areas (Title and Body).
 */
export class NoteBox {
    public titleArea: TextArea;
    public bodyArea: TextArea;
    public position: THREE.Vector3 = new THREE.Vector3();
    
    private boxManager: BoxManager;
    private headerId: number;
    private bodyId: number;
    
    private width: number = 8;
    private height: number = 6;
    private headerHeight: number = 1.2;

    constructor(textManager: TextManager, boxManager: BoxManager) {
        if (!textManager.fontData) throw new Error("Font data must be loaded first");
        
        this.boxManager = boxManager;
        
        // Initialize layout engines
        this.titleArea = new TextArea(textManager.fontData);
        this.bodyArea = new TextArea(textManager.fontData);
        
        // Register boxes with manager
        // We initialize with dummy values, setSize will update them
        this.headerId = this.boxManager.addBox(new THREE.Vector3(), new THREE.Vector3(1,1,1), new THREE.Color(0x444444));
        this.bodyId = this.boxManager.addBox(new THREE.Vector3(), new THREE.Vector3(1,1,1), new THREE.Color(0x2a2a2a));

        this.updateGeometry();
    }

    /**
     * Updates the sizes and positions of the background meshes.
     */
    setSize(w: number, h: number, headerH: number = 1.2) {
        this.width = w;
        this.height = h;
        this.headerHeight = headerH;
        this.updateGeometry();
    }

    private updateGeometry() {
        // Calculate world positions based on this.position
        
        // Header
        const headerPos = this.position.clone().add(new THREE.Vector3(this.width / 2, -this.headerHeight / 2, 0.01));
        this.boxManager.updateBox(this.headerId, headerPos, new THREE.Vector3(this.width, this.headerHeight, 1), new THREE.Color(0x444444));

        // Body
        const bodyH = this.height - this.headerHeight;
        const bodyY = -(this.headerHeight + bodyH / 2);
        const bodyPos = this.position.clone().add(new THREE.Vector3(this.width / 2, bodyY, 0));
        
        this.boxManager.updateBox(this.bodyId, bodyPos, new THREE.Vector3(this.width, bodyH, 1), new THREE.Color(0x2a2a2a));
    }

    setPosition(x: number, y: number, z: number) {
        this.position.set(x, y, z);
        this.updateGeometry();
    }

    /**
     * Helper to get total glyphs for rendering
     */
    getLayout(textScale: number) {
        // Map world units to font pixels for wrapping
        this.titleArea.width = (this.width - 0.5) / textScale;
        this.titleArea.height = (this.headerHeight - 0.1) / textScale;
        
        this.bodyArea.width = (this.width - 0.5) / textScale;
        this.bodyArea.height = (this.height - this.headerHeight - 0.5) / textScale;

        const titleGlyphs = this.titleArea.computeLayout().map(g => ({
            ...g,
            x: g.x + (0.25 / textScale), // Padding
            y: g.y - (0.3 / textScale)  // Header Offset
        }));

        const bodyGlyphs = this.bodyArea.computeLayout().map(g => ({
            ...g,
            x: g.x + (0.25 / textScale), 
            y: g.y - ((this.headerHeight + 0.4) / textScale) // Start below header
        }));

        return [...titleGlyphs, ...bodyGlyphs];
    }
}
