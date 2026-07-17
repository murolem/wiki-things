import p5Class from 'p5'
import { Client as RenderServerClient } from './renderServer/Client';
import { Vector2 } from '@aliser/vector2';
import { Vars } from './vars';
import { clamp } from '../utils/clamp';
import { randomInRange } from '../utils/randomInRange';
import { shuffle } from '../utils/shuffle';
import './styles.css';
import { map } from '../utils/map';
import { randomIntInRange } from '../utils/randomIntInRange';

// ===============

const CAPTURE = true;
const CAPTURE_N_FRAMES = 30 * 311;
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
    document.querySelector('.capture-btn')?.addEventListener('click', () => renderClient.endBatch())

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

    const flyingPixels: FlyingPixel[] = [];
    let flyingPixelsOrdered: FlyingPixel[] = new Array();
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

    const bigPixelIndexToPos = (idx: number) => {
        return new Vector2(
            idx % bigPixelsPerSide,
            Math.trunc(idx / bigPixelsPerSide)
        )
    }

    function drawBigPixel(pixels: number[], pos: Vector2, r: number, g: number, b: number, a: number) {
        let bigPixelSizeActual = bigPixelSize;
        if (bigPixelSizeActual < 1) {
            bigPixelSizeActual = 1;
        }

        const xActual = Math.round(pos.x * bigPixelSizeActual);
        const yActual = Math.round(pos.y * bigPixelSizeActual);
        const objWidthActual = 1000;

        const topLeftIdxActual = yActual * objWidthActual + xActual;
        for (let row = 0; row < bigPixelSizeActual; row++) {
            for (let col = 0; col < bigPixelSizeActual; col++) {
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

    let initialAngle = 0;
    let finishAngle = 0;

    p5.draw = async function () {
        Vars.ts = Date.now();

        // p5.background(Vars.bgColor);
        p5.push();
        p5.clear(0, 0, width, height);
        // const renderRect = flyingPixels.reduce((accum, p) => {
        //     if(p.pos.x < accum.x1)
        //         accum.x1 = p.pos.x;
        //     else if (p.pos.x > accum.x2)
        //         accum.x2 = p.pos.x;

        //     if(p.pos.y < accum.y1)
        //         accum.y1 = p.pos.y;
        //     else if (p.pos.y > accum.y2)
        //         accum.y2 = p.pos.y;

        //     return accum;
        // }, { x1: 0, y1: 0, x2: bigPixelsPerSide, y2: bigPixelsPerSide });

        // const scale = Math.max(renderRect.x2 - renderRect.x1, renderRect.y2 - renderRect.y1) / bigPixelsPerSide;
        // p5.scale(scale);

        // ==========
        const mouse = getMouse();
        const cpSmallPixel = new Vector2(width / 2, height / 2);
        const cp = cpSmallPixel.div(bigPixelSize).floor();
        // mouse[0] = bigPixelsPerSide / 2;
        // mouse[1] = bigPixelsPerSide / 2;

        // gen
        let pixelsToChopOffCount = clamp(bigPixelSize * 100000000 * dt, 1, Infinity)
        const pixelsToChopOff = nonrndPixelIndices.splice(0, pixelsToChopOffCount);
        // buffer.loadPixels()
        const durationMax = CAPTURE ? Vars.fps * 3 : Vars.fps * 1.5;

        const dist = randomInRange(0, bigPixelsPerSide)
        let accum = 0;
        for (let i = 0; i < pixelsToChopOff.length; i++) {
            const pixelIdx = pixelsToChopOff[i];
            const posFrom = new Vector2(
                pixelIdx % bigPixelsPerSide,
                Math.trunc(pixelIdx / bigPixelsPerSide)
            );
            // const posTo = (flyingPixels.length > 1 ? flyingPixels[randomIntInRange(flyingPixels.length - 1)].pos : posFrom.copy() );

            // let posTo: Vector2;
            // setInterval(() => {
            //     accum += i;
            //     let posToX = Math.trunc((accum << 2) % bigPixelsPerSide);
            //     accum += posToX;
            //     let posToY = (accum << 4) % bigPixelsPerSide;
            //     posTo = new Vector2(posToX, posToY);

            // }, i / 1000)
            // accum += i;
            // let posToX = Math.trunc((accum << 2) % bigPixelsPerSide);
            // accum << 3;
            // accum += posToX;
            // let posToY = (accum << 4) % bigPixelsPerSide;
            // accum >> 2;
            // accum = accum ^ (1 / accum);

            // posTo = new Vector2(posToX, posToY);
            // const posTo = (flyingPixels.length > bigPixelsPerSide + 1 ? flyingPixels[i - 1 - bigPixelsPerSide + randomIntInRange(10)].pos : posFrom.copy());

            const posTo = Vector2.random(500);

            const rgba = sampleBigPixel(stareImgBuffer.pixels, posFrom);
            // const rgbaTo = sampleBigPixel(expJoyImgBuffer.pixels, x, y)
            const rgbaTo = rgba;

            let durationFrames = durationMax;

            flyingPixels.push({
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

        let idx = 0;
        let angle = 0;
        flyingPixelsOrdered = new Array(bigPixelsTotal);
        for (const obj of flyingPixels) {
            // const sector = obj.posTo.copy().div(10).floor();

            // const angleLocal = frames / 10 + sector.x / 10;
            // if (idx === 0) {
            //     if (frames === 0) {
            //         initialAngle = angleLocal;
            //         finishAngle = initialAngle + Math.PI * 2;
            //     }
            //     angle = angleLocal;
            // }


            // const div = -5;
            // obj.pos.x = obj.posFrom.x + Math.cos(frames / 10 + sector.x / div) * 150
            // obj.pos.y = obj.posFrom.y + Math.sin(frames / 10 + sector.y / div) * 150

            // const sizeHalf = bigPixelsPerSide / 2;
            // obj.posTo = mouse.copy().add(obj.posFrom.copy().sub(sizeHalf).div(2))

            idx++;

            // if (obj.pos.x < 0 || obj.pos.x >= bigPixelsPerSide || obj.pos.y < 0 || obj.pos.y >= bigPixelsPerSide)
            //     continue;

            // const posIdx = Math.round(obj.pos.y) * bigPixelsPerSide + Math.round(obj.pos.x);
            // flyingPixelsOrdered[posIdx] = obj;

            // obj.posTo = flyingPixels[(idx + (idx % 25)) % flyingPixels.length].posTo.copy();
            // obj.posTo = bigPixelIndexToPos(idx ** 44);
            // const cpDelta = cp.copy().sub(obj.posFrom);
            // away
            // const targetPos = cp.copy().add(m);
            // obj.posTo.set(targetPos)
            // obj.posTo.set(cp.copy().add(obj.posTo.x % Math.round((obj.pos.mag + (Math.cos(frames / 10)) * 100) / 10)))
            // obj.posTo.set(obj.posTo.copy().div(10).floor().mult(10))
        }

        // buffer.updatePixels();

        // render
        // if (rndPixelIndices.length > 0)
        // p5.image(buffer, 0, 0, 1000, 1000);
        this.loadPixels();
        // const toDelete = new Set<FlyingPixel>();
        // const bigPixelSize = 8;

        const speed = 200000;
        let empty = 0;
        // let lastGoodObj = flyingPixels[0];
        // for (let i = 0; i < flyingPixelsOrdered.length; i++) {
        //     const obj = flyingPixelsOrdered[i];
        //     if (obj) {
        //         drawBigPixel(
        //             this.pixels,
        //             obj.pos.copy().round(),
        //             obj.rgba[0],
        //             obj.rgba[1],
        //             obj.rgba[2],
        //             obj.rgba[3]
        //         )
        //         lastGoodObj = obj;
        //     } else {
        //         drawBigPixel(
        //             this.pixels,
        //             new Vector2(
        //                 i % bigPixelsPerSide,
        //                 Math.trunc(i / bigPixelsPerSide)
        //             ).round(),
        //             lastGoodObj.rgba[0],
        //             lastGoodObj.rgba[1],
        //             lastGoodObj.rgba[2],
        //             lastGoodObj.rgba[3]
        //         )
        //     }
        // }
        for (const obj of flyingPixels) {
            // draw new pixel
            // obj.t = 0.5;

            const delta = obj.posTo.copy().sub(obj.pos);
            // let accelDetla = delta.copy().setMag(Math.max(delta.mag, speed));
            // accelDetla.mag = frames / Math.pow(accelDetla.mag, 2);

            // obj.accel.mult(.99);
            // obj.accel.add(accelDetla)

            // obj.accel.add(0, (10 + height - obj.pos.x) * dt * 100);

            // if(obj.accel.mag > 500)
            //     obj.accel.mag -= 100;

            // if(obj.accel.mag > 100)
            // obj.accel.setMag(obj.accel.mag - 2000);

            // const velMod = delta.mag < 500
            //     ? map(delta.mag, 500, 0, .99, -1)
            //     : .99;

            // obj.vel.mult(velMod);
            obj.vel.add(delta.copy().mult(dt * 100))
            const velMax = 500;
            obj.vel.clamp(-velMax, velMax);
            obj.vel.mult(.95)

            obj.pos.x += obj.vel.x * dt;
            obj.pos.y += obj.vel.y * dt;


            // bound wrapping
            if (false) {
                if (obj.pos.x < 0) { obj.pos.x = bigPixelsPerSide - 1 - obj.pos.x; }
                else if (obj.pos.x > bigPixelsPerSide - 1) { obj.pos.x -= (bigPixelsPerSide - 1); }
                if (obj.pos.y < 0) { obj.pos.y = bigPixelsPerSide - 1 - obj.pos.y; }
                else if (obj.pos.y > bigPixelsPerSide - 1) { obj.pos.y -= (bigPixelsPerSide - 1); }
            }

            // obj.t = easeCubicOut(obj.t);
            // obj.pos.x = Math.round(obj.pos.xFrom + (obj.pos.xTo - obj.pos.xFrom) * obj.t);
            // obj.pos.y = Math.round(obj.pos.yFrom + (obj.pos.yTo - obj.pos.yFrom) * obj.t);

            if (obj.pos.x < 0 || obj.pos.x >= bigPixelsPerSide || obj.pos.y < 0 || obj.pos.y >= bigPixelsPerSide) {
                // pass
            } else {

                const posIdx = Math.round(obj.pos.y) * bigPixelsPerSide + Math.round(obj.pos.x);
                flyingPixelsOrdered[posIdx] = obj;
                // const colMixed = toMixedColsArr(obj.t, obj.rgba, obj.rgbaTo);
                // drawBigPixel(
                //     this.pixels,
                //     obj.pos.copy().round(),
                //     obj.rgba[0],
                //     obj.rgba[1],
                //     obj.rgba[2],
                //     obj.rgba[3]
                // )
            }

            // const pixelsArrIdx = (y * 1000 + x) * 4;
            // this.pixels[pixelsArrIdx] = obj.r + (obj.rTo - obj.r) * t;
            // this.pixels[pixelsArrIdx + 1] = obj.g + (obj.gTo - obj.g) * t;
            // this.pixels[pixelsArrIdx + 2] = obj.b + (obj.bTo - obj.b) * t;
            // this.pixels[pixelsArrIdx + 3] = obj.a + (obj.aTo - obj.a) * t;

            // if (++obj.framesElapsed > obj.framesTotal)
            //     toDelete.add(obj)
        }


        let fillers = [];
        for (let ii = 0; ii < 100; ii++) {


            for (let i = 0; i < flyingPixelsOrdered.length; i++) {
                const obj = flyingPixelsOrdered[i];
                if (obj) {
                    // drawBigPixel(
                    //     this.pixels,
                    //     obj.pos.copy().round(),
                    //     obj.rgba[0],
                    //     obj.rgba[1],
                    //     obj.rgba[2],
                    //     obj.rgba[3]
                    // )
                } else {
                    const iX = i % bigPixelsPerSide;
                    const iY = Math.trunc(i / bigPixelsPerSide);

                    const brushSize = 100;
                    const brushStartOffset = Math.trunc(brushSize / 2);
                    const brushStartX = iX - brushStartOffset;
                    const brushStartY = iY - brushStartOffset;

                    const rgba = new Uint8ClampedArray(4);
                    let encounters = 0;
                    for (let k = 0; k < brushSize * brushSize; k++) {
                        const x = brushStartX + k % brushSize;
                        if (x < 0 || x > bigPixelsPerSide)
                            continue; // overflow = skip
                        const y = brushStartY + Math.trunc(k / brushSize);
                        if (y < 0 || y > bigPixelsPerSide)
                            continue; // overflow = skip

                        const idx = y * bigPixelsPerSide + x;
                        const obj2 = flyingPixelsOrdered[idx];
                        if (!obj2)
                            continue;

                        rgba[0] += obj2.rgba[0];
                        rgba[1] += obj2.rgba[1];
                        rgba[2] += obj2.rgba[2];
                        rgba[3] += obj2.rgba[3];

                        encounters++;
                        if(encounters >= 1)
                            break;
                    }

                    if (encounters === 0)
                        continue;

                    const mult = 1 / encounters;
                    if (encounters > 1) {
                        rgba[0] *= mult;
                        rgba[1] *= mult;
                        rgba[2] *= mult;
                        rgba[3] *= mult;
                    }

                    flyingPixelsOrdered[i] = ({ pos: new Vector2(iX, iY), rgba, dirty: true })
                    // drawBigPixel(
                    //     this.pixels,
                    //     new Vector2(
                    //         iX,
                    //         iY
                    //     ),
                    //     rgba[0],
                    //     rgba[1],
                    //     rgba[2],
                    //     rgba[3]
                    // )
                }
            }

            flyingPixelsOrdered.reverse()
        }

        // for(let i = 0; i < fillers.length; i++) {
        //     const fil = fillers[i];
        //     drawBigPixel(
        //         this.pixels,
        //         fil[0],
        //         fil[1][0],
        //         fil[1][1],
        //         fil[1][2],
        //         fil[1][3]
        //     )
        // }

        for (let ii = 0; ii < 2; ii++) {
            const drawDirty = ii === 0;

            for (let i = 0; i < flyingPixelsOrdered.length; i++) {
                const obj = flyingPixelsOrdered[i];
                if (obj && (obj.dirty && drawDirty || !obj.dirty)) {
                    const pos = obj.pos.copy().mod(bigPixelsPerSide);
                    if (true) {
                        if (pos.x < 0) { pos.x = bigPixelsPerSide - 1 - pos.x; }
                        else if (pos.x > bigPixelsPerSide - 1) { pos.x -= (bigPixelsPerSide - 1); }
                        if (pos.y < 0) { pos.y = bigPixelsPerSide - 1 - pos.y; }
                        else if (pos.y > bigPixelsPerSide - 1) { pos.y -= (bigPixelsPerSide - 1); }
                    }

                    drawBigPixel(
                        this.pixels,
                        pos,
                        obj.rgba[0],
                        obj.rgba[1],
                        obj.rgba[2],
                        obj.rgba[3]
                    )
                }
            }
        }

        this.updatePixels()

        // buffer.loadPixels();
        // for (const obj of toDelete) {
        //     flyingPixels.splice(flyingPixels.indexOf(obj), 1);

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
        // }
        // buffer.updatePixels();

        frames++;

        p5.pop();

        if (CAPTURE) {
            const endBatch = async () => {
                p5.noLoop();
                await renderClient.endBatch();
                p5.textSize(50);
                p5.stroke('white');
                p5.fill('black');
                p5.text('> DONE', width / 2, height / 2);
            }

            // if (angle >= finishAngle)
            //     return await endBatch();

            await renderClient.saveFrame();
            if (frames >= CAPTURE_N_FRAMES)
                await endBatch();
        }
    };
});