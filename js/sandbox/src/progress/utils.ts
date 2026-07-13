
export function getElementAbsPosition(el) {
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

// Source - https://stackoverflow.com/a/494348
// Posted by Crescent Fresh, modified by community. See post 'Timeline' for change history
// Retrieved 2026-07-08, License - CC BY-SA 4.0

export function createElementFromHTML<T extends HTMLElement>(htmlString: string): T {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();

    // Change this to div.childNodes to support multiple top-level nodes.
    return div.firstChild as T;
}

