import { personLook } from '../game/looks';

// The front of the character's voxel head, in the same units and colours as their
// body in the room (see personParts in BarScene). Each box is [centre x, centre
// height, width, height, colour]; later boxes sit in front. The view is centred on
// the head and wide enough that every corner stays inside the round frame.
const centre = 1.04,
  view = 1.12;
type Box = [number, number, number, number, string];
function faceBoxes(id: string): Box[] {
  const { skin, hair } = personLook(id);
  return [
    [-0.33, 1, 0.09, 0.16, skin],
    [0.33, 1, 0.09, 0.16, skin],
    [0, 1, 0.6, 0.58, skin],
    [0, 1.3, 0.65, 0.14, hair],
    [-0.24, 1.18, 0.14, 0.16, hair],
    [-0.13, 1.04, 0.055, 0.07, '#352b2b'],
    [0.13, 1.04, 0.055, 0.07, '#352b2b'],
    [0, 0.89, 0.13, 0.035, '#a85d51'],
    [-0.21, 0.95, 0.08, 0.04, '#d68d79'],
    [0.21, 0.95, 0.08, 0.04, '#d68d79'],
  ];
}

/** A guest's face in a round frame, for their card and their conversations. */
export function Portrait({ id, big = false }: { id: string; big?: boolean }) {
  return (
    <span className={'portrait ' + (big ? 'big ' : '') + id} aria-hidden="true">
      <svg viewBox={`${-view / 2} ${-view / 2} ${view} ${view}`} shapeRendering="crispEdges">
        {faceBoxes(id).map(([x, y, w, h, color], i) => (
          <rect key={i} x={x - w / 2} y={centre - y - h / 2} width={w} height={h} fill={color} />
        ))}
      </svg>
    </span>
  );
}
