import p5Class from 'p5';

export class Vars {
    static p5: InstanceType<typeof p5Class>;

    private static _width: number = 1000;
    static get width() { return Vars._width; }

    private static _height: number = 1000;
    static get height() { return Vars._height; }

    private static _fps: number = 144;
    static get fps() { return Vars._fps; }

    private static _dt: number = 1 / Vars.fps;
    static get dt() { return Vars._dt; }

    static bgColor: p5Class.Color;

    static previousMp: p5Class.Vector;

    static mp: p5Class.Vector;

    static ts: number = 0;

    // ====================
    // your vars here...
}