import * as THREE from 'three';
import type { FontData, Char } from '../font/FontData.ts';
import { TextArea } from '../noteBoxes/TextArea';
import { NoteBox } from '../noteBoxes/NoteBox';
import { BoxManager } from '../noteBoxes/BoxManager';
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

    private managedObjects: Set<any> = new Set();

    /**
     * Creates a new TextManager instance with dynamic buffer growth.
     * @param scene The Three.js scene to add the mesh to.
     * @param initialCapacity Initial buffer size. Defaults to 100 and grows as needed.
     */
    constructor(scene: THREE.Scene, initialCapacity: number = 100) {
        this.scene = scene;
        this.capacity = initialCapacity;

        this.material = new THREE.ShaderMaterial({
            vertexShader: msdfVert,
            fragmentShader: msdfFrag,
            uniforms: {
                uMap: { value: null }
            },
            transparent: true,
            side: THREE.DoubleSide
        });

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
        mesh.renderOrder = 999; // Ensure text renders on top of UI boxes
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        
        return mesh;
    }

    /**
     * Grows the buffer capacity by recreating the InstancedMesh.
     * Preserves existing instance data (Matrices, UVs, Colors) by copying to the new buffer.
     * 
     * @param requiredCapacity The absolute minimum capacity required.
     */
    private grow(requiredCapacity: number) {
        // Headroom strategy: 
        // 20% for small counts, but cap waste at 10k units for large counts
        const padding = Math.min(Math.ceil(requiredCapacity * 0.2), 10000);
        let newCapacity = Math.max(requiredCapacity + padding, requiredCapacity + 50);
        
        // Ensure we don't shrink
        newCapacity = Math.max(newCapacity, this.capacity);

        const oldMesh = this.mesh;
        const oldCount = oldMesh.count;
        
        // Create new mesh with larger capacity
        const newMesh = this.createMesh(newCapacity);
        
        // Copy existing instance data using high-speed TypedArray.set()
        if (oldCount > 0) {
            // Copy Instance Matrices
            (newMesh.instanceMatrix.array as Float32Array).set(
                (oldMesh.instanceMatrix.array as Float32Array).subarray(0, oldCount * 16)
            );

            // Copy Custom Attributes (UVs and Colors)
            const oldUvAttr = oldMesh.geometry.getAttribute('aUvOffset') as THREE.InstancedBufferAttribute;
            const newUvAttr = newMesh.geometry.getAttribute('aUvOffset') as THREE.InstancedBufferAttribute;
            const oldColorAttr = oldMesh.geometry.getAttribute('aColor') as THREE.InstancedBufferAttribute;
            const newColorAttr = newMesh.geometry.getAttribute('aColor') as THREE.InstancedBufferAttribute;
            
            (newUvAttr.array as Float32Array).set((oldUvAttr.array as Float32Array).subarray(0, oldCount * 4));
            (newColorAttr.array as Float32Array).set((oldColorAttr.array as Float32Array).subarray(0, oldCount * 3));
            
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
    }

    /**
     * Loads the font JSON data and the texture atlas.
     * @param fontUrl URL to the MSDF font JSON file.
     * @param textureUrl URL to the MSDF font texture image.
     */
    async load(fontUrl: string, textureUrl: string): Promise<void> {
        try {
            // 1. Load & Validate Font JSON
            const response = await fetch(fontUrl);
            if (!response.ok) throw new Error(`Failed to fetch font data: ${response.statusText}`);
            
            this.fontData = await response.json();
            if (!this.fontData || !this.fontData.chars) {
                throw new Error("Invalid MSDF font JSON format.");
            }

            // 2. Process Char Map for O(1) lookups
            this.charMap.clear();
            this.fontData.chars.forEach(char => {
                this.charMap.set(char.char, char);
            });

            // 3. Load & Configure Texture
            const loader = new THREE.TextureLoader();
            const texture = await loader.loadAsync(textureUrl);
            
            // MSDF optimization: Disable mipmaps to prevent bleeding at small sizes
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;
            
            this.material.uniforms.uMap.value = texture;

        } catch (error) {
            console.error(`[TextManager] Asset loading failed:`, error);
            throw error;
        }
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
     * Useful for complex UI components like NoteBoxes where glyphs might be computed in local space
     * but need to be rendered in world space.
     * 
     * @param glyphs Array of glyph objects with world coordinates {x, y, z, char, scale, ...}.
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
            if (instanceIndex >= this.capacity) break; 

            const { char, x: gx, y: gy, z: gz } = glyph;
            const gScale = glyph.scale !== undefined ? glyph.scale : 1.0;
            const finalScale = scale * gScale;
            
            dummy.scale.set(char.width * finalScale, char.height * finalScale, 1);
            
            // Critical: The quad offset must ALSO be scaled by the glyph's local scale
            const posX = (gx + (char.xoffset + char.width / 2) * gScale) * scale;
            const posY = (gy - (char.yoffset + char.height / 2) * gScale) * scale;
            const posZ = (gz !== undefined ? gz : 0) + 0.02;

            dummy.position.set(posX, posY, posZ); 
            
            if (glyph.rotation) {
                dummy.rotation.z = glyph.rotation;
            } else {
                dummy.rotation.z = 0;
            }

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
     * Resets the engine to a clean state and recovers VRAM.
     * Removes all instances and reverts to a minimal buffer size if the headeroom is too large.
     */
    clear() {
        const initialCapacity = 100;
        if (this.capacity > initialCapacity * 2) {
            // Dispose massive buffer and revert to small one
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            
            this.capacity = initialCapacity;
            this.mesh = this.createMesh(this.capacity);
            this.scene.add(this.mesh);
        } else {
            // Just reset the counter if buffer is already reasonable
            this.mesh.count = 0;
            this.mesh.instanceMatrix.needsUpdate = true;
        }
        this.managedObjects.clear();
    }

    /**
     * Managed API: Automatically collects and renders all registered text objects.
     */
    add(object: any) {
        this.managedObjects.add(object);
    }

    remove(object: any) {
        this.managedObjects.delete(object);
    }

    /**
     * Updates all managed text objects and pushes them to the GPU in one batch.
     */
    update() {
        if (!this.fontData) return;
        const allLayouts: any[] = [];
        for (const obj of this.managedObjects) {
            if (obj.getLayout) {
                // For NoteBox
                allLayouts.push(...obj.getLayout(this.textScale));
            } else if (obj.getWorldLayout) {
                // For standalone TextArea
                allLayouts.push(...obj.getWorldLayout(this.textScale));
            }
        }
        this.renderGlyphs(allLayouts);
    }

    /**
     * Returns profiling and status information about the text engine.
     * Useful for debugging performance and buffer usage.
     * 
     * @returns Object containing metrics like visible characters, buffer size, and update times.
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

    /**
     * Factory: Creates and registers a new TextArea.
     * @param text The initial text content.
     * @param x X world coordinate.
     * @param y Y world coordinate.
     * @param z Z world coordinate.
     * @returns A new TextArea instance managed by this engine.
     * @throws Error if font data has not been loaded.
     */
    createTextArea(text: string = "", x: number = 0, y: number = 0, z: number = 0): TextArea {
        if (!this.fontData) throw new Error("Font data must be loaded first");
        const area = new TextArea(this.fontData);
        area.text = text;
        area.position.set(x, y, z);
        this.add(area);
        return area;
    }

    /**
     * Factory: Creates and registers a new NoteBox.
     * @param boxManager The BoxManager instance to handle background geometry.
     * @param id Optional unique identifier for the box.
     * @returns A new NoteBox instance managed by this engine.
     * @throws Error if font data has not been loaded.
     */
    createNoteBox(boxManager: BoxManager, id?: string): NoteBox {
        if (!this.fontData) throw new Error("Font data must be loaded first");
        return new NoteBox(this, boxManager, id);
    }
}
