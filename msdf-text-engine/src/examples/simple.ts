import * as THREE from 'three';
import { TextManager } from '../library/base/TextManager';

/**
 * Minimal example showing how to render text using the MSDF Text Engine.
 */
export async function createSimpleExample() {
    // 1. Standard Three.js Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 2. Initialize TextManager
    // It automatically adds an InstancedMesh to the scene
    const textManager = new TextManager(scene);

    // 3. Load Font Assets
    // You can find these in the /public folder of this repo
    await textManager.load('font.json', 'font.png');

    // 4. Set Text
    // This updates the internal InstancedMesh
    textManager.setText("Hello MSDF Text Engine\nMulti-line is supported!");

    // 5. Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Optional: Rotate the text to show it's 3D
        // The textManager.mesh is the actual Three.js object
        (textManager as any).mesh.rotation.y += 0.01;

        renderer.render(scene, camera);
    }

    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
