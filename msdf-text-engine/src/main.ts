import './style.css'
import * as THREE from 'three'
import { TextManager } from './library/base/TextManager'
import { TextEffects } from './library/effects/TextEffects'
import { BoxManager } from './library/noteBoxes/BoxManager'
import { TextEditor } from './library/textEdit/TextEditor'

// Demo Subsystems
import { scene, camera, renderer, controls } from './demo/SceneSetup'
import { ExhibitManager } from './demo/Exhibits'
import { InteractionHandler } from './demo/InteractionHandler'

/**
 * MSDF TEXT ENGINE - INTERACTIVE PLAYGROUND
 * This file orchestrates the library components and the demo-specific logic.
 */

// 1. Initialize Global Managers
const boxManager = new BoxManager(scene, 2000);
const textManager = new TextManager(scene);
const textEffects = new TextEffects();
const textEditor = new TextEditor(scene);

// 2. Initialize Demo Managers
const exhibitManager = new ExhibitManager(textManager, boxManager, textEditor);
const interaction = new InteractionHandler(camera, renderer, boxManager, textManager, textEditor, controls, exhibitManager.noteBoxMap);

const clock = new THREE.Clock();
let lastExhibit = '';
let needsUpdate = true;

// --- UI Binding ---
const setupUI = () => {
    // 3D Toggle
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

    // Background Controls
    const setBG = (color: number, id: string) => {
        scene.background = new THREE.Color(color);
        ['bg-dark', 'bg-steel', 'bg-light'].forEach(bid => {
            document.getElementById(bid)?.classList.toggle('active', bid === id);
        });
    };

    document.getElementById('btn-2d')?.addEventListener('click', () => set3D(false));
    document.getElementById('btn-3d')?.addEventListener('click', () => set3D(true));
    document.getElementById('ex-showcase')?.addEventListener('click', () => exhibitManager.setExhibit('showcase'));
    document.getElementById('ex-professional')?.addEventListener('click', () => exhibitManager.setExhibit('professional'));
    document.getElementById('ex-notebox')?.addEventListener('click', () => exhibitManager.setExhibit('notebox'));
    document.getElementById('ex-stress')?.addEventListener('click', () => exhibitManager.setExhibit('stress'));

    document.getElementById('bg-dark')?.addEventListener('click', () => setBG(0x0a0a0a, 'bg-dark'));
    document.getElementById('bg-steel')?.addEventListener('click', () => setBG(0x1e293b, 'bg-steel'));
    document.getElementById('bg-light')?.addEventListener('click', () => setBG(0xf1f5f9, 'bg-light'));
};

// --- Main Engine Load ---
textManager.load('font.json', 'font.png').then(() => {
    setupUI();
    exhibitManager.setExhibit('professional');

    function animate() {
        requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();
        controls.update();

        const isLightBg = scene.background instanceof THREE.Color && scene.background.r > 0.5;
        const defaultTitleColor = isLightBg ? new THREE.Color(0,0,0) : new THREE.Color(1,1,1);
        
        // 1. Detect if something changed
        const exhibitChanged = exhibitManager.currentExhibit !== lastExhibit;
        const interactionActive = interaction.draggingBox || interaction.resizingBox || interaction.editingBox;
        
        if (exhibitChanged || interactionActive || needsUpdate) {
            let allLayouts: any[] = [];

            // --- Demo Logic Execution ---
            if (exhibitManager.currentExhibit === 'stress') {
                const scale = textManager.textScale;
                for (const area of exhibitManager.stressAreas) {
                    const pos = (area as any).worldPos;
                    const cachedLayout = (area as any).cachedLayout;
                    
                    // Optimized color & layout extraction for 1M characters
                    for (let k = 0; k < cachedLayout.length; k++) {
                        const glyph = cachedLayout[k];
                        allLayouts.push({ 
                            char: glyph.char, 
                            x: glyph.x + pos.x / scale, 
                            y: glyph.y + pos.y / scale, 
                            z: pos.z, 
                            color: glyph.color 
                        });
                    }
                }
            } else {
                // Standard NoteBox Layouts
                textEffects.update(deltaTime);
                for (const nb of exhibitManager.noteBoxMap.values()) {
                    // Apply Effects
                    if (exhibitManager.currentExhibit === 'showcase' && nb.id === 'hero') {
                        textEffects.updateRainbow(nb.titleArea, 0, nb.titleArea.text.length, 1.0);
                    } else {
                        const titleColor = exhibitManager.currentExhibit === 'notebox' ? new THREE.Color(0,0,0) : defaultTitleColor;
                        textEffects.applyColor(nb.titleArea, 0, nb.titleArea.text.length, titleColor);
                    }
                    
                    // Collect Layouts
                    allLayouts.push(...nb.getLayout(textManager.textScale));
                }
            }

            // --- GPU Rendering ---
            textManager.renderGlyphs(allLayouts);
            lastExhibit = exhibitManager.currentExhibit;
            needsUpdate = exhibitManager.currentExhibit === 'showcase'; // Keep updating if rainbow effect is active
        }

        // --- Interactive Caret (Always updates if focused) ---
        if (interaction.editingBox && interaction.editingPart) {
            textEditor.update(deltaTime);
            textEditor.setColor(isLightBg ? 0x000000 : 0x00d4ff);

            const caretWorld = interaction.editingBox.getCaretWorldPosition(interaction.editingPart, textManager.textScale);
            textEditor.setCaretPosition(
                caretWorld.x, 
                caretWorld.y, 
                caretWorld.z, 
                textManager.textScale * textManager.fontData!.common.lineHeight
            );
        }

        renderer.render(scene, camera);

        // --- Stats ---
        const profile = textManager.getProfile();
        const statsEl = document.getElementById('stats');
        const gpuStatsEl = document.getElementById('gpu-stats');

        if (statsEl) {
            statsEl.innerText = `FPS: ${Math.round(1/deltaTime)}\nINSTANCES: ${profile.visibleCharacters}\nBUFFER: ${profile.bufferCapacity}\nCPU: ${profile.lastUpdateDuration.toFixed(2)}ms`;
        }

        if (gpuStatsEl) {
            gpuStatsEl.innerText = `DRAW CALLS: ${renderer.info.render.calls}\nTRIANGLES: ${renderer.info.render.triangles.toLocaleString()}\nTEXTURES: ${renderer.info.memory.textures}`;
        }
    }
    
    animate();
});
