import { p5 } from '$src/vars';
import { randomInRange } from '$utils/randomInRange';
import p5Class from 'p5';

export function areTwoCirclesColliding(pos1: p5Class.Vector, rad1: number, pos2: p5Class.Vector, rad2: number) {
    return p5Class.Vector.dist(pos1, pos2) < rad1 + rad2;
}

export function calculateGravity(pos1: p5Class.Vector, mass1: number, pos2: p5Class.Vector, mass2: number, distanceAffectionPower = 2): number {
    return (mass1 * mass2) / (p5Class.Vector.dist(pos1, pos2) ** distanceAffectionPower)
}

// thanks ai
export function sampleGradient(colorStops: string[], sampleNumber?: number): p5Class.Color {
    sampleNumber = sampleNumber === undefined
        ? randomInRange(1)
        : sampleNumber;

    // Ensure sampleNumber is clamped between 0 and 1
    sampleNumber = Math.max(0, Math.min(1, sampleNumber));

    // Calculate the total number of color stops
    const totalStops = colorStops.length;

    // Determine the position in the colorStops array
    const scaledIndex = sampleNumber * (totalStops - 1);
    const lowerIndex = Math.floor(scaledIndex);
    const upperIndex = Math.ceil(scaledIndex);

    // If sampleNumber is exactly 1, return the last color
    if (lowerIndex === upperIndex) {
        return p5.color(colorStops[lowerIndex]);
    }

    // Get the two colors to interpolate between
    const color1 = colorStops[lowerIndex];
    const color2 = colorStops[upperIndex];

    // Calculate the interpolation factor
    const t = scaledIndex - lowerIndex;

    // Return the interpolated color
    return p5.lerpColor(p5.color(color1), p5.color(color2), t);
}