import type { VoxelPart } from './room-layout';

// Shared with the room, so staff and guests wear the bar's own colours.
export const dark = '#50352e',
  brass = '#c9995d',
  cream = '#ead7ac',
  teal = '#478f83';
const shirts = ['#669f8e', '#b97876', '#d2a054', '#8088a8', '#986d98', '#d6bd8b'];

/** Where each arm hangs from, left then right. Arm parts are placed relative to it. */
export const shoulders: [number, number, number][] = [
  [-0.34, 0.77, 0],
  [0.34, 0.77, 0],
];
/** From the shoulder to the middle of the hand, with the arm hanging straight down. */
export const armReach = 0.46;

/**
 * A character's voxel model, worked out from their id. The room builds their body
 * from every part; their card draws the head on its own, straight from these parts,
 * so a change here shows in both places. Each arm is its own set of parts around its
 * shoulder, so staff can reach for what they are working with.
 */
export function personModel(
  id: string,
  bartender = false,
): { head: VoxelPart[]; body: VoxelPart[]; arms: [VoxelPart[], VoxelPart[]] } {
  const index = [...id].reduce((n, c) => n + c.charCodeAt(0), 0);
  const skin = ['#e9b592', '#b97857', '#db9e78', '#f0c7a1'][index % 4],
    hair = ['#403029', '#a85e39', '#d2a265', '#674143'][index % 4],
    shirt = bartender ? cream : shirts[index % shirts.length];
  return {
    body: [
      [0, 0.56, 0, 0.5, 0.48, 0.3, shirt],
      [0, 0.3, 0, 0.46, 0.16, 0.31, '#3c4546'],
      [-0.14, 0.14, 0, 0.18, 0.28, 0.21, '#424957'],
      [0.14, 0.14, 0, 0.18, 0.28, 0.21, '#424957'],
      [-0.14, 0.035, 0.045, 0.24, 0.09, 0.32, dark],
      [0.14, 0.035, 0.045, 0.24, 0.09, 0.32, dark],
      ...(bartender
        ? ([
            [0, 0.5, 0.17, 0.33, 0.5, 0.035, teal],
            [0, 0.7, 0.18, 0.09, 0.09, 0.03, brass],
          ] as VoxelPart[])
        : []),
    ],
    arms: [0, 1].map(() => [
      [0, -0.21, 0, 0.16, 0.42, 0.22, shirt],
      [0, -0.46, 0.02, 0.15, 0.13, 0.19, skin],
    ]) as [VoxelPart[], VoxelPart[]],
    head: [
      [0, 1, 0, 0.6, 0.58, 0.48, skin],
      [-0.33, 1, 0, 0.09, 0.16, 0.17, skin],
      [0.33, 1, 0, 0.09, 0.16, 0.17, skin],
      [0, 1.3, -0.02, 0.65, 0.14, 0.53, hair],
      [0, 1.14, -0.22, 0.64, 0.26, 0.12, hair],
      [-0.24, 1.18, 0.2, 0.14, 0.16, 0.12, hair],
      [-0.13, 1.04, 0.248, 0.055, 0.07, 0.035, '#352b2b'],
      [0.13, 1.04, 0.248, 0.055, 0.07, 0.035, '#352b2b'],
      [0, 0.89, 0.25, 0.13, 0.035, 0.025, '#a85d51'],
      [-0.21, 0.95, 0.245, 0.08, 0.04, 0.02, '#d68d79'],
      [0.21, 0.95, 0.245, 0.08, 0.04, 0.02, '#d68d79'],
    ],
  };
}
/** Every part of the model in place, arms hanging at the sides. */
export function standingParts(model: ReturnType<typeof personModel>): VoxelPart[] {
  return [
    ...model.body,
    ...model.head,
    ...model.arms.flatMap((arm, side) =>
      arm.map(([x, y, z, w, h, d, c]): VoxelPart => [
        x + shoulders[side][0],
        y + shoulders[side][1],
        z + shoulders[side][2],
        w,
        h,
        d,
        c,
      ]),
    ),
  ];
}
