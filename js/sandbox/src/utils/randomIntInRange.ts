import { randomInRange } from './randomInRange';

export function randomIntInRange(high: number): number;
export function randomIntInRange(low: number, high: number): number;
export function randomIntInRange(range: [number, number]): number;
export function randomIntInRange(...args: any[]): number {
  return Math.round(randomInRange.apply(null, args as any));
}