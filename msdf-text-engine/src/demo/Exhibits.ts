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
            corp1.setPosition(-12, 10, 0);
            corp1.setSize(10, 5);
            corp1.titleArea.text = "BOX 01";
            corp1.bodyArea.text = "Standard Slate Theme\n\nHeader: #334155\nBody: #0f172a\n\nAuto-expanding box!\nType as much as you want.";
            corp1.setStyle({
                headerColor1: 0x334155, headerColor2: 0x334155, headerGradientMode: GradientMode.NONE,
                bodyColor1: 0x0f172a, bodyAlpha: 1.0, bodyGradientMode: GradientMode.NONE,
            });
            this.noteBoxMap.set(corp1.name, corp1);

            const placeholderBox = new NoteBox(this.textManager, this.boxManager, "placeholder-demo");
            placeholderBox.setPosition(-12, -5, 0);
            placeholderBox.setSize(10, 4);
            placeholderBox.titleArea.text = ""; // Empty
            placeholderBox.titleArea.placeholder = "UNTITLED NOTE";
            placeholderBox.bodyArea.text = ""; // Empty
            placeholderBox.bodyArea.placeholder = "Click here to start typing...\nPlaceholders behave like real text but with lower opacity.";
            placeholderBox.setStyle({
                headerColor1: 0x1e293b,
                bodyColor1: 0x020617, bodyAlpha: 0.95
            });
            this.noteBoxMap.set(placeholderBox.name, placeholderBox);

            const simple = new NoteBox(this.textManager, this.boxManager, "simple");
            simple.setPosition(0, 5, 0);
            simple.setSize(10, 5);
            simple.titleArea.text = "SIMPLE LAYOUT";
            simple.bodyArea.text = "The classic Minimalist theme.\n\nHeader: Solid #666666\nBody: Solid #222222\n\nZero gradients, maximum focus.";
            simple.setStyle({
                headerColor1: 0x666666, headerColor2: 0x666666, headerGradientMode: GradientMode.NONE,
                bodyColor1: 0x222222, bodyColor2: 0x222222, bodyGradientMode: GradientMode.NONE,
                bodyAlpha: 1.0
            });
            this.noteBoxMap.set(simple.name, simple);

            const palette = new NoteBox(this.textManager, this.boxManager, "palette");
            palette.setPosition(12, 5, 0);
            palette.setSize(10, 5);
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
            this.noteBoxMap.set(palette.name, palette);

            // --- Fluent API Examples ---
            this.textManager.createTextArea("ROTATED TEXT")
                .setPos(-5, 15, 0)
                .setRot(Math.PI / 6) // 30 degrees
                .setColor(0xffaa00);

            this.textManager.createTextArea("SCALED & COLORED")
                .setPos(5, 15, 0)
                .setScale(1.5)
                .setColor(0x00d4ff);

            this.textManager.createTextArea("Fluent API makes\npositioning easy!")
                .setPos(0, -5, 0)
                .setColor(0xaaaaaa)
                .setRot(-0.1);
        } else if (id === 'showcase') {
            const hero = new NoteBox(this.textManager, this.boxManager, "hero");
            hero.setPosition(-7, 10, 0);
            hero.setSize(14, 2.5);
            hero.titleArea.text = "TYPE FREELY";
            hero.bodyArea.text = "Double click here. You can now use backspace, arrows, and enter just like a real text editor.";
            hero.setStyle({
                headerColor1: 0x444444, headerColor2: 0x333333,
                bodyColor1: 0x222222, bodyAlpha: 0.95
            });
            this.noteBoxMap.set(hero.name, hero);

            const secondary = new NoteBox(this.textManager, this.boxManager, "secondary");
            secondary.setPosition(-10, 2, 0);
            secondary.setSize(9, 6.5);
            secondary.titleArea.text = "STABLE GRADIENTS";
            secondary.bodyArea.text = "Try resizing this box. Notice how the internal layout re-wraps automatically and effects stay anchored.";
            secondary.setStyle({
                headerColor1: 0x2c3e50, headerColor2: 0x2c3e50,
                bodyColor1: 0x1a2a32, bodyColor2: 0x0a1012, bodyGradientMode: GradientMode.VERTICAL,
                bodyAlpha: 0.95
            });
            this.noteBoxMap.set(secondary.name, secondary);

            const hacker = new NoteBox(this.textManager, this.boxManager, "hacker");
            hacker.setPosition(1, 2, 0);
            hacker.setSize(9, 6.5);
            hacker.titleArea.text = "TERMINAL GLITCH";
            hacker.bodyArea.text = "Status: Interactive\nType into the terminal...\n\nEverything is batched on the GPU.";
            hacker.setStyle({
                headerColor1: 0x00ff00, headerColor2: 0x008800,
                bodyColor1: 0x000500, bodyColor2: 0x001000, bodyAlpha: 0.7
            });
            this.noteBoxMap.set(hacker.name, hacker);

            const kinetic = new NoteBox(this.textManager, this.boxManager, "kinetic");
            kinetic.setPosition(12, 5, 0);
            kinetic.setSize(9, 3.5);
            kinetic.titleArea.text = "KINETIC TYPOGRAPHY";
            kinetic.bodyArea.text = "SPINNING LETTERS\nFLOATING WORDS";
            kinetic.setStyle({
                headerColor1: 0xff0088, headerColor2: 0xff00ff,
                bodyColor1: 0x220022, bodyAlpha: 0.9
            });
            this.noteBoxMap.set(kinetic.name, kinetic);

            const glitch = new NoteBox(this.textManager, this.boxManager, "glitch");
            glitch.setPosition(12, 12, 0);
            glitch.setSize(9, 3.5);
            glitch.titleArea.text = "GLITCH SYSTEM";
            glitch.bodyArea.text = "CRITICAL ERROR... SYSTEM COMPROMISED";
            glitch.setStyle({
                headerColor1: 0xff3300, headerColor2: 0x330000,
                bodyColor1: 0x110000, bodyAlpha: 0.95
            });
            this.noteBoxMap.set(glitch.name, glitch);

            const pulse = new NoteBox(this.textManager, this.boxManager, "pulse");
            pulse.setPosition(1, 18, 0);
            pulse.setSize(9, 3.5);
            pulse.titleArea.text = "BREATHING TEXT";
            pulse.bodyArea.text = "PULSATING RHYTHM\nSOFT SCALE EFFECTS";
            pulse.setStyle({
                headerColor1: 0x00ffcc, headerColor2: 0x0066aa,
                bodyColor1: 0x001a1a, bodyAlpha: 0.9
            });
            this.noteBoxMap.set(pulse.name, pulse);

            const wave = new NoteBox(this.textManager, this.boxManager, "wave");
            wave.setPosition(-10, 18, 0);
            wave.setSize(9, 3.5);
            wave.titleArea.text = "WAVE FORM";
            wave.bodyArea.text = "OCEANIC MOTION\nSMOOTH SINUSOIDS";
            wave.setStyle({
                headerColor1: 0x0088ff, headerColor2: 0x003366,
                bodyColor1: 0x000a1a, bodyAlpha: 0.9
            });
            this.noteBoxMap.set(wave.name, wave);

            const shake = new NoteBox(this.textManager, this.boxManager, "shake");
            shake.setPosition(-12, 27, 0);
            shake.setSize(9, 3.5);
            shake.titleArea.text = "VIBRATING WARNING";
            shake.bodyArea.text = "DANGER: HIGH CORE HEAT\nSHAKE EFFECT ACTIVE";
            shake.setStyle({
                headerColor1: 0xffaa00,
                bodyColor1: 0x221100, bodyAlpha: 0.95
            });
            this.noteBoxMap.set(shake.name, shake);

            const typewriter = new NoteBox(this.textManager, this.boxManager, "typewriter");
            typewriter.setPosition(1, 27, 0);
            typewriter.setSize(9, 3.5);
            typewriter.titleArea.text = "TYPEWRITER REVEAL";
            typewriter.bodyArea.text = "Initializing sequence...\nTransmission incoming...";
            typewriter.setStyle({
                headerColor1: 0x00ff00, headerColor2: 0x004400,
                bodyColor1: 0x001100, bodyAlpha: 0.9
            });
            this.noteBoxMap.set(typewriter.name, typewriter);

        } else if (id === 'notebox') {
            for (let i = 0; i < 3; i++) {
                const nb = new NoteBox(this.textManager, this.boxManager, `box-${i+1}`);
                nb.setPosition(-12 + i * 9, 2 - i * 2, i * -1);
                nb.setSize(8, 6);
                nb.titleArea.text = `BOX ${i+1}`;
                nb.bodyArea.text = `Real-time text editing enabled.\n\nDouble click to focus.`;
                this.noteBoxMap.set(nb.name, nb);
            }
        } else if (id === 'stress') {
            const grid = 80; // 80x80 = 6,400 areas
            const spacing = 18;
            for (let i = 0; i < grid; i++) {
                for (let j = 0; j < grid; j++) {
                    const area = this.textManager.createTextArea(
                        "The quick brown fox jumps over the lazy dog. MSDF Text Engine is ultra fast. ".repeat(3),
                        (i - grid/2) * spacing,
                        (j - grid/2) * spacing,
                        (Math.random() - 0.5) * 60
                    )
                    .setBoxSize(1000, 3000)
                    .setWordWrap(true);
                    (area as any).cachedLayout = area.computeLayout();
                    this.stressAreas.push(area);
                }
            }
        } else if (id === 'simple-stress') {
            const grid = 16; // 16x16 = 256 areas
            const spacing = 20;
            for (let i = 0; i < grid; i++) {
                for (let j = 0; j < grid; j++) {
                    const area = this.textManager.createTextArea(
                        "Simple performance test. MSDF is great! ".repeat(5),
                        (i - grid/2) * spacing,
                        (j - grid/2) * spacing,
                        0
                    )
                    .setBoxSize(1000, 5000)
                    .setWordWrap(true);
                    (area as any).cachedLayout = area.computeLayout();
                    this.stressAreas.push(area);
                }
            }
        }
    }
}
