import * as THREE from 'three';

export const GradientMode = {
    NONE: 0,
    VERTICAL: 1,
    HORIZONTAL: 2,
    RADIAL: 3
} as const;

export type GradientMode = typeof GradientMode[keyof typeof GradientMode];

export interface BoxInstance {
    id: number;
    position: THREE.Vector3;
    scale: THREE.Vector3;
    color1: THREE.Color;
    color2: THREE.Color;
    alpha: number;
    gradientMode: GradientMode;
}

/**
 * Advanced BoxManager with support for per-instance alpha and multi-mode gradients.
 */
export class BoxManager {
    private mesh: THREE.InstancedMesh;
    private geometry: THREE.PlaneGeometry;
    private material: THREE.MeshBasicMaterial;
    private maxBoxes: number;
    private instances: BoxInstance[] = [];

    constructor(scene: THREE.Scene, maxBoxes: number = 2000) {
        this.maxBoxes = maxBoxes;
        this.geometry = new THREE.PlaneGeometry(1, 1);
        
        this.material = new THREE.MeshBasicMaterial({ 
            transparent: true,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, maxBoxes);
        
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

        const id = this.instances.length;
        const instance = { 
            id, 
            position: position.clone(), 
            scale: scale.clone(), 
            color1: color1.clone(), 
            color2: (color2 || color1).clone(), 
            alpha,
            gradientMode: mode || GradientMode.NONE
        };
        this.instances.push(instance);
        
        this.updateInstance(id);
        this.mesh.count = this.instances.length;
        
        return id;
    }

    updateBox(id: number, position: THREE.Vector3, scale: THREE.Vector3, color1: THREE.Color, color2?: THREE.Color, alpha: number = 1.0, mode: GradientMode = GradientMode.NONE) {
        if (id < 0 || id >= this.instances.length) return;
        
        const instance = this.instances[id];
        instance.position.copy(position);
        instance.scale.copy(scale);
        instance.color1.copy(color1);
        instance.color2.copy(color2 || color1);
        instance.alpha = alpha;
        instance.gradientMode = mode || GradientMode.NONE;
        
        this.updateInstance(id);
    }

    private updateInstance(id: number) {
        const instance = this.instances[id];
        const dummy = new THREE.Object3D();
        
        dummy.position.copy(instance.position);
        dummy.scale.copy(instance.scale);
        dummy.updateMatrix();
        
        this.mesh.setMatrixAt(id, dummy.matrix);
        this.mesh.setColorAt(id, instance.color1);
        
        const alphaAttr = this.mesh.geometry.getAttribute('instanceAlpha') as THREE.InstancedBufferAttribute;
        const color2Attr = this.mesh.geometry.getAttribute('instanceColor2') as THREE.InstancedBufferAttribute;
        const modeAttr = this.mesh.geometry.getAttribute('instanceMode') as THREE.InstancedBufferAttribute;
        
        alphaAttr.setX(id, instance.alpha);
        color2Attr.setXYZ(id, instance.color2.r, instance.color2.g, instance.color2.b);
        modeAttr.setX(id, instance.gradientMode);
        
        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
        alphaAttr.needsUpdate = true;
        color2Attr.needsUpdate = true;
        modeAttr.needsUpdate = true;
    }

    clear() {
        this.instances = [];
        this.mesh.count = 0;
    }

    public getMesh() {
        return this.mesh;
    }
}
