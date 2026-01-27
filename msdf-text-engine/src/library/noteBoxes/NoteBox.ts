import * as THREE from 'three';
import { TextArea } from './TextArea.ts';
import { TextManager } from '../base/TextManager.ts';
import { BoxManager, GradientMode } from './BoxManager.ts';

/**
 * A UI component that manages a background box, a title bar, 
 * and two text areas (Title and Body).
 */
export class NoteBox {
    public titleArea: TextArea;
    public bodyArea: TextArea;
    public position: THREE.Vector3 = new THREE.Vector3();
    
    // Style Properties
    public headerColor1: THREE.Color = new THREE.Color(0x666666);
    public headerColor2: THREE.Color = new THREE.Color(0x666666);
    public headerAlpha: number = 1.0;
    public headerGradientMode: GradientMode = GradientMode.NONE;

    public bodyColor1: THREE.Color = new THREE.Color(0x222222);
    public bodyColor2: THREE.Color = new THREE.Color(0x222222);
    public bodyAlpha: number = 1.0;
    public bodyGradientMode: GradientMode = GradientMode.NONE;

    public id: string;
    private boxManager: BoxManager;
    private headerId: number;
    private bodyId: number;
    private resizeHandleId: number;
    
    public width: number = 10;
    public height: number = 5;
    public autoHeight: boolean = true;
    public autoWidth: boolean = true;
    public minWidth: number = 4;
    private headerHeight: number = 1.0;

    constructor(textManager: TextManager, boxManager: BoxManager, id?: string) {
        if (!textManager.fontData) throw new Error("Font data must be loaded first");
        
        this.id = id || `box-${Math.random().toString(36).substr(2, 9)}`;
        this.boxManager = boxManager;
        this.titleArea = new TextArea(textManager.fontData);
        this.bodyArea = new TextArea(textManager.fontData);
        
        // Initialize with default values
        this.headerId = this.boxManager.addBox(new THREE.Vector3(), new THREE.Vector3(1,1,1), this.headerColor1, this.headerColor2, this.headerAlpha, this.headerGradientMode);
        this.bodyId = this.boxManager.addBox(new THREE.Vector3(), new THREE.Vector3(1,1,1), this.bodyColor1, this.bodyColor2, this.bodyAlpha, this.bodyGradientMode);
        
        // Resize handle (small square at bottom right)
        this.resizeHandleId = this.boxManager.addBox(new THREE.Vector3(), new THREE.Vector3(0.5, 0.5, 1), new THREE.Color(0xffffff), new THREE.Color(0x888888), 1.0, GradientMode.RADIAL);

        this.updateGeometry();
    }

    // Helper to identify which part was hit
    getPart(instanceId: number): 'header' | 'body' | 'resize' | null {
        if (instanceId === this.headerId) return 'header';
        if (instanceId === this.bodyId) return 'body';
        if (instanceId === this.resizeHandleId) return 'resize';
        return null;
    }

    dispose() {
        this.boxManager.removeBox(this.headerId);
        this.boxManager.removeBox(this.bodyId);
        this.boxManager.removeBox(this.resizeHandleId);
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
            this.headerColor1, this.headerColor2, this.headerAlpha, this.headerGradientMode);

        // Body
        const bodyH = Math.max(0.1, this.height - this.headerHeight);
        const bodyY = -(this.headerHeight + bodyH / 2);
        const bodyPos = this.position.clone().add(new THREE.Vector3(this.width / 2, bodyY, 0));
        
        this.boxManager.updateBox(this.bodyId, bodyPos, new THREE.Vector3(this.width, bodyH, 1), 
            this.bodyColor1, this.bodyColor2, this.bodyAlpha, this.bodyGradientMode);

        // Resize Handle (Bottom Right)
        const handlePos = this.position.clone().add(new THREE.Vector3(this.width - 0.2, -this.height + 0.2, 0.02));
        this.boxManager.updateBox(this.resizeHandleId, handlePos, new THREE.Vector3(0.4, 0.4, 1), 
            new THREE.Color(0x888888), new THREE.Color(0xffffff), 1.0, GradientMode.RADIAL);
    }

    setPosition(x: number, y: number, z: number) {
        this.position.set(x, y, z);
        this.updateGeometry();
    }

    setStyle(config: {
        headerColor1?: number | THREE.Color,
        headerColor2?: number | THREE.Color,
        headerAlpha?: number,
        headerGradientMode?: GradientMode,
        bodyColor1?: number | THREE.Color,
        bodyColor2?: number | THREE.Color,
        bodyAlpha?: number,
        bodyGradientMode?: GradientMode,
        titleColor?: number | THREE.Color,
        textColor?: number | THREE.Color
    }) {
        if (config.headerColor1 !== undefined) {
            this.headerColor1 = this.toColor(config.headerColor1);
            // If color1 is provided but color2 is not, force solid color
            if (config.headerColor2 === undefined) {
                this.headerColor2 = this.headerColor1.clone();
                this.headerGradientMode = GradientMode.NONE;
            }
        }
        if (config.headerColor2 !== undefined) {
            this.headerColor2 = this.toColor(config.headerColor2);
            if (config.headerGradientMode === undefined && this.headerGradientMode === GradientMode.NONE) {
                this.headerGradientMode = GradientMode.VERTICAL;
            }
        }
        if (config.headerAlpha !== undefined) this.headerAlpha = config.headerAlpha;
        if (config.headerGradientMode !== undefined) this.headerGradientMode = config.headerGradientMode;

        if (config.bodyColor1 !== undefined) {
            this.bodyColor1 = this.toColor(config.bodyColor1);
            // If bodyColor1 is provided but color2 is not, force solid color
            if (config.bodyColor2 === undefined) {
                this.bodyColor2 = this.bodyColor1.clone();
                this.bodyGradientMode = GradientMode.NONE;
            }
        }
        if (config.bodyColor2 !== undefined) {
            this.bodyColor2 = this.toColor(config.bodyColor2);
            if (config.bodyGradientMode === undefined && this.bodyGradientMode === GradientMode.NONE) {
                this.bodyGradientMode = GradientMode.VERTICAL;
            }
        }
        if (config.bodyAlpha !== undefined) this.bodyAlpha = config.bodyAlpha;
        if (config.bodyGradientMode !== undefined) this.bodyGradientMode = config.bodyGradientMode;

        if (config.titleColor !== undefined) {
            this.titleArea.defaultColor = this.toColor(config.titleColor);
        }
        if (config.textColor !== undefined) {
            this.bodyArea.defaultColor = this.toColor(config.textColor);
        }

        this.updateGeometry();
    }

    private toColor(c: number | THREE.Color): THREE.Color {
        return c instanceof THREE.Color ? c : new THREE.Color(c);
    }

    getLayout(textScale: number) {
        // --- Auto Width Check (Title driven) ---
        if (this.autoWidth) {
            const oldWrap = this.titleArea.wordWrap;
            this.titleArea.wordWrap = false; // Never wrap title if autoWidth is on
            this.titleArea.width = 999999;
            this.titleArea.computeLayout();
            const contentW = this.titleArea.getContentWidth() * textScale;
            this.titleArea.wordWrap = oldWrap;

            const targetW = Math.max(this.minWidth, contentW + 1.0); // + padding
            if (this.width < targetW) {
                this.width = targetW;
                this.updateGeometry();
            }
        }

        this.titleArea.width = (this.width - 0.5) / textScale;
        this.titleArea.height = (this.headerHeight - 0.1) / textScale;
        
        this.bodyArea.width = (this.width - 0.5) / textScale;
        
        let bodyGlyphsLocal: any[] = [];
        
        // Auto-Adjust height BEFORE layout if enabled
        if (this.autoHeight) {
            // Temporarily set infinite height to compute full content
            this.bodyArea.height = 999999;
            bodyGlyphsLocal = this.bodyArea.computeLayout(); // Compute to populate visualMap AND get glyphs
            const contentH = this.bodyArea.getContentHeight() * textScale;
            const targetH = Math.max(2, contentH + this.headerHeight + 0.5);
            
            if (this.height < targetH) {
                this.height = targetH;
                this.updateGeometry();
            }
            // Keep the infinite height for rendering - we already have the glyphs
        } else {
            this.bodyArea.height = (this.height - this.headerHeight - 0.5) / textScale;
            bodyGlyphsLocal = this.bodyArea.computeLayout();
        }

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

        const bodyGlyphs = bodyGlyphsLocal.map(g => ({
            ...g,
            x: g.x + (0.25 / textScale) + worldOffsetX, 
            y: g.y - bodyVertOffset + worldOffsetY,
            z: worldOffsetZ
        }));

        return [...titleGlyphs, ...bodyGlyphs];
    }

    /**
     * Translates local caret position to world space for the editor.
     */
    getCaretWorldPosition(type: 'header' | 'body', textScale: number) {
        const area = type === 'header' ? this.titleArea : this.bodyArea;
        const local = area.lastCaretPos;
        
        let vertOffset = 0;
        if (type === 'header') {
            const fontLineHeight = area.fontData.common.lineHeight;
            const headerHeightFont = this.headerHeight / textScale;
            vertOffset = (headerHeightFont - fontLineHeight) / 2;
        } else {
            const bodyPadding = 0.2;
            vertOffset = (this.headerHeight + bodyPadding) / textScale;
        }

        return {
            x: this.position.x + (local.x + 0.25 / textScale) * textScale,
            y: this.position.y + (local.y - vertOffset) * textScale,
            z: this.position.z + 0.05
        };
    }

    /**
     * Converts a world coordinate to local TextArea space.
     */
    getLocalPoint(type: 'header' | 'body', worldPoint: THREE.Vector3, textScale: number) {
        let vertOffset = 0;
        if (type === 'header') {
            const fontLineHeight = this.titleArea.fontData.common.lineHeight;
            const headerHeightFont = this.headerHeight / textScale;
            vertOffset = (headerHeightFont - fontLineHeight) / 2;
        } else {
            const bodyPadding = 0.2;
            vertOffset = (this.headerHeight + bodyPadding) / textScale;
        }

        return {
            x: (worldPoint.x - this.position.x) / textScale - (0.25 / textScale),
            y: (worldPoint.y - this.position.y) / textScale + vertOffset
        };
    }
}
