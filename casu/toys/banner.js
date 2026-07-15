// Adds fake ad banners to the wiki! Well, currently only once made by Nezzy... please make more!
// Author: aliser
// Source code: below 
// mlep

(() => {
    // once every N pages
    const showABannerChance = chance(1/25);

    // empty = main namespace
    const targetNamespace = '';

    // todo add a weight system when more banners are added
    const bannerCfg = {
        url: "https://static.wikitide.net/casualtiesunknownwiki/4/43/Paw-supremacy-neural-booster.png",
        width: 728,
        height: 90,
        linkToPage: 'Neural booster'
    }

    // ======================

    let namespace = null;
    try {
        namespace = mw.config.get('wgCanonicalNamespace');
    } catch (err) {
        // pass
    }
    if (isNullish(namespace) || namespace !== targetNamespace)
        return;

    const firstHeader = document.querySelector('h1.firstHeading');
    if (!firstHeader)
        return;

    if (!chance(showABannerChance))
        return;

    const cunt = document.createElement('div');
    cunt.classList.add("paw-supremacy-cunt");
    firstHeader.before(cunt);

    const banner = makeBannerEl(bannerCfg);
    cunt.append(banner);

    addCss(`\
.paw-supremacy-cunt {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    max-height: 125px;
    margin-bottom: .4rem;
    border: 2px dashed var(--border);
    padding: 5px;
}

@keyframes bounce {
    0% {
        scale: 1;
    }

    25% {
        scale: 1.03;
    }

    50% {
        scale: 1;
    }

    75% { 
        scale: 0.97;
    }

    100% { 
        scale: 1;
    }
}

.paw-supremacy {
    /* set in the script */
    --barrel-roll-duration: 1ms;

    display: block !important;
    width: 100%;
    height: 100%;
    max-height: 125px;
    object-fit: contain;

    transition: 
        all 150ms ease-in-out,
        rotate var(--barrel-roll-duration) ease-in-out;

    &.paw-supremacy-loading {
        width: var(--loading-width);
        height: var(--loading-height);
    }

    &.paw-barrel-roll {
        rotate: 360deg;
    }

    &:hover {
        scale: 1.03;
        filter: brightness(105%);

        &.paw-with-bounce {
            animation: bounce 500ms linear forwards infinite;
        }
    }

    &:active {
        scale: 0.97;
        filter: brightness(108%);

        &.paw-with-bounce {
            animation: bounce 300ms linear forwards infinite;
        }
    }
}
        `)

    // ======================

    function makeBannerEl(banner) {
        const img = document.createElement('img');
        img.classList.add('paw-supremacy', 'paw-supremacy-loading');
        // make bouncy at some low chance
        if(chance(.3))
            img.classList.add('paw-with-bounce');

        img.src = banner.url;
        // we can't set both width and height attributes cuz otherwise it could match adblock rules.
        // and the network load request gets canceled. can't do much about that one so use css instead.
        img.style.setProperty('--loading-width', banner.width + "px");
        img.style.setProperty('--loading-height', banner.height + "px");

        if (img.complete)
            img.classList.remove('paw-supremacy-loading');
        else
            img.addEventListener('load', () => img.classList.remove('paw-supremacy-loading'), { once: true });

        if(banner.linkToPage) {
            const link = document.createElement('a');
            link.href = banner.linkToPage;

            // on rare chance do a barrel role <^>v
            if(chance(1/10)) {
                link.href = "javascript:void(0)";
                const barrelRollDurationMs = 750;
                img.style.setProperty("--barrel-roll-duration", barrelRollDurationMs + "ms");
                img.addEventListener('click', () => { 
                    img.classList.add('paw-barrel-roll');
                    setTimeout(() => {
                        link.href = banner.linkToPage;
                        link.click();
                    }, barrelRollDurationMs)
                 }, { once: true });
            }

            link.append(img);
            return link
        } else {
            return img;
        }
    }

    function chance(chance) {
        return Math.random() < chance;
    }

    function isNullish(value) {
        return value === undefined || value === null
    }

    function addCss(style) {
        const el = document.createElement('style');
        el.innerHTML = style;
        document.head.append(el);
    }
})();