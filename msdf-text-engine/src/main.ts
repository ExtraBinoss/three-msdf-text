import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TextManager } from './TextManager.ts'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a1a) // Dark grey

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 0, 10)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Text Manager
const textManager = new TextManager(scene, 2000)
textManager.load('/font.json', '/font.png').then(() => {
    console.log('Font loaded. Setting text.')
    textManager.setText(
        "Hello MSDF Text Engine!\n" +
        "Rendering with Three.js InstancedMesh.\n" +
        "Zoom in to see crisp edges."
    )
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
