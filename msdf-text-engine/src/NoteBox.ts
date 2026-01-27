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
    
    // Style Properties
    public headerColor1: THREE.Color = new THREE.Color(0x00d4ff);
    public headerColor2: THREE.Color = new THREE.Color(0x00d4ff);
    public headerAlpha: number = 1.0;

    public bodyColor1: THREE.Color = new THREE.Color(0x0a1012);
    public bodyColor2: THREE.Color = new THREE.Color(0x0a1012);
    public bodyAlpha: number = 0.9;

    private boxManager: BoxManager;
    private headerId: number;
    private bodyId: number;
    
    private width: number = 8;
    private height: number = 6;
    private headerHeight: number = 1.2;

    constructor(textManager: TextManager, boxManager: BoxManager) {
        if (!textManager.fontData) throw new Error("Font data must be loaded first");
        
        this.boxManager = boxManager;
        this.titleArea = new TextArea(textManager.fontData);
        this.bodyArea = new TextArea(textManager.fontData);
        
        // Initialize with default values
        this.headerId = this.boxManager.addBox(new THREE.Vector3(), new THREE.Vector3(1,1,1), this.headerColor1, this.headerColor2, this.headerAlpha);
        this.bodyId = this.boxManager.addBox(new THREE.Vector3(), new THREE.Vector3(1,1,1), this.bodyColor1, this.bodyColor2, this.bodyAlpha);

        this.updateGeometry();
    }

    setSize(w: number, h: number, headerH: number = 1.2) {
        this.width = w;
        this.height = h;
        this.headerHeight = headerH;
        this.updateGeometry();
    }

    private updateGeometry() {
        // Header
        const headerPos = this.position.clone().add(new THREE.Vector3(this.width / 2, -this.headerHeight / 2, 0.01));
        this.boxManager.updateBox(this.headerId, headerPos, new THREE.Vector3(this.width, this.headerHeight, 1), 
            this.headerColor1, this.headerColor2, this.headerAlpha);

        // Body
        const bodyH = this.height - this.headerHeight;
        const bodyY = -(this.headerHeight + bodyH / 2);
        const bodyPos = this.position.clone().add(new THREE.Vector3(this.width / 2, bodyY, 0));
        
        this.boxManager.updateBox(this.bodyId, bodyPos, new THREE.Vector3(this.width, bodyH, 1), 
            this.bodyColor1, this.bodyColor2, this.bodyAlpha);
    }

    setPosition(x: number, y: number, z: number) {
        this.position.set(x, y, z);
        this.updateGeometry();
    }

    setStyle(config: {
        headerColor1?: number | THREE.Color,
        headerColor2?: number | THREE.Color,
        headerAlpha?: number,
        bodyColor1?: number | THREE.Color,
        bodyColor2?: number | THREE.Color,
        bodyAlpha?: number
    }) {
        if (config.headerColor1 !== undefined) this.headerColor1 = this.toColor(config.headerColor1);
        if (config.headerColor2 !== undefined) this.headerColor2 = this.toColor(config.headerColor2);
        if (config.headerAlpha !== undefined) this.headerAlpha = config.headerAlpha;

        if (config.bodyColor1 !== undefined) this.bodyColor1 = this.toColor(config.bodyColor1);
        if (config.bodyColor2 !== undefined) this.bodyColor2 = this.toColor(config.bodyColor2);
        if (config.bodyAlpha !== undefined) this.bodyAlpha = config.bodyAlpha;

        this.updateGeometry();
    }

    private toColor(c: number | THREE.Color): THREE.Color {
        return c instanceof THREE.Color ? c : new THREE.Color(c);
    }

    getLayout(textScale: number) {
        this.titleArea.width = (this.width - 0.5) / textScale;
        this.titleArea.height = (this.headerHeight - 0.1) / textScale;
        
        this.bodyArea.width = (this.width - 0.5) / textScale;
        this.bodyArea.height = (this.height - this.headerHeight - 0.5) / textScale;

        const worldOffsetX = this.position.x / textScale;
        const worldOffsetY = this.position.y / textScale;
        const worldOffsetZ = this.position.z;

        const fontLineHeight = this.titleArea.fontData.common.lineHeight;
        const headerHeightFont = this.headerHeight / textScale;
        const titleVertOffset = (headerHeightFont - fontLineHeight) / 2;

        const titleGlyphs = this.titleArea.computeLayout().map(g => ({
            ...g,
            x: g.x + (0.25 / textScale) + worldOffsetX, 
            y: g.y - titleVertOffset + worldOffsetY,
            z: worldOffsetZ
        }));

        const bodyPadding = 0.2;
        const bodyVertOffset = (this.headerHeight + bodyPadding) / textScale;

        const bodyGlyphs = this.bodyArea.computeLayout().map(g => ({
            ...g,
            x: g.x + (0.25 / textScale) + worldOffsetX, 
            y: g.y - bodyVertOffset + worldOffsetY,
            z: worldOffsetZ
        }));

        return [...titleGlyphs, ...bodyGlyphs];
    }
}
