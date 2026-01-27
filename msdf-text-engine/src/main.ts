import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TextManager } from './TextManager.ts'
import { TextEffects } from './TextEffects.ts'
import { NoteBox } from './NoteBox.ts'
import { BoxManager, GradientMode } from './BoxManager.ts'
import { TextArea } from './TextArea.ts'
import { TextEditor } from './TextEditor.ts'

/**
 * MSDF TEXT ENGINE - INTERACTIVE PLAYGROUND
 */

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a0a)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000)
camera.position.set(0, 0, 15)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enableRotate = false;
controls.mouseButtons = {
    LEFT: null, 
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
}

// Global Managers
const boxManager = new BoxManager(scene, 2000);
const textManager = new TextManager(scene);
const textEffects = new TextEffects();
const textEditor = new TextEditor(scene);

// State
let currentExhibit = 'professional';
const clock = new THREE.Clock();
const noteBoxes: NoteBox[] = [];
const stressAreas: TextArea[] = [];

// Selection & Interaction State
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let resizingBox: NoteBox | null = null;
let editingBox: NoteBox | null = null;
let editingPart: 'header' | 'body' | null = null;

const animals = ["Lion", "Tiger", "Elephant", "Giraffe", "Zebra", "Leopard", "Cheetah", "Rhino", "Hippo", "Gorilla", "Panda", "Wolf", "Bear", "Eagle", "Hawk", "Penguin", "Dolphin", "Whale", "Shark", "Octopus", "Butterfly", "Stallion", "Falcon", "Panther", "Jaguar", "Lynx", "Cobra", "Viper", "Dragon"];

const set3D = (enabled: boolean) => {
    controls.enableRotate = enabled;
    controls.mouseButtons = {
        LEFT: enabled ? THREE.MOUSE.ROTATE : null,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
    };
    document.getElementById('btn-2d')?.classList.toggle('active', !enabled);
    document.getElementById('btn-3d')?.classList.toggle('active', enabled);
    if (!enabled) {
        camera.position.set(0, 0, 15);
        controls.target.set(0, 0, 0);
    }
};

const setBG = (color: number, id: string) => {
    scene.background = new THREE.Color(color);
    ['bg-dark', 'bg-steel', 'bg-light'].forEach(bid => {
        document.getElementById(bid)?.classList.toggle('active', bid === id);
    });
};

const setExhibit = (id: string) => {
    currentExhibit = id;
    ['ex-showcase', 'ex-professional', 'ex-notebox', 'ex-stress'].forEach(eid => {
        document.getElementById(eid)?.classList.toggle('active', eid === `ex-${id}`);
    });
    initExhibit(id);
};

const clearScene = () => {
    boxManager.clear();
    noteBoxes.length = 0;
    stressAreas.length = 0;
    textEditor.focus(null);
};

const initExhibit = (id: string) => {
    clearScene();
    
    if (id === 'professional') {
        const corp1 = new NoteBox(textManager, boxManager);
        corp1.setPosition(-12, 5, 0);
        corp1.setSize(10, 5, 1.0);
        corp1.titleArea.text = "BOX 01";
        corp1.bodyArea.text = "Standard Slate Theme\n\nHeader: #334155\nBody: #0f172a\n\nAuto-expanding box!\nType as much as you want.";
        corp1.setStyle({
            headerColor1: 0x334155, headerColor2: 0x334155, headerGradientMode: GradientMode.NONE,
            bodyColor1: 0x0f172a, bodyAlpha: 1.0, bodyGradientMode: GradientMode.NONE,
        });
        noteBoxes.push(corp1);

        const simple = new NoteBox(textManager, boxManager);
        simple.setPosition(2, 5, 0);
        simple.setSize(10, 5, 1.0);
        simple.titleArea.text = "SIMPLE LAYOUT";
        simple.bodyArea.text = "The classic Minimalist theme.\n\nHeader: Solid #666666\nBody: Solid #222222\n\nZero gradients, maximum focus.";
        simple.setStyle({
            headerColor1: 0x666666, headerColor2: 0x666666, headerGradientMode: GradientMode.NONE,
            bodyColor1: 0x222222, bodyColor2: 0x222222, bodyGradientMode: GradientMode.NONE,
            bodyAlpha: 1.0
        });
        noteBoxes.push(simple);

        const palette = new NoteBox(textManager, boxManager);
        palette.setPosition(-12, -2, 0);
        palette.setSize(10, 5, 1.0);
        palette.titleArea.text = "COLOR SAMPLES";
        palette.bodyArea.text = "Enterprise Palette:\n" +
                               "• Slate: #1e293b\n" +
                               "• Zinc: #18181b\n" +
                               "• Neutral: #171717\n" +
                               "• Custom: Any Hex value";
        palette.setStyle({
             headerColor1: 0x00d4ff, headerColor2: 0x00d4ff,
             bodyColor1: 0x18181b, bodyAlpha: 1.0
        });
        noteBoxes.push(palette);
    } else if (id === 'showcase') {
        const hero = new NoteBox(textManager, boxManager);
        hero.setPosition(-7, 5, 0);
        hero.setSize(14, 2.5, 1.0);
        hero.titleArea.text = "TYPE FREELY";
        hero.bodyArea.text = "Double click here. You can now use backspace, arrows, and enter just like a real text editor.";
        hero.setStyle({
            headerColor1: 0x444444, headerColor2: 0x333333,
            bodyColor1: 0x222222, bodyAlpha: 0.95
        });
        noteBoxes.push(hero);

        const secondary = new NoteBox(textManager, boxManager);
        secondary.setPosition(-10, 0, 0);
        secondary.setSize(9, 6.5, 1.2);
        secondary.titleArea.text = "STABLE GRADIENTS";
        secondary.bodyArea.text = "Try resizing this box. Notice how the internal layout re-wraps automatically and effects stay anchored.";
        secondary.setStyle({
            headerColor1: 0x2c3e50, headerColor2: 0x2c3e50,
            bodyColor1: 0x1a2a32, bodyColor2: 0x0a1012, bodyGradientMode: GradientMode.VERTICAL,
            bodyAlpha: 0.95
        });
        noteBoxes.push(secondary);

        const hacker = new NoteBox(textManager, boxManager);
        hacker.setPosition(1, 0, 0);
        hacker.setSize(9, 6.5, 1.2);
        hacker.titleArea.text = "TERMINAL GLITCH";
        hacker.bodyArea.text = "Status: Interactive\nType into the terminal...\n\nEverything is batched on the GPU.";
        hacker.setStyle({
            headerColor1: 0x00ff00, headerColor2: 0x008800,
            bodyColor1: 0x000500, bodyColor2: 0x001000, bodyAlpha: 0.7
        });
        noteBoxes.push(hacker);

    } else if (id === 'notebox') {
        for (let i = 0; i < 3; i++) {
            const nb = new NoteBox(textManager, boxManager);
            nb.setPosition(-12 + i * 9, 2 - i * 2, i * -1);
            nb.setSize(8, 6, 1.2);
            nb.titleArea.text = `BOX ${i+1}`;
            nb.bodyArea.text = `Real-time text editing enabled.\n\nDouble click to focus.`;
            noteBoxes.push(nb);
        }
    } else if (id === 'stress') {
        const grid = 16;
        const spacing = 15;
        for (let i = 0; i < grid; i++) {
            for (let j = 0; j < grid; j++) {
                const area = new TextArea(textManager.fontData!);
                area.width = 500;
                const count = 3 + Math.floor(Math.random() * 5);
                let sentence = "";
                for(let k=0; k<count; k++) sentence += animals[Math.floor(Math.random() * animals.length)] + " ";
                area.text = sentence.trim();
                area.wordWrap = true;
                (area as any).worldPos = new THREE.Vector3((i - grid/2) * spacing, (j - grid/2) * spacing, (Math.random() - 0.5) * 10);
                (area as any).cachedLayout = area.computeLayout();
                stressAreas.push(area);
            }
        }
    }
};

const setupUI = () => {
    document.getElementById('btn-2d')?.addEventListener('click', () => set3D(false));
    document.getElementById('btn-3d')?.addEventListener('click', () => set3D(true));
    document.getElementById('ex-showcase')?.addEventListener('click', () => setExhibit('showcase'));
    document.getElementById('ex-professional')?.addEventListener('click', () => setExhibit('professional'));
    document.getElementById('ex-notebox')?.addEventListener('click', () => setExhibit('notebox'));
    document.getElementById('ex-stress')?.addEventListener('click', () => setExhibit('stress'));

    document.getElementById('bg-dark')?.addEventListener('click', () => setBG(0x0a0a0a, 'bg-dark'));
    document.getElementById('bg-steel')?.addEventListener('click', () => setBG(0x1e293b, 'bg-steel'));
    document.getElementById('bg-light')?.addEventListener('click', () => setBG(0xf1f5f9, 'bg-light'));
};

const handleInteraction = () => {
    renderer.domElement.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        if (resizingBox) {
            raycaster.setFromCamera(mouse, camera);
            const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -resizingBox.position.z);
            const planeIntersect = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, planeIntersect);
            
            const newW = Math.max(2, planeIntersect.x - resizingBox.position.x);
            const newH = Math.max(2, -(planeIntersect.y - resizingBox.position.y));
            resizingBox.setSize(newW, newH);
        }
    });

    renderer.domElement.addEventListener('mousedown', () => {
        raycaster.setFromCamera(mouse, camera);
        const mesh = boxManager.getMesh();
        const intersects = raycaster.intersectObject(mesh);
        
        if (intersects.length > 0) {
            const instanceId = intersects[0].instanceId!;
            const box = noteBoxes.find(nb => nb.getPart(instanceId) !== null);
            
            // Handle Focus & Blur
            if (box) {
                const part = box.getPart(instanceId);
                if (part === 'resize') {
                    resizingBox = box;
                    controls.enabled = false;
                }
            } else {
                // Clicked something else (not a NoteBox)
                textEditor.focus(null);
                editingBox = null;
                editingPart = null;
            }
        } else {
            // Clicked background
            textEditor.focus(null);
            editingBox = null;
            editingPart = null;
        }
    });

    window.addEventListener('mouseup', () => {
        resizingBox = null;
        controls.enabled = true;
    });

    renderer.domElement.addEventListener('dblclick', () => {
        raycaster.setFromCamera(mouse, camera);
        const mesh = boxManager.getMesh();
        const intersects = raycaster.intersectObject(mesh);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            const instanceId = hit.instanceId!;
            const box = noteBoxes.find(nb => nb.getPart(instanceId) !== null);
            if (box) {
                const part = box.getPart(instanceId);
                if (part === 'header' || part === 'body') {
                    editingBox = box;
                    editingPart = part;
                    
                    // NEW: Calculate click index
                    const localPoint = box.getLocalPoint(part, hit.point, textManager.textScale);
                    const area = part === 'header' ? box.titleArea : box.bodyArea;
                    const charIdx = area.getIndexAtPos(localPoint.x, localPoint.y);
                    
                    textEditor.focus(area, charIdx);
                }
            }
        } else {
            textEditor.focus(null);
            editingBox = null;
            editingPart = null;
        }
    });
};

textManager.load('/font.json', '/font.png').then(() => {
    setupUI();
    handleInteraction();
    setExhibit('professional');

    function animate() {
        requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();
        controls.update();

        let allLayouts: any[] = [];
        const isLightBg = scene.background instanceof THREE.Color && scene.background.r > 0.5;
        const defaultTitleColor = isLightBg ? new THREE.Color(0,0,0) : new THREE.Color(1,1,1);

        if (currentExhibit === 'professional') {
             noteBoxes.forEach(nb => textEffects.applyColor(nb.titleArea, 0, nb.titleArea.text.length, defaultTitleColor));
             allLayouts = noteBoxes.flatMap(nb => nb.getLayout(textManager.textScale));
        } else if (currentExhibit === 'showcase' && noteBoxes.length >= 2) {
            textEffects.update(deltaTime);
            noteBoxes.forEach((nb, i) => {
                if (i === 0) textEffects.updateRainbow(nb.titleArea, 0, nb.titleArea.text.length, 1.0);
                else textEffects.applyColor(nb.titleArea, 0, nb.titleArea.text.length, defaultTitleColor);
            });
            allLayouts = noteBoxes.flatMap(nb => nb.getLayout(textManager.textScale));
        } else if (currentExhibit === 'notebox') {
            for (const nb of noteBoxes) {
                textEffects.applyColor(nb.titleArea, 0, nb.titleArea.text.length, new THREE.Color(0x000000));
            }
            allLayouts = noteBoxes.flatMap(nb => nb.getLayout(textManager.textScale));
        } else if (currentExhibit === 'stress') {
            textEffects.update(deltaTime);
            for (const area of stressAreas) {
                const pos = (area as any).worldPos;
                const cachedLayout = (area as any).cachedLayout;
                textEffects.updateRainbow(area, 0, area.text.length, 0.4);
                for (let k = 0; k < cachedLayout.length; k++) {
                    const glyph = cachedLayout[k];
                    const style = area.styles.find(s => k >= s.start && k < s.end);
                    if (style && style.color) glyph.color = style.color;
                    allLayouts.push({ char: glyph.char, x: glyph.x + pos.x / textManager.textScale, y: glyph.y + pos.y / textManager.textScale, z: pos.z, color: glyph.color });
                }
            }
        }

        textManager.renderGlyphs(allLayouts);

        // UPDATE CARET POSITION
        if (editingBox && editingPart) {
            textEditor.update(deltaTime);
            
            // Dynamic Caret Color based on background
            if (isLightBg) textEditor.setColor(0x000000);
            else textEditor.setColor(0x00d4ff);

            const caretWorld = editingBox.getCaretWorldPosition(editingPart, textManager.textScale);
            textEditor.setCaretPosition(caretWorld.x, caretWorld.y, caretWorld.z, textManager.textScale * textManager.fontData!.common.lineHeight);
        }

        renderer.render(scene, camera);

        const profile = textManager.getProfile();
        const statsEl = document.getElementById('stats');
        if (statsEl) {
            statsEl.innerText = `FPS: ${Math.round(1/deltaTime)}\nINSTANCES: ${profile.visibleCharacters}\nBUFFER: ${profile.bufferCapacity}\nCPU: ${profile.lastUpdateDuration.toFixed(2)}ms`;
        }
    }
    animate();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
