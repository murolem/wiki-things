(() => {
    window.addEventListener("keydown", e => {
        if(e.key.toLocaleLowerCase() === "p") {
            playSound();
            for(let i = 0; i < 20; i++) {
                spawnPlushie();
            }
        }
    })

    const contentEl = document.querySelector('#content');
    let lowerBoundY;
    function calculateLowerBoundY() {
        lowerBoundY = document.body.scrollHeight;
        
        if(contentEl) {
            // todo make dynamic if needed
            const rect = contentEl.getBoundingClientRect();
            lowerBoundY = rect.bottom + window.scrollY;
        }
    }
    calculateLowerBoundY();
    window.addEventListener("resize", () => calculateLowerBoundY());

    let audioSoftLockStart = 1111111;
    let audioHardLockStart = 51111;
    
    let activePlaying = 0;
    function playSound() {
        if(activePlaying >= audioHardLockStart)
            return;

        let chanceToPlay = 1;
        if(activePlaying >= audioSoftLockStart) {
            chanceToPlay = map(activePlaying, audioSoftLockStart, audioHardLockStart, 1, 0);
        }

        if(chanceToPlay < Math.random())
            return;

        let audio = new Audio('https://static.wikitide.net/casualtiesunknownwiki/2/29/Plushie.ogg');
        audio.addEventListener("ended", () => activePlaying--)
        audio.play();
        activePlaying++;
    }

    let mousePos = [0, 0];
    document.addEventListener('mousemove', e => {
        mousePos[0] = window.scrollX + e.clientX;
        mousePos[1] = window.scrollY + e.clientY;
    });

    const els = [];
    function spawnPlushie() {
        let el = document.createElement('img');
        el.classList.add("plush")
        el.src = Math.random() < .9
            ? "https://static.wikitide.net/casualtiesunknownwiki/a/a1/Experimentplush.png"
            // jimmy 
            : "data:image/gif;base64,R0lGODlhGAAWAIcAAAAAAADL/wCm+AC1+QC9/wCW9wDK/wDM/wBc/0ZGRgBQvgCe/wCv/wCx+W21/wBIzwCD9QCB9QA4zAAzyADG/wC3/wCj/wCi/wCZ/wBg/wB6/wCM9gBT1wBW/zs7OwDH/wBO/wBUvwBOvAA7tABLugBMuwBCuABQvQA2sABbxABNvABIvQBWwAA4sgAzrQBcxQBKugA6tgAurX6+/wBHuACc9wBozABFzQBdxwArrQAlpwA/8ACs+QCo+ACq+ACR9gBv/wCH/wCP9gGv/wA6ygBo/wBMvQAqxgAfpABA8AA97wCP/wCL/wCJ9gCb94G//4C+/wBEzgBpzwBZ8wBF8Xu7/wB+9QA8sgBf/wBBtgC6/wK9/gCE9QCI/wCt/wCS54bB/wAwxwBQ0gBM0AAgwwBG8QBL8gCs/43E/4G+/wBAzABQ0QA8ywBS/wBb/wBHwgCC9Xm7/4XA/wAkxQBw9ABy9QBk8wArxQB13QBe8wAvyAAtywBX8gDA/wCG9gCA4QCq+QC6+gCP9wTF/ACR9wCz+YC9/wA6vQAy/wBa/wB+9gBY8gBC8AA07wBi8wB09AApxwBP0AApxgB14AB19QBj9AA7ywBQ/wA3zQB54AAzswAz8ACW+ACO9wCe+AC4+gCo+QCQ9gCm+QCY9wCK9gCF9gCt+QC7+gCZ+ACn+ACX9wCB9gC/+gC5+gCp+InD/wAwzABm/wA4/wBHzwBU/wBy/wBw/wBD/wBR/wC2/wCU/wCY/wvO/gCO9nS3/wG+/wC//wCd/wCQ93i6/5TJ/4LA/4K//4vD/wBC0QB7/wBa2ABX2ABJ/wO2/Tk5OQBn/3e5/wCp/wCl/wed+AvP/waK+ZPI/1ZWVmlpaSoqKgBA0ANy/QDE/xKq8QbO/6ampiwsLABz/wA7zgBV/wB3/wB5/wC4/wC8/wCS/wCu/wCn/ybT/8Tg/52dnZ/O/4jC/7Xa/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQFAAAAACwAAAAAGAAWAAAI/wABCByYBg0aMGAGKlzIUCEaYjwaSmzIY8ugLRMHVkmj0ILFAyC38AiWcSOYNMQ8DjrAi9fFkSWr+ELjDh67dQkSHHhZLaPAWNt08UjQ7psHkINGBslIC8G2YOCuYTsKspmFatsG1liIDASCZN3AeVhZ9eo2BwB4NGs2kMcGDmxAbKsWrNmWLc10pXEQS6BaqwDsWniLjFasZMEsWAjmKxYCBAIt8LBQ44tdkQWUxaW1LVmybbRCDyywYQOXP8Eqitxwg40ERLJuNYWskIvtPwUKKC5gZcyYG3fuSDgk0QqeDZNsc3lkhwOHMRL2aHpjw4bEGqTzUGnUiM2NMQBGZEwpkaJ8wwLBCnCQcGfOBO8CV5QIQb8hlw26uNjZM+cOG4UlBDjRIwTaQQUSOYwwn08K5cGHGUrokOAKITA4kHZUKAGAC5ooaOGHDAUEADs="
        document.body.append(el);

        const angle = -Math.PI / 2 + (Math.random() > .5 ? 1 : -1) * (Math.random() * Math.PI / 3);
        const mag = 300 + Math.random() * 1000;
        const velocity = [Math.cos(angle) * mag, Math.sin(angle) * mag];
        const rotation = Math.random() * Math.PI * 2;
        const angularVelocity = Math.random() * Math.PI * 2;
        let size = 40 + Math.random() * 40;
        if(Math.random() > .9) {
            size = 80 + Math.random() * 80;
        }
        el.style.setProperty("--size", size + "px");
        const radius = size / 2;
        const area = circleArea(size / 2);

        let pos = vCopy(mousePos);
        pos[0] -= size / 2;
        pos[1] -= size / 2;

        els.push({ 
            el, 
            pos, 
            velocity, 
            rotation, 
            angularVelocity, 
            size,
            radius,
            area,
            spawnedAtTs: Date.now(), 
            firstFrameDone: false, 
            removalScheduled: false 
        });
    }

    let velocityDecaySoftMag = 2;
    let velocityDecayHardMag = 1;

    // const physicsFps = 60;
    // const physicsDt = 1 / physicsFps;
    let previousLoopTs = 0;
    async function loop(loopTs) {
        const dt = (loopTs - previousLoopTs) / 1000;
        // const msTilNextPhysicsFrame = clamp(physicsDt - dt, 0, Infinity) * 1000;
        // console.log(msTilNextPhysicsFrame)
        // await sleep(msTilNextPhysicsFrame);
        const ts = Date.now()

        const drag = 0.99;

        let vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
        let vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)

        let toRemove = [];
        for(let i = 0; i < els.length; i++) {
            const item = els[i];
            item.velocity[1] += 9.8 * dt * 300;
            item.velocity[0] *= drag;
            item.velocity[1] *= drag;
            
            const velMag = vMag(item.velocity);
            if(velMag < velocityDecaySoftMag) {
                const decay = velMag < velocityDecayHardMag
                    ? 1
                    : map(velMag, velocityDecaySoftMag, velocityDecayHardMag, 0, 1);
                // !note: no dt used
                item.velocity[0] *= decay;
                item.velocity[1] *= decay;
            }

            item.pos[0] += item.velocity[0] * dt;
            item.pos[1] += item.velocity[1] * dt;

            const overflowMod = 1.2;
            const hardness = .2;
            if(item.pos[1] + item.size / 2 > lowerBoundY) {
                const overflow = item.pos[1] + item.size / 2 - lowerBoundY;
                item.pos[1] -= overflow * overflowMod;
                item.velocity[1] *= -1 + hardness;
            }

            if(item.pos[0] + item.size / 2 > vw) {
                const overflow = item.pos[0] + item.size / 2 - vw;
                item.pos[0] -= overflow * overflowMod;
                item.velocity[0] *= -1 + hardness;
            }

            if(item.pos[0] - item.size / 2 < 0) {
                const overflow = (item.pos[0] - item.size / 2) * -1;
                item.pos[0] += overflow * overflowMod;
                item.velocity[0] *= -1 + hardness;
            }

            // const collisionSoftDepth = 10;
            const friction = .3;
            for(let k = i + 1; k < els.length; k++) {
                const other = els[k];
                if(vMagBetweenTwo(item.pos, other.pos) < 300 /* max radius doubled */) {
                    const deltaToOther = vSubToNew(item.pos, other.pos);
                    const deltaToOtherMag = vMag(deltaToOther)
                    const overflowMagNeg = deltaToOtherMag - item.radius - other.radius;
                    if(overflowMagNeg < 0) {
                        // const intensity = overflowMagNeg < collisionSoftDepth
                            // ? 1
                            // : map(overflowMagNeg, 0, -collisionSoftDepth, 0, 1);

                        const areaTotal = item.area + other.area;
                        const energyRatioThis = item.area / areaTotal;
                        const energyRatioOther = other.area / areaTotal;
                        const deltaToOtherOverflow = vSetMag(vCopy(deltaToOther), deltaToOtherMag - item.radius - other.radius);
                        const deltaToOtherOverflowMag = vMag(deltaToOtherOverflow)
                        const resolvedDeltaForOther = vSetMag(vCopy(deltaToOtherOverflow), deltaToOtherOverflowMag * energyRatioOther);
                        const resolvedDeltaForThis = vSetMag(vCopy(deltaToOtherOverflow), deltaToOtherOverflowMag * energyRatioThis * -1);

                        vAdd(item.pos, resolvedDeltaForThis)
                        vAdd(other.pos, resolvedDeltaForOther)

                        item.velocity[0] -= item.velocity[0] * friction * dt;
                        item.velocity[1] -= item.velocity[1] * friction * dt;
                        other.velocity[0] -= other.velocity[0] * friction * dt;
                        other.velocity[1] -= other.velocity[1] * friction * dt;
                    }
                }
            }

            item.rotation += item.angularVelocity * dt;

            item.el.style.top = item.pos[1] + "px";
            item.el.style.left = item.pos[0] + "px";
            item.el.style.rotate = item.rotation + "rad";

            if(!item.firstFrameDone) {
                setTimeout(() => item.el.classList.add("an"), 1);
                item.firstFrameDone = true;
            }

            if(ts - item.spawnedAtTs > 5000 && !item.removalScheduled)
                toRemove.push(i);
        }

        for(const itemIdx of toRemove.reverse()) {
            const item = els[itemIdx];
            item.removalScheduled = true;
            item.el.classList.add("rem");
            setTimeout(() => {
                item.el.remove()
                els.splice(els.indexOf(item), 1);
            }, 350)
        }

        previousLoopTs = loopTs;
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    addCss(`\
.plush {
    position: absolute;
	width: var(--size);
	height: var(--size);
	object-fit: contain;
    scale: 0;
    image-rendering: pixelated;

    &.an {
        scale: 1;
        transition: scale 100ms ease;
        }
        
    &.rem {
        /* time also set in script */
        transition: scale 350ms ease-in;
        scale: 0
    }
}
        `)


    function addCss(style) {
        const el = document.createElement('style');
        el.innerHTML = style;
        document.head.append(el);
    }

    function map (number, inMin, inMax, outMin, outMax) {
        return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }

    function vMag(vec) {
        return Math.sqrt(vec[0] ** 2 + vec[1] ** 2);
    }

    function vMagBetweenTwo(vec1, vec2) {
        return Math.sqrt((vec1[0] - vec2[0]) ** 2, (vec1[1] - vec2[1]) ** 2);
    }

    function vSubToNew(vec1, vec2) {
        return [vec1[0] - vec2[0], vec1[1] - vec2[1]]
    }

    function vAdd(vec1, vec2) {
        vec1[0] += vec2[0]
        vec1[1] += vec2[1]
        return vec1;
    }

    function vAddToNew(vec1, vec2) {
        return [vec1[0] + vec2[0], vec1[1] + vec2[1]]
    }

    function vCopy(vec) {
        return [vec[0], vec[1]]
    }

    function vNorm(vec) {
        const mag = vMag(vec);
        vec[0] /= mag;
        vec[1] /= mag;
        return vec;
    }

    function vSetMag(vec, mag) {
        vNorm(vec);
        vec[0] *= mag;
        vec[1] *= mag;
        return vec;
    }

    function vInvert(vec) {
        vec[0] *= -1;
        vec[1] *= -1;
        return vec;
    }

    function clamp(num, min, max) {
         return Math.min(Math.max(num, min), max);
    }

    async function sleep(ms) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    function circleArea(radius) {
        return Math.PI * radius ** 2;
    }
})();