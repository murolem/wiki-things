export function randomInRange(high: number): number;
export function randomInRange(low: number, high: number): number;
export function randomInRange(range: [number, number]): number;
export function randomInRange(low: number | [number, number], high?: number): number {
  if (Array.isArray(low)) {
    high = low[1];
    low = low[0];
  } else if (high === undefined) {
    // only high arg is provided
    high = low;
    low = 0;
  }

  return low + Math.random() * (high! - low);
}


export function randomSign(): number {
  return Math.random() > .5 ? 1 : -1
}