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
                const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -this.resizingBox.position.z);
                const planeIntersect = new THREE.Vector3();
                this.raycaster.ray.intersectPlane(plane, planeIntersect);
                
                const newW = Math.max(2, planeIntersect.x - this.resizingBox.position.x);
                const newH = Math.max(2, -(planeIntersect.y - this.resizingBox.position.y));
                this.resizingBox.setSize(newW, newH);
            } else if (this.draggingBox) {
                this.raycaster.setFromCamera(this.mouse, this.camera);
                const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -this.draggingBox.position.z);
                const planeIntersect = new THREE.Vector3();
                this.raycaster.ray.intersectPlane(plane, planeIntersect);
                
                const newPos = planeIntersect.sub(this.dragOffset);
                // Lock Z to the specific box Z to ensure 2D movement
                this.draggingBox.setPosition(newPos.x, newPos.y, this.draggingBox.position.z);
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
                        
                        // Recalculate the hit point on the NEW Z-plane to ensure 2D dragging stability
                        // Using 'hit.point' would use the OLD Z-plane intersection, causing the box to snap back in Z 
                        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -hitBox.position.z);
                        const planePoint = new THREE.Vector3();
                        this.raycaster.ray.intersectPlane(plane, planePoint);
                        
                        this.dragOffset.copy(planePoint).sub(hitBox.position);
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
        
        // Sort boxes by current Z value to preserve relative ordering of unselected boxes
        boxes.sort((a, b) => a.position.z - b.position.z);
        
        // Move the selected box to the end (top-most)
        const index = boxes.indexOf(box);
        if (index > -1) {
            boxes.splice(index, 1);
            boxes.push(box);
        }

        // Re-normalize Z values to keep them within a reasonable range (e.g. 0.0 to N * 0.05)
        // This prevents Z values from growing infinitely with every click
        const startZ = 0.0;
        const step = 0.05;
        
        boxes.forEach((b, i) => {
            const newZ = startZ + (i * step);
            // Only update if the Z changed significantly to avoid dirtying the geometry unnecessarily
            if (Math.abs(b.position.z - newZ) > 0.001) {
                b.setPosition(b.position.x, b.position.y, newZ);
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

