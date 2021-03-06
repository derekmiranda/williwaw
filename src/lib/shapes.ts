import { Point } from "../types";
import { rotate } from "./utils";

export function player(): Point[] {
  return [
    { x: -0.25, y: -0.25 },
    { x: -0.5, y: 0 },
    { x: 0, y: 0.3 },
    { x: 0.5, y: 0 },
    { x: 0.25, y: -0.25 },
    { x: 0.4, y: 0 },
    { x: 0, y: 0.1 },
    { x: -0.4, y: 0 },
  ];
}

export function plus(): Point[] {
  return [
    // start from right side
    { x: 0.5, y: 0 },
    { x: 0.5, y: 0.25 },
    { x: 0.25, y: 0.25 },
    { x: 0.25, y: 0.5 },
    { x: 0, y: 0.5 },
    { x: -0.25, y: 0.5 },
    { x: -0.25, y: 0.25 },
    { x: -0.5, y: 0.25 },
    { x: -0.5, y: 0 },
    { x: -0.5, y: -0.25 },
    { x: -0.25, y: -0.25 },
    { x: -0.25, y: -0.5 },
    { x: 0, y: -0.5 },
    { x: 0.25, y: -0.5 },
    { x: 0.25, y: -0.25 },
    { x: 0.5, y: -0.25 },
  ];
}

const _circleMemo = {};
export function circle(segments) {
  if (!_circleMemo[segments]) {
    const segmentAngle: number = (2 * Math.PI) / segments;
    const pts = [];
    for (let i = 0; i < segments; i++) {
      const angle = segmentAngle * i;
      pts.push({
        x: 0.5 * Math.cos(angle),
        y: 0.5 * Math.sin(angle),
      });
    }
    _circleMemo[segments] = pts;
  }
  return _circleMemo[segments]; //.slice()
}

export function explosion(): Point[] {
  const outerPoints = circle(7);
  const innerPoints = outerPoints.map(({ x, y }) => {
    const rotated: Point = rotate(x, y, Math.PI / 4);
    return {
      x: 0.5 * rotated.x,
      y: 0.5 * rotated.y,
    };
  });

  const explosionPts = [];
  for (let i = 0; i < outerPoints.length; i++) {
    explosionPts.push(outerPoints[i]);
    explosionPts.push(innerPoints[i]);
  }

  return explosionPts;
}

const _squareMemo = {};
export function square(segments) {
  if (!_squareMemo[segments]) {
    const pts = [];
    // draw points from top-right to bottom-right to bottom-left to top-left and back
    const segQtrNum = Math.floor(segments / 4);
    for (let i = 0; i < segments; i++) {
      switch (Math.floor((4 * i) / segments)) {
        // from top-right to bottom-right
        case 0:
          pts.push({
            x: 0.5,
            y: -0.5 + i / segQtrNum,
          });
          break;
        // from bottom-right to bottom-left
        case 1:
          pts.push({
            x: 0.5 - (i - segQtrNum) / segQtrNum,
            y: 0.5,
          });
          break;
        // from bottom-left to top-left
        case 2:
          pts.push({
            x: -0.5,
            y: 0.5 - (i - 2 * segQtrNum) / segQtrNum,
          });
          break;
        // from top-left to top-right
        case 3:
          pts.push({
            x: -0.5 + (i - 3 * segQtrNum) / segQtrNum,
            y: -0.5,
          });
      }
    }
    _squareMemo[segments] = pts;
  }
  return _squareMemo[segments];
}

const DOT_SIZE = 0.005;
export function farDot(center: Point): Point[] {
  const diamondPts = circle(4);
  return diamondPts.map((pt) => {
    return {
      x: DOT_SIZE * pt.x + center.x,
      y: DOT_SIZE * pt.y + center.y,
    };
  });
}
