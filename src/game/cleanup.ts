import { entrance, type FloorPoint } from './navigation';

export type CleanupKind = 'wipe' | 'trash' | 'wash';
export interface CleanupJob {
  kind: CleanupKind;
  actor: 'host' | 'bartender';
  stage: 'walking' | 'working' | 'carrying' | 'emptying';
  left: number;
}
export const cleanupInfo: Record<
  CleanupKind,
  { label: string; seconds: number; position: FloorPoint }
> = {
  wipe: { label: 'Wiping counter', seconds: 3, position: [1, -3.05] },
  trash: { label: 'Taking out trash', seconds: 2, position: [4.6, -3.05] },
  wash: { label: 'Washing glasses', seconds: 4, position: [-2.6, -3.05] },
};
export function cleanupTarget(job: CleanupJob): FloorPoint {
  return job.stage === 'carrying' || job.stage === 'emptying'
    ? [entrance[0] + 1.2, entrance[2]]
    : cleanupInfo[job.kind].position;
}
export function cleanupLabel(job: CleanupJob): string {
  const actor = job.actor === 'host' ? 'Host' : 'Bartender';
  if (job.stage === 'walking')
    return (
      actor +
      ' walking to ' +
      (job.kind === 'wipe' ? 'counter' : job.kind === 'wash' ? 'sink' : 'bin')
    );
  if (job.stage === 'carrying') return actor + ' carrying trash to the door';
  return actor + ': ' + cleanupInfo[job.kind].label + '…';
}
