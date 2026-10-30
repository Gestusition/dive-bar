import { useMemo } from 'react';
import { personModel } from '../game/person';
import { portraitImage } from '../view/portraitRender';

/**
 * A flat front view of a character's voxel head, used where WebGL cannot draw the
 * 3D one. It is drawn from the same parts as their body in the room. Parts nearer the front are painted last, and the view is fitted round
 * the head so no corner reaches the round frame, whatever the model looks like.
 */
export function portraitFace(id: string) {
  const parts = personModel(id).head;
  const rects = parts
    .map(([x, y, z, w, h, d, color]) => ({
      x: x - w / 2,
      y: -(y + h / 2),
      w,
      h,
      front: z + d / 2,
      color,
    }))
    .sort((a, b) => a.front - b.front);
  const left = Math.min(...rects.map((r) => r.x)),
    right = Math.max(...rects.map((r) => r.x + r.w)),
    top = Math.min(...rects.map((r) => r.y)),
    bottom = Math.max(...rects.map((r) => r.y + r.h));
  const cx = (left + right) / 2,
    cy = (top + bottom) / 2;
  // The farthest corner from the middle sets the size, with a little air inside the frame.
  const reach = Math.max(
    ...rects.flatMap((r) => [
      Math.hypot(r.x - cx, r.y - cy),
      Math.hypot(r.x + r.w - cx, r.y - cy),
      Math.hypot(r.x - cx, r.y + r.h - cy),
      Math.hypot(r.x + r.w - cx, r.y + r.h - cy),
    ]),
  );
  const size = (reach * 2) / 0.9;
  return { rects, viewBox: `${cx - size / 2} ${cy - size / 2} ${size} ${size}` };
}

/** A guest's 3D face in a round frame, for their card and their conversations. */
export function Portrait({ id, big = false }: { id: string; big?: boolean }) {
  const image = useMemo(() => portraitImage(id), [id]);
  const { rects, viewBox } = portraitFace(id);
  return (
    <span className={'portrait ' + (big ? 'big ' : '') + id} aria-hidden="true">
      {image ? (
        <img src={image} alt="" />
      ) : (
        <svg viewBox={viewBox} shapeRendering="crispEdges">
          {rects.map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color} />
          ))}
        </svg>
      )}
    </span>
  );
}
