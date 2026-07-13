import { randomInRange } from '$utils/randomInRange';

/**
 * Rolls a random number and compares it to the given probability `chance` (from `0` to `1`).
 * 
 * @param chance The probability of success.
 * @param options Additional options for the dice roll.
 * @param options.dt Delta time to adjust the chance for.
 * @returns A boolean indicating success or failure based on the probability.
 */
export function diceRoll(chance: number, { dt = 1 }: { dt?: number } = {}): boolean {
    return randomInRange(0, 1) < (chance * dt);
}