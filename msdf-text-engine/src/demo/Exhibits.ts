import * as THREE from 'three';
import { NoteBox } from '../library/noteBoxes/NoteBox';
import { BoxManager, GradientMode } from '../library/noteBoxes/BoxManager';
import { TextManager } from '../library/base/TextManager';
import { TextArea } from '../library/noteBoxes/TextArea';
import { TextEditor } from '../library/textEdit/TextEditor';


export class ExhibitManager {
    public currentExhibit = 'professional';
    public noteBoxMap = new Map<string, NoteBox>();
    public stressAreas: TextArea[] = [];

    private textManager: TextManager;
    private boxManager: BoxManager;
    private textEditor: TextEditor;

    constructor(
        textManager: TextManager,
        boxManager: BoxManager,
        textEditor: TextEditor
    ) {
        this.textManager = textManager;
        this.boxManager = boxManager;
        this.textEditor = textEditor;
    }

    clearScene(interaction?: any) {
        this.boxManager.clear();
        this.textManager.clear();
        this.noteBoxMap.clear();
        this.stressAreas.length = 0;
        this.textEditor.focus(null);
        if (interaction) interaction.clearState();
    }

    setExhibit(id: string, interaction?: any) {
        this.currentExhibit = id;
        const buttons = ['showcase', 'professional', 'notebox', 'stress', 'simple-stress'];
        buttons.forEach(name => {
            document.getElementById(`ex-${name}`)?.classList.toggle('active', name === id);
        });
        this.initExhibit(id, interaction);
    }

    private initExhibit(id: string, interaction?: any) {
        this.clearScene(interaction);
        
        if (id === 'professional') {
            const corp1 = new NoteBox(this.textManager, this.boxManager, "corp1");
            corp1.setPosition(-12, 5, 0);
            corp1.setSize(10, 5, 1.0);
            corp1.titleArea.text = "BOX 01";
            corp1.bodyArea.text = "Standard Slate Theme\n\nHeader: #334155\nBody: #0f172a\n\nAuto-expanding box!\nType as much as you want.";
            corp1.setStyle({
                headerColor1: 0x334155, headerColor2: 0x334155, headerGradientMode: GradientMode.NONE,
                bodyColor1: 0x0f172a, bodyAlpha: 1.0, bodyGradientMode: GradientMode.NONE,
            });
            this.noteBoxMap.set(corp1.id, corp1);

            const simple = new NoteBox(this.textManager, this.boxManager, "simple");
            simple.setPosition(2, 5, 0);
            simple.setSize(10, 5, 1.0);
            simple.titleArea.text = "SIMPLE LAYOUT";
            simple.bodyArea.text = "The classic Minimalist theme.\n\nHeader: Solid #666666\nBody: Solid #222222\n\nZero gradients, maximum focus.";
            simple.setStyle({
                headerColor1: 0x666666, headerColor2: 0x666666, headerGradientMode: GradientMode.NONE,
                bodyColor1: 0x222222, bodyColor2: 0x222222, bodyGradientMode: GradientMode.NONE,
                bodyAlpha: 1.0
            });
            this.noteBoxMap.set(simple.id, simple);

            const palette = new NoteBox(this.textManager, this.boxManager, "palette");
            palette.setPosition(15, 5, 0);
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
            this.noteBoxMap.set(palette.id, palette);
        } else if (id === 'showcase') {
            const hero = new NoteBox(this.textManager, this.boxManager, "hero");
            hero.setPosition(-7, 6, 0);
            hero.setSize(14, 2.5, 1.0);
            hero.titleArea.text = "TYPE FREELY";
            hero.bodyArea.text = "Double click here. You can now use backspace, arrows, and enter just like a real text editor.";
            hero.setStyle({
                headerColor1: 0x444444, headerColor2: 0x333333,
                bodyColor1: 0x222222, bodyAlpha: 0.95
            });
            this.noteBoxMap.set(hero.id, hero);

            const secondary = new NoteBox(this.textManager, this.boxManager, "secondary");
            secondary.setPosition(-10, -3, 0);
            secondary.setSize(9, 6.5, 1.2);
            secondary.titleArea.text = "STABLE GRADIENTS";
            secondary.bodyArea.text = "Try resizing this box. Notice how the internal layout re-wraps automatically and effects stay anchored.";
            secondary.setStyle({
                headerColor1: 0x2c3e50, headerColor2: 0x2c3e50,
                bodyColor1: 0x1a2a32, bodyColor2: 0x0a1012, bodyGradientMode: GradientMode.VERTICAL,
                bodyAlpha: 0.95
            });
            this.noteBoxMap.set(secondary.id, secondary);

            const hacker = new NoteBox(this.textManager, this.boxManager, "hacker");
            hacker.setPosition(1, -3, 0);
            hacker.setSize(9, 6.5, 1.2);
            hacker.titleArea.text = "TERMINAL GLITCH";
            hacker.bodyArea.text = "Status: Interactive\nType into the terminal...\n\nEverything is batched on the GPU.";
            hacker.setStyle({
                headerColor1: 0x00ff00, headerColor2: 0x008800,
                bodyColor1: 0x000500, bodyColor2: 0x001000, bodyAlpha: 0.7
            });
            this.noteBoxMap.set(hacker.id, hacker);

            const kinetic = new NoteBox(this.textManager, this.boxManager, "kinetic");
            kinetic.setPosition(12, 0, 0);
            kinetic.setSize(9, 6.5, 1.2);
            kinetic.titleArea.text = "KINETIC TYPOGRAPHY";
            kinetic.bodyArea.text = "SPINNING LETTERS\n\nFLOATING WORDS\n\nDynamic spatial transforms per character.";
            kinetic.setStyle({
                headerColor1: 0xff0088, headerColor2: 0xff00ff,
                bodyColor1: 0x220022, bodyAlpha: 0.9
            });
            this.noteBoxMap.set(kinetic.id, kinetic);

        } else if (id === 'notebox') {
            for (let i = 0; i < 3; i++) {
                const nb = new NoteBox(this.textManager, this.boxManager, `box-${i+1}`);
                nb.setPosition(-12 + i * 9, 2 - i * 2, i * -1);
                nb.setSize(8, 6, 1.2);
                nb.titleArea.text = `BOX ${i+1}`;
                nb.bodyArea.text = `Real-time text editing enabled.\n\nDouble click to focus.`;
                this.noteBoxMap.set(nb.id, nb);
            }
        } else if (id === 'stress') {
            const grid = 80; // 80x80 = 6,400 areas
            const spacing = 18;
            for (let i = 0; i < grid; i++) {
                for (let j = 0; j < grid; j++) {
                    const area = new TextArea(this.textManager.fontData!);
                    area.width = 1000;
                    area.height = 3000; // Prevent clipping characters
                    // ~230 characters per area * 6400 areas = ~1.4M characters
                    area.text = "The quick brown fox jumps over the lazy dog. MSDF Text Engine is ultra fast. ".repeat(3);
                    area.wordWrap = true;
                    const pos = new THREE.Vector3((i - grid/2) * spacing, (j - grid/2) * spacing, (Math.random() - 0.5) * 60);
                    (area as any).worldPos = pos;
                    (area as any).cachedLayout = area.computeLayout();
                    this.stressAreas.push(area);
                }
            }
        } else if (id === 'simple-stress') {
            const grid = 16; // 16x16 = 256 areas
            const spacing = 20;
            for (let i = 0; i < grid; i++) {
                for (let j = 0; j < grid; j++) {
                    const area = new TextArea(this.textManager.fontData!);
                    area.width = 1000;
                    area.height = 5000; // Increased to prevent truncation
                    // ~200 characters * 256 = ~50k instances
                    area.text = "Simple performance test. MSDF is great! ".repeat(5);
                    area.wordWrap = true;
                    const pos = new THREE.Vector3((i - grid/2) * spacing, (j - grid/2) * spacing, 0);
                    (area as any).worldPos = pos;
                    (area as any).cachedLayout = area.computeLayout();
                    this.stressAreas.push(area);
                }
            }
        }
    }
}
