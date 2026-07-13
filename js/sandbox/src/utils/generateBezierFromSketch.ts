import { p5 } from '$src/vars';
import { bezier } from '$utils/bezier';
import p5Class from 'p5'

// example
// only spaces are allowed, no tabs
// should have newlines at both start and end
// any character is allowed as a marker, except space and newlines.
const curveSource = `
МЯУ              МЯУ      МЯУ
     МЯУ 
           МЯУ       МЯУ           МЯУ
`;

export function generateBezierFromSketch(sketch: string) {
    let rows = sketch
        .split('\n');

    // get rid of newlines on both start and end
    rows = rows.slice(1, rows.length - 1);


    const longestRowLength = rows
        .reduce((longestLength, row) => {
            return row.length > longestLength ? row.length : longestLength;
        }, 0);

    const xStepSize = 1 / longestRowLength;
    const yStepSize = 1 / rows.length;

    const points: p5Class.Vector[] = [];
    for (let colI = 0; colI < longestRowLength; colI++) {
        for (const [rowI, row] of rows.entries()) {
            const value = row[colI];
            if (value !== undefined && value !== ' ') {
                const pnt = p5.createVector(
                    colI * xStepSize,
                    (rows.length - rowI) * yStepSize
                );

                points.push(pnt);

                continue;
            }
        }
        const rowWithPointMatch = [...rows.entries()]
            .find(([_, row]) => {
                const value = row[colI];
                return value !== undefined && value !== ' ';
            });

        if (rowWithPointMatch) {
            points
        }
    }

    return function (t: number): number {
        return bezier(t, points);
    }
}