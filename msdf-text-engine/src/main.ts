import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TextManager } from './TextManager.ts'
import { TextEffects } from './TextEffects.ts'
import { NoteBox } from './NoteBox.ts'
import { BoxManager, GradientMode } from './BoxManager.ts'
import { TextArea } from './TextArea.ts'

/**
 * MSDF TEXT ENGINE - MINIMALIST TURBO PLAYGROUND
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

// State
let currentExhibit = 'showcase';
const clock = new THREE.Clock();
const noteBoxes: NoteBox[] = [];
const stressAreas: TextArea[] = [];

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
};

const initExhibit = (id: string) => {
    clearScene();
    
    if (id === 'showcase') {
        // Hero: Minimalist Gray / Slate Theme
        const hero = new NoteBox(textManager, boxManager);
        hero.setPosition(-7, 5, 0);
        hero.setSize(14, 2.5, 1.0);
        hero.titleArea.text = "MINIMALIST VIEW";
        hero.bodyArea.text = "Demonstrating the classic slate and gray corporate look.";
        hero.setStyle({
            headerColor1: 0x444444, headerColor2: 0x333333, headerAlpha: 1.0,
            bodyColor1: 0x222222, bodyAlpha: 0.95
        });
        noteBoxes.push(hero);

        const secondary = new NoteBox(textManager, boxManager);
        secondary.setPosition(-10, 0, 0);
        secondary.setSize(9, 6.5, 1.2);
        secondary.titleArea.text = "STABLE GRADIENTS";
        secondary.bodyArea.text = "The background boxes now support vertical gradients and per-instance alpha blending.";
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
        hacker.bodyArea.text = "Testing independent background alpha...\n\n" +
                               "NODE: 0xDE77\n" +
                               "SYNC: ACTIVE\n" +
                               "ENCRYPTION: HIGH";
        hacker.setStyle({
            headerColor1: 0x00ff00, headerColor2: 0x008800,
            bodyColor1: 0x000500, bodyColor2: 0x001000, bodyAlpha: 0.7
        });
        noteBoxes.push(hacker);

    } else if (id === 'professional') {
        const corp1 = new NoteBox(textManager, boxManager);
        corp1.setPosition(-12, 5, 0);
        corp1.setSize(10, 6, 1.0);
        corp1.titleArea.text = "CORPORATE DASHBOARD";
        corp1.bodyArea.text = "A clean, minimalist style using subtle horizontal gradients.\n\n" +
                             "Header: Horizontal Blue\n" +
                             "Body: Solid Off-Black (95% Opacity)\n\n" +
                             "This looks professional and readable for enterprise tools.";
        corp1.setStyle({
            headerColor1: 0x1e293b, headerColor2: 0x334155, headerGradientMode: GradientMode.HORIZONTAL,
            bodyColor1: 0x0f172a, bodyAlpha: 0.95
        });
        noteBoxes.push(corp1);

        const radBox = new NoteBox(textManager, boxManager);
        radBox.setPosition(0, 5, 0);
        radBox.setSize(10, 6, 1.0);
        radBox.titleArea.text = "RADIAL DESIGN";
        radBox.bodyArea.text = "Showcasing the Radial Gradient mode.\n\n" +
                               "The body uses a radial fade from center to edges.";
        radBox.setStyle({
            headerColor1: 0x0f172a, headerColor2: 0x0f172a,
            bodyColor1: 0x1e293b, bodyColor2: 0x020617, bodyGradientMode: GradientMode.RADIAL,
            bodyAlpha: 1.0
        });
        noteBoxes.push(radBox);

        const palette = new NoteBox(textManager, boxManager);
        palette.setPosition(-12, -2, 0);
        palette.setSize(10, 5, 1.0);
        palette.titleArea.text = "COLOR SAMPLES";
        palette.bodyArea.text = "Base Colors Supported:\n" +
                               "• Slate: #1e293b\n" +
                               "• Zinc: #18181b\n" +
                               "• Neutral: #171717\n" +
                               "• Custom: Any Hex value";
        palette.setStyle({
             headerColor1: 0x00d4ff, headerColor2: 0x00d4ff,
             bodyColor1: 0x18181b, bodyAlpha: 1.0
        });
        noteBoxes.push(palette);

        // SIMPLE LAYOUT: No gradients, no flashy stuff
        const simple = new NoteBox(textManager, boxManager);
        simple.setPosition(0, -2, 0);
        simple.setSize(10, 5, 1.0);
        simple.titleArea.text = "SIMPLE LAYOUT";
        simple.bodyArea.text = "A clean, basic NoteBox without gradients or transparency.\n\n" +
                              "Header: Solid Light Gray\n" +
                              "Body: Solid Dark Gray\n" +
                              "Text: Solid White";
        simple.setStyle({
            headerColor1: 0x666666, headerColor2: 0x666666, headerGradientMode: GradientMode.NONE,
            bodyColor1: 0x222222, bodyColor2: 0x222222, bodyGradientMode: GradientMode.NONE,
            bodyAlpha: 1.0
        });
        noteBoxes.push(simple);
    } else if (id === 'notebox') {
        for (let i = 0; i < 3; i++) {
            const nb = new NoteBox(textManager, boxManager);
            nb.setPosition(-12 + i * 9, 2 - i * 2, i * -1);
            nb.setSize(8, 6, 1.2);
            nb.titleArea.text = `BOX MODULE 0${i+1}`;
            nb.bodyArea.text = `Standard NoteBox component.\n\n` +
                               `• Auto-clipping\n• Word wrap\n• Header alignment\n• Depth testing`;
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

const originalHackerText = "Decrypting secret data... \n\n0x7F4A2B9C1D\nSTATUS: UNKNOWN\nACCESS: DENIED";

const setupUI = () => {
    document.getElementById('btn-2d')?.addEventListener('click', () => set3D(false));
    document.getElementById('btn-3d')?.addEventListener('click', () => set3D(true));
    document.getElementById('ex-showcase')?.addEventListener('click', () => setExhibit('showcase'));
    document.getElementById('ex-professional')?.addEventListener('click', () => setExhibit('professional'));
    document.getElementById('ex-notebox')?.addEventListener('click', () => setExhibit('notebox'));
    document.getElementById('ex-stress')?.addEventListener('click', () => setExhibit('stress'));

    // BG Themes
    document.getElementById('bg-dark')?.addEventListener('click', () => setBG(0x0a0a0a, 'bg-dark'));
    document.getElementById('bg-steel')?.addEventListener('click', () => setBG(0x1e293b, 'bg-steel'));
    document.getElementById('bg-light')?.addEventListener('click', () => setBG(0xf1f5f9, 'bg-light'));
};

textManager.load('/font.json', '/font.png').then(() => {
    setupUI();
    setExhibit('showcase');

    function animate() {
        requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        controls.update();

        let allLayouts: any[] = [];

        if (currentExhibit === 'showcase' && noteBoxes.length >= 3) {
            const hero = noteBoxes[0];
            const secondary = noteBoxes[1];
            const hacker = noteBoxes[2];
            
            textEffects.update(deltaTime);
            textEffects.updateRainbow(hero.titleArea, 0, hero.titleArea.text.length, 1.0);
            
            // Light background check: If BG is light, use dark titles. If dark, use white/colored.
            const isLightBg = scene.background instanceof THREE.Color && scene.background.r > 0.5;
            const titleColor = isLightBg ? new THREE.Color(0x000000) : new THREE.Color(1, 1, 1);
            
            textEffects.applyColor(secondary.titleArea, 0, secondary.titleArea.text.length, titleColor);
            textEffects.applyColor(hacker.titleArea, 0, hacker.titleArea.text.length, titleColor);

            hacker.bodyArea.text = originalHackerText;
            textEffects.applyScramble(hacker.bodyArea, 0, hacker.bodyArea.text.length, 0.1);
            textEffects.applyColor(hacker.bodyArea, 0, hacker.bodyArea.text.length, new THREE.Color(0x00d4ff));

            secondary.setSize(9 + Math.sin(elapsedTime) * 1, 6.5, 1.2);
            allLayouts = noteBoxes.flatMap(nb => nb.getLayout(textManager.textScale));
        } else if (currentExhibit === 'professional') {
             const isLightBg = scene.background instanceof THREE.Color && scene.background.r > 0.5;
             for (const nb of noteBoxes) {
                 const color = isLightBg ? new THREE.Color(0,0,0) : new THREE.Color(1,1,1);
                 textEffects.applyColor(nb.titleArea, 0, nb.titleArea.text.length, color);
             }
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
                    allLayouts.push({
                        char: glyph.char,
                        x: glyph.x + pos.x / textManager.textScale,
                        y: glyph.y + pos.y / textManager.textScale,
                        z: pos.z,
                        color: glyph.color
                    });
                }
            }
        }

        textManager.renderGlyphs(allLayouts);
        renderer.render(scene, camera);

        const profile = textManager.getProfile();
        const statsEl = document.getElementById('stats');
        if (statsEl) {
            statsEl.innerText = 
                `FPS: ${Math.round(1/deltaTime)}\n` +
                `INSTANCES: ${profile.visibleCharacters}\n` +
                `BUFFER: ${profile.bufferCapacity}\n` +
                `CPU: ${profile.lastUpdateDuration.toFixed(2)}ms\n` +
                `GL CALLS: ${renderer.info.render.calls}`;
        }
    }
    animate();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
