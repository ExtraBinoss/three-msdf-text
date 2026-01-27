import * as THREE from 'three';
import type { FontData, Char } from '../Font/FontData.ts';
import msdfVert from '../shaders/msdf.vert?raw';
import msdfFrag from '../shaders/msdf.frag?raw';

/**
 * Manages MSDF text rendering using a single Three.js InstancedMesh.
 * Handles loading font data, processing strings, and updating GPU instances.
 */
export class TextManager {
    private mesh: THREE.InstancedMesh;
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

        // 3. Material
        this.material = new THREE.ShaderMaterial({
            vertexShader: msdfVert,
            fragmentShader: msdfFrag,
            uniforms: {
                uMap: { value: null }
            },
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false // Optional, depends on use case
        });

        // Initialize mesh with initial capacity
        this.mesh = this.createMesh(this.capacity);
        scene.add(this.mesh);
    }

    private createMesh(capacity: number): THREE.InstancedMesh {
        const geometry = new THREE.PlaneGeometry(1, 1);
        
        // Custom Attributes
        const uvOffsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
        geometry.setAttribute('aUvOffset', uvOffsetAttribute);
        
        const colorAttribute = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
        geometry.setAttribute('aColor', colorAttribute);

        const mesh = new THREE.InstancedMesh(geometry, this.material, capacity);
        mesh.count = 0;
        mesh.frustumCulled = false;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        
        return mesh;
    }

    /**
     * Grows the buffer capacity by recreating the InstancedMesh.
     * Preserves existing instance data.
     */
    private grow(requiredCapacity: number) {
        // Grow more tightly: 20% headroom or at least 500 units
        let newCapacity = Math.max(
            Math.ceil(requiredCapacity * 1.2), 
            this.capacity + 500
        );
        
        // Safety cap for initial small jumps
        if (newCapacity < requiredCapacity) newCapacity = requiredCapacity + 100;

        const oldMesh = this.mesh;
        const oldCount = oldMesh.count;
        
        // Create new mesh with larger capacity
        const newMesh = this.createMesh(newCapacity);
        
        // Copy existing instance data
        if (oldCount > 0) {
            const oldUvAttr = oldMesh.geometry.getAttribute('aUvOffset') as THREE.InstancedBufferAttribute;
            const newUvAttr = newMesh.geometry.getAttribute('aUvOffset') as THREE.InstancedBufferAttribute;
            const oldColorAttr = oldMesh.geometry.getAttribute('aColor') as THREE.InstancedBufferAttribute;
            const newColorAttr = newMesh.geometry.getAttribute('aColor') as THREE.InstancedBufferAttribute;
            
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
                
                // Copy color data
                newColorAttr.setXYZ(
                    i,
                    oldColorAttr.getX(i),
                    oldColorAttr.getY(i),
                    oldColorAttr.getZ(i)
                );
            }
            
            newMesh.count = oldCount;
            newMesh.instanceMatrix.needsUpdate = true;
            newUvAttr.needsUpdate = true;
            newColorAttr.needsUpdate = true;
        }

        // Replace in scene
        this.scene.remove(oldMesh);
        this.scene.add(newMesh);
        
        // Dispose old resources
        oldMesh.geometry.dispose();
        
        // Update references
        this.mesh = newMesh;
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

        // Pre-allocate buffer once (text length is the max possible instances)
        if (text.length > this.capacity) {
            this.grow(text.length);
        }

        let cursorX = 0;
        let cursorY = 0;
        const dummy = new THREE.Object3D();
        let instanceIndex = 0;
        
        let uvOffsetAttribute = this.mesh.geometry.getAttribute('aUvOffset') as THREE.InstancedBufferAttribute;
        let colorAttribute = this.mesh.geometry.getAttribute('aColor') as THREE.InstancedBufferAttribute;

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
            
            // Default white color
            colorAttribute.setXYZ(instanceIndex, 1, 1, 1);

            // Advance cursor
            cursorX += charData.xadvance;
            
            // Kerning? (Skip for now or check map)

            instanceIndex++;
        }

        this.mesh.count = instanceIndex;
        this.mesh.instanceMatrix.needsUpdate = true;
        uvOffsetAttribute.needsUpdate = true;
        colorAttribute.needsUpdate = true;

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
        
        // Pre-allocate buffer once if we know the size
        if (glyphs.length > this.capacity) {
            this.grow(glyphs.length);
        }

        let instanceIndex = 0;
        const dummy = new THREE.Object3D();
        let uvOffsetAttribute = this.mesh.geometry.getAttribute('aUvOffset') as THREE.InstancedBufferAttribute;
        let colorAttribute = this.mesh.geometry.getAttribute('aColor') as THREE.InstancedBufferAttribute;
        
        const scaleW = this.fontData!.common.scaleW;
        const scaleH = this.fontData!.common.scaleH;
        const scale = this.textScale; // Use textScale for local glyph scaling

        for (const glyph of glyphs) {
            // No need to check inside loop anymore as we pre-allocated, 
            // but keeping a safety just in case of future logic changes
            if (instanceIndex >= this.capacity) break; 

            const { char, x: gx, y: gy, z: gz } = glyph;
            dummy.scale.set(char.width * scale, char.height * scale, 1);
            
            const posX = (gx + char.xoffset + char.width / 2) * scale;
            const posY = (gy - char.yoffset - char.height / 2) * scale;
            const posZ = (gz !== undefined ? gz : 0) + 0.02;

            dummy.position.set(posX, posY, posZ); 
            dummy.updateMatrix();
            this.mesh.setMatrixAt(instanceIndex, dummy.matrix);

            const u = char.x / scaleW;
            const v = 1.0 - (char.y + char.height) / scaleH;
            uvOffsetAttribute.setXYZW(instanceIndex, u, v, char.width / scaleW, char.height / scaleH);
            
            // Use glyph-specific color if provided
            const finalColor = glyph.color || new THREE.Color(1, 1, 1);
            colorAttribute.setXYZ(instanceIndex, finalColor.r, finalColor.g, finalColor.b);

            instanceIndex++;
        }

        this.mesh.count = instanceIndex;
        this.mesh.instanceMatrix.needsUpdate = true;
        uvOffsetAttribute.needsUpdate = true;
        colorAttribute.needsUpdate = true;
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
