import * as THREE from 'three';

export interface BoxInstance {
    id: number;
    position: THREE.Vector3;
    scale: THREE.Vector3;
    color: THREE.Color;
}

/**
 * Manages rendering of multiple rectangular boxes using a single InstancedMesh.
 * Used for drawing NoteBox backgrounds efficiently.
 */
export class BoxManager {
    private mesh: THREE.InstancedMesh;
    private geometry: THREE.PlaneGeometry;
    private material: THREE.MeshBasicMaterial;
    private maxBoxes: number;
    private instances: BoxInstance[] = [];

    constructor(scene: THREE.Scene, maxBoxes: number = 1000) {
        this.maxBoxes = maxBoxes;
        
        // geometry
        this.geometry = new THREE.PlaneGeometry(1, 1);
        
        // material (supports instanceColor automatically in newer Three.js versions)
        this.material = new THREE.MeshBasicMaterial({ 
            color: 0xffffff
        });

        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, maxBoxes);
        this.mesh.count = 0;
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.mesh.frustumCulled = false;
        
        scene.add(this.mesh);
    }

    /**
     * Reserves a slot for a box and returns its ID.
     */
    addBox(position: THREE.Vector3, scale: THREE.Vector3, color: THREE.Color): number {
        if (this.instances.length >= this.maxBoxes) {
            console.warn("BoxManager: Max limits reached");
            return -1;
        }

        const id = this.instances.length;
        const instance = { id, position, scale, color };
        this.instances.push(instance);
        
        this.updateInstance(id);
        this.mesh.count = this.instances.length;
        
        return id;
    }

    /**
     * Updates the transform and color of a specific box instance.
     */
    updateBox(id: number, position: THREE.Vector3, scale: THREE.Vector3, color: THREE.Color) {
        if (id < 0 || id >= this.instances.length) return;
        
        const instance = this.instances[id];
        instance.position.copy(position);
        instance.scale.copy(scale);
        instance.color.copy(color);
        
        this.updateInstance(id);
    }

    private updateInstance(id: number) {
        const instance = this.instances[id];
        const dummy = new THREE.Object3D();
        
        dummy.position.copy(instance.position);
        dummy.scale.copy(instance.scale);
        dummy.updateMatrix();
        
        this.mesh.setMatrixAt(id, dummy.matrix);
        this.mesh.setColorAt(id, instance.color);
        
        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }

    /**
     * Clears all box instances.
     */
    clear() {
        this.instances = [];
        this.mesh.count = 0;
    }
}
