// sourced from https://stackoverflow.com/a/31169371

// from: http://rosettacode.org/wiki/Evaluate_binomial_coefficients#JavaScript
export function binom(n: number, k: number): number {
    var coeff = 1;
    for (var i = n - k + 1; i <= n; i++) coeff *= i;
    for (var i = 1; i <= k; i++) coeff /= i;
    return coeff;
}

// based on: https://stackoverflow.com/questions/16227300
export function bezier(t: number, plist: Array<{ x: number, y: number }>): number {
    var order = plist.length - 1;

    var y = 0;
    var x = 0;

    for (let i = 0; i <= order; i++) {
        x = x + (binom(order, i) * Math.pow((1 - t), (order - i)) * Math.pow(t, i) * (plist[i].x));
        y = y + (binom(order, i) * Math.pow((1 - t), (order - i)) * Math.pow(t, i) * (plist[i].y));
    }

    return y;
    // return {
    //     x: x,
    //     y: y
    // };
}