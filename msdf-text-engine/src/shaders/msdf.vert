attribute vec4 aUvOffset; // The region of the atlas for THIS instance
attribute vec3 aColor; // Per-instance color
varying vec2 vUv;
varying vec3 vColor;

void main() {
    // Remap the 0-1 UV of the quad to the glyph's location in the atlas
    vUv = uv * aUvOffset.zw + aUvOffset.xy;
    vColor = aColor;
    
    // instanceMatrix is provided automatically by Three.js InstancedMesh
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
