import * as THREE from 'three';
import { TextArea } from './TextArea.ts';
import { TextManager } from '../base/TextManager.ts';
import { BoxManager, GradientMode } from './BoxManager.ts';

/**
 * A UI component that manages a background box, a title bar, 
 * and two text areas (Title and Body).
 */
export class NoteBox extends THREE.Object3D {
    public titleArea: TextArea;
    public bodyArea: TextArea;
    
    // Style Properties
    public headerColor1: THREE.Color = new THREE.Color(0x666666);
    public headerColor2: THREE.Color = new THREE.Color(0x666666);
    public headerAlpha: number = 1.0;
    public headerGradientMode: GradientMode = GradientMode.NONE;

    public bodyColor1: THREE.Color = new THREE.Color(0x222222);
    public bodyColor2: THREE.Color = new THREE.Color(0x222222);
    public bodyAlpha: number = 1.0;
    public bodyGradientMode: GradientMode = GradientMode.NONE;

    public name: string;
    private boxManager: BoxManager;
    private textManager: TextManager;
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
        super();
        if (!textManager.fontData) throw new Error("Font data must be loaded first");
        
        this.name = id || `box-${Math.random().toString(36).substr(2, 9)}`;
        this.boxManager = boxManager;
        this.textManager = textManager;
        
        this.titleArea = new TextArea(textManager.fontData);
        this.titleArea.defaultColor.setHex(0xffffff);
        this.add(this.titleArea);
        
        this.bodyArea = new TextArea(textManager.fontData);
        this.bodyArea.defaultColor.setHex(0xffffff);
        this.add(this.bodyArea);
        
        // Initialize with default values
        this.headerId = this.boxManager.addBox(new THREE.Vector3(), new THREE.Vector3(1,1,1), this.headerColor1, this.headerColor2, this.headerAlpha, this.headerGradientMode);
        this.bodyId = this.boxManager.addBox(new THREE.Vector3(), new THREE.Vector3(1,1,1), this.bodyColor1, this.bodyColor2, this.bodyAlpha, this.bodyGradientMode);
        
        // Resize handle (small square at bottom right)
        this.resizeHandleId = this.boxManager.addBox(new THREE.Vector3(), new THREE.Vector3(0.5, 0.5, 1), new THREE.Color(0xffffff), new THREE.Color(0x888888), 1.0, GradientMode.RADIAL);

        this.updateGeometry();
        this.textManager.add(this);
    }

    /**
     * Helper to identify which part of the NoteBox was hit by a raycast or interaction.
     * @param instanceId The instance ID returned by the physics or interaction hit test.
     * @returns {'header' | 'body' | 'resize' | null} The part name or null if no match.
     */
    getPart(instanceId: number): 'header' | 'body' | 'resize' | null {
        if (instanceId === this.headerId) return 'header';
        if (instanceId === this.bodyId) return 'body';
        if (instanceId === this.resizeHandleId) return 'resize';
        return null;
    }

    /**
     * Disposes of the visual resources associated with this NoteBox.
     * Removes boxes from the BoxManager.
     */
    dispose() {
        this.boxManager.removeBox(this.headerId);
        this.boxManager.removeBox(this.bodyId);
        this.boxManager.removeBox(this.resizeHandleId);
    }
    
    /**
     * Sets the dimensions of the NoteBox.
     * @param w Width of the box.
     * @param h Height of the box.
     */
    setSize(w: number, h: number) {
        this.width = w;
        this.height = h;
        this.updateGeometry();
    }

    /**
     * Fluent API: Sets the dimensions of the NoteBox. Chainable.
     * @param w Width of the box.
     * @param h Height of the box.
     */
    setBoxSize(w: number, h: number): this {
        this.setSize(w, h);
        return this;
    }

    /**
     * Sets the world position of the NoteBox.
     * @param x X coordinate.
     * @param y Y coordinate.
     * @param z Z coordinate.
     */
    setPosition(x: number, y: number, z: number) {
        this.position.set(x, y, z);
        this.updateGeometry();
    }

    /**
     * Fluent API: Sets the world position of the NoteBox. Chainable.
     * @param x X coordinate.
     * @param y Y coordinate.
     * @param z Z coordinate.
     */
    setPos(x: number, y: number, z: number): this {
        this.setPosition(x, y, z);
        return this;
    }

    /**
     * Fluent API: Sets the title text. Chainable.
     * @param text The title string.
     */
    setTitle(text: string): this {
        this.titleArea.text = text;
        return this;
    }

    /**
     * Fluent API: Sets the body text. Chainable.
     * @param text The body string.
     */
    setBody(text: string): this {
        this.bodyArea.text = text;
        return this;
    }

    /**
     * Fluent API: Sets the placeholder text for the title. Chainable.
     * @param text The placeholder string.
     */
    setTitlePlaceholder(text: string): this {
        this.titleArea.placeholder = text;
        return this;
    }

    /**
     * Fluent API: Sets the placeholder text for the body. Chainable.
     * @param text The placeholder string.
     */
    setBodyPlaceholder(text: string): this {
        this.bodyArea.placeholder = text;
        return this;
    }

    private updateGeometry() {
        // Ensure matrix is updated to get world positions if needed, 
        // though BoxManager usually wants world space if it's a global manager.
        // For now let's assume boxes are world-space in the manager.
        this.updateWorldMatrix(true, false);

        const fontH = this.titleArea.fontData.common.lineHeight * this.textManager.textScale;
        this.headerHeight = fontH;

        // Header
        const headerPos = new THREE.Vector3(this.width / 2, -this.headerHeight / 2, 0.01);
        headerPos.applyMatrix4(this.matrixWorld);

        this.boxManager.updateBox(this.headerId, headerPos, new THREE.Vector3(this.width, this.headerHeight, 1), 
            this.headerColor1, this.headerColor2, this.headerAlpha, this.headerGradientMode);

        // Body
        const bodyH = Math.max(0.1, this.height - this.headerHeight);
        const bodyY = -(this.headerHeight + bodyH / 2);
        const bodyPos = new THREE.Vector3(this.width / 2, bodyY, 0);
        bodyPos.applyMatrix4(this.matrixWorld);
        
        this.boxManager.updateBox(this.bodyId, bodyPos, new THREE.Vector3(this.width, bodyH, 1), 
            this.bodyColor1, this.bodyColor2, this.bodyAlpha, this.bodyGradientMode);

        // Resize Handle (Bottom Right)
        const handlePos = new THREE.Vector3(this.width - 0.2, -this.height + 0.2, 0.02);
        handlePos.applyMatrix4(this.matrixWorld);

        this.boxManager.updateBox(this.resizeHandleId, handlePos, new THREE.Vector3(0.4, 0.4, 1), 
            new THREE.Color(0x888888), new THREE.Color(0xffffff), 1.0, GradientMode.RADIAL);

        // Position the TextAreas locally
        this.titleArea.position.set(0.25, 0, 0);
        this.bodyArea.position.set(0.25, -this.headerHeight - 0.2, 0);
    }

    /**
     * Configures the visual style of the NoteBox. Chainable.
     * @param config Object containing color and gradient settings.
     */
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
    }): this {
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
        return this;
    }

    private toColor(c: number | THREE.Color): THREE.Color {
        return c instanceof THREE.Color ? c : new THREE.Color(c);
    }

    /**
     * Computes the layout for glyphs to be rendered.
     * Automatically adjusts box dimensions if autoWidth or autoHeight is enabled.
     * 
     * @param textScale The global scale of the text.
     * @returns {any[]} Array of glyph layout data containing position, rotation, and color.
     */
    getLayout(textScale: number) {
        // --- Auto Width Check (Title driven) ---
        if (this.autoWidth) {
            const oldWrap = this.titleArea.wordWrap;
            this.titleArea.wordWrap = false;
            this.titleArea.width = 999999;
            this.titleArea.computeLayout();
            const contentW = this.titleArea.getContentWidth() * textScale;
            this.titleArea.wordWrap = oldWrap;

            const targetW = Math.max(this.minWidth, contentW + 1.0);
            if (this.width < targetW) {
                this.width = targetW;
                this.updateGeometry();
            }
        }

        this.titleArea.width = (this.width - 0.5) / textScale;
        this.titleArea.height = (this.headerHeight - 0.1) / textScale;
        this.bodyArea.width = (this.width - 0.5) / textScale;
        
        let bodyGlyphsLocal: any[] = [];
        if (this.autoHeight) {
            this.bodyArea.height = 999999;
            bodyGlyphsLocal = this.bodyArea.computeLayout();
            const contentH = this.bodyArea.getContentHeight() * textScale;
            const targetH = Math.max(2, contentH + this.headerHeight + 0.5);
            
            if (this.height < targetH) {
                this.height = targetH;
                this.updateGeometry();
            }
        } else {
            this.bodyArea.height = (this.height - this.headerHeight - 0.5) / textScale;
            bodyGlyphsLocal = this.bodyArea.computeLayout();
        }

        this.updateWorldMatrix(true, true);
        const fontLineHeight = this.titleArea.fontData.common.lineHeight;
        const headerHeightFont = this.headerHeight / textScale;
        const titleVertOffset = (headerHeightFont - fontLineHeight) / 2;

        const titleGlyphs = this.titleArea.computeLayout().map(g => {
            const v = new THREE.Vector3(g.x * textScale, (g.y - titleVertOffset) * textScale, 0);
            v.applyMatrix4(this.titleArea.matrixWorld);
            return {
                ...g,
                x: v.x / textScale,
                y: v.y / textScale,
                z: v.z,
                rotation: this.titleArea.rotation.z + (g.rotation || 0)
            };
        });

        const bodyGlyphs = bodyGlyphsLocal.map(g => {
            const v = new THREE.Vector3(g.x * textScale, g.y * textScale, 0);
            v.applyMatrix4(this.bodyArea.matrixWorld);
            return {
                ...g,
                x: v.x / textScale,
                y: v.y / textScale,
                z: v.z,
                rotation: this.bodyArea.rotation.z + (g.rotation || 0)
            };
        });

        return [...titleGlyphs, ...bodyGlyphs];
    }

    /**
     * Gets the world position of the caret for the specified area type.
     * Useful for positioning a visual blinking cursor.
     * 
     * @param type 'header' or 'body'
     * @param textScale current text scale
     * @returns {THREE.Vector3} The world position of the caret.
     */
    getCaretWorldPosition(type: 'header' | 'body', textScale: number) {
        const area = type === 'header' ? this.titleArea : this.bodyArea;
        const local = area.lastCaretPos;
        
        let vertOffset = 0;
        if (type === 'header') {
            const fontLineHeight = area.fontData.common.lineHeight;
            const headerHeightFont = this.headerHeight / textScale;
            vertOffset = (headerHeightFont - fontLineHeight) / 2;
        }

        const v = new THREE.Vector3(local.x * textScale, (local.y - vertOffset) * textScale, 0.05);
        v.applyMatrix4(area.matrixWorld);
        return v;
    }

    /**
     * Converts a world position to a local text coordinate (for picking).
     * Accounts for text scale and vertical offsets of headers.
     * 
     * @param type 'header' or 'body'
     * @param worldPoint The point in world space.
     * @param textScale The current text scale.
     * @returns {{x: number, y: number}} Local 2D coordinates for text layout.
     */
    getLocalPoint(type: 'header' | 'body', worldPoint: THREE.Vector3, textScale: number) {
        const area = type === 'header' ? this.titleArea : this.bodyArea;
        const localPoint = worldPoint.clone();
        area.worldToLocal(localPoint);

        let vertOffset = 0;
        if (type === 'header') {
            const fontLineHeight = area.fontData.common.lineHeight;
            const headerHeightFont = this.headerHeight / textScale;
            vertOffset = (headerHeightFont - fontLineHeight) / 2;
        }

        return {
            x: localPoint.x / textScale,
            y: localPoint.y / textScale + vertOffset
        };
    }
}
