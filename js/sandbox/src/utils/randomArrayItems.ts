/** 
 * Returns `count` random array items.
 * 
 * Items can repeat.
 * 
 * Corners:
 * - If `array` is empty, returns an empty array.
 * - If `count` is <= 0, returns an empty array.
*/
export function randomArrayItems<T>(array: T[], count: number): T[] {
    if (array.length === 0 || count <= 0) {
        return [];
    }

    const items = [];
    for (let i = 0; i < count; i++) {
        items.push(array[Math.floor(Math.random() * array.length)]);
    }

    return items;
}