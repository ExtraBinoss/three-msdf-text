import * as THREE from 'three';

export const GradientMode = {
    NONE: 0,
    VERTICAL: 1,
    HORIZONTAL: 2,
    RADIAL: 3
} as const;

export type GradientMode = typeof GradientMode[keyof typeof GradientMode];

export interface BoxInstance {
    logicalId: number;
    position: THREE.Vector3;
    scale: THREE.Vector3;
    color1: THREE.Color;
    color2: THREE.Color;
    alpha: number;
    gradientMode: GradientMode;
}

/**
 * Advanced BoxManager with stable IDs and efficient O(1) removals.
 */
export class BoxManager {
    private mesh: THREE.InstancedMesh;
    private material: THREE.MeshBasicMaterial;
    private maxBoxes: number;
    
    private instances: BoxInstance[] = [];
    private idCounter: number = 0;
    
    // Maps logicalId -> physical index in the instances array/InstancedMesh
    private idToIndex: Map<number, number> = new Map();

    constructor(scene: THREE.Scene, maxBoxes: number = 2000) {
        this.maxBoxes = maxBoxes;
        const geometry = new THREE.PlaneGeometry(1, 1);
        
        this.material = new THREE.MeshBasicMaterial({ 
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: true
        });

        this.mesh = new THREE.InstancedMesh(geometry, this.material, maxBoxes);
        
        const alphaArray = new Float32Array(maxBoxes);
        const color2Array = new Float32Array(maxBoxes * 3);
        const modeArray = new Float32Array(maxBoxes);
        
        this.mesh.geometry.setAttribute('instanceAlpha', new THREE.InstancedBufferAttribute(alphaArray, 1));
        this.mesh.geometry.setAttribute('instanceColor2', new THREE.InstancedBufferAttribute(color2Array, 3));
        this.mesh.geometry.setAttribute('instanceMode', new THREE.InstancedBufferAttribute(modeArray, 1));

        this.material.onBeforeCompile = (shader) => {
            shader.vertexShader = `
                attribute float instanceAlpha;
                attribute vec3 instanceColor2;
                attribute float instanceMode;
                varying float vAlpha;
                varying vec3 vColor2;
                varying float vMode;
                varying vec2 vBoxUv;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vAlpha = instanceAlpha;
                vColor2 = instanceColor2;
                vMode = instanceMode;
                vBoxUv = uv;
                `
            );

            shader.fragmentShader = `
                varying float vAlpha;
                varying vec3 vColor2;
                varying float vMode;
                varying vec2 vBoxUv;
                ${shader.fragmentShader}
            `.replace(
                'vec4 diffuseColor = vec4( diffuse, opacity );',
                `
                float t = 0.0;
                if (vMode == 1.0) { // Vertical
                    t = vBoxUv.y;
                } else if (vMode == 2.0) { // Horizontal
                    t = vBoxUv.x;
                } else if (vMode == 3.0) { // Radial
                    t = distance(vBoxUv, vec2(0.5)) * 2.0;
                    t = clamp(t, 0.0, 1.0);
                }
                
                vec3 finalColor = mix(diffuse, vColor2, t);
                vec4 diffuseColor = vec4( finalColor, vAlpha );
                `
            );
        };

        this.mesh.count = 0;
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.mesh.frustumCulled = false;
        
        scene.add(this.mesh);
    }

    addBox(position: THREE.Vector3, scale: THREE.Vector3, color1: THREE.Color, color2?: THREE.Color, alpha: number = 1.0, mode: GradientMode = GradientMode.NONE): number {
        if (this.instances.length >= this.maxBoxes) return -1;

        const logicalId = this.idCounter++;
        const physicalIndex = this.instances.length;

        const instance = { 
            logicalId, 
            position: position.clone(), 
            scale: scale.clone(), 
            color1: color1.clone(), 
            color2: (color2 || color1).clone(), 
            alpha,
            gradientMode: mode || GradientMode.NONE
        };

        this.instances.push(instance);
        this.idToIndex.set(logicalId, physicalIndex);
        
        this.updateInstance(physicalIndex);
        this.mesh.count = this.instances.length;
        
        return logicalId;
    }

    removeBox(logicalId: number) {
        const index = this.idToIndex.get(logicalId);
        if (index === undefined) return;

        const lastIndex = this.instances.length - 1;
        if (index !== lastIndex) {
            // Swap last instance into this spot
            const lastInstance = this.instances[lastIndex];
            this.instances[index] = lastInstance;
            this.idToIndex.set(lastInstance.logicalId, index);
            this.updateInstance(index);
        }

        this.instances.pop();
        this.idToIndex.delete(logicalId);
        this.mesh.count = this.instances.length;
    }

    updateBox(logicalId: number, position: THREE.Vector3, scale: THREE.Vector3, color1: THREE.Color, color2?: THREE.Color, alpha: number = 1.0, mode: GradientMode = GradientMode.NONE) {
        const index = this.idToIndex.get(logicalId);
        if (index === undefined) return;
        
        const instance = this.instances[index];
        instance.position.copy(position);
        instance.scale.copy(scale);
        instance.color1.copy(color1);
        instance.color2.copy(color2 || color1);
        instance.alpha = alpha;
        instance.gradientMode = mode || GradientMode.NONE;
        
        this.updateInstance(index);
    }

    private updateInstance(index: number) {
        const instance = this.instances[index];
        const dummy = new THREE.Object3D();
        
        dummy.position.copy(instance.position);
        dummy.scale.copy(instance.scale);
        dummy.updateMatrix();
        
        this.mesh.setMatrixAt(index, dummy.matrix);
        this.mesh.setColorAt(index, instance.color1);
        
        const alphaAttr = this.mesh.geometry.getAttribute('instanceAlpha') as THREE.InstancedBufferAttribute;
        const color2Attr = this.mesh.geometry.getAttribute('instanceColor2') as THREE.InstancedBufferAttribute;
        const modeAttr = this.mesh.geometry.getAttribute('instanceMode') as THREE.InstancedBufferAttribute;
        
        alphaAttr.setX(index, instance.alpha);
        color2Attr.setXYZ(index, instance.color2.r, instance.color2.g, instance.color2.b);
        modeAttr.setX(index, instance.gradientMode);
        
        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
        alphaAttr.needsUpdate = true;
        color2Attr.needsUpdate = true;
        modeAttr.needsUpdate = true;
    }

    clear() {
        this.instances = [];
        this.idToIndex.clear();
        this.idCounter = 0;
        this.mesh.count = 0;
    }

    public getMesh() {
        return this.mesh;
    }
}
