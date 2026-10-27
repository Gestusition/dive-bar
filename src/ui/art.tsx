// Hand-drawn style illustrations shared by the HUD, guest bubbles and dialogs.
// Every piece uses the same thick ink outline and flat fills so the interface
// reads as part of the bar rather than a separate web page.
import type { ReactNode } from 'react';

function Art({ children, size = 48 }: { children: ReactNode; size?: number }) {
  return (
    <svg className="art" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      {children}
    </svg>
  );
}
type ArtProps = { size?: number };

export const CalendarArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <rect x="8" y="12" width="48" height="45" rx="8" fill="#fbf3e4" />
    <path d="M8 20a8 8 0 0 1 8-8h32a8 8 0 0 1 8 8v6H8z" fill="#e04f5f" />
    <rect x="18" y="6" width="7" height="13" rx="3.5" fill="#d6d9e0" />
    <rect x="39" y="6" width="7" height="13" rx="3.5" fill="#d6d9e0" />
  </Art>
);

export const CoinsArt = ({ size }: ArtProps) => (
  <Art size={size}>
    {[46, 36, 26].map((y) => (
      <g key={y}>
        <path d={`M12 ${y}v6c0 4.4 9 8 20 8s20-3.6 20-8v-6`} fill="#d9922a" />
        <ellipse cx="32" cy={y} rx="20" ry="8" fill="#f6b545" />
      </g>
    ))}
    <ellipse cx="32" cy="26" rx="9" ry="3.4" fill="#fde3a2" stroke="none" />
  </Art>
);

export const BookArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <path d="M12 52V14a6 6 0 0 1 6-6h34v42H18a6 6 0 0 0-6 6z" fill="#3fae9c" />
    <path d="M12 52a6 6 0 0 1 6-6h34v12H18a6 6 0 0 1-6-6z" fill="#fbf3e4" />
    <path d="M21 17h24L33 30z" fill="#f6b545" />
    <path d="M33 30v8M27 38h12" fill="none" />
  </Art>
);

export const ReceiptArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <path d="M14 6h32v50l-5.3-4-5.4 4-5.3-4-5.3 4-5.4-4-5.3 4z" fill="#fbf3e4" />
    <path d="M21 17h18M21 25h18M21 33h10" fill="none" />
    <circle cx="45" cy="44" r="10" fill="#f6b545" />
    <path d="M45 39v10" fill="none" />
  </Art>
);

export const PlantArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <path d="M32 36C29 23 19 18 9 21c2 10 11 15 23 15z" fill="#7bbf5a" />
    <path d="M32 36c3-15 13-21 23-19-2 12-11 19-23 19z" fill="#5fa246" />
    <path d="M32 36c-5-11-2-22 4-28 6 9 4 20-4 28z" fill="#96d27a" />
    <path d="M19 40h26l-4 18H23z" fill="#d9744c" />
    <rect x="15" y="34" width="34" height="9" rx="4" fill="#e88d63" />
  </Art>
);

export const GearArt = ({ size }: ArtProps) => (
  <Art size={size}>
    {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => (
      <rect
        key={r}
        x="27"
        y="5"
        width="10"
        height="14"
        rx="3"
        fill="#cfd3dc"
        transform={`rotate(${r} 32 32)`}
      />
    ))}
    <circle cx="32" cy="32" r="18" fill="#cfd3dc" />
    <circle cx="32" cy="32" r="7" fill="#8f95a8" />
  </Art>
);

export const PauseArt = ({ size, paused }: ArtProps & { paused: boolean }) => (
  <Art size={size}>
    <circle cx="32" cy="32" r="25" fill="#7fd8cc" />
    {paused ? (
      <path d="M26 20l18 12-18 12z" fill="#fbf3e4" />
    ) : (
      <>
        <rect x="22" y="20" width="7" height="24" rx="3" fill="#fbf3e4" />
        <rect x="35" y="20" width="7" height="24" rx="3" fill="#fbf3e4" />
      </>
    )}
  </Art>
);

export const SoundArt = ({ size, on }: ArtProps & { on: boolean }) => (
  <Art size={size}>
    <path d="M10 25h10l13-11v36L20 39H10z" fill="#f6b545" />
    {on ? (
      <path d="M41 24c4 4 4 12 0 16M47 18c7 7 7 21 0 28" fill="none" />
    ) : (
      <path d="M41 25l12 14M53 25L41 39" fill="none" />
    )}
  </Art>
);

export const HelpArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <path
      d="M32 8c13 0 24 9 24 21s-11 21-24 21c-3 0-5 0-8-1l-11 7 3-11c-5-4-8-10-8-16C8 17 19 8 32 8z"
      fill="#fbf3e4"
    />
    <path d="M25 24a7 7 0 1 1 10 6c-2 1-3 2-3 4v2" fill="none" />
    <circle cx="32" cy="42" r="1.5" fill="#231a24" />
  </Art>
);

export const SpongeArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <rect x="9" y="20" width="46" height="30" rx="8" fill="#f6b545" />
    <path d="M9 30v-2a8 8 0 0 1 8-8h30a8 8 0 0 1 8 8v2z" fill="#7bbf5a" />
    {[
      [20, 40],
      [31, 44],
      [43, 39],
      [26, 36],
    ].map(([x, y]) => (
      <circle key={x} cx={x} cy={y} r="2.6" fill="#d9922a" stroke="none" />
    ))}
  </Art>
);

export const GlassArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <path d="M15 10h34l-4 44H19z" fill="#dff3ee" />
    <path d="M17.5 30h29l-2 22h-25z" fill="#7fd8cc" stroke="none" />
    <path d="M15 10h34l-4 44H19z" fill="none" />
    <circle cx="27" cy="40" r="2.4" fill="#fbf3e4" stroke="none" />
    <circle cx="36" cy="45" r="1.8" fill="#fbf3e4" stroke="none" />
  </Art>
);

export const IceArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <rect
      x="17"
      y="12"
      width="14"
      height="14"
      rx="3"
      fill="#effaf8"
      transform="rotate(-14 24 19)"
    />
    <rect x="32" y="10" width="14" height="14" rx="3" fill="#effaf8" transform="rotate(12 39 17)" />
    <path d="M11 26h42l-5 30H16z" fill="#5cc7b8" />
    <rect x="8" y="23" width="48" height="8" rx="4" fill="#9fe3d8" />
  </Art>
);

export const BellArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <circle cx="32" cy="18" r="4.5" fill="#f6b545" />
    <path d="M12 46a20 20 0 0 1 40 0z" fill="#f6b545" />
    <path d="M22 34a12 12 0 0 1 7-6" fill="none" stroke="#fde3a2" />
    <rect x="7" y="45" width="50" height="9" rx="4" fill="#d9744c" />
  </Art>
);

export const TrashArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <path d="M14 20h36l-4 36H18z" fill="#a7d68c" />
    <rect x="10" y="13" width="44" height="9" rx="4" fill="#7bbf5a" />
    <path d="M26 30v18M38 30v18" fill="none" />
  </Art>
);

export const BoxArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <path d="M10 24l22-10 22 10v26L32 60 10 50z" fill="#e9a65a" />
    <path d="M10 24l22 10 22-10M32 34v26" fill="none" />
  </Art>
);

export const DiceArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <rect x="10" y="10" width="44" height="44" rx="10" fill="#fbf3e4" />
    {[
      [22, 22],
      [42, 22],
      [32, 32],
      [22, 42],
      [42, 42],
    ].map(([x, y]) => (
      <circle key={x + '-' + y} cx={x} cy={y} r="4" fill="#e04f5f" stroke="none" />
    ))}
  </Art>
);

export const CocktailArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <path d="M12 14h40L32 36z" fill="#dff3ee" />
    <path d="M18 18h28L32 31z" fill="#d9744c" stroke="none" />
    <path d="M12 14h40L32 36z" fill="none" />
    <path d="M32 36v16M22 54h20" fill="none" />
    <path d="M44 14c0-4 2-7 5-8" fill="none" />
    <circle cx="44" cy="12" r="5" fill="#d8344a" />
  </Art>
);

export const HeartArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <path
      d="M32 54S9 40 9 24a11.5 11.5 0 0 1 23-4 11.5 11.5 0 0 1 23 4c0 16-23 30-23 30z"
      fill="#e04f5f"
    />
    <path d="M18 22a6 6 0 0 1 6-5" fill="none" stroke="#f4a3ab" />
  </Art>
);

export const CoinArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <circle cx="32" cy="32" r="22" fill="#f6b545" />
    <circle cx="32" cy="32" r="14" fill="none" stroke="#d9922a" />
    <path d="M32 24v16" fill="none" />
  </Art>
);

export const DoorArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <path d="M16 56V14a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v42z" fill="#7fd8cc" />
    <circle cx="40" cy="34" r="3" fill="#f6b545" />
    <path d="M8 56h48" fill="none" />
  </Art>
);
