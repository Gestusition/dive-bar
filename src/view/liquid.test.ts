import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  LiquidBody,
  LiquidStream,
  innerProfile,
  levelFor,
  shellOutline,
  smoothProfile,
  uprightLevel,
  volumeSamples,
  type Profile,
} from './liquid';

const tumbler: Profile = [
  [0, 0],
  [0.17, 0],
  [0.175, 0.3],
  [0, 0.3],
];
const bottle = innerProfile(
  smoothProfile([
    [0.09, 0],
    [0.095, 0.25],
    [0.032, 0.34],
    [0.03, 0.47],
  ]),
  0.02,
  0.008,
);
const turned = (angle: number, y = 0) =>
  new THREE.Matrix4().makeRotationZ(angle).setPosition(0, y, 0);
/** How much of the volume is below a height, with the container placed by this matrix. */
function shareBelow(samples: Float32Array, m: THREE.Matrix4, level: number) {
  const e = m.elements;
  let below = 0,
    all = 0;
  for (let i = 0; i < samples.length; i += 4) {
    all += samples[i + 3];
    if (e[1] * samples[i] + e[5] * samples[i + 1] + e[9] * samples[i + 2] + e[13] <= level)
      below += samples[i + 3];
  }
  return below / all;
}

describe('the level of a liquid', () => {
  it('stands at the share of the height in a straight glass', () => {
    expect(uprightLevel(tumbler, 0.5)).toBeCloseTo(0.15, 1);
    expect(uprightLevel(tumbler, 0)).toBeCloseTo(0, 2);
    expect(uprightLevel(tumbler, 1)).toBeCloseTo(0.3, 1);
  });
  it('stands lower in the wide top of a cone than the share of its height', () => {
    const cone: Profile = [
      [0, 0],
      [0.02, 0],
      [0.2, 0.3],
      [0, 0.3],
    ];
    expect(uprightLevel(cone, 0.5)).toBeGreaterThan(0.18);
  });
  it('keeps the same volume under it however the bottle is turned', () => {
    const samples = volumeSamples(bottle);
    for (const angle of [0, 0.5, 1.2, 2.05, Math.PI * 0.9]) {
      const m = turned(angle, 1.5);
      const level = levelFor(samples, m, 0.6);
      expect(shareBelow(samples, m, level)).toBeCloseTo(0.6, 1);
    }
  });
  it('reaches the spout of a bottle turned over, but not one that is upright', () => {
    const samples = volumeSamples(bottle);
    const tipLocal = new THREE.Vector3(0, 0.47, 0);
    const upright = turned(0);
    expect(levelFor(samples, upright, 0.6)).toBeLessThan(tipLocal.clone().applyMatrix4(upright).y);
    const over = turned(2.05);
    expect(levelFor(samples, over, 0.6)).toBeGreaterThan(tipLocal.clone().applyMatrix4(over).y);
  });
});

describe('a liquid surface', () => {
  const settled = () => {
    const body = new LiquidBody();
    body.samples = volumeSamples(tumbler);
    body.fraction = 0.5;
    const m = new THREE.Matrix4();
    for (let i = 0; i < 30; i++) body.step(m, 1 / 60);
    return { body, m };
  };
  it('lies flat in a glass left alone', () => {
    const { body } = settled();
    expect(body.tiltX).toBeCloseTo(0, 5);
    expect(body.tiltZ).toBeCloseTo(0, 5);
  });
  it('swings when the glass is shoved, and settles again', () => {
    const { body, m } = settled();
    let most = 0;
    for (let i = 0; i < 10; i++) {
      m.setPosition((i * i) / 400, 0, 0);
      body.step(m, 1 / 60);
      most = Math.max(most, Math.abs(body.tiltX));
    }
    expect(most).toBeGreaterThan(0.02);
    for (let i = 0; i < 60 * 5; i++) body.step(m, 1 / 60);
    expect(Math.abs(body.tiltX)).toBeLessThan(0.01);
    expect(body.agitation).toBeLessThan(0.01);
  });
  it('never tilts past what a surface can, however hard it is shaken', () => {
    const { body, m } = settled();
    for (let i = 0; i < 200; i++) {
      m.setPosition(Math.sin(i) * 0.3, 0, 0);
      body.step(m, 1 / 60);
      expect(Math.abs(body.tiltX)).toBeLessThanOrEqual(0.42);
    }
  });
});

describe('a stream', () => {
  it('falls in a curve and lands past where it left, on the surface', () => {
    const stream = new LiquidStream();
    stream.update(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), 0.5, 0.2, 0.02, 0);
    expect(stream.landing.y).toBe(0.2);
    expect(stream.landing.x).toBeGreaterThan(0.1);
    stream.geometry.computeBoundingBox();
    const box = stream.geometry.boundingBox!;
    expect(box.max.y).toBeLessThan(1.05);
    expect(box.min.y).toBeGreaterThan(0.15);
    expect(Number.isFinite(box.max.x)).toBe(true);
  });
});

describe('a glass in section', () => {
  it('goes up the outside and back down the inside to its floor', () => {
    const outer = smoothProfile([
      [0.17, 0],
      [0.175, 0.3],
    ]);
    const shell = shellOutline(outer, 0.035, 0.012);
    expect(shell[0]).toEqual([0, 0]);
    expect(shell[shell.length - 1]).toEqual([0, 0.035]);
    expect(Math.max(...shell.map(([, y]) => y))).toBeGreaterThan(0.3);
  });
});
