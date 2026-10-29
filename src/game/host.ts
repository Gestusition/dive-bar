import type { Guest } from './engine';
import { guestPosition, seatApproach, type FloorPoint } from './navigation';

// A visible spot inside the room, independent of the responsive side walls.
export const hostHome: FloorPoint = [-5.1, 5.4];
export interface HostVisit {
  id: number;
  escorting: boolean;
}
/** Follow one arriving party to its seat, then return to greet the next one. */
export function hostDestination(
  guests: Guest[],
  visit: HostVisit | null,
  position: FloorPoint,
): { visit: HostVisit | null; target: FloorPoint } {
  let guest = guests.find((g) => g.id === visit?.id && g.status !== 'leaving');
  if (!guest) {
    guest = guests.find((g) => g.lead && g.status === 'waiting');
    visit = guest ? { id: guest.id, escorting: false } : null;
  }
  if (!guest || !visit) return { visit: null, target: hostHome };
  if (guest.status === 'waiting') {
    const [x, , z] = guestPosition(guest);
    return { visit, target: [x - 0.7, z] };
  }
  const target = seatApproach[guest.seat];
  if (
    !target ||
    (visit.escorting && Math.hypot(position[0] - target[0], position[1] - target[1]) < 0.05)
  )
    return { visit: null, target: hostHome };
  return { visit: { ...visit, escorting: true }, target };
}
