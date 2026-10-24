export type VoxelPart = [number, number, number, number, number, number, string];

// Leave the right-hand walkway clear, including the foliage and the rotating
// bartender's arms. Keep the entire plant inside the back wall and floor.
const plantX = 5.1,
  plantZ = -4,
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
  plant(0, 0.3, 0, 0.7, 0.6, 0.7, '#bb7658'),
  plant(0, 0.8, 0, 0.1, 0.6, 0.1, '#627650'),
  ...Array.from({ length: 7 }, (_, i) =>
    plant(
      Math.sin(i * 2) * 0.28,
      1 + i * 0.1,
      Math.cos(i * 2) * 0.25,
      0.45,
      0.16,
      0.38,
      ['#63835c', '#8da16a', '#506e52'][i % 3],
    ),
  ),
];
