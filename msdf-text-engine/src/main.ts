import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TextManager } from './TextManager.ts'
import { NoteBox } from './NoteBox.ts'
import { BoxManager } from './BoxManager.ts'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a1a) // Dark grey

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 4, 15)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(4, -2, 0)

// Managers
const boxManager = new BoxManager(scene, 100);
const textManager = new TextManager(scene);

textManager.load('/font.json', '/font.png').then(() => {
    // We store references to simulate resize
    const note = new NoteBox(textManager, boxManager);
    note.setSize(10, 8, 1.2);
    note.setPosition(0, 0, 0);
    note.titleArea.text = "NOTELOG v1.0";
    note.bodyArea.text = "This is a NoteBox component.\n\n" +
                         "It features a dedicated Title Bar and a main body area with automatic word wrapping. " +
                         "The geometry is handled by standard Three.js planes, while the text is batched into " +
                         "the master InstancedMesh for maximum performance.\n\n" +
                         "Try resizing this box! The text will automatically reflow and hide if it overflows.";

    const note2 = new NoteBox(textManager, boxManager);
    note2.setSize(8, 6, 1.2);
    note2.setPosition(12, 1, -2);
    note2.titleArea.text = "BATCHING TEST";
    note2.bodyArea.text = "This second box is drawn in the same draw calls as the first one.\n" +
                          "1 Draw call for all boxes.\n" +
                          "1 Draw call for all text.";

    // Simulation Loop for Resize
    let time = 0;
    function updateLayouts() {
        time += 0.05;
        // Oscillate width and height
        const newW = 10 + Math.sin(time) * 3;
        const newH = 8 + Math.cos(time * 0.7) * 2;
        
        note.setSize(newW, newH, 1.2);
        
        // Re-calculate layouts
        const layouts = [
            ...note.getLayout(textManager.textScale),
            ...note2.getLayout(textManager.textScale)
        ];
        textManager.renderGlyphs(layouts);
        
        requestAnimationFrame(updateLayouts);
    }
    updateLayouts();

}).catch(err => {
    console.error('Failed to load font:', err)
})

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})

// Stats UI
const statsContainer = document.createElement('div');
statsContainer.style.position = 'absolute';
statsContainer.style.top = '10px';
statsContainer.style.left = '10px';
statsContainer.style.color = 'white';
statsContainer.style.backgroundColor = 'rgba(0,0,0,0.5)';
statsContainer.style.padding = '8px';
statsContainer.style.fontFamily = 'monospace';
statsContainer.style.pointerEvents = 'none';
document.body.appendChild(statsContainer);

// Animation Loop
function animate() {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)

    // Update stats
    const profile = textManager.getProfile();
    statsContainer.innerText = 
        `Draw Calls: ${renderer.info.render.calls}\n` +
        `Triangles: ${renderer.info.render.triangles}\n` +
        `Visible Chars: ${profile.visibleCharacters}\n` + 
        `Update Time: ${profile.lastUpdateDuration.toFixed(2)}ms`;
}

animate()
