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
import './styles.css';
import { Dune, type DuneCtorArgs } from './Dune';
import { duneStareImg } from './vars';
import { jsonClone } from '../utils/jsonClone';

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = 1 / RAD2DEG;

export type DuneCfg = typeof duneCfg;
const duneCfg = {
    mp: Vector2.zero(),
    mpAbs: Vector2.zero(),

    dunesPerSec: {
        starting: 15,
        ending: 30
    },

    duneGrowDurationMs: 150,
    duneShrinkDurationMs: 100,

    duneSpawnRippleDurationMs: 100,

    speed: {
        min: 200,
        max: 500
    },

    lifetimeMs: {
        min: 800,
        max: 3000
    },

    trajectoryBend: {
        startRadians: 25 * DEG2RAD,
        intensityCurve: easeInSine,
        radOffsetMax: 50 * DEG2RAD
    }
}
const duneCfgInitial = jsonClone(duneCfg);

// ==============

let stateInit = false;
let contentRoot: HTMLElement | null = null;

let dunnenlingsCunt: HTMLElement | null = null;
const dunnenlings: Dune[] = [];

let linkHoldersBoundCount = 0;

const sliderCunt: HTMLElement = document.createElement('div');
sliderCunt.classList.add("dunnelings-slider-cunt");

const sliderToStateMap = new Map<HTMLInputElement, { valueLabel: HTMLElement }>();

// ==============

main();

// ==============

function makeSlider(label, value, min, max, step?) {
    const id = Math.random().toString();

    const cunt = createElementFromHTML(`\
<div>
    <label for="${id}">${label}</label><br>
    <input type="range" name="${id}" min="${min}" max="${max}" step="${step}" value=${value} />
    <span>${min}-${max}</span> • <span class="dunnelingls-slider-val-current">${value}</span>
</div>
`);
    const slider = cunt.querySelector<HTMLInputElement>('input');
    sliderCunt.append(cunt);
    
    const valueLabel = cunt.querySelector('span.dunnelingls-slider-val-current');
    slider.addEventListener('input', e => {
        valueLabel.innerText = e.target.value;
    });
    sliderToStateMap.set(slider, { valueLabel })

    return slider
}

function dirtySlider(slider: HTMLInputElement) {
    const state = sliderToStateMap.get(slider);
    if(!state)
        return;

    state.valueLabel.innerText = slider.value;
}

function main() {
    contentRoot = document.querySelector('.mw-parser-output');
    if (!contentRoot) return;

    const linkHolders = contentRoot.querySelectorAll('.pbox-link-holder');
    linkHolders.forEach(bindLinkHolder);

    if (!stateInit) {
        document.addEventListener('mousemove', e => {
            duneCfg.mp.x = e.clientX;
            duneCfg.mp.y = e.clientY;

            const bodyRect = document.body.getBoundingClientRect();

            duneCfg.mpAbs.x = e.clientX - bodyRect.left;
            duneCfg.mpAbs.y = e.clientY - bodyRect.top;
        });

        dunnenlingsCunt = document.createElement('div');
        dunnenlingsCunt.classList.add("dunnenlings-cunt")
        document.body.append(dunnenlingsCunt);

        const slidersCuntTarget = linkHolders[0];
        if (slidersCuntTarget) {
            slidersCuntTarget.before(sliderCunt);
        }

        const getSliderValue = (e: HTMLInputElement) => {
            return parseInt(e.value);
        }
        const getSliderValueFromArgs = (e: Event) => {
            return getSliderValue(e.target as HTMLInputElement);
        }
        const ensureSliderValueEqualToOrAbove = (slider: HTMLInputElement, value: number) => {
            const sliderValue = getSliderValue(slider);
            if(sliderValue < value) {
                slider.value = value.toString();
                dirtySlider(slider);
            }
        }

        const ensureSliderValueEqualToOrBelow = (slider: HTMLInputElement, value: number) => {
            const sliderValue = getSliderValue(slider);
            if(sliderValue > value) {
                slider.value = value.toString();
                dirtySlider(slider);
            }
        }

        const ensureRangedSlidersConstrained = (sliderMin: HTMLInputElement, sliderMax: HTMLInputElement) => {
            sliderMin.addEventListener('input', e => {
                const valueMin = getSliderValueFromArgs(e);
                ensureSliderValueEqualToOrAbove(sliderMax, valueMin);
            });

            sliderMax.addEventListener('input', e => {
                const valueMax = getSliderValueFromArgs(e);
                ensureSliderValueEqualToOrBelow(sliderMin, valueMax);
            });
        }

        const duneMin = makeSlider("Dune-o-min", duneCfgInitial.dunesPerSec.starting, 1, 250, 1);
        duneMin.addEventListener('input', e => duneCfg.dunesPerSec.starting = getSliderValueFromArgs(e));
        const duneMax = makeSlider("Dune-o-max", duneCfgInitial.dunesPerSec.ending, 1, 500, 1);
        duneMax.addEventListener('input', e => duneCfg.dunesPerSec.ending = getSliderValueFromArgs(e));
        ensureRangedSlidersConstrained(duneMin, duneMax);

        const duneSpeedMin = makeSlider("Dune init speed min", duneCfgInitial.speed.min, 0, 3000, 1);
        duneSpeedMin.addEventListener('input', e => duneCfg.speed.min = getSliderValueFromArgs(e));
        const duneSpeedMax = makeSlider("Dune init speed max", duneCfgInitial.speed.max, 0, 6000, 1);
        duneSpeedMax.addEventListener('input', e => duneCfg.speed.max = getSliderValueFromArgs(e));
        ensureRangedSlidersConstrained(duneSpeedMin, duneSpeedMax);

        const duneLifetimeMsMin = makeSlider("Dune lifetime ms min", duneCfgInitial.lifetimeMs.min, 1, 5000, 1);
        duneLifetimeMsMin.addEventListener('input', e => duneCfg.lifetimeMs.min = getSliderValueFromArgs(e));
        const duneLifetimeMsMax = makeSlider("Dune lifetime ms max", duneCfgInitial.lifetimeMs.max, 1, 10000, 1);
        duneLifetimeMsMax.addEventListener('input', e => duneCfg.lifetimeMs.max = getSliderValueFromArgs(e));
        ensureRangedSlidersConstrained(duneLifetimeMsMin, duneLifetimeMsMax);

        stateInit = true;
    }
}

function linkHolderBound() {
    linkHoldersBoundCount++;
    duneCfg.dunesPerSec.starting = duneCfgInitial.dunesPerSec.starting / linkHoldersBoundCount;
    duneCfg.dunesPerSec.ending = duneCfgInitial.dunesPerSec.ending / linkHoldersBoundCount;
}

function bindLinkHolder(linkHolder: HTMLElement) {
    // prefire just because
    // linkHolderBound();

    const title = linkHolder.dataset.title ?? "did you forget your title loser :voyager:"

    const linksTotal = linkHolder.children.length;
    const newLinks = linkHolder.querySelectorAll('a.new');
    const linksNewCount = newLinks.length;
    const progressT = 1 - (linksNewCount / linksTotal);
    // const progressT = 1;
    const progressPercentage = roundToDigit(progressT * 100, 2) + "%"

    const pbarWrapper = document.createElement("div");
    linkHolder.after(pbarWrapper);

    const pbarEl = createElementFromHTML<HTMLElement>(`\
    <div style="--progress: ${progressT};" class="pbar">
        <div class="pbar-progress"><div class="pbar-progress-head"></div></div>
        <br>
        <div class="pbar-header">
            ${duneStareImg}<span class="pbar-header-text">${title}</span>${duneStareImg}
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
        if (visible) {
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

        for (const link of [...newLinks]) {
            const href = (link as HTMLLinkElement).href;
            let page = href.split("/wiki/")[1] ?? "";
            page = page.split("?")[0] ?? "";
            page = replaceAll(page, "_", " ")

            if (page === "")
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

    const generateDuneCtorArgs = (): DuneCtorArgs => {
        const pborProgressedWidth = pbarAbsRect.w * progressT;
        const pborPendingWidth = pbarAbsRect.w * (1 - progressT);

        const initialYOffset = randomInRange(pbarAbsRect.h);
        const initialPos = new Vector2(pbarAbsRect.x - 20 + randomInRange(pborProgressedWidth), pbarAbsRect.y + initialYOffset);
        const targetPos = new Vector2(pbarAbsRect.x + pbarAbsRect.w - 20 - randomInRange(pborPendingWidth), pbarAbsRect.y + randomInRange(pbarAbsRect.h));
        let velSign = initialYOffset < pbarAbsRect.h / 2
            ? -1
            : 1;
        if (moveDunesAwayFromExpando) {
            velSign = -1;
        }

        const initialVelocity = Vector2.fromAngle(velSign * randomInRange(95 * DEG2RAD), randomInRange(duneCfg.speed.min, duneCfg.speed.max));
        // const initialVelocity = Vector2.fromAngle(Math.PI / 10, 500);
        const durationMs = randomInRange(duneCfg.lifetimeMs.min, duneCfg.lifetimeMs.max);

        return {
            initialPos,
            targetPos,
            initialVelocity,
            durationMs,
            dunnenlingsCunt,
            staticCfg: duneCfg
        }
    }

    const makeDune = () => {
        return new Dune(generateDuneCtorArgs());
    }
    const dunePool = new Pool<Dune>(makeDune, dune => dune.initialize(generateDuneCtorArgs()));

    let pbarBgOffset = new Vector2();

    let tsPrevious = 0;
    let toCreate = 0;
    const loop = (ts) => {
        const dt = (ts - tsPrevious) / 1000;

        // =====

        pbarBgOffset.add(new Vector2(3, 1.5).mult(dt));

        pbarExpando.style.setProperty('--bg-offset-x', pbarBgOffset.x + "px")
        pbarExpando.style.setProperty('--bg-offset-y', pbarBgOffset.y + "px");

        const toCreatePerSec = map(progressT, 0, 1, duneCfg.dunesPerSec.starting, duneCfg.dunesPerSec.ending);
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
}