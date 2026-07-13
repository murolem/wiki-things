(() => {
    var RAD2DEG = 180 / Math.PI;
    var DEG2RAD = 1 / RAD2DEG;

    const dunesPerSec = {
        starting: 3,
        get ending() { return this.starting; }
    }

    const duneGrowDurationMs = 150;
    const duneShrinkDurationMs = 500;

    const trajectoryBend = {
        startRadians: 10 * DEG2RAD,
        intensityCurve: easeInSine,
        radOffsetMax: 30 * DEG2RAD
    }

    // ================

    const bezier = (() => {
        // Source - https://stackoverflow.com/a/58199971
        // Posted by Thomas
        // Retrieved 2026-07-10, License - CC BY-SA 4.0

        return function bezier4(t, p1, c1, c2, p2) {
            var u = 1 - t, fa = u * u * u, fb = 3 * u * u * t, fc = 3 * u * t * t, fd = t * t * t;
            return {
                x: p1.x * fa + c1.x * fb + c2.x * fc + p2.x * fd,
                y: p1.y * fa + c1.y * fb + c2.y * fc + p2.y * fd
            };
        }

        function bezier(t, ...points) {
            var last = points.length - 1;
            t *= last;

            if (t <= 0) return points[0];
            if (t >= last) return points[last];
            var i = Math.floor(t);
            if (t === i) return points[i];

            return bezier4(
                t - i,
                points[i],
                cp(points[i - 1], points[i], points[i + 1]),
                cp(points[i + 2], points[i + 1], points[i]),
                points[i + 1]
            );
        }

    })();

    class Vector2 {
        x;
        y;
        constructor(...args) {
            this.set(...args);
        }
        get 0() {
            return this.x;
        }
        set 0(value) {
            this.x = value;
        }
        get 1() {
            return this.y;
        }
        set 1(value) {
            this.y = value;
        }
        get u() {
            return this.x;
        }
        set u(value) {
            this.x = value;
        }
        get v() {
            return this.y;
        }
        set v(value) {
            this.y = value;
        }
        get max() {
            return Math.max(this.x, this.y);
        }
        get min() {
            return Math.min(this.x, this.y);
        }
        get sqrMag() {
            return Math.pow(this.x, 2) + Math.pow(this.y, 2);
        }
        get mag() {
            return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
        }
        set mag(value) {
            value <= 0 ? this.set() : this.normalize().mult(value);
        }
        get angle() {
            return Math.atan2(this.y, this.x);
        }
        set angle(value) {
            this.rotateTo(value);
        }
        set(arg1, arg2) {
            if (arg1 === undefined) {
                this.x = this.y = 0;
            } else if (typeof arg1 === "number") {
                if (arg2 === undefined) {
                    this.x = this.y = arg1;
                } else {
                    this.x = arg1;
                    this.y = arg2;
                }
            } else {
                this.x = arg1.x;
                this.y = arg1.y;
            }
            return this;
        }
        add(...args) {
            switch (args.length) {
                case 1:
                    if (typeof args[0] === "number") {
                        this.x += args[0];
                        this.y += args[0];
                    } else {
                        this.x += args[0].x;
                        this.y += args[0].y;
                    }
                    break;
                default:
                    this.x += args[0];
                    this.y += args[1];
                    break;
            }
            return this;
        }
        sub(...args) {
            switch (args.length) {
                case 1:
                    if (typeof args[0] === "number") {
                        this.x -= args[0];
                        this.y -= args[0];
                    } else {
                        this.x -= args[0].x;
                        this.y -= args[0].y;
                    }
                    break;
                default:
                    this.x -= args[0];
                    this.y -= args[1];
                    break;
            }
            return this;
        }
        mult(...args) {
            switch (args.length) {
                case 1:
                    if (typeof args[0] === "number") {
                        this.x *= args[0];
                        this.y *= args[0];
                    } else {
                        this.x *= args[0].x;
                        this.y *= args[0].y;
                    }
                    break;
                default:
                    this.x *= args[0];
                    this.y *= args[1];
                    break;
            }
            return this;
        }
        div(...args) {
            switch (args.length) {
                case 1:
                    if (typeof args[0] === "number") {
                        this.x /= args[0];
                        this.y /= args[0];
                    } else {
                        this.x /= args[0].x;
                        this.y /= args[0].y;
                    }
                    break;
                default:
                    this.x /= args[0];
                    this.y /= args[1];
                    break;
            }
            return this;
        }
        setMag(arg) {
            this.mag = typeof arg === "number" ? arg : arg.mag;
            return this;
        }
        rotateTo(arg) {
            arg = typeof arg === "number" ? arg : arg.angle;
            return this.set(Math.cos(arg) * this.mag, Math.sin(arg) * this.mag);
        }
        rotateBy(arg) {
            arg = typeof arg === "number" ? arg : arg.angle;
            return this.set(this.x * Math.cos(arg) - this.y * Math.sin(arg), this.x * Math.sin(arg) + this.y * Math.cos(arg));
        }
        normalize() {
            return this.mag > 0 ? this.div(this.mag) : this;
        }
        negate() {
            return this.set(-this.x, -this.y);
        }
        isEquals(vec) {
            return this.x === vec.x && this.y === vec.y;
        }
        copy() {
            return new Vector2(this.x, this.y);
        }
        clamp(...args) {
            switch (args.length) {
                case 0:
                    this.set(Math.min(Math.max(this.x, 0), 1), Math.min(Math.max(this.y, 0), 1));
                    break;
                case 1:
                    args[0] >= 0 ? this.set(Math.min(Math.max(this.x, 0), args[0]), Math.min(Math.max(this.y, 0), args[0])) : this.set(Math.max(Math.min(this.x, 0), args[0]), Math.max(Math.min(this.y, 0), args[0]));
                    break;
                case 3:
                case 2:
                    args[1] >= args[0] ? this.set(Math.min(Math.max(this.x, args[0]), args[1]), Math.min(Math.max(this.y, args[0]), args[1])) : this.set(Math.min(Math.max(this.x, args[1]), args[0]), Math.min(Math.max(this.y, args[1]), args[0]));
                    break;
                default:
                    this.set(args[1] >= args[0] ? Math.min(Math.max(this.x, args[0]), args[1]) : Math.min(Math.max(this.x, args[1]), args[0]), args[3] >= args[2] ? Math.min(Math.max(this.y, args[2]), args[3]) : Math.min(Math.max(this.y, args[3]), args[2]));
                    break;
            }
            return this;
        }
        round() {
            return this.set(Math.round(this.x), Math.round(this.y));
        }
        ceil() {
            return this.set(Math.ceil(this.x), Math.ceil(this.y));
        }
        floor() {
            return this.set(Math.floor(this.x), Math.floor(this.y));
        }
        mod(...args) {
            if (args.length === 1) {
                this.set(this.x % args[0], this.y % args[0]);
            } else {
                this.set(this.x % args[0], this.y % args[1]);
            }
            return this;
        }
        lerp(vec1, vec2, t) {
            return Vector2.lerp(this, vec1, vec2, t);
        }
        static add(...vecs) {
            return vecs.slice(1).reduce((accum, vector) => accum.add(vector), vecs[0].copy());
        }
        static sub(...vecs) {
            return vecs.slice(1).reduce((accum, vector) => accum.sub(vector), vecs[0].copy());
        }
        static mult(...vecs) {
            return vecs.slice(1).reduce((accum, vector) => accum.mult(vector), vecs[0].copy());
        }
        static div(...vectors) {
            return vectors.slice(1).reduce((accum, vector) => accum.div(vector), vectors[0].copy());
        }
        static dist(vec1, vec2) {
            return Math.hypot(vec2.x - vec1.x, vec2.y - vec1.y);
        }
        static fromAngle(angleOfRadians, length = 1) {
            return length <= 0 ? new Vector2 : new Vector2(Math.cos(angleOfRadians) * length, Math.sin(angleOfRadians) * length);
        }
        static angleBetween(vec1, vec2) {
            return Math.acos((vec1.x * vec2.x + vec1.y * vec2.y) / (Math.sqrt(Math.pow(vec1.x, 2) + Math.pow(vec1.y, 2)) * Math.sqrt(Math.pow(vec2.x, 2) + Math.pow(vec2.y, 2))));
        }
        static angleBetweenSigned(vec1, vec2) {
            const tempMess = vec2.angle - vec1.angle;
            return Math.abs(tempMess) > Math.PI ? (Math.PI * 2 - Math.abs(tempMess)) * -Math.sign(tempMess) : tempMess;
        }
        static dot(vec1, vec2) {
            return vec1.mag * vec2.mag * Math.cos(Vector2.angleBetween(vec1, vec2));
        }
        static lerp(vecOut, vec1, vec2, t) {
            return vecOut.set(vec1.x + (vec2.x - vec1.x) * t, vec1.y + (vec2.y - vec1.y) * t);
        }
        static zero() {
            return new Vector2;
        }
        static randomWithLength(length = 1) {
            return Vector2.fromAngle(Math.random() * Math.PI * 2, length);
        }
        static random(multiplier = 1) {
            return new Vector2((Math.random() * 2 - 1) * multiplier, (Math.random() * 2 - 1) * multiplier);
        }
    }


    // ================

    let mp = { x: 0, y: 0 }
    let mpAbs = { x: 0, y: 0 }

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
    const linksNew = linkHolder.querySelectorAll('a.new').length;
    const progressT = 1 - (linksNew / linksTotal);
    const progressPercentage = roundToDigit(progressT * 100, 2) + "%"

    const duneStareImg = `<img width=40 height=40 style="width: 40px; height: 40px; object-fit: contain;" src="https://static.wikitide.net/casualtiesunknownwiki/c/ca/De_dune_stare.webp" />`

    /** @type {HTMLDivElement} */
    const pbarEl = createElementFromHTML(`\
    <div style="--progress: ${progressT};" class="pbar">
        <div class="pbar-progress"><div class="pbar-progress-head"></div></div>
        <br>
        <div class="pbar-header">
            ${duneStareImg}<span class="pbar-header-text">Item Pages Creation Progress</span>${duneStareImg}
            <br>
            <span class="pbar-header-progress-text">${progressPercentage}</span>
        </div>
    </div>`)

    contentRoot.append(pbarEl);



    let tsPrevious = 0;
    let toCreate = 0;
    const loop = (ts) => {
        const dt = (ts - tsPrevious) / 1000;

        // =====

        const toCreatePerSec = map(easeInExpo(progressT) * progressT, 0, 1, dunesPerSec.starting, dunesPerSec.ending);
        toCreate += toCreatePerSec * dt;

        // create

        const pbarAbsRect = getElementAbsPosition(pbarEl);

        for (let i = 1; i < toCreate; i++) {
            const initialPos = { x: pbarAbsRect.x - 38, y: pbarAbsRect.y + pbarAbsRect.h / 2 }
            const targetPos = { x: pbarAbsRect.x + pbarAbsRect.w - 40, y: pbarAbsRect.y + pbarAbsRect.h / 2 }
            const initialVelocity = vecFromAngle(randomSign() * randomInRange(Math.PI / 5), randomInRange(200, 600));
            const durationMs = randomInRange(500, 1500);

            const dune = new Dune(initialPos, targetPos, initialVelocity, durationMs);
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
            }
        }

        // =====

        requestAnimationFrame(loop);
        tsPrevious = ts;
    }
    requestAnimationFrame(loop);

    class Dune {
        targetPos;
        initialPos;
        initVelocity;
        t = 0;
        /** @type {HTMLImageElement} */
        el;

        shrinkQueued = false;

        constructor(initialPos, targetPos, initVelocity, durationMs) {
            this.initialPos = initialPos;
            this.targetPos = targetPos;
            this.initVelocity = initVelocity;
            this.durationMs = durationMs;

            const endingYOffset = randomInRange(-30, 30);
            this.targetPos.y += endingYOffset;

            const initPos = this.initialPos;
            const c1 = { ...initPos };
            c1.x += this.initVelocity.x;
            c1.y += this.initVelocity.y;
            const endPos = this.targetPos;
            const c2 = bezier(.7, initPos, c1, endPos, endPos);

            // point from start to c1
            const startToC1Delta = subVecToNew(c1, initPos);
            const startToC1Heading = vecHeading(startToC1Delta)
            // point from end to c2
            const endToC2Delta = subVecToNew(c2, endPos);
            const endToC2Heading = vecHeading(endToC2Delta)
            this.sampleIdealPosition = t => {
                let c1Final = c1;

                const startToMp = subVecToNew(mpAbs, initPos)
                const startToMpHeading = vecHeading(startToMp);
                const endToMp = subVecToNew(mpAbs, initPos)
                const endToMpHeading = vecHeading(endToMp);

                // diff between current heading and to mouse heading
                const startToC1ToMpHeadingDiff = startToMpHeading - startToC1Heading;
                // const endToMpHeadingDeltaWithCp2 = endToMpHeading - endToC2Heading;
                if (Math.abs(startToC1ToMpHeadingDiff) < trajectoryBend.startRadians) {
                    let intensityT = 1 - (Math.abs(startToC1ToMpHeadingDiff) / trajectoryBend.startRadians);
                    intensityT = trajectoryBend.intensityCurve(intensityT);
                    const bendRads = trajectoryBend.radOffsetMax * intensityT * Math.sign(startToC1ToMpHeadingDiff);

                    const newStartToC1Delta = rotateVecBy(copyVec(startToC1Delta), bendRads);
                    c1Final = addVec(copyVec(initPos), newStartToC1Delta);
                    console.log(bendRads, startToC1Heading, vecHeading(newStartToC1Delta))
                }

                return bezier(this.t, initPos, c1Final, c2, endPos)
            };

            this.el = createElementFromHTML(duneStareImg);
            this.el.classList.add("fl-dune");
            setTimeout(() => this.el.classList.add("grow"), 1);
        }

        tickAndDraw(dt) {
            const tickTElapsed = dt * 1000 / this.durationMs;
            const msElapsedTotal = tickTElapsed * this.durationMs;
            if (!this.shrinkQueued && msElapsedTotal >= this.durationMs - duneShrinkDurationMs) {
                setTimeout(() => this.el.classList.remove("grow"), 1);
                this.shrinkQueued = true;
            }

            this.t += tickTElapsed;
            this.t = clamp(this.t, 0, 1);


            const idealPosition = this.sampleIdealPosition(this.t);
            const yOffsetFromCenteral = Math.abs(this.initialPos.y - idealPosition.y);
            // this.el.style.setProperty("--scale-mod", 1 + Math.pow(yOffsetFromCenteral / 100, 2))

            this.el.style.left = idealPosition.x + "px";
            this.el.style.top = idealPosition.y + "px";

            const done = this.t === 1;
            return done;
        }
    }

    addCss(`\
        .dunnenlings-cunt {
            position: absolute;
            top: 0;
            left: 0;
            width: 0;
            height: 0;
        }

        .fl-dune {
            --scale-mod: 1;

            position: absolute;
            transform-origin: center center;
            scale: 0;

            transition: scale ${duneShrinkDurationMs}ms ease-out;

            &.grow {
                scale: calc(1 * var(--scale-mod));
                transition: scale ${duneGrowDurationMs}ms ease-out;
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
                content: '';
                position: absolute;
                inset: 0;
                right: calc(100% - 100% * var(--progress));
                background-color: #ffff00;
            }
        }`)





    function addCss(styles) {
        const el = document.createElement('style');
        el.innerHTML = styles;
        document.head.append(el);
    }

    // Source - https://stackoverflow.com/a/494348
    // Posted by Crescent Fresh, modified by community. See post 'Timeline' for change history
    // Retrieved 2026-07-08, License - CC BY-SA 4.0

    function createElementFromHTML(htmlString) {
        var div = document.createElement('div');
        div.innerHTML = htmlString.trim();

        // Change this to div.childNodes to support multiple top-level nodes.
        return div.firstChild;
    }

    function roundToDigit(value, digits) {
        const factor = Math.pow(10, digits);

        return Math.round(value * factor) / factor;
    }

    function easeInExpo(t) {
        return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
    }

    function easeInSine(t) {
        return 1 - Math.cos((t * Math.PI) / 2);

    }

    function randomSign() {
        return Math.random() > .5 ? 1 : -1
    }

    function randomInRange(low, high) {
        if (Array.isArray(low)) {
            if (low.length < 2)
                throw new Error("expected 2 items for range, got: " + low.length);
            high = low[1];
            low = low[0];
        } else if (high === undefined) {
            // only high arg is provided
            high = low;
            low = 0;
        }

        return low + Math.random() * (high - low);
    }

    function clamp(value, min, max) {
        return Math.max(Math.min(value, max), min);
    }

    function map(number, fromMin, fromMax, toMin, toMax) {
        return toMin + (number - fromMin) * ((toMax - toMin) / (fromMax - fromMin));
    }

    function getElementAbsPosition(el) {
        const bodyRect = document.body.getBoundingClientRect();
        const elemRect = el.getBoundingClientRect();
        const yOffset = elemRect.top - bodyRect.top;
        const xOffset = elemRect.left - bodyRect.left;

        return {
            x: xOffset,
            y: yOffset,
            w: elemRect.width,
            h: elemRect.height
        }
    }


})();