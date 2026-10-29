export type VoxelPart = [number, number, number, number, number, number, string];

// Leave the right-hand walkway clear, including the foliage and the rotating
// bartender's arms. Keep the entire plant inside the back wall and floor, in
// front of the skirting board and clear of the window sill to its left.
const plantX = 5.25,
  plantZ = -3.92,
  plantScale = 0.8;
const plant = (
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
): VoxelPart => [
  plantX + x * plantScale,
  y * plantScale,
  plantZ + z * plantScale,
  w * plantScale,
  h * plantScale,
  d * plantScale,
  color,
];
export const cornerPlantParts: VoxelPart[] = [
  // Pot, rim and soil.
  plant(0, 0.3, 0, 0.62, 0.6, 0.62, '#bb7658'),
  plant(0, 0.63, 0, 0.66, 0.06, 0.66, '#a8644a'),
  plant(0, 0.67, 0, 0.54, 0.04, 0.54, '#6b4a35'),
  plant(0, 0.8, 0, 0.08, 0.3, 0.08, '#627650'),
  // One leafy clump with leaves fanning out around it.
  plant(0, 1.08, 0, 0.56, 0.36, 0.5, '#63835c'),
  plant(-0.3, 0.92, 0.05, 0.32, 0.16, 0.34, '#8da16a'),
  plant(0.3, 0.98, -0.05, 0.32, 0.16, 0.34, '#506e52'),
  plant(0.04, 0.86, 0.26, 0.4, 0.14, 0.26, '#8da16a'),
  plant(-0.05, 1.12, -0.24, 0.4, 0.16, 0.22, '#506e52'),
  plant(0.04, 1.32, 0.02, 0.36, 0.16, 0.34, '#8da16a'),
];

// The bought plant in the front right corner: a tall leafy plant in a pot.
export const floorPlantParts: VoxelPart[] = [
  [0, 0.25, 0, 0.6, 0.5, 0.6, '#bc7960'],
  [0, 0.52, 0, 0.66, 0.06, 0.66, '#a8644a'],
  [0, 0.56, 0, 0.52, 0.04, 0.52, '#6b4a35'],
  [0, 0.75, 0, 0.07, 0.4, 0.07, '#5d7a4c'],
  [0, 1.05, 0, 0.5, 0.4, 0.48, '#6c8c58'],
  [-0.3, 0.85, 0.08, 0.4, 0.14, 0.36, '#7c9a65'],
  [0.3, 0.92, -0.05, 0.4, 0.14, 0.36, '#5f8050'],
  [0.02, 0.8, 0.3, 0.44, 0.14, 0.26, '#91ad73'],
  [0.15, 1.3, 0.12, 0.36, 0.14, 0.32, '#91ad73'],
  [-0.15, 1.38, -0.12, 0.38, 0.14, 0.32, '#5f8050'],
  [0.04, 1.55, 0.02, 0.3, 0.14, 0.28, '#7c9a65'],
];
