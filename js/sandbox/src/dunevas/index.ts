import p5Class from 'p5'
import { Client as RenderServerClient } from './renderServer/Client';
import { Vector2 } from '@aliser/vector2';
import { Vars } from './vars';
import { clamp } from '../utils/clamp';
import { randomInRange } from '../utils/randomInRange';
import { shuffle } from '../utils/shuffle';
import './styles.css';

// ===============

const CAPTURE = true;
const CAPTURE_N_FRAMES = 30 * 8;
const bigPixelSize = 4;

const {
    fps, height, width, dt
    // your vars here
} = Vars;

// ===============

new p5Class(async (p5Untyped) => {
    Vars.p5 = (p5Untyped as InstanceType<typeof p5Class>);
    const { p5 } = Vars;

    // const audioCtrl = new AudioController({
    //     totalSoundsLimit: 100,
    //     totalSpsLimit: 100,
    //     groupSoundsLimit: 100,
    //     groupSpsLimit: 100,
    // });
    let stareImg: p5Class.Image;
    let expJoyImg: p5Class.Image;
    let playMegabite: () => void;
    let buffer: p5Class.Graphics;
    let stareImgBuffer: p5Class.Graphics;
    let expJoyImgBuffer: p5Class.Graphics;

    const renderClient = new RenderServerClient();

    document.querySelector('.save-btn')?.addEventListener('click', () => p5.saveCanvas("render-image-" + new Date().toISOString().replaceAll(":", "-")))

    p5.setup = async function () {
        // p5 settings
        p5.createCanvas(width, height);
        p5.pixelDensity(1)
        p5.frameRate(fps);
        // p5.colorMode(p5.HSL);

        Vars.bgColor = p5.color(15);

        Vars.mp = p5.createVector(0, 0);
        Vars.previousMp = p5.createVector(0, 0);

        Vars.ts = Date.now();

        function mouseMove(e: MouseEvent) {
            Vars.previousMp.set(Vars.mp.x, Vars.mp.y);
            Vars.mp.set(p5.mouseX, p5.mouseY);
        }

        p5.mouseMoved = mouseMove;
        p5.mouseDragged = mouseMove;

        // ==========

        stareImg = await this.loadImage("/stare.webp");
        expJoyImg = await this.loadImage("/exp_joy.webp");

        buffer = this.createGraphics(1000, 1000);
        buffer.background(Vars.bgColor);
        buffer.image(stareImg, 0, 0, 1000, 1000);

        stareImgBuffer = this.createGraphics(1000, 1000);
        stareImgBuffer.background(Vars.bgColor);
        stareImgBuffer.image(stareImg, 0, 0, 1000, 1000);
        stareImgBuffer.loadPixels()

        expJoyImgBuffer = this.createGraphics(1000, 1000);
        expJoyImgBuffer.background(Vars.bgColor);
        expJoyImgBuffer.image(expJoyImg, 0, 0, 1000, 1000);
        expJoyImgBuffer.loadPixels()

        await renderClient.init(p5);
    }

    let frames = 0;
    // let initialTs = Date.now();
    const megabitesPlayedForIdx = new Set();
    let lastPhaseT = 0;

    type FlyingPixel = {
        idx: number,
        posFrom: Vector2,
        posTo: Vector2,
        pos: Vector2,
        vel: Vector2,
        accel: Vector2,
        t: number,
        rgba: Uint8ClampedArray,
        rgbaTo: Uint8ClampedArray,
        framesElapsed: number,
        framesTotal: number
    }

    const bigPixelsPerSide = Math.ceil(1000 / bigPixelSize);
    const bigPixelsTotal = bigPixelsPerSide * bigPixelsPerSide;

    let flyingPixels = new Set<FlyingPixel>();
    const nonrndPixelIndices = new Array(bigPixelsTotal);
    const rndPixelIndices = new Array(bigPixelsTotal);
    for (let i = 0; i < bigPixelsTotal; i++) {
        rndPixelIndices[i] = i;
        nonrndPixelIndices[i] = i;
    }
    shuffle(rndPixelIndices);

    type LandedPixel = {
        rgba: Uint8ClampedArray,
        overlaps: number
    }
    const finalGrid = new Map<number, LandedPixel>();

    function drawBigPixel(pixels: number[], pos: Vector2, r: number, g: number, b: number, a: number) {
        const xActual = pos.x * bigPixelSize;
        const yActual = pos.y * bigPixelSize;
        const objWidthActual = 1000;

        const topLeftIdxActual = yActual * objWidthActual + xActual;
        for (let row = 0; row < bigPixelSize; row++) {
            for (let col = 0; col < bigPixelSize; col++) {
                const rgbaIdx = (topLeftIdxActual + row * objWidthActual + col) * 4;
                pixels[rgbaIdx] = r;
                pixels[rgbaIdx + 1] = g;
                pixels[rgbaIdx + 2] = b;
                pixels[rgbaIdx + 3] = a;
            }
        }
    }

    function sampleBigPixel(pixels: number[], pos: Vector2): Uint8ClampedArray {
        const xActual = pos.x * bigPixelSize;
        const yActual = pos.y * bigPixelSize;
        const objWidthActual = 1000;

        let rAccum = 0;
        let gAccum = 0;
        let bAccum = 0;
        let aAccum = 0;

        const topLeftIdxActual = yActual * objWidthActual + xActual;
        for (let row = 0; row < bigPixelSize; row++) {
            for (let col = 0; col < bigPixelSize; col++) {
                const rgbaIdx = (topLeftIdxActual + row * objWidthActual + col) * 4;
                rAccum += pixels[rgbaIdx]
                gAccum += pixels[rgbaIdx + 1]
                bAccum += pixels[rgbaIdx + 2]
                aAccum += pixels[rgbaIdx + 3]
            }
        }

        const sampledCount = bigPixelSize * bigPixelSize;
        const arr = new Uint8ClampedArray(4);
        arr[0] = rAccum / sampledCount;
        arr[1] = gAccum / sampledCount;
        arr[2] = bAccum / sampledCount;
        arr[3] = aAccum / sampledCount;
        return arr;
    }

    function toMixedCols(t: number, r1: number, g1: number, b1: number, a1: number, r2: number, g2: number, b2: number, a2: number): Uint8ClampedArray {
        const arr = new Uint8ClampedArray(4);
        arr[0] = r1 + (r2 - r1) * t;
        arr[1] = g1 + (g2 - g1) * t;
        arr[2] = b1 + (b2 - b1) * t;
        arr[3] = a1 + (a2 - a1) * t;
        return arr;
    }

    function toMixedColsArr(t: number, rgba1: Uint8ClampedArray, rgba2: Uint8ClampedArray): Uint8ClampedArray {
        const arr = new Uint8ClampedArray(4);
        arr[0] = rgba1[0] + (rgba2[0] - rgba1[0]) * t;
        arr[1] = rgba1[1] + (rgba2[1] - rgba1[1]) * t;
        arr[2] = rgba1[2] + (rgba2[2] - rgba1[2]) * t;
        arr[3] = rgba1[3] + (rgba2[3] - rgba1[3]) * t;
        return arr;
    }

    function mixColsArr(t: number, baseRgba: Uint8ClampedArray, topRgba: Uint8ClampedArray): Uint8ClampedArray {
        baseRgba[0] += (topRgba[0] - baseRgba[0]) * t;
        baseRgba[1] += (topRgba[1] - baseRgba[1]) * t;
        baseRgba[2] += (topRgba[2] - baseRgba[2]) * t;
        baseRgba[3] += (topRgba[3] - baseRgba[3]) * t;
        return baseRgba;
    }

    function getMouse(): Vector2 {
        return new Vector2(p5.mouseX / bigPixelSize, p5.mouseY / bigPixelSize);
    }

    p5.draw = async function () {
        Vars.ts = Date.now();

        // p5.background(Vars.bgColor);
        p5.clear(0, 0, width, height);

        // ==========
        const mouse = getMouse();
        const cpSmallPixel = new Vector2(width / 2, height / 2);
        const cp = cpSmallPixel.div(bigPixelSize).floor();
        // mouse[0] = bigPixelsPerSide / 2;
        // mouse[1] = bigPixelsPerSide / 2;

        // gen
        let pixelsToChopOffCount = clamp(bigPixelSize * 100000000 * dt, 1, Infinity)
        const pixelsToChopOff = rndPixelIndices.splice(0, pixelsToChopOffCount);
        buffer.loadPixels()
        const durationMax = CAPTURE ? Vars.fps * 3 : Vars.fps * 1.5;

        const dist = randomInRange(0, bigPixelsPerSide)
        for (let i = 0; i < pixelsToChopOff.length; i++) {
            const pixelIdx = pixelsToChopOff[i];
            const posFrom = new Vector2(
                pixelIdx % bigPixelsPerSide,
                Math.trunc(pixelIdx / bigPixelsPerSide)
            );
            const posTo = mouse.copy();

            const rgba = sampleBigPixel(stareImgBuffer.pixels, posFrom);
            // const rgbaTo = sampleBigPixel(expJoyImgBuffer.pixels, x, y)
            const rgbaTo = rgba;

            let durationFrames = durationMax;

            flyingPixels.add({
                idx: pixelIdx,
                posFrom,
                posTo,
                pos: posFrom.copy(),
                vel: new Vector2(),
                accel: new Vector2(),
                t: 0,
                rgba,
                rgbaTo,
                framesElapsed: 0,
                framesTotal: durationFrames,
            })

            // perma erase initial pixels
            if (!finalGrid.has(pixelIdx)) {
                drawBigPixel(buffer.pixels, posFrom, 0, 0, 0, 0)
            }
        }

        for (const obj of flyingPixels) {
            // const cpDelta = cp.copy().sub(obj.posFrom);
            // away
            // const targetPos = cp.copy().add(m);
            // obj.posTo.set(targetPos)
            obj.posTo.set(cp.copy().add(obj.posTo.x % Math.round((obj.pos.mag + (Math.cos(frames / 10)) * 100) / 10)))
        }

        buffer.updatePixels();

        // render
        if(rndPixelIndices.length > 0)
            p5.image(buffer, 0, 0, 1000, 1000);
        this.loadPixels();
        const toDelete = new Set<FlyingPixel>();
        // const bigPixelSize = 8;

        const speed = 200000;
        for (const obj of flyingPixels) {
            // draw new pixel
            // obj.t = 0.5;

            const delta = obj.posTo.copy().sub(obj.pos);
            let accelDetla = delta.copy().setMag(Math.min(delta.mag, speed));
            accelDetla.mag = frames / Math.pow(accelDetla.mag, 2);

            obj.accel.mult(1.1);
            obj.accel.add(delta)

            // obj.accel.add(0, (10 + height - obj.pos.x) * dt * 100);

            if(obj.accel.mag > 500)
                obj.accel.mag -= 100;

            // if(obj.accel.mag > 100)
                // obj.accel.setMag(obj.accel.mag - 2000);

            obj.vel.mult(.99)
            obj.vel.x += obj.accel.x  * dt;
            obj.vel.y += obj.accel.y  * dt;
            
            obj.pos.x += obj.vel.x * dt;
            obj.pos.y += obj.vel.y * dt;
            

            // bound wrapping
            if(false) {
                if(obj.pos.x < 0) { obj.pos.x = bigPixelsPerSide - 1 - obj.pos.x; }
                else if(obj.pos.x > bigPixelsPerSide - 1) { obj.pos.x -= (bigPixelsPerSide - 1); }
                if(obj.pos.y < 0) { obj.pos.y = bigPixelsPerSide - 1 - obj.pos.y; }
                else if(obj.pos.y > bigPixelsPerSide - 1) { obj.pos.y -= (bigPixelsPerSide - 1); }
            }

            // obj.t = easeCubicOut(obj.t);
            // obj.pos.x = Math.round(obj.pos.xFrom + (obj.pos.xTo - obj.pos.xFrom) * obj.t);
            // obj.pos.y = Math.round(obj.pos.yFrom + (obj.pos.yTo - obj.pos.yFrom) * obj.t);

            if (obj.pos.x < 0 || obj.pos.x >= bigPixelsPerSide || obj.pos.y < 0 || obj.pos.y >= bigPixelsPerSide) {
                // pass
            } else {
                // const colMixed = toMixedColsArr(obj.t, obj.rgba, obj.rgbaTo);
                drawBigPixel(
                    this.pixels,
                    obj.pos.copy().round(),
                    obj.rgba[0],
                    obj.rgba[1],
                    obj.rgba[2],
                    obj.rgba[3],
                )
            }

            // const pixelsArrIdx = (y * 1000 + x) * 4;
            // this.pixels[pixelsArrIdx] = obj.r + (obj.rTo - obj.r) * t;
            // this.pixels[pixelsArrIdx + 1] = obj.g + (obj.gTo - obj.g) * t;
            // this.pixels[pixelsArrIdx + 2] = obj.b + (obj.bTo - obj.b) * t;
            // this.pixels[pixelsArrIdx + 3] = obj.a + (obj.aTo - obj.a) * t;

            // if (++obj.framesElapsed > obj.framesTotal)
            //     toDelete.add(obj)
        }
        this.updatePixels()

        buffer.loadPixels();
        for (const obj of toDelete) {
            flyingPixels.delete(obj);

            // if within bounds, perma set the pixel
            // if (obj.pos.xTo > 0 && obj.pos.xTo < bigPixelsPerSide && obj.pos.yTo > 0 && obj.pos.yTo < bigPixelsPerSide) {
            //     let existing: LandedPixel | undefined = finalGrid.get(obj.idx);
            //     if (!existing) {
            //         existing = {
            //             overlaps: 0,
            //             rgba: new Uint8ClampedArray(obj.rgbaTo)
            //         }
            //         finalGrid.set(obj.idx, existing);
            //     }

            //     existing.overlaps++;
            //     const newColRatio = 1 / existing.overlaps;
            //     mixColsArr(newColRatio, existing.rgba, obj.rgbaTo);

            //     drawBigPixel(
            //         buffer.pixels,
            //         Math.round(obj.pos.xTo), Math.round(obj.pos.yTo),
            //         existing.rgba[0],
            //         existing.rgba[1],
            //         existing.rgba[2],
            //         existing.rgba[3],
            //     )

            //     // const pixelsArrIdx = (obj.pos.yTo * bigPixelsPerSide + obj.pos.xTo) * 4;
            //     // stareImgBuffer.pixels[pixelsArrIdx] = obj.rTo;
            //     // stareImgBuffer.pixels[pixelsArrIdx + 1] = obj.gTo;
            //     // stareImgBuffer.pixels[pixelsArrIdx + 2] = obj.bTo;
            //     // stareImgBuffer.pixels[pixelsArrIdx + 3] = obj.aTo;


            // }
        }
        buffer.updatePixels();

        frames++;

        if (CAPTURE) {
            await renderClient.saveFrame();
            if(frames >= CAPTURE_N_FRAMES) {
                await renderClient.endBatch();
                p5.noLoop();
                p5.textSize(50);
                p5.stroke('white');
                p5.fill('black');
                p5.text('> DONE', width / 2, height / 2);
            }
        }
    };
});