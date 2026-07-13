import { Vector2 } from '@aliser/vector2';
import { map } from '../utils/map';
import { roundToDigit } from '../utils/roundToDigit';
import { easeInSine } from './easing';
import { createElementFromHTML, getElementAbsPosition } from './utils';
import { randomInRange, randomSign } from '../utils/randomInRange';
import { clamp } from '../utils/clamp';
import { addCss } from '../utils/addCss';
import { bezier } from '../utils/bezier';
import { Pool } from './Pool';
import { replaceAll } from '../utils/replaceAll';

(() => {
    var RAD2DEG = 180 / Math.PI;
    var DEG2RAD = 1 / RAD2DEG;

    const dunesPerSec = {
        starting: 15,
        get ending() { return 50; }
    }

    const duneGrowDurationMs = 150;
    const duneShrinkDurationMs = 100;

    const duneSpawnRippleDurationMs = 100;

    const trajectoryBend = {
        startRadians: 25 * DEG2RAD,
        intensityCurve: easeInSine,
        radOffsetMax: 50 * DEG2RAD
    }

    // ================

    let mp = Vector2.zero();
    let mpAbs = Vector2.zero();

    document.addEventListener('mousemove', e => {
        mp.x = e.clientX;
        mp.y = e.clientY;

        const bodyRect = document.body.getBoundingClientRect();

        mpAbs.x = e.clientX - bodyRect.left;
        mpAbs.y = e.clientY - bodyRect.top;
    });

    const dunnenlingsCunt = document.createElement('div');
    dunnenlingsCunt.classList.add("dunnenlings-cunt")
    document.body.append(dunnenlingsCunt);
    /** @type {Dune[]} */
    const dunnenlings = []

    const contentRoot = document.querySelector('.mw-parser-output');
    if (!contentRoot) return;

    const linkHolder = contentRoot.querySelector('.pbox-link-holder');
    if (!linkHolder) return;

    const linksTotal = linkHolder.children.length;
    const newLinks = linkHolder.querySelectorAll('a.new');
    const linksNewCount = newLinks.length;
    const progressT = 1 - (linksNewCount / linksTotal);
    // const progressT = 1;
    const progressPercentage = roundToDigit(progressT * 100, 2) + "%"

    const duneStareImg = `<img width=40 height=40 style="width: 40px; height: 40px; object-fit: contain;" src="https://static.wikitide.net/casualtiesunknownwiki/c/ca/De_dune_stare.webp" />`
    const rippleImg = `<img alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAFhJREFUOI3Nk8ESABAIBT3//885MZUiOdCpjN3MKBQniIh4DQDWvelQgxOgRKLYwZZkJFFYS5CBuaRmQCHJdu9x/YL3gg9+oSdXg3QqMUc5Klku00rkrXMDODMsEsS7L1cAAAAASUVORK5CYII=" />`

    const pbarWrapper = document.createElement("div");
    contentRoot.append(pbarWrapper);

    const pbarEl = createElementFromHTML<HTMLElement>(`\
    <div style="--progress: ${progressT};" class="pbar">
        <div class="pbar-progress"><div class="pbar-progress-head"></div></div>
        <br>
        <div class="pbar-header">
            ${duneStareImg}<span class="pbar-header-text">Item Pages Creation Progress</span>${duneStareImg}
            <br>
            <span class="pbar-header-progress-text">${progressPercentage}</span>
        </div>
    </div>`)
    pbarWrapper.append(pbarEl);

    const pbarExpando = createElementFromHTML<HTMLElement>(`\
    <div class="pbar-expando">
        <div class="pbar-expando-content"></div>
        <button class="pbar-expando-btn">[EXPAND]</button>
    </div>
        `);

    let moveDunesAwayFromExpando = false;

    const pbarExpandoBtn = pbarExpando.querySelector<HTMLElement>('.pbar-expando-btn');
    const pbarExpandoContent = pbarExpando.querySelector('.pbar-expando-content');
    pbarExpandoBtn.addEventListener('click', () => {
        const visible = pbarExpandoContent.classList.contains("visible");
        if(visible) {
            // was visible, now hidden
            pbarExpandoBtn.innerText = "[EXPAND]"
        } else {
            // was hidden, now visible
            pbarExpandoBtn.innerText = "[HIDE]"
        }
        pbarExpandoContent.classList.toggle("visible")
    });
    const pbarExpandoContentEl = (() => {
        const ul = createElementFromHTML("<ul></ul>");
        
        for(const link of [...newLinks]) {
            const href = (link as HTMLLinkElement).href;
            let page = href.split("/wiki/")[1] ?? "";
            page = page.split("?")[0] ?? "";
            page = replaceAll(page, "_", " ")

            if(page === "")
                continue;

            ul.append(createElementFromHTML(`<li><a class="new" href="/wiki/${page}">${page}</li>`))
        }
        return ul;
    })()
    pbarExpandoContentEl.addEventListener("mouseenter", () => moveDunesAwayFromExpando = true)
    pbarExpandoContentEl.addEventListener("mouseleave", () => moveDunesAwayFromExpando = false)

    pbarExpandoContent.append(pbarExpandoContentEl);


    pbarWrapper.append(pbarExpando);

    let pbarAbsRect = getElementAbsPosition(pbarEl);

    const makeDuneVars = (): ConstructorParameters<typeof Dune> => {
        const pborProgressedWidth = pbarAbsRect.w * progressT;
        const pborPendingWidth = pbarAbsRect.w * (1 - progressT);

        const initialYOffset = randomInRange(pbarAbsRect.h);
        const initialPos = new Vector2(pbarAbsRect.x - 20 + randomInRange(pborProgressedWidth), pbarAbsRect.y + initialYOffset);
        const targetPos = new Vector2(pbarAbsRect.x + pbarAbsRect.w - 20 - randomInRange(pborPendingWidth), pbarAbsRect.y + randomInRange(pbarAbsRect.h));
        let velSign = initialYOffset < pbarAbsRect.h / 2
            ? -1
            : 1;
        if(moveDunesAwayFromExpando) {
            velSign = -1;
        } else {
            velSign = 1
        }

        const initialVelocity = Vector2.fromAngle(velSign * randomInRange(90 * DEG2RAD), randomInRange(300, 1000));
        // const initialVelocity = Vector2.fromAngle(Math.PI / 10, 500);
        const durationMs = randomInRange(500, 2000);

        return [initialPos, targetPos, initialVelocity, durationMs]
    }

    const makeDune = () => {
        return new Dune(...makeDuneVars());
    }
    const dunePool = new Pool<Dune>(makeDune, dune => dune.initialize(...makeDuneVars()));

    let pbarBgOffset = new Vector2();

    let tsPrevious = 0;
    let toCreate = 0;
    const loop = (ts) => {
        const dt = (ts - tsPrevious) / 1000;

        // =====

        pbarBgOffset.add(new Vector2(3, 1.5).mult(dt));

        pbarExpando.style.setProperty('--bg-offset-x', pbarBgOffset.x + "px")
        pbarExpando.style.setProperty('--bg-offset-y', pbarBgOffset.y + "px");

        const toCreatePerSec = map(progressT, 0, 1, dunesPerSec.starting, dunesPerSec.ending);
        toCreate += toCreatePerSec * dt;

        // create

        pbarAbsRect = getElementAbsPosition(pbarEl);
        for (let i = 1; i < toCreate; i++) {
            const dune = dunePool.take();
            dunnenlings.push(dune);
            dunnenlingsCunt.append(dune.el);
        }
        toCreate %= 1;

        // update & render

        for (let i = dunnenlings.length - 1; i >= 0; i--) {
            const dune = dunnenlings[i];
            const toRemove = dune.tickAndDraw(dt);
            if (toRemove) {
                dunnenlings.splice(i, 1);
                dune.el.remove();
                dunePool.free(dune);
            }
        }

        // =====

        requestAnimationFrame(loop);
        tsPrevious = ts;
    }
    requestAnimationFrame(loop);

    class Dune {
        private targetPos: Vector2;
        private initialPos: Vector2;
        private initVelocity: Vector2;
        private durationMs: number;
        private t: number = 0;
        el: HTMLElement;
        rippleEl: HTMLElement;

        private shrinkQueued: boolean = false;

        private sampleIdealPosition: (t: number) => Vector2;

        constructor(initialPos: Vector2, targetPos: Vector2, initVelocity: Vector2, durationMs: number) {
            this.initialize(initialPos, targetPos, initVelocity, durationMs);
        }

        initialize(initialPos: Vector2, targetPos: Vector2, initVelocity: Vector2, durationMs: number) {
            this.initialPos = initialPos;
            this.targetPos = targetPos;
            this.initVelocity = initVelocity;
            this.durationMs = durationMs;

            // const endingYOffset = randomInRange(-30, 30);
            // this.targetPos.y += endingYOffset;

            const initPos = this.initialPos;
            const c1 = initPos.copy().add(this.initVelocity);
            const endPos = this.targetPos;
            const c2 = bezier(.3, initPos, c1, endPos, endPos);

            const c1Delta = Vector2.sub(c1, initPos);
            // CW = 1, CCW = -1
            const preferdBendDirection = Math.sign(c1Delta.angle);

            const intensityBound = 0.8;

            this.sampleIdealPosition = () => {
                // move control point in a way so that the resulting bezier trajectory bends around mouse cursor.
                // given points p1 and p2, calculate a delta to p2, then its angle.
                // calculate a delta to mouse position from p1, then its angle.
                // compare angles. if angle is small enough, start applying bend. smaller angle = more bendy.
                // returns a new position of p2.
                // const applyBend = (p1: Vector2, p2: Vector2): Vector2 => {
                //     const p2Delta = Vector2.sub(p2, p1);
                //     const mouseDelta = Vector2.sub(mpAbs, p1);
                //     const angleDelta = Vector2.angleBetweenSigned(p2Delta, mouseDelta);
                //     const angleDeltaAbs = Math.abs(angleDelta);

                //     if (angleDeltaAbs > trajectoryBend.startRadians) {
                //         return p2.copy();
                //     }

                //     let intensityT = (angleDeltaAbs / trajectoryBend.startRadians);
                //     if(intensityT > intensityBound) {
                //         intensityT = map(intensityT, intensityBound, 1, intensityBound, 0)
                //     } else if (intensityT < intensityBound) {
                //         intensityT = map(intensityT, 0, intensityBound, 0, intensityBound)
                //     }

                //     intensityT = 1 - trajectoryBend.intensityCurve(1 - intensityT);

                //     let bendRads = intensityT * Math.sign(angleDelta) * Math.PI / 7;

                //     return Vector2.add(p1, p2Delta.rotateBy(bendRads));
                // }

                // const c1Res = applyBend(initPos, c1);
                // // const c2Res = applyBend(endPos, c2);
                // const c2Res = c2;

                // return bezier(this.t, initPos, c1Res, c2Res, endPos);

                return bezier(this.t, initPos, c1, c2, endPos);
            };

            if (!this.el) {
                this.el = createElementFromHTML(duneStareImg);
                this.el.classList.add("fl-dune");
                setTimeout(() => this.el.classList.add("grow"), 1);

                this.rippleEl = createElementFromHTML(rippleImg);
                this.rippleEl.classList.add("fl-dune-ripple");
                this.rippleEl.style.top = initialPos.y + "px";
                this.rippleEl.style.left = initialPos.x + "px";
                dunnenlingsCunt.append(this.rippleEl);
                setTimeout(() => this.rippleEl.classList.add("grow"), 1);
                setTimeout(() => this.rippleEl.remove(), 150);
            } else {
                // reset
                this.el.classList.remove("grow");
                setTimeout(() => this.el.classList.add("grow"), 1);

                dunnenlingsCunt.append(this.rippleEl);
                this.rippleEl.classList.remove("shrink");
                this.rippleEl.style.top = initialPos.y + "px";
                this.rippleEl.style.left = initialPos.x + "px";
                setTimeout(() => this.rippleEl.classList.add("grow"), 1);
                setTimeout(() => this.rippleEl.remove(), 150);

                this.shrinkQueued = false;
                this.t = 0;
            }
        }

        tickAndDraw(dt) {
            const tickTElapsed = dt * 1000 / this.durationMs;
            const msElapsedTotal = this.t * this.durationMs;
            if (!this.shrinkQueued && msElapsedTotal >= this.durationMs - duneShrinkDurationMs) {
                setTimeout(() => this.el.classList.remove("grow"), 1);

                dunnenlingsCunt.append(this.rippleEl);
                setTimeout(() => this.rippleEl.classList.add("grow"), 1);
                setTimeout(() => this.rippleEl.classList.remove("grow"), 2);
                setTimeout(() => this.rippleEl.remove(), 150);
                // setTimeout(() => this.rippleEl.classList.add("shrink"), 2);
                this.rippleEl.style.top = this.targetPos.y + "px";
                this.rippleEl.style.left = this.targetPos.x + "px";


                this.shrinkQueued = true;
            }

            this.t += tickTElapsed;
            this.t = clamp(this.t, 0, 1);

            const idealPosition = this.sampleIdealPosition(this.t);
            const yOffsetFromCenteral = Math.abs(this.initialPos.y - idealPosition.y);

            let scaleMod = 1 - Math.pow(yOffsetFromCenteral / 100, 2) * 0.3;
            scaleMod = clamp(scaleMod, 0.5, 10);

            this.el.style.setProperty("--scale-mod", scaleMod.toString());
            // this.el.style.filter = `blur(${(yOffsetFromCenteral) / 30}px)`

            this.el.style.left = idealPosition.x + "px";
            this.el.style.top = idealPosition.y + "px";

            const done = this.t === 1;
            return done;
        }
    }

    addCss(`\
        .pbar-expando {
            --bg-offset-x: 0px;
            --bg-offset-y: 0px;

            margin-top: 7px;
            border: 2px solid white;
            border-top: none;
            overflow: hidden;
            position: relative;

            
            &::after {
                content: '';
                position: absolute;
                inset: 0;
                background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKUAAABFCAYAAAArbyZYAAAAAXNSR0IArs4c6QAAA31JREFUeJzt3N1LU3Ecx/HvKqSMVuG8sLowyLQtKrQocRBRN5XmerASovwLrP6EuimTSgqiB3swmBJYqKFWFFZaXpSQF4VpPmA60TShLmpQ/bpIT1PPYptn7XB8v648O2ff35fjZ79zxu8wEQAAAAAAAAAAAAAAAAAAAAAAAADTYTO6YEbmlgnb54tOKJfLpXts4dHj0tb50fAerKqy/Kay2xfo7svJ3SP+n7Nici5bmhsMrTfL0Go6VLQHgOVEPZRAuAglTIdQwnQIJUwntqHkWxB0xDSUilRCB5dvmA6hhOkQSpjOHKMLrnWuUMVnTod07MULJRLs687Va6VSWf3gn8tmSQ67Krt1I7JGA1RV1cil0tv/ZYkuybFQld26/j+GmuJ80UnlcjmnXSfLvVnmL0qM2vlipoTpmDeUfDGfsQy/fLe3d4jXW649gLRjx3ZZvHiR7rEvm5ulu6tb92GlV69bwh67oeGp+AYG/n3QWNjz8vZKXFzcxBdjIKSex+TtC+x5eoaHR+Tho0chHZuWmioZGemGjBsKw0P57YfNVlZxT9teu26NChbKioo78r6rL6x7E+/Nyyox0aG778rVUvn89XtI9XJydqrxf7DHkyseT66WzJxdu8X/a7Zh90yG9ZydrcIJ5TpXijpTdEp3X29vr5SV3w1p3I3pq1VgKF80PZPxT3JjY5N4PA2G3l+a9/KNGSv6oeTeEGFiptTB5yi2CKUuYhlLPCUE07HYTEnKrSDGoSREmMpiMyWswFKhVEy8lhD1HyP4/mVExcfHi4hIWlqqlJSc0/Y1Nb2QD52dunWeP2+UvsHRKf2lJC/R6rmcTikoOKzte/z4ifT3+ya9IzCpf8vl5x/QluzetLaK11uh7autq5dlySmGnZuVy5eq+Hl/ena6VknBkUk9+wJ7Dj5s/sH9QZcZ9X6M4NuXEZWZuUnbPnasUJYkJYmMLTPW1tWH1L9zVZps2LBe2y4uPiufhodFRMTnG5D6uvuG5sjwZcbJ5toTbL/G/m5rez9hLnO7s8TtztJ9n9/vl76ah1Ne7+jxaSdgcHBQBYZy27atEfXY090jre8+aHWXJadEVCeY9u7+vz0PDanAUEbacyjm2RNsb952aNujn0fVeCgdjgQ5cvhQRHWrqmt4dA0zC6EEAAAAAAAAAAAAAAAAAAAAAAAAAIv5DeL1+N3Q4uwrAAAAAElFTkSuQmCC");
                background-size: 50px;
                background-position: var(--bg-offset-x) var(--bg-offset-y);
                pointer-events: none;
                user-select: none;
                opacity: .15;
                transform: rotate(30deg) scale(3);
            }

            & > div {
                zoom: 0.000000000001;

                transition: zoom 300ms ease-out;
                padding: 1rem;

                &.visible {
                    zoom: 1;
                }

                & > ul {
                    columns: 3;
                }
            }
            
            & > button {
                all: unset;
                height: 3.5rem;
                font-size: 1.4rem;
                text-align: center;
                width: 100%;
                user-select: none;

                transition: all 120ms ease-out;

                &:hover {
                    background-color: white;
                    color: black;
                }
            }
        }

        .dunnenlings-cunt {
            position: absolute;
            top: 0;
            left: 0;
            width: 0;
            height: 0;
        }
            
        .fl-dune-ripple {
            position: absolute;
            transform-origin: center center;
            scale: 0;
            z-index: 99999999998;

            transition: scale 100ms ease-out;

            &.grow {
                scale: .6;
                transition: scale 100ms ease-out;
            }
        }

        .fl-dune {
            --scale-mod: 1;

            position: absolute;
            transform-origin: center center;
            scale: 0;
            border-radius: 100px;
            z-index: 99999999999;

            user-select: none;

            transition: 
                scale ${duneShrinkDurationMs}ms ease-out;

            &.grow {
                scale: calc(1 * var(--scale-mod));
                transition: scale ${duneGrowDurationMs}ms ease-out;
            }

            &:hover {
            scale: 4;
            border-radius: 8px;
            }
        }

        .pbar {
            position: relative;
            box-sizing: border-box !important;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 5rem;
            height: fit-content;

            & * {
                box-sizing: border-box !important;
            }
        }

        .pbar::after {
            content: "";
            inset: 0;
            position: absolute;
            border-image-slice: 3;
            border-image-width: 6px;
            border-image-outset: 3;
            border-image-repeat: stretch stretch;
            border-image-source: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAADdJREFUGJWFjkEOACAMwqj//zOeTHBO5UQCbEWSbFuNALiFS+NYAG0hg/TbheeLZEn/haQuKvQEnw8YDYaI+MoAAAAASUVORK5CYII=);
            border-style: solid;
            border-color: white;
            pointer-events: none;
        }

        .pbar-header {
            font-size: 2rem;
            text-align: center;
            width: 100%;
            margin: 1rem;

            & .pbar-header-text,
            & .pbar-header-progress-text {
                mix-blend-mode: difference;
            }
            
            & .pbar-header-progress-text {
                display: inline-block;
                transform: scaleX(300%);
            }

            & img {
                z-index: 100;
                position: relative;
                vertical-align: center;
            }
        }

        .pbar-progress {
            position: absolute;
            overflow: hidden;
            inset: -5px;

            background-color: black;
            // border: 2px solid white;

            & > .pbar-progress-head {
                position: absolute;
                inset: 0;
                right: calc(100% - 100% * var(--progress));
                background-color: #ffff00;
            }
        }`)
})();