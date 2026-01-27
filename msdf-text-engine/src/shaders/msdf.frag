varying vec2 vUv;
uniform sampler2D uMap;
uniform vec3 uColor;

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

float contour(in float d, in float w) {
    return smoothstep(0.5 - w, 0.5 + w, d);
}

// Sample helper for supersampling
float samp(in vec2 uv, float w) {
    return contour(median(texture2D(uMap, uv).r, texture2D(uMap, uv).g, texture2D(uMap, uv).b), w);
}

void main() {
    // 1. Standard MSDF distance
    vec3 msdfSample = texture2D(uMap, vUv).rgb;
    float dist = median(msdfSample.r, msdfSample.g, msdfSample.b); // 0..1 range (0.5 is edge)
    
    // 2. Width based on screen space derivatives (fwidth)
    // This helps keep outlines constant width or sharp
    float width = fwidth(dist);

    // 3. Base opacity/alpha
    float alpha = contour(dist, width);
    
    // 4. Supersampling (4 extra points) to improve small scale artifacts
    // dscale = 0.354 (approx 1/sqrt(8) or half of 1/sqrt(2)?) 
    // The user suggested 0.354
    float dscale = 0.354; 
    vec2 duv = dscale * (dFdx(vUv) + dFdy(vUv));
    vec4 box = vec4(vUv - duv, vUv + duv);
    
    float asum = samp(box.xy, width)
               + samp(box.zw, width)
               + samp(box.xw, width)
               + samp(box.zy, width);
    
    // Weighted average
    // Original point weight 1.0, 4 extra points weight 0.5 each -> sum weights = 3.0
    float opacity = (alpha + 0.5 * asum) / 3.0;
    
    if (opacity < 0.01) discard;
    
    gl_FragColor = vec4(uColor, opacity);
}
