import * as THREE from 'three';

// Where each member of staff wants their hands this frame, in room coordinates.
// Whatever they are working with (the drink at the counter, a glass at the sink, the
// sponge, a trash bag) writes the points, and the staff member's arms reach for them.
export type Actor = 'bartender' | 'host';
export interface Reach {
  left: THREE.Vector3;
  right: THREE.Vector3;
  useLeft: boolean;
  useRight: boolean;
  /** Clock time of the last update; a reach not renewed by the next frame is let go. */
  at: number;
}
export const reaches: Record<Actor, Reach> = {
  bartender: {
    left: new THREE.Vector3(),
    right: new THREE.Vector3(),
    useLeft: false,
    useRight: false,
    at: -1,
  },
  host: {
    left: new THREE.Vector3(),
    right: new THREE.Vector3(),
    useLeft: false,
    useRight: false,
    at: -1,
  },
};
/** Ask for hands at these points (or null to leave a hand free) for this frame. */
export function reachFor(
  actor: Actor,
  time: number,
  left: THREE.Vector3 | null,
  right: THREE.Vector3 | null,
) {
  const r = reaches[actor];
  r.useLeft = !!left;
  r.useRight = !!right;
  if (left) r.left.copy(left);
  if (right) r.right.copy(right);
  r.at = time;
}
