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
    dunesPerSec: {
        starting: 15,
        ending: 50
    },

    duneGrowDurationMs: 150,
    duneShrinkDurationMs: 100,

    duneSpawnRippleDurationMs: 100,

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

let mp = Vector2.zero();
let mpAbs = Vector2.zero();
let dunnenlingsCunt: HTMLElement | null = null;
const dunnenlings: Dune[] = [];

let linkHoldersBoundCount = 0;

// ==============

main();

// ==============

function main() {
    if (!stateInit) {
        document.addEventListener('mousemove', e => {
            mp.x = e.clientX;
            mp.y = e.clientY;

            const bodyRect = document.body.getBoundingClientRect();

            mpAbs.x = e.clientX - bodyRect.left;
            mpAbs.y = e.clientY - bodyRect.top;
        });

        dunnenlingsCunt = document.createElement('div');
        dunnenlingsCunt.classList.add("dunnenlings-cunt")
        document.body.append(dunnenlingsCunt);

        stateInit = true;
    }

    contentRoot = document.querySelector('.mw-parser-output');
    if (!contentRoot) return;

    const linkHolders = contentRoot.querySelectorAll('.pbox-link-holder');
    linkHolders.forEach(bindLinkHolder);
}

function linkHolderBound() {
    linkHoldersBoundCount++;
    duneCfg.dunesPerSec.starting = duneCfgInitial.dunesPerSec.starting / linkHoldersBoundCount;
    duneCfg.dunesPerSec.ending = duneCfgInitial.dunesPerSec.ending / linkHoldersBoundCount;
}

function bindLinkHolder(linkHolder: HTMLElement) {
    // prefire just because
    linkHolderBound();

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

        const initialVelocity = Vector2.fromAngle(velSign * randomInRange(95 * DEG2RAD), randomInRange(300, 500));
        // const initialVelocity = Vector2.fromAngle(Math.PI / 10, 500);
        const durationMs = randomInRange(500, 2000);

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