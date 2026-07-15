// import { AudioController } from '$src/AudioController';
// import { Vars } from '$src/vars';
// import { clamp } from '$utils/clamp';
// import { randomInRange } from '$utils/randomInRange';
// import { randomIntInRange } from '$utils/randomIntInRange';
// import { shuffle } from '$utils/shuffle';
// import p5Class from 'p5'
// import { easeBounceInOut, easeBounceOut, easeCubicInOut, easeCubicOut, easeExpOut } from 'd3-ease';
// import { Client as RenderServerClient } from './renderServer/Client';

// // ===============

// const CAPTURE = false;

// const {
//     fps, height, width, dt
//     // your vars here
// } = Vars;

// // ===============

// new p5Class(async (p5Untyped) => {
//     Vars.p5 = (p5Untyped as InstanceType<typeof p5Class>);
//     const { p5 } = Vars;

//     const audioCtrl = new AudioController({
//         totalSoundsLimit: 100,
//         totalSpsLimit: 100,
//         groupSoundsLimit: 100,
//         groupSpsLimit: 100
//     });
//     let stareImg: p5Class.Image;
//     let expJoyImg: p5Class.Image;
//     let playMegabite: () => void;
//     let buffer: p5Class.Graphics;
//     let stareImgBuffer: p5Class.Graphics;
//     let expJoyImgBuffer: p5Class.Graphics;

//     const renderClient = new RenderServerClient();

//     document.querySelector('.save-btn')?.addEventListener('click', () => p5.saveCanvas("render-image-" + new Date().toISOString().replaceAll(":", "-")))

//     p5.setup = async function () {
//         // p5 settings
//         p5.createCanvas(width, height);
//         p5.pixelDensity(1)
//         p5.frameRate(fps);
//         // p5.colorMode(p5.HSL);

//         Vars.bgColor = p5.color(15);

//         Vars.mp = p5.createVector(0, 0);
//         Vars.previousMp = p5.createVector(0, 0);

//         Vars.ts = Date.now();

//         function mouseMove(e: MouseEvent) {
//             Vars.previousMp.set(Vars.mp.x, Vars.mp.y);
//             Vars.mp.set(p5.mouseX, p5.mouseY);
//         }

//         p5.mouseMoved = mouseMove;
//         p5.mouseDragged = mouseMove;

//         // ==========

//         stareImg = await this.loadImage("/stare.webp");
//         expJoyImg = await this.loadImage("/exp_joy.webp");

//         buffer = this.createGraphics(1000, 1000);
//         buffer.background(Vars.bgColor);
//         buffer.image(stareImg, 0, 0, 1000, 1000);

//         stareImgBuffer = this.createGraphics(1000, 1000);
//         stareImgBuffer.background(Vars.bgColor);
//         stareImgBuffer.image(stareImg, 0, 0, 1000, 1000);
//         stareImgBuffer.loadPixels()

//         expJoyImgBuffer = this.createGraphics(1000, 1000);
//         expJoyImgBuffer.background(Vars.bgColor);
//         expJoyImgBuffer.image(expJoyImg, 0, 0, 1000, 1000);
//         expJoyImgBuffer.loadPixels()

//         await renderClient.init(p5);
//     }

//     let frames = 0;
//     // let initialTs = Date.now();
//     const megabitesPlayedForIdx = new Set();
//     let lastPhaseT = 0;

//     type FlyingPixel = {
//         idx: number,
//         xFrom: number,
//         yFrom: number,
//         rgba: Uint8ClampedArray,
//         rgbaTo: Uint8ClampedArray,
//         xTo: number,
//         yTo: number
//         framesElapsed: number,
//         framesTotal: number
//     }

//     const bigPixelSize = 16;
//     const bigPixelsPerSide = Math.ceil(1000 / bigPixelSize);
//     const bigPixelsTotal = bigPixelsPerSide * bigPixelsPerSide;

//     let flyingPixels = new Set<FlyingPixel>();
//     const nonrndPixelIndices = new Array(1000 * 1000);
//     const rndPixelIndices = new Array(1000 * 1000);
//     for (let i = 0; i < 1000 * 1000; i++) {
//         rndPixelIndices[i] = i;
//         nonrndPixelIndices[i] = i;
//     }
//     shuffle(rndPixelIndices);

//     const landedPixelRgbaIndices = new Set();

//     function drawRectPixels(pixels: number[], objectWidth: number, x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number) {
//         const topLeftIdx = y * objectWidth + x;
//         for (let row = 0; row < h; row++) {
//             for (let col = 0; col < w; col++) {
//                 const rgbaIdx = (topLeftIdx + row * objectWidth + col) * 4;
//                 pixels[rgbaIdx] = r;
//                 pixels[rgbaIdx + 1] = g;
//                 pixels[rgbaIdx + 2] = b;
//                 pixels[rgbaIdx + 3] = a;
//             }
//         }
//     }

//     function sampleRectPixels(pixels: number[], objectWidth: number, x: number, y: number, w: number, h: number): Uint8ClampedArray {
//         let rAccum = 0;
//         let gAccum = 0;
//         let bAccum = 0;
//         let aAccum = 0;

//         const topLeftIdx = y * objectWidth + x;
//         for (let row = 0; row < h; row++) {
//             for (let col = 0; col < w; col++) {
//                 const rgbaIdx = (topLeftIdx + row * objectWidth + col) * 4;
//                 rAccum += pixels[rgbaIdx]
//                 gAccum += pixels[rgbaIdx + 1]
//                 bAccum += pixels[rgbaIdx + 2]
//                 aAccum += pixels[rgbaIdx + 3]
//             }
//         }

//         const sampledCount = w * h;
//         const arr = new Uint8ClampedArray(4);
//         arr[0] = rAccum / sampledCount;
//         arr[1] = gAccum / sampledCount;
//         arr[2] = bAccum / sampledCount;
//         arr[3] = aAccum / sampledCount;
//         return arr;
//     }

//     p5.draw = async function () {
//         Vars.ts = Date.now();

//         p5.background(Vars.bgColor);

//         // ==========

//         // gen
//         let pixelsToChopOffCount = clamp(100000 * dt, 1, Infinity)
//         const pixelsToChopOff = rndPixelIndices.splice(0, pixelsToChopOffCount);
//         buffer.loadPixels()
//         const durationMax = 50;

//         const dist = [randomInRange(0, 1000), randomInRange(0, 1000)]
//         for (let i = 0; i < pixelsToChopOff.length; i++) {
//             const pixelIdx = pixelsToChopOff[i];
//             const pixelIdxRgba = pixelsToChopOff[i] * 4;
//             const x = pixelIdx % 1000;
//             const y = Math.trunc(pixelIdx / 1000);
//             const xTo = Math.trunc(Math.random() * 333);
//             const yTo = y;

//             const rgba = sampleRectPixels(stareImgBuffer.pixels, 1000, x, y, bigPixelSize, bigPixelSize);
//             const rgbaTo = sampleRectPixels(expJoyImgBuffer.pixels, 1000, x, y, bigPixelSize, bigPixelSize)

//             let durationFrames = durationMax;

//             flyingPixels.add({
//                 xFrom: x,
//                 yFrom: y,
//                 idx: pixelIdx,
//                 rgba,
//                 rgbaTo,
//                 framesElapsed: 0,
//                 framesTotal: durationFrames,
//                 xTo,
//                 yTo
//             })

//             // perma erase initial pixels
//             if (!landedPixelRgbaIndices.has(pixelIdxRgba)) {
//                 drawRectPixels(buffer.pixels, 1000, x, y, bigPixelSize, bigPixelSize, 0, 0, 0, 0)

//                 // buffer.pixels[pixelIdxRgba] = 0;
//                 // buffer.pixels[pixelIdxRgba + 1] = 0;
//                 // buffer.pixels[pixelIdxRgba + 2] = 0;
//                 // buffer.pixels[pixelIdxRgba + 3] = 0;
//             }
//         }
//         buffer.updatePixels();

//         // render
//         p5.image(buffer, 0, 0, 1000, 1000);
//         this.loadPixels();
//         const toDelete = new Set<FlyingPixel>();
//         // const bigPixelSize = 8;
//         for (const obj of flyingPixels) {
//             // draw new pixel
//             let t = obj.framesElapsed / obj.framesTotal;
//             t = easeCubicOut(t);
//             const x = obj.xFrom + Math.trunc((obj.xTo - obj.xFrom) * t);
//             if (x < 0 || x >= 1000) {
//                 toDelete.add(obj)
//                 continue;
//             }
//             const y = obj.yFrom + Math.trunc((obj.yTo - obj.yFrom) * t);
//             if (y < 0 || y >= 1000) {
//                 toDelete.add(obj)
//                 continue
//             }


//             drawRectPixels(
//                 this.pixels, 1000,
//                 x - bigPixelSize, y - bigPixelSize,
//                 bigPixelSize, bigPixelSize,
//                 obj.rgba[0] + (obj.rgbaTo[0] - obj.rgba[0]) * t,
//                 obj.rgba[1] + (obj.rgbaTo[1] - obj.rgba[1]) * t,
//                 obj.rgba[2] + (obj.rgbaTo[2] - obj.rgba[2]) * t,
//                 obj.rgba[3] + (obj.rgbaTo[3] - obj.rgba[3]) * t,
//             )

//             // const pixelsArrIdx = (y * 1000 + x) * 4;
//             // this.pixels[pixelsArrIdx] = obj.r + (obj.rTo - obj.r) * t;
//             // this.pixels[pixelsArrIdx + 1] = obj.g + (obj.gTo - obj.g) * t;
//             // this.pixels[pixelsArrIdx + 2] = obj.b + (obj.bTo - obj.b) * t;
//             // this.pixels[pixelsArrIdx + 3] = obj.a + (obj.aTo - obj.a) * t;

//             if (++obj.framesElapsed > obj.framesTotal)
//                 toDelete.add(obj)
//         }
//         this.updatePixels()

//         buffer.loadPixels();
//         for (const obj of toDelete) {
//             flyingPixels.delete(obj);

//             // if within bounds, perma set the pixel
//             if (obj.xTo > 0 && obj.xTo < 1000 && obj.yTo > 0 && obj.yTo < 1000) {
//                 drawRectPixels(
//                     buffer.pixels, 1000,
//                     obj.xTo, obj.yTo,
//                     bigPixelSize, bigPixelSize,
//                     obj.rgbaTo[0],
//                     obj.rgbaTo[1],
//                     obj.rgbaTo[2],
//                     obj.rgbaTo[3],
//                 )

//                 const pixelsArrIdx = (obj.yTo * 1000 + obj.xTo) * 4;
//                 // stareImgBuffer.pixels[pixelsArrIdx] = obj.rTo;
//                 // stareImgBuffer.pixels[pixelsArrIdx + 1] = obj.gTo;
//                 // stareImgBuffer.pixels[pixelsArrIdx + 2] = obj.bTo;
//                 // stareImgBuffer.pixels[pixelsArrIdx + 3] = obj.aTo;

//                 landedPixelRgbaIndices.add(pixelsArrIdx)
//             }
//         }
//         buffer.updatePixels();

//         frames++;

//         if(CAPTURE)
//             await renderClient.saveFrame();
//     };
// });