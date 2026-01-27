import * as THREE from 'three';
import type { FontData, Char } from './FontData.ts';
import msdfVert from './shaders/msdf.vert?raw';
import msdfFrag from './shaders/msdf.frag?raw';

/**
 * Manages MSDF text rendering using a single Three.js InstancedMesh.
 * Handles loading font data, processing strings, and updating GPU instances.
 */
export class TextManager {
    private mesh: THREE.InstancedMesh;
    private geometry: THREE.PlaneGeometry;
    private material: THREE.ShaderMaterial;
    private charMap: Map<string, Char> = new Map();
    private maxChars: number;
    public textScale: number = 0.01;
    public fontData: FontData | null = null;
    private _profileData = {
        lastUpdateDuration: 0
    };

    /**
     * Creates a new TextManager instance.
     * @param scene The Three.js scene to add the mesh to.
     * @param maxChars Maximum number of characters that can be displayed (buffer size). Defaults to 1000.
     */
    constructor(scene: THREE.Scene, maxChars: number = 1000) {
        this.maxChars = maxChars;

        // 1. Geometry
        this.geometry = new THREE.PlaneGeometry(1, 1);
        
        // 2. Custom Attributes (aUvOffset)
        // [u, v, width, height]
        const uvOffsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(maxChars * 4), 4);
        this.geometry.setAttribute('aUvOffset', uvOffsetAttribute);

        // 3. Material
        this.material = new THREE.ShaderMaterial({
            vertexShader: msdfVert,
            fragmentShader: msdfFrag,
            uniforms: {
                uMap: { value: null },
                uColor: { value: new THREE.Color(0xffffff) }
            },
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false // Optional, depends on use case
        });

        // InstancedMesh
        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, maxChars);
        this.mesh.count = 0; // Start with 0 visible
        this.mesh.frustumCulled = false; // Phase 5 optimization
        
        scene.add(this.mesh);
    }

    /**
     * Loads the font JSON data and the texture atlas.
     * @param fontUrl URL to the MSDF font JSON file.
     * @param textureUrl URL to the MSDF font texture image.
     * @returns A promise that resolves when both assets are loaded.
     */
    async load(fontUrl: string, textureUrl: string): Promise<void> {
        // Load JSON
        const response = await fetch(fontUrl);
        this.fontData = await response.json();

        // Process Char Map
        this.fontData?.chars.forEach(char => {
            this.charMap.set(char.char, char);
        });

        // Load Texture
        const loader = new THREE.TextureLoader();
        return new Promise((resolve, reject) => {
            loader.load(textureUrl, (texture) => {
                this.material.uniforms.uMap.value = texture;
                // MSDF textures need specific filtering usually? 
                // Usually LinearFilter is fine, but maybe MinFilter needs adjustment.
                // Standard texture settings are usually okay for MSDF.
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false; // Usually better for MSDF to avoid mipmap artifacts at small sizes, or handle mipmaps carefully.
                resolve();
            }, undefined, reject);
        });
    }

    /**
     * Updates the InstancedMesh to display the provided text.
     * Calculates glyph positions, UVs, and updates the instance matrices.
     * @param text The string to render.
     */
    setText(text: string) {
        if (!this.fontData) return;

        const startTime = performance.now();

        let cursorX = 0;
        let cursorY = 0;
        const dummy = new THREE.Object3D();
        let instanceIndex = 0;
        
        const uvOffsetAttribute = this.geometry.getAttribute('aUvOffset') as THREE.InstancedBufferAttribute;

        // Common values
        const scaleW = this.fontData.common.scaleW;
        const scaleH = this.fontData.common.scaleH;
        const lineHeight = this.fontData.common.lineHeight;
        
        // Iterate through string
        for (let i = 0; i < text.length; i++) {
            const charStr = text[i];
            
            // Handle newlines
            if (charStr === '\n') {
                cursorX = 0;
                cursorY -= lineHeight;
                continue;
            }

            const charData = this.charMap.get(charStr);
            if (!charData) {
                 // Maybe advance space if space?
                 if (charStr === ' ') {
                     cursorX += (this.charMap.get(' ')?.xadvance ?? 30); // fallback
                 }
                 continue;
            }

            if (instanceIndex >= this.maxChars) break;

            // Calculate position
            // Font JSON glyphs have xoffset, yoffset.
            // In Three.js, plane is centered at 0,0 usually.
            // We need to align it. 
            // charData.width/height is the size of the plane.
            // We scale the instance to width/height.
            // Position is cursorX + xoffset + width/2, cursorY - (yoffset + height/2) ?
            // Coordinate systems:
            // Font system: y grows down usually (BMFont). MSDF gen usually follows BMFont.
            // Three.js: y grows up.
            // We might need to invert Y.

            // Let's assume we map 1 unit = 1 pixel for now, or scale down.
            const scale = this.textScale;
            
            dummy.scale.set(charData.width * scale, charData.height * scale, 1);
            
            // Position
            // x = cursorX + xoffset
            // y = cursorY - yoffset (inverted Y)
            // But we display a centered quad. So we need to shift by half width/height
            const x = (cursorX + charData.xoffset + charData.width / 2) * scale;
            const y = (cursorY - charData.yoffset - charData.height / 2) * scale; // Inverted Y axis for rendering
            
            dummy.position.set(x, y, 0);
            dummy.updateMatrix();
            
            this.mesh.setMatrixAt(instanceIndex, dummy.matrix);
            
            const u = charData.x / scaleW;
            const v = 1.0 - (charData.y + charData.height) / scaleH; // Invert V
            const w = charData.width / scaleW;
            const h = charData.height / scaleH;

            uvOffsetAttribute.setXYZW(instanceIndex, u, v, w, h);

            // Advance cursor
            cursorX += charData.xadvance;
            
            // Kerning? (Skip for now or check map)

            instanceIndex++;
        }

        this.mesh.count = instanceIndex;
        this.mesh.instanceMatrix.needsUpdate = true;
        uvOffsetAttribute.needsUpdate = true;

        this._profileData.lastUpdateDuration = performance.now() - startTime;
    }

    /**
     * Renders a custom list of glyphs at specific offsets.
     * Useful for complex UI components like NoteBoxes.
     */
    renderGlyphs(glyphs: any[], worldOffset: THREE.Vector3 = new THREE.Vector3()) {
        const startTime = performance.now();
        let instanceIndex = 0;
        const dummy = new THREE.Object3D();
        const uvOffsetAttribute = this.geometry.getAttribute('aUvOffset') as THREE.InstancedBufferAttribute;
        
        const scaleW = this.fontData!.common.scaleW;
        const scaleH = this.fontData!.common.scaleH;
        const scale = this.textScale;

        for (const glyph of glyphs) {
            if (instanceIndex >= this.maxChars) break;

            const { char, x: gx, y: gy } = glyph;
            dummy.scale.set(char.width * scale, char.height * scale, 1);
            
            const posX = worldOffset.x + (gx + char.xoffset + char.width / 2) * scale;
            const posY = worldOffset.y + (gy - char.yoffset - char.height / 2) * scale;
            
            dummy.position.set(posX, posY, worldOffset.z + 0.02); // Slightly front
            dummy.updateMatrix();
            this.mesh.setMatrixAt(instanceIndex, dummy.matrix);

            const u = char.x / scaleW;
            const v = 1.0 - (char.y + char.height) / scaleH;
            uvOffsetAttribute.setXYZW(instanceIndex, u, v, char.width / scaleW, char.height / scaleH);

            instanceIndex++;
        }

        this.mesh.count = instanceIndex;
        this.mesh.instanceMatrix.needsUpdate = true;
        uvOffsetAttribute.needsUpdate = true;
        this._profileData.lastUpdateDuration = performance.now() - startTime;
    }

    /**
     * Returns profiling and status information about the text engine.
     */
    getProfile() {
        return {
            visibleCharacters: this.mesh.count,
            bufferCapacity: this.maxChars,
            geometryVertices: this.mesh.count * 4,
            geometryTriangles: this.mesh.count * 2,
            lastUpdateDuration: this._profileData.lastUpdateDuration
        };
    }
}
