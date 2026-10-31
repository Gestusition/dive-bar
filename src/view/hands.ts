import * as THREE from 'three';

// Where each member of staff wants their hands this frame, in room coordinates.
// Whatever they are working with (the drink at the counter, a glass at the sink, the
// sponge, a trash bag) writes the points, and the staff member's arms reach for them.
export type Actor = 'bartender' | 'host';
/** The shape the fingers take; see staffRig.ts. */
export type HandPose = 'relaxed' | 'flat' | 'neck' | 'bottle' | 'vessel' | 'pinch' | 'fork';
export interface HandGoal {
  /** The point held: the middle of the bottle, the waist of the jigger. */
  at: THREE.Vector3;
  /** How the hand is turned, in room coordinates; without one it follows the forearm. */
  turn: THREE.Quaternion;
  fixedTurn: boolean;
  pose: HandPose;
  /** What is being held. When it changes the hand travels to it, rather than jumping. */
  key: string;
}
const newGoal = (): HandGoal => ({
  at: new THREE.Vector3(),
  turn: new THREE.Quaternion(),
  fixedTurn: false,
  pose: 'relaxed',
  key: '',
});
export interface Reach {
  hands: [HandGoal, HandGoal];
  use: [boolean, boolean];
  /** Effort in the body: how far the shoulders dip this frame, and the head with them. */
  bob: number;
  /** Clock time of the last update; a reach not renewed by the next frame is let go. */
  at: number;
}
export const reaches: Record<Actor, Reach> = {
  bartender: { hands: [newGoal(), newGoal()], use: [false, false], bob: 0, at: -1 },
  host: { hands: [newGoal(), newGoal()], use: [false, false], bob: 0, at: -1 },
};
/** Ask for hands at these points (or null to leave a hand free) for this frame. */
export function reachFor(
  actor: Actor,
  time: number,
  left: THREE.Vector3 | null,
  right: THREE.Vector3 | null,
) {
  const r = reaches[actor];
  [left, right].forEach((point, side) => {
    r.use[side] = !!point;
    if (!point) return;
    const goal = r.hands[side];
    goal.at.copy(point);
    goal.fixedTurn = false;
    goal.pose = 'relaxed';
    goal.key = 'reach';
  });
  r.bob = 0;
  r.at = time;
}
/** A hand closed round something, written by whatever is being held. */
export interface Grip {
  node: THREE.Object3D;
  point: readonly [number, number, number];
  /** The way the fingers point and the way the palm faces, in the node's own frame. */
  fingers: readonly [number, number, number];
  palm: readonly [number, number, number];
  pose: HandPose;
  key: string;
}
const scratch = {
  y: new THREE.Vector3(),
  z: new THREE.Vector3(),
  x: new THREE.Vector3(),
  basis: new THREE.Matrix4(),
  world: new THREE.Quaternion(),
};
/** A hand's turn from the way its fingers point and its palm faces; palm is made square. */
export function handTurn(
  fingers: readonly [number, number, number],
  palm: readonly [number, number, number],
  out: THREE.Quaternion,
) {
  const { x, y, z, basis } = scratch;
  y.set(-fingers[0], -fingers[1], -fingers[2]).normalize();
  z.set(palm[0], palm[1], palm[2]);
  z.addScaledVector(y, -z.dot(y)).normalize();
  x.crossVectors(y, z);
  return out.setFromRotationMatrix(basis.makeBasis(x, y, z));
}
/** Ask for hands closed round things for this frame; a null grip leaves that hand free. */
export function gripFor(
  actor: Actor,
  time: number,
  left: Grip | null,
  right: Grip | null,
  bob = 0,
) {
  const r = reaches[actor];
  [left, right].forEach((grip, side) => {
    r.use[side] = !!grip;
    if (!grip) return;
    const goal = r.hands[side];
    grip.node.updateWorldMatrix(true, false);
    goal.at.set(...grip.point).applyMatrix4(grip.node.matrixWorld);
    handTurn(grip.fingers, grip.palm, goal.turn);
    goal.turn.premultiply(grip.node.getWorldQuaternion(scratch.world));
    goal.fixedTurn = true;
    goal.pose = grip.pose;
    goal.key = grip.key;
  });
  r.bob = bob;
  r.at = time;
}
