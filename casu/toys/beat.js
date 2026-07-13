(() => {
    const viewportHeight = window.innerHeight;
    
    const blurOverlay = document.createElement('div');
    blurOverlay.classList.add('overlay');
    document.body.append(blurOverlay);

    const imgWrapper = document.createElement('div')
    imgWrapper.classList.add("wawa-wrapper");
    document.body.append(imgWrapper);

    const img = document.createElement('img');
    img.classList.add('wawa')
    img.src = "https://static.wikitide.net/casualtiesunknownwiki/a/a1/Experimentplush.png";
    imgWrapper.append(img);

    const imgSizePx = 200;
    const imgSizePxHalf = imgSizePx / 2;
    
    imgWrapper.animate([
        { top: viewportHeight + "px" },
        { top: viewportHeight / 2 - imgSizePxHalf + "px" },
    ], {
        duration: 20000,
        easing: "ease",
        fill: 'forwards',
    })

    const beat = () => {
        const rotation = (Math.random() > .5 ? 1 : -1) * Math.random() * Math.PI / 12
        imgWrapper.animate([
            { transform: "scale(1) rotate(0rad)", },
            { transform: `scale(1.05) rotate(${rotation}rad)`, },
            { transform: "scale(1) rotate(0rad)", },
        ], {
            duration: 300,
            easing: "ease-out",
            fill: 'forwards',
        })
    }

    let beatHandle = null;
    setTimeout(() => { 
        beatHandle = setInterval(beat, 900)
        // setTimeout(() => clearInterval(beatHandle), 7000 + (6000 - 2000))
    }, 1)

    const wobbleOverMs = 7000;
    const endWobbleAtTs = Date.now() + wobbleOverMs;
    const wobble = getWobbleGenerator(wobbleOverMs, 100, .2);
    wobble.start();
    
    const loop = () => {
        const offsetPx = wobble.sample()
        imgWrapper.style.left = `calc(50% - ${imgSizePxHalf}px + ${offsetPx}px)`

        if(Date.now() < endWobbleAtTs + 500)
            requestAnimationFrame(loop);
        else
            imgWrapper.style.left = `calc(50% - ${imgSizePxHalf}px)`
    }
    requestAnimationFrame(loop);

    imgWrapper.animate([
        { filter: "blur(200px)" },
        { filter: "blur(0px)" },
    ], {
        duration: 6000,
        easing: "ease",
        fill: 'forwards',
    })

    blurOverlay.animate([
        { backdropFilter: "blur(0px)" },
        { backdropFilter: "blur(10px)" },
    ], {
        duration: 6000,
        easing: "ease-in",
        fill: 'forwards',
        delay: 3000
    })

    blurOverlay.animate([
        { backdropFilter: "blur(10px)" },
        { backdropFilter: "blur(0px)" },
    ], {
        duration: 6000,
        easing: "ease-in",
        fill: 'forwards',
        delay: 25000
    })


    imgWrapper.animate([
        { top: viewportHeight / 2 - imgSizePxHalf + "px", left: `calc(50% - ${imgSizePxHalf}px)`},
        { top: viewportHeight / 4 + "px", left: "130%" },
    ], {
        duration: 15000,
        easing: "ease-in-out",
        fill: 'forwards',
        delay: 22500
    })

    img.animate([
        { transform: "rotate(0deg)"  },
        { transform: "rotate(5000deg)" },
    ], {
        duration: 15000,
        easing: "ease-in-out",
        fill: 'forwards',
        delay: 22500
    })

    addCss(`\
.wawa-wrapper {
    position: fixed;
    width: fit-content;
    z-index: 9999999999;
    transform-origin: center center;
}
.wawa {
    image-rendering: pixelated;
    width: ${imgSizePx}px;
    height: auto;
    object-fit: contain;
    transform-origin: center center;
}

.overlay {
    position: fixed;
    inset: 0;
    z-index: 9999999;
}
`)

    function addCss(style) {
        const el = document.createElement('style');
        el.innerHTML = style;
        document.head.append(el);
    }

    function getWobbleGenerator(overPeriodMs, maxAmplitude, frequencyPerSecond) {
        let startTs = Date.now();
        return {
            start() {
                startTs = Date.now();
            },

            sample() {
                const msElapsed = Date.now() - startTs;
                const intensityT = 1 - clamp(msElapsed / overPeriodMs, 0, 1);
                const msPerPeriod = 1000 / frequencyPerSecond;
                const halfPeriodT = msElapsed / (msPerPeriod / 2) % 1;
                const amplitude = Math.cos(halfPeriodT * Math.PI * 2) * maxAmplitude * intensityT;
                return amplitude;
            }
        }
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(value, max))
    }
})();