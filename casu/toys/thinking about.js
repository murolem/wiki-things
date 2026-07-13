(() => {
    const row = document.querySelector('.druid-grid-section-Interaction > .druid-grid');
    row.classList.add("wawa");
    
    const lastTs = document.timeline.currentTime;
    let total = 0;
    let avatar = null;
    let stop3Reached = false;
    const loop = (ts) => {
        const dt = (ts - lastTs) / 1000;

        const stop1 = 40 + 40 + 5;
        const stop2 = stop1 + 150;

        if(!stop3Reached && total < stop1)
            total += dt / 10;
        else if (!stop3Reached && total < stop2) {
            // pass
            total += dt / 10;
        } else {
            stop3Reached = true;
            total -= dt / 5;
        }


        row.style.paddingRight = clamp(total, -Infinity, 40 + 10 * 2) + "px";
        
        avatar ??= spawnAvatar(row);
        avatar.style.right = clamp(-40 + total, -Infinity, 0 + 10) + "px";
        requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop);

    

    addCss(`\
.druid-grid {
    position: relative;
}

.druid-grid-section-Interaction {
overflow: hidden;
}

.wawa-avatar {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translate(0, -50%);

    --chat-avatar-size: 40px;

    border-radius: 10rem;
    cursor: pointer;
    flex: 0 0 auto;
    height: var(--chat-avatar-size);
    inset-inline-start: var(--custom-message-margin-horizontal);
    margin-top: calc(4px - var(--custom-message-spacing-vertical-container-cozy));
    overflow: hidden;
    pointer-events: none;
    position: absolute;
    -webkit-user-select: none;
    -moz-user-select: none;
    user-select: none;
    width: var(--chat-avatar-size);
    z-index: 1;
}
.`)

    function spawnAvatar(root) {
        var img = new Image();
        img.classList.add("wawa-avatar")
        img.src = "data:image/octet-stream;base64,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";
        root.append(img)
        return img;
    }

    function addCss(styles) {
        const el = document.createElement('style');
        el.innerHTML = styles;
        document.head.append(el);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value))
    }
})();