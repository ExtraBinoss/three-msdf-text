import * as THREE from 'three';
import { NoteBox } from '../library/noteBoxes/NoteBox';
import { BoxManager } from '../library/noteBoxes/BoxManager';
import { TextManager } from '../library/base/TextManager';
import { TextEditor } from '../library/textEdit/TextEditor';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class InteractionHandler {
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    
    public resizingBox: NoteBox | null = null;
    public draggingBox: NoteBox | null = null;
    private dragOffset = new THREE.Vector3();
    
    public editingBox: NoteBox | null = null;
    public editingPart: 'header' | 'body' | null = null;

    private camera: THREE.Camera;
    private renderer: THREE.WebGLRenderer;
    private boxManager: BoxManager;
    private textManager: TextManager;
    private textEditor: TextEditor;
    private controls: OrbitControls;
    private noteBoxMap: Map<string, NoteBox>;

    constructor(
        camera: THREE.Camera,
        renderer: THREE.WebGLRenderer,
        boxManager: BoxManager,
        textManager: TextManager,
        textEditor: TextEditor,
        controls: OrbitControls,
        noteBoxMap: Map<string, NoteBox>
    ) {
        this.camera = camera;
        this.renderer = renderer;
        this.boxManager = boxManager;
        this.textManager = textManager;
        this.textEditor = textEditor;
        this.controls = controls;
        this.noteBoxMap = noteBoxMap;
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.renderer.domElement.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            if (this.resizingBox) {
                this.raycaster.setFromCamera(this.mouse, this.camera);
                
                const worldPos = new THREE.Vector3();
                this.resizingBox.getWorldPosition(worldPos);
                const worldScale = new THREE.Vector3();
                this.resizingBox.getWorldScale(worldScale);

                const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -worldPos.z);
                const planeIntersect = new THREE.Vector3();
                this.raycaster.ray.intersectPlane(plane, planeIntersect);
                
                // Calculate world-space dimensions and convert back to local units
                const dxWorld = planeIntersect.x - worldPos.x;
                const dyWorld = -(planeIntersect.y - worldPos.y);
                
                const newW = Math.max(2, dxWorld / worldScale.x);
                const newH = Math.max(2, dyWorld / worldScale.y);
                this.resizingBox.setSize(newW, newH);
            } else if (this.draggingBox) {
                this.raycaster.setFromCamera(this.mouse, this.camera);
                
                const worldPos = new THREE.Vector3();
                this.draggingBox.getWorldPosition(worldPos);

                const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -worldPos.z);
                const planeIntersect = new THREE.Vector3();
                this.raycaster.ray.intersectPlane(plane, planeIntersect);
                
                const newWorldPos = planeIntersect.sub(this.dragOffset);
                
                // Convert world position back to parent-local space for setPosition
                if (this.draggingBox.parent) {
                    const localPos = newWorldPos.clone();
                    this.draggingBox.parent.worldToLocal(localPos);
                    this.draggingBox.setPosition(localPos.x, localPos.y, this.draggingBox.position.z);
                } else {
                    this.draggingBox.setPosition(newWorldPos.x, newWorldPos.y, this.draggingBox.position.z);
                }
            }
        });

        this.renderer.domElement.addEventListener('mousedown', () => {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const mesh = this.boxManager.getMesh();
            const intersects = this.raycaster.intersectObject(mesh);
            
            if (intersects.length > 0) {
                const hit = intersects[0];
                const instanceId = hit.instanceId!;
                let hitBox: NoteBox | null = null;
                
                for (const nb of this.noteBoxMap.values()) {
                    if (nb.getPart(instanceId)) {
                        hitBox = nb;
                        break;
                    }
                }
                
                if (hitBox) {
                    this.bringToFront(hitBox);

                    const part = hitBox.getPart(instanceId);

                    // Single-click to move caret if already editing this exact area
                    if (this.editingBox && this.editingBox === hitBox && this.editingPart === part && (part === 'header' || part === 'body')) {
                        const localPoint = hitBox.getLocalPoint(part, hit.point, this.textManager.textScale);
                        const area = part === 'header' ? hitBox.titleArea : hitBox.bodyArea;
                        const charIdx = area.getIndexAtPos(localPoint.x, localPoint.y);
                        this.textEditor.focus(area, charIdx);
                        return;
                    }

                    // If clicking something else, ensure we blur previous selection (unless resizing same box?)
                    // Actually, if we start dragging/resizing, we likely want to blur text
                    if (this.editingBox && (this.editingBox !== hitBox || this.editingPart !== part)) {
                        this.blur();
                    }

                    if (part === 'resize') {
                        this.resizingBox = hitBox;
                        this.controls.enabled = false;
                    } else if (part === 'header' || part === 'body') {
                        this.draggingBox = hitBox;
                        
                        const worldPos = new THREE.Vector3();
                        hitBox.getWorldPosition(worldPos);

                        // Recalculate the hit point on the world Z-plane to ensure dragging stability
                        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -worldPos.z);
                        const planePoint = new THREE.Vector3();
                        this.raycaster.ray.intersectPlane(plane, planePoint);
                        
                        this.dragOffset.copy(planePoint).sub(worldPos);
                        this.controls.enabled = false;
                    }
                } else {
                    this.blur();
                }
            } else {
                this.blur();
            }
        });

        window.addEventListener('mouseup', () => {
            this.resizingBox = null;
            this.draggingBox = null;
            this.controls.enabled = true;
        });

        this.renderer.domElement.addEventListener('dblclick', () => {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const mesh = this.boxManager.getMesh();
            const intersects = this.raycaster.intersectObject(mesh);
            
            if (intersects.length > 0) {
                const hit = intersects[0];
                const instanceId = hit.instanceId!;
                
                let hitBox: NoteBox | null = null;
                for (const nb of this.noteBoxMap.values()) {
                    if (nb.getPart(instanceId)) {
                        hitBox = nb;
                        break;
                    }
                }

                if (hitBox) {
                    const part = hitBox.getPart(instanceId);
                    if (part === 'header' || part === 'body') {
                        this.editingBox = hitBox;
                        this.editingPart = part;
                        
                        const localPoint = hitBox.getLocalPoint(part, hit.point, this.textManager.textScale);
                        const area = part === 'header' ? hitBox.titleArea : hitBox.bodyArea;
                        const charIdx = area.getIndexAtPos(localPoint.x, localPoint.y);
                        
                        this.textEditor.focus(area, charIdx);
                    }
                }
            } else {
                this.blur();
            }
        });
    }

    private bringToFront(box: NoteBox) {
        // Collect all managed boxes
        const boxes = Array.from(this.noteBoxMap.values());
        
        // Sort boxes by current world Z status (using world space to be safe with nesting)
        boxes.sort((a, b) => {
            const az = new THREE.Vector3();
            const bz = new THREE.Vector3();
            a.getWorldPosition(az);
            b.getWorldPosition(bz);
            return az.z - bz.z;
        });
        
        // Move the selected box to the end (top-most)
        const index = boxes.indexOf(box);
        if (index > -1) {
            boxes.splice(index, 1);
            boxes.push(box);
        }

        // Re-normalize Z values
        const startZ = 0.0;
        const step = 0.05;
        
        boxes.forEach((b, i) => {
            const targetWorldZ = startZ + (i * step);
            const currentWorldPos = new THREE.Vector3();
            b.getWorldPosition(currentWorldPos);

            if (Math.abs(currentWorldPos.z - targetWorldZ) > 0.001) {
                if (b.parent) {
                    // Calculate required local Z to reach target world Z
                    const targetWorldPos = new THREE.Vector3(currentWorldPos.x, currentWorldPos.y, targetWorldZ);
                    const localPos = targetWorldPos.clone();
                    b.parent.worldToLocal(localPos);
                    b.setPosition(b.position.x, b.position.y, localPos.z);
                } else {
                    b.setPosition(b.position.x, b.position.y, targetWorldZ);
                }
            }
        });
    }

    public clearState() {
        this.resizingBox = null;
        this.draggingBox = null;
        this.editingBox = null;
        this.editingPart = null;
        this.controls.enabled = true;
    }

    private blur() {
        this.textEditor.focus(null);
        this.editingBox = null;
        this.editingPart = null;
    }
}

