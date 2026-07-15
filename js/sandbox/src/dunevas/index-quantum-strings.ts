// import { AudioController } from '$src/AudioController';
// import { Vars } from '$src/vars';
// import { clamp } from '$utils/clamp';
// import { randomInRange } from '$utils/randomInRange';
// import { randomIntInRange } from '$utils/randomIntInRange';
// import { shuffle } from '$utils/shuffle';
// import p5Class from 'p5'
// import { easeCubicInOut } from 'd3-ease';

// // ===============

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
//     let playMegabite: () => void;
//     let stareImgBuffer: p5Class.Graphics;
//     let stareImgBufferReadonly: p5Class.Graphics;

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
//         playMegabite = await audioCtrl.preload("/megabite.ogg")

//         stareImgBuffer = this.createGraphics(1000, 1000);
//         stareImgBuffer.background(Vars.bgColor);
//         stareImgBuffer.image(stareImg, 0, 0, 1000, 1000);

//         stareImgBufferReadonly = this.createGraphics(1000, 1000);
//         stareImgBufferReadonly.background(Vars.bgColor);
//         stareImgBufferReadonly.image(stareImg, 0, 0, 1000, 1000);
//         stareImgBufferReadonly.loadPixels()
//     }

//     let frames = 0;
//     // let initialTs = Date.now();
//     const megabitesPlayedForIdx = new Set();
//     let lastPhaseT = 0;

//     type FlyingPixel = {
//         idx: number,
//         xFrom: number,
//         yFrom: number,
//         r: number,
//         g: number,
//         b: number,
//         xTo: number,
//         yTo: number
//         framesElapsed: number,
//         framesTotal: number
//     }
//     let flyingPixels = new Set<FlyingPixel>();
//     const rndPixelIndices = new Array(1000 * 1000);
//     for (let i = 0; i < 1000 * 1000; i++) {
//         rndPixelIndices[i] = i;
//     }
//     shuffle(rndPixelIndices);

//     const landedPixelRgbaIndices = new Set();


//     p5.draw = function () {
//         Vars.ts = Date.now();

//         p5.background(Vars.bgColor);

//         // ==========

//         // gen
//         let pixelsToChopOffCount = clamp(10000000000 * dt, 1, Infinity)
//         const pixelsToChopOff = rndPixelIndices.splice(0, pixelsToChopOffCount);
//         stareImgBuffer.loadPixels()
//         const durationMax = 200;
//         for (let i = 0; i < pixelsToChopOff.length; i++) {
//             const pixelIdx = pixelsToChopOff[i];
//             const pixelIdxRgba = pixelsToChopOff[i] * 4;
//             const x = pixelIdx % 1000;
//             const y = Math.trunc(pixelIdx / 1000);
//             const xTo = Math.trunc(x + Math.cos(y / 10) * 25);
//             const yTo = Math.trunc(y + Math.cos(x / 10) * 25);

//             const r = stareImgBufferReadonly.pixels[pixelIdxRgba]
//             const g = stareImgBufferReadonly.pixels[pixelIdxRgba + 1]
//             const b = stareImgBufferReadonly.pixels[pixelIdxRgba + 2]
//             const a = stareImgBufferReadonly.pixels[pixelIdxRgba + 3]
//             let durationFrames = durationMax;

//             flyingPixels.add({
//                 xFrom: x,
//                 yFrom: y,
//                 idx: pixelIdx,
//                 r,
//                 g,
//                 b,
//                 a,
//                 framesElapsed: 0,
//                 framesTotal: durationFrames,
//                 xTo,
//                 yTo
//             })

//             // perma erase initial pixels
//             if(!landedPixelRgbaIndices.has(pixelIdxRgba)) {
//                 stareImgBuffer.pixels[pixelIdxRgba] = 0;
//                 stareImgBuffer.pixels[pixelIdxRgba + 1] = 0;
//                 stareImgBuffer.pixels[pixelIdxRgba + 2] = 0;
//                 stareImgBuffer.pixels[pixelIdxRgba + 3] = 0;
//             }
//         }
//         stareImgBuffer.updatePixels();

//         // render
//         p5.image(stareImgBuffer, 0, 0, 1000, 1000);
//         this.loadPixels();
//         const toDelete = new Set<FlyingPixel>();
//         for (const obj of flyingPixels) {
//             // draw new pixel
//             let t = obj.framesElapsed / obj.framesTotal;
//             t = easeCubicInOut(t);
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
//             const pixelsArrIdx = (y * 1000 + x) * 4;
//             this.pixels[pixelsArrIdx] = obj.r;
//             this.pixels[pixelsArrIdx + 1] = obj.g;
//             this.pixels[pixelsArrIdx + 2] = obj.b;

//             if (++obj.framesElapsed > obj.framesTotal)
//                 toDelete.add(obj)
//         }
//         this.updatePixels()

//         stareImgBuffer.loadPixels();
//         for (const obj of toDelete) {
//             flyingPixels.delete(obj);

//             // if within bounds, perma set the pixel
//             if (obj.xTo > 0 && obj.xTo < 1000 && obj.yTo > 0 && obj.yTo < 1000) {
//                 const pixelsArrIdx = (obj.yTo * 1000 + obj.xTo) * 4;
//                 stareImgBuffer.pixels[pixelsArrIdx] = obj.r;
//                 stareImgBuffer.pixels[pixelsArrIdx + 1] = obj.g;
//                 stareImgBuffer.pixels[pixelsArrIdx + 2] = obj.b;
//                 stareImgBuffer.pixels[pixelsArrIdx + 3] = obj.a;

//                 landedPixelRgbaIndices.add(pixelsArrIdx)
//             }
//         }
//         stareImgBuffer.updatePixels();

//         frames++;
//     };
// });