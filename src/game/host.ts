import type { Guest } from './engine';
import {
  counterSeats,
  guestPosition,
  seatApproach,
  seatFacing,
  type FloorPoint,
} from './navigation';

// A visible spot inside the room, independent of the responsive side walls.
export const hostHome: FloorPoint = [-5.1, 5.4];
/** How far in front of a waiting guest the host stands to greet them. */
export const greetingDistance = 1.1;
/** How far to the side of a seat's approach the host stops when showing the way. */
export const escortOffset = 1;
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
    // Greet from in front of the waiting spot, off the line in from the door, so the
    // guest never has to step round the host to get there.
    const [x, , z] = guestPosition(guest);
    return { visit, target: [x, z - greetingDistance] };
  }
  const approach = seatApproach[guest.seat];
  // Show the way to the chair from beside the spot the guest sits down from, so they can
  // step past into their seat and the host can walk away without either waiting: on the
  // side away from the table, or towards the middle of the room from a stool.
  const target: FloorPoint | undefined =
    approach &&
    (counterSeats.includes(guest.seat)
      ? [approach[0] - Math.sign(approach[0]) * escortOffset, approach[1]]
      : [approach[0], approach[1] + (seatFacing(guest.seat) === 0 ? -1 : 1) * escortOffset]);
  if (
    !target ||
    (visit.escorting && Math.hypot(position[0] - target[0], position[1] - target[1]) < 0.05)
  )
    return { visit: null, target: hostHome };
  return { visit: { ...visit, escorting: true }, target };
}
