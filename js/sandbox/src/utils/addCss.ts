export function addCss(style: string): void {
    const el = document.createElement('style');
    el.innerHTML = style;
    document.head.append(el);
}