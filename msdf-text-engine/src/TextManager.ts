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
    private capacity: number;
    private scene: THREE.Scene;
    public textScale: number = 0.01;
    public fontData: FontData | null = null;
    private _profileData = {
        lastUpdateDuration: 0,
        growthCount: 0
    };

    /**
     * Creates a new TextManager instance with dynamic buffer growth.
     * @param scene The Three.js scene to add the mesh to.
     * @param initialCapacity Initial buffer size. Defaults to 100 and grows as needed.
     */
    constructor(scene: THREE.Scene, initialCapacity: number = 100) {
        this.scene = scene;
        this.capacity = initialCapacity;

        // 1. Geometry
        this.geometry = new THREE.PlaneGeometry(1, 1);

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

        // Initialize mesh with initial capacity
        this.mesh = this.createMesh(this.capacity);
        scene.add(this.mesh);
    }

    /**
     * Creates a new InstancedMesh with the specified capacity.
     * Used for initial creation and dynamic growth.
     */
    private createMesh(capacity: number): THREE.InstancedMesh {
        const geometry = this.geometry.clone();
        
        // Custom Attributes (aUvOffset)
        const uvOffsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
        geometry.setAttribute('aUvOffset', uvOffsetAttribute);

        const mesh = new THREE.InstancedMesh(geometry, this.material, capacity);
        mesh.count = 0;
        mesh.frustumCulled = false;
        
        return mesh;
    }

    /**
     * Grows the buffer capacity by recreating the InstancedMesh.
     * Preserves existing instance data.
     */
    private grow(requiredCapacity: number) {
        // Double capacity until we can fit the required amount
        let newCapacity = this.capacity * 2;
        while (newCapacity < requiredCapacity) {
            newCapacity *= 2;
        }

        const oldMesh = this.mesh;
        const oldCount = oldMesh.count;
        
        // Create new mesh with larger capacity
        const newMesh = this.createMesh(newCapacity);
        
        // Copy existing instance data
        if (oldCount > 0) {
            const oldUvAttr = oldMesh.geometry.getAttribute('aUvOffset') as THREE.InstancedBufferAttribute;
            const newUvAttr = newMesh.geometry.getAttribute('aUvOffset') as THREE.InstancedBufferAttribute;
            
            // Copy matrices
            for (let i = 0; i < oldCount; i++) {
                const matrix = new THREE.Matrix4();
                oldMesh.getMatrixAt(i, matrix);
                newMesh.setMatrixAt(i, matrix);
                
                // Copy UV data
                newUvAttr.setXYZW(
                    i,
                    oldUvAttr.getX(i),
                    oldUvAttr.getY(i),
                    oldUvAttr.getZ(i),
                    oldUvAttr.getW(i)
                );
            }
            
            newMesh.count = oldCount;
            newMesh.instanceMatrix.needsUpdate = true;
            newUvAttr.needsUpdate = true;
        }

        // Replace in scene
        this.scene.remove(oldMesh);
        this.scene.add(newMesh);
        
        // Dispose old resources
        oldMesh.geometry.dispose();
        
        // Update references
        this.mesh = newMesh;
        this.geometry = newMesh.geometry as THREE.PlaneGeometry;
        this.capacity = newCapacity;
        this._profileData.growthCount++;
        
        console.log(`TextManager grew to ${newCapacity} instances (growth #${this._profileData.growthCount})`);
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

            // Grow buffer if needed
            if (instanceIndex >= this.capacity) {
                this.grow(instanceIndex + 100); // Grow with some headroom
            }

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
    /**
     * Renders a custom list of glyphs.
     * Use NoteBox.getLayout() to get glyphs with world positions already baked in.
     */
    renderGlyphs(glyphs: any[]) { // glyphs expected to be in world space (relative to 0,0,0) if offset
        const startTime = performance.now();
        let instanceIndex = 0;
        const dummy = new THREE.Object3D();
        const uvOffsetAttribute = this.geometry.getAttribute('aUvOffset') as THREE.InstancedBufferAttribute;
        
        const scaleW = this.fontData!.common.scaleW;
        const scaleH = this.fontData!.common.scaleH;
        const scale = this.textScale; // Use textScale for local glyph scaling

        for (const glyph of glyphs) {
            // Grow buffer if needed
            if (instanceIndex >= this.capacity) {
                this.grow(instanceIndex + 100); // Grow with some headroom
            }

            const { char, x: gx, y: gy, z: gz } = glyph;
            dummy.scale.set(char.width * scale, char.height * scale, 1);
            
            // Glyph layout positions (gx, gy) are already potentially offset by world pos
            // But strict NoteBox textScale logic was:
            // x = (gx + char.xoffset + char.width/2) * scale
            // The NoteBox layout returns {x,y} in FONT units, but offsetted.
            // Wait, previous NoteBox change: x: g.x + (0.25 / textScale) + worldOffsetX
            // So gx IS in FONT units.
            // We need to multiply by scale.
            
            const posX = (gx + char.xoffset + char.width / 2) * scale;
            const posY = (gy - char.yoffset - char.height / 2) * scale;
            const posZ = (gz !== undefined ? gz : 0) + 0.02;

            dummy.position.set(posX, posY, posZ); 
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
            bufferCapacity: this.capacity,
            geometryVertices: this.mesh.count * 4,
            geometryTriangles: this.mesh.count * 2,
            lastUpdateDuration: this._profileData.lastUpdateDuration,
            growthCount: this._profileData.growthCount
        };
    }
}
