/** Clones object using json.stringify and json.parse. */
export function jsonClone<T extends object>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}