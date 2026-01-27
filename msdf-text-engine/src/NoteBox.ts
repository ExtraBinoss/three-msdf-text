import * as THREE from 'three';
import { TextArea } from './TextArea.ts';
import { TextManager } from './TextManager.ts';

/**
 * A UI component that manages a background box, a title bar, 
 * and two text areas (Title and Body).
 */
export class NoteBox {
    public group: THREE.Group;
    public titleArea: TextArea;
    public bodyArea: TextArea;
    
    private headerBg: THREE.Mesh;
    private bodyBg: THREE.Mesh;
    private width: number = 8;
    private height: number = 6;
    private headerHeight: number = 1.2;

    constructor(textManager: TextManager) {
        if (!textManager.fontData) throw new Error("Font data must be loaded first");
        
        this.group = new THREE.Group();
        
        // Initialize layout engines
        this.titleArea = new TextArea(textManager.fontData);
        this.bodyArea = new TextArea(textManager.fontData);
        
        // Backgrounds
        const geo = new THREE.PlaneGeometry(1, 1);
        
        this.headerBg = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x444444 }));
        this.bodyBg = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x2a2a2a }));
        
        this.group.add(this.bodyBg);
        this.group.add(this.headerBg);

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
        // Header at top
        this.headerBg.scale.set(this.width, this.headerHeight, 1);
        this.headerBg.position.set(this.width / 2, -this.headerHeight / 2, 0.01);

        // Body below header
        const bodyH = this.height - this.headerHeight;
        this.bodyBg.scale.set(this.width, bodyH, 1);
        this.bodyBg.position.set(this.width / 2, -(this.headerHeight + bodyH / 2), 0);
    }

    /**
     * Helper to get total glyphs for rendering
     */
    getLayout(textScale: number) {
        // Map world units to font pixels for wrapping
        this.titleArea.width = (this.width - 0.5) / textScale;
        this.bodyArea.width = (this.width - 0.5) / textScale;

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
