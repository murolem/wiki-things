import { Vector2 } from '@aliser/vector2';
import { bezier } from '../utils/bezier';
import { clamp } from '../utils/clamp';
import { createElementFromHTML } from './utils';
import { duneStareImg, rippleImg } from './vars';
import type { DuneCfg } from '.';
import { map } from '../utils/map';
import { easeOutCubic } from './easing';

export type DuneCtorArgs = {
    initialPos: Vector2,
    targetPos: Vector2,
    initialVelocity: Vector2,
    durationMs: number,
    staticCfg: DuneCfg
}

export class Dune {
    private targetPos: Vector2;
    private initialPos: Vector2;
    private initVelocity: Vector2;
    private durationMs: number;
    private dunnenlingsCunt: HTMLElement;
    private cfg: DuneCfg
    private t: number = 0;
    // el: HTMLElement;
    // rippleEl: HTMLElement;

    private finishGrowAtMs: number;
    private startShrinkAtMs: number;

    private sampleIdealPosition: (t: number) => Vector2;

    constructor(args: DuneCtorArgs) {
        this.initialize(args);
    }

    initialize(args: DuneCtorArgs) {
        this.initialPos = args.initialPos;
        this.targetPos = args.targetPos;
        this.initVelocity = args.initialVelocity;
        this.durationMs = args.durationMs;
        this.cfg = args.staticCfg;

        this.finishGrowAtMs = this.cfg.duneGrowDurationMs;
        this.startShrinkAtMs = args.durationMs - this.cfg.duneShrinkDurationMs;

        // const endingYOffset = randomInRange(-30, 30);
        // this.targetPos.y += endingYOffset;

        const initPos = this.initialPos;
        const c1 = initPos.copy().add(this.initVelocity);
        const endPos = this.targetPos;
        const c2 = bezier(.6, initPos, c1, endPos, endPos);
        c2.x = endPos.x;

        // const c1Delta = Vector2.sub(c1, initPos);
        // CW = 1, CCW = -1
        // const preferdBendDirection = Math.sign(c1Delta.angle);

        const intensityBound = 0.8;

        this.sampleIdealPosition = () => {
            // move control point in a way so that the resulting bezier trajectory bends around mouse cursor.
            // given points p1 and p2, calculate a delta to p2, then its angle.
            // calculate a delta to mouse position from p1, then its angle.
            // compare angles. if angle is small enough, start applying bend. smaller angle = more bendy.
            // returns a new position of p2.
            // const applyBend = (p1: Vector2, p2: Vector2): Vector2 => {
            //     const p2Delta = Vector2.sub(p2, p1);
            //     const mouseDelta = Vector2.sub(this.cfg.mpAbs, p1);
            //     const angleDelta = Vector2.angleBetweenSigned(p2Delta, mouseDelta);
            //     const angleDeltaAbs = Math.abs(angleDelta);

            //     if (angleDeltaAbs > this.cfg.trajectoryBend.startRadians) {
            //         return p2.copy();
            //     }

            //     let intensityT = (angleDeltaAbs / this.cfg.trajectoryBend.startRadians);
            //     if(intensityT > intensityBound) {
            //         intensityT = map(intensityT, intensityBound, 1, intensityBound, 0)
            //     } else if (intensityT < intensityBound) {
            //         intensityT = map(intensityT, 0, intensityBound, 0, intensityBound)
            //     }

            //     intensityT = 1 - this.cfg.trajectoryBend.intensityCurve(1 - intensityT);

            //     let bendRads = intensityT * Math.sign(angleDelta) * Math.PI / 7;

            //     return Vector2.add(p1, p2Delta.rotateBy(bendRads));
            // }

            // const c1Res = applyBend(initPos, c1);
            // const c2Res = applyBend(endPos, c2);

            // return bezier(this.t, initPos, c1Res, c2Res, endPos);

            return bezier(this.t, initPos, c1, c2, endPos);
        };


        // this.shrinkQueued = false;
        this.t = 0;

        // if (!this.el) {
        // this.el = createElementFromHTML(duneStareImg);
        // this.el.classList.add("fl-dune");
        // this.el.style.setProperty("--duneShrinkDurationMs", this.cfg.duneShrinkDurationMs + "ms")
        // this.el.style.setProperty("--duneGrowDurationMs", this.cfg.duneGrowDurationMs + "ms")
        // setTimeout(() => this.el.classList.add("grow"), 1);

        // this.rippleEl = createElementFromHTML(rippleImg);
        // this.rippleEl.classList.add("fl-dune-ripple");
        // this.rippleEl.style.top = this.initialPos.y + "px";
        // this.rippleEl.style.left = this.initialPos.x + "px";
        // this.dunnenlingsCunt.append(this.rippleEl);
        // setTimeout(() => this.rippleEl.classList.add("grow"), 1);
        // setTimeout(() => this.rippleEl.remove(), 150);
        // } else {
        // reset
        // this.el.classList.remove("grow");
        // setTimeout(() => this.el.classList.add("grow"), 1);

        // this.dunnenlingsCunt.append(this.rippleEl);
        // this.rippleEl.classList.remove("shrink");
        // this.rippleEl.style.top = this.initialPos.y + "px";
        // this.rippleEl.style.left = this.initialPos.x + "px";
        // setTimeout(() => this.rippleEl.classList.add("grow"), 1);
        // setTimeout(() => this.rippleEl.remove(), 150);

        // this.shrinkQueued = false;
        // this.t = 0;
        // }
    }

    tickAndDraw(dt) {
        const ctx = this.cfg.ctx;

        const tickTElapsed = dt * 1000 / this.durationMs;
        const msElapsedTotal = this.t * this.durationMs;

        this.t += tickTElapsed;
        // this.t = clamp(this.t, 0, 1);

        const rippleExpandDurationMs = 250;
        const rippleShrinkDurationMs = 450;
        const rippleExpand2DurationMs = 150;
        const rippleShrink2DurationMs = 100;
        const rippleGoneAfterMs = rippleExpandDurationMs + rippleShrinkDurationMs;
        if (msElapsedTotal <= rippleGoneAfterMs) {
            if (msElapsedTotal <= rippleExpandDurationMs) {
                const rippleT = msElapsedTotal / rippleExpandDurationMs;
                const size = 10 * easeOutCubic(rippleT);
                ctx.drawImage(rippleImg, this.initialPos.x, this.initialPos.y, size, size);
            } else {
                const rippleT = (msElapsedTotal - rippleExpandDurationMs) / rippleShrinkDurationMs;
                const size = 10 * easeOutCubic(1 - rippleT);
                ctx.drawImage(rippleImg, this.initialPos.x, this.initialPos.y, size, size);
            }
        }

        if(msElapsedTotal >= this.durationMs) {
            const msElapsedTotalAdjusted = msElapsedTotal - this.durationMs;

            if (msElapsedTotalAdjusted <= rippleExpand2DurationMs) {
                const rippleT = msElapsedTotalAdjusted / rippleExpand2DurationMs;
                const size = 5 * easeOutCubic(rippleT);
                ctx.drawImage(rippleImg, this.targetPos.x, this.targetPos.y, size, size);
            } else {
                let rippleT = (msElapsedTotalAdjusted - rippleExpand2DurationMs) / rippleShrink2DurationMs;
                rippleT = clamp(rippleT, 0, 1);
                const size = 5 * easeOutCubic(1 - rippleT);
                ctx.drawImage(rippleImg, this.targetPos.x, this.targetPos.y, size, size);
            }
        }

        if(this.t >= 1) {
            return msElapsedTotal > this.durationMs * 2;
        }

        // if (!this.shrinkQueued && msElapsedTotal >= this.durationMs - this.cfg.duneShrinkDurationMs) {
        //     setTimeout(() => this.el.classList.remove("grow"), 1);

        //     this.dunnenlingsCunt.append(this.rippleEl);
        //     setTimeout(() => this.rippleEl.classList.add("grow"), 1);
        //     setTimeout(() => this.rippleEl.classList.remove("grow"), 2);
        //     setTimeout(() => this.rippleEl.remove(), 150);
        //     // setTimeout(() => this.rippleEl.classList.add("shrink"), 2);
        //     this.rippleEl.style.top = this.targetPos.y + "px";
        //     this.rippleEl.style.left = this.targetPos.x + "px";


        //     this.shrinkQueued = true;
        // }



        const idealPosition = this.sampleIdealPosition(this.t);
        const yOffsetFromCenteral = Math.abs(this.initialPos.y - idealPosition.y);

        const growT = msElapsedTotal < this.finishGrowAtMs
            ? msElapsedTotal / this.finishGrowAtMs
            : 1;
        const shrinkT = msElapsedTotal > this.startShrinkAtMs
            ? (msElapsedTotal - this.startShrinkAtMs) / this.cfg.duneShrinkDurationMs
            : 0;

        const scaleMod2 = easeOutCubic(growT * (1 - shrinkT));

        const scaleMod = clamp(1 - Math.pow(yOffsetFromCenteral / 100, 2) * 0.3, .5, 10)
        const scale = scaleMod * scaleMod2;
        const size = 40 * scale;

        ctx.drawImage(duneStareImg, idealPosition.x, idealPosition.y, size, size);

        const done = this.t === 1;
        return done;
    }
}