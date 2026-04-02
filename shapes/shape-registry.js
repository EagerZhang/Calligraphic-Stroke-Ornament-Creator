/**
 * Ornament shape library — edit this file to add, remove, or replace shapes.
 *
 * How it works
 * ------------
 * - ORNAMENT_SHAPE_ORDER: palette order (left to top-to-bottom on desktop).
 * - ORNAMENT_SHAPES[id]: one entry per shape.
 *
 * Palette (sidebar preview)
 * - palette.viewBox: string for the <svg viewBox="..."> of the 48×48 icon.
 * - palette.innerHTML: SVG children only (paths, circles, groups…). Use
 *   currentColor for fills/strokes so shapes follow the global “Shape color”
 *   control (see :root --ornament-shape-color in styles.css).
 *
 * Canvas (dragged instances)
 * - canvas.kind === "sourcePath" — path from a design file with its own
 *   coordinate system. Set sourceWidth / sourceHeight from the original
 *   viewBox, pathD from the path, targetSize ≈ on-canvas height in user units
 *   (other primitives use ~52). Optional fill (default currentColor via fragment).
 * - canvas.kind === "fragment" — small snippet centered on (0,0), same coords
 *   as the live canvas uses for built-in shapes.
 *
 * Optional source file (for your reference; not loaded at runtime):
 * - A-Arch path matches svg/a-arch-sharproman.svg (Illustrator export).
 */
(function (global) {
  "use strict";

  var A_ARCH_D =
    "M164.6,677.8c-76.2-269.6-92.3-454.4-7.8-579.6C245.8-33.6,335.8-11.5,390.8,42.1c35.7,35.1,42.9,98,35.5,166.2l-4.8.9c-2.3-37.5-19.6-63-38.9-81.5-42.3-39.6-121-41.6-188.2,57.9-69.1,102.4-74.7,235.4-18.9,476l18.6,70.6c36,138.9,84.7,283.6,182.8,543.1,7.2,20,12.8,32.1,10.3,35.9-3.8,5.7-8.3,4.1-25.6-13.2-168.5-167.6-131-122.6-306.6-318.5-22.1-24.6-39-65-50.7-117.1-2.5-12.7-4-24.8-4.2-34.6l6-8.9c1-1.5,3-1.6,4.5-.6s0,0,0,0c255.1,282.7,216.3,243.7,319.7,356.3-67.5-178.1-109.9-307.5-146-429.9l-19.6-67.1Z";

  global.ORNAMENT_SHAPE_ORDER = [
    "a-arch",
    "ring",
    "square",
    "triangle",
    "diamond",
    "star",
    "arc",
    "leaf",
  ];

  global.ORNAMENT_SHAPES = {
    "a-arch": {
      label: "A-Arch",
      title: "A-Arch",
      palette: {
        viewBox: "-26 -26 52 52",
        innerHTML:
          '<g transform="translate(-214.45 -655.65) scale(0.039654)"><path fill="currentColor" d="' +
          A_ARCH_D +
          '"/></g>',
      },
      canvas: {
        kind: "sourcePath",
        pathD: A_ARCH_D,
        sourceWidth: 428.9,
        sourceHeight: 1311.3,
        targetSize: 52,
      },
    },

    ring: {
      label: "Ring",
      title: "Ring",
      palette: {
        viewBox: "0 0 48 48",
        innerHTML:
          '<circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="4"/>',
      },
      canvas: {
        kind: "fragment",
        html:
          '<circle cx="0" cy="0" r="24" fill="none" stroke="currentColor" stroke-width="5"/>',
      },
    },

    square: {
      label: "Square",
      title: "Square",
      palette: {
        viewBox: "0 0 48 48",
        innerHTML: '<rect x="8" y="8" width="32" height="32" rx="2" fill="currentColor"/>',
      },
      canvas: {
        kind: "fragment",
        html:
          '<rect x="-22" y="-22" width="44" height="44" rx="3" fill="currentColor"/>',
      },
    },

    triangle: {
      label: "Triangle",
      title: "Triangle",
      palette: {
        viewBox: "0 0 48 48",
        innerHTML: '<polygon points="24,6 42,40 6,40" fill="currentColor"/>',
      },
      canvas: {
        kind: "fragment",
        html: '<polygon points="0,-26 23,20 -23,20" fill="currentColor"/>',
      },
    },

    diamond: {
      label: "Diamond",
      title: "Diamond",
      palette: {
        viewBox: "0 0 48 48",
        innerHTML: '<polygon points="24,4 44,24 24,44 4,24" fill="currentColor"/>',
      },
      canvas: {
        kind: "fragment",
        html: '<polygon points="0,-28 26,0 0,28 -26,0" fill="currentColor"/>',
      },
    },

    star: {
      label: "Star",
      title: "Star",
      palette: {
        viewBox: "0 0 48 48",
        innerHTML:
          '<polygon points="24,2 29.5,17.5 46,17.5 33,27.5 38,44 24,34 10,44 15,27.5 2,17.5 18.5,17.5" fill="currentColor"/>',
      },
      canvas: {
        kind: "fragment",
        html:
          '<polygon points="0,-26 6,-8 25,-8 10,4 16,24 0,14 -16,24 -10,4 -25,-8 -6,-8" fill="currentColor"/>',
      },
    },

    arc: {
      label: "Arc",
      title: "Arc",
      palette: {
        viewBox: "0 0 48 48",
        innerHTML:
          '<path d="M 8 36 A 16 16 0 0 1 40 36" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
      },
      canvas: {
        kind: "fragment",
        html:
          '<path d="M -28 18 A 28 28 0 0 1 28 18" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
      },
    },

    leaf: {
      label: "Leaf",
      title: "Leaf",
      palette: {
        viewBox: "0 0 48 48",
        innerHTML:
          '<ellipse cx="24" cy="24" rx="10" ry="18" transform="rotate(-25 24 24)" fill="currentColor"/>',
      },
      canvas: {
        kind: "fragment",
        html:
          '<ellipse cx="0" cy="0" rx="14" ry="26" transform="rotate(-28)" fill="currentColor"/>',
      },
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
