export interface FontData {
    pages: string[];
    chars: Char[];
    info: Info;
    common: Common;
    distanceField: DistanceField;
    kernings: Kerning[];
}

export interface Char {
    id: number;
    index: number;
    char: string;
    width: number;
    height: number;
    xoffset: number;
    yoffset: number;
    xadvance: number;
    chnl: number;
    x: number;
    y: number;
    page: number;
}

export interface Info {
    face: string;
    size: number;
    bold: number;
    italic: number;
    charset: string[];
    unicode: number;
    stretchH: number;
    smooth: number;
    aa: number;
    padding: number[];
    spacing: number[];
    outline: number;
}

export interface Common {
    lineHeight: number;
    base: number;
    scaleW: number;
    scaleH: number;
    pages: number;
    packed: number;
    alphaChnl: number;
    redChnl: number;
    greenChnl: number;
    blueChnl: number;
}

export interface DistanceField {
    fieldType: string;
    distanceRange: number;
}

export interface Kerning {
    first: number;
    second: number;
    amount: number;
}
