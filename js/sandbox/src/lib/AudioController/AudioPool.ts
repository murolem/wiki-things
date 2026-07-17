import type { AudioInstancer } from './AudioInstancer';

/** Audio pool contains different audio instancers. Maps audio URLs to each instancer. */
export type AudioPool = Map<string, AudioInstancer>;