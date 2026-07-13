export function easeInExpo(t) {
    return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
}

export function easeInSine(t) {
    return 1 - Math.cos((t * Math.PI) / 2);

}