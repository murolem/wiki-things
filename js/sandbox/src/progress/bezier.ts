// // Source - https://stackoverflow.com/a/58199971
// // Posted by Thomas
// // Retrieved 2026-07-10, License - CC BY-SA 4.0

// function cp(a, b, c) {
//   if (!a || !c) return b;
//   return {
//     x: b.x + (c.x - a.x) * .25,
//     y: b.y + (c.y - a.y) * .25
//   };
// }

// function bezier4(t, p1, c1, c2, p2) {
//     var u = 1 - t, fa = u * u * u, fb = 3 * u * u * t, fc = 3 * u * t * t, fd = t * t * t;
//     return {
//         x: p1.x * fa + c1.x * fb + c2.x * fc + p2.x * fd,
//         y: p1.y * fa + c1.y * fb + c2.y * fc + p2.y * fd
//     };
// }

// export function bezier(t, ...points) {
//     var last = points.length - 1;
//     t *= last;

//     if (t <= 0) return points[0];
//     if (t >= last) return points[last];
//     var i = Math.floor(t);
//     if (t === i) return points[i];

//     return bezier4(
//         t - i,
//         points[i],
//         cp(points[i - 1], points[i], points[i + 1]),
//         cp(points[i + 2], points[i + 1], points[i]),
//         points[i + 1]
//     );
// }