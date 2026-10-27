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

// Bartending techniques for the counter's mix step.
export const IceCubesArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <rect
      x="10"
      y="24"
      width="22"
      height="22"
      rx="4"
      fill="#effaf8"
      transform="rotate(-10 21 35)"
    />
    <rect x="30" y="18" width="22" height="22" rx="4" fill="#dff3ee" transform="rotate(12 41 29)" />
    <path d="M15 31l5-1M35 24l5 1" fill="none" stroke="#ffffff" />
    <path d="M22 50h22" fill="none" stroke="#9fe3d8" />
  </Art>
);

export const MuddleArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <rect x="29" y="4" width="8" height="38" rx="4" fill="#d9a35c" transform="rotate(14 33 23)" />
    <path d="M14 30h36l-4 26H18z" fill="#dff3ee" />
    <path d="M19 46c4-4 9-4 12-1 4-4 9-3 12 1l-1 6H20z" fill="#7bbf5a" stroke="none" />
    <path d="M14 30h36l-4 26H18z" fill="none" />
  </Art>
);

export const ShakerArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <path d="M10 28c-3 4-3 10 0 14M54 28c3 4 3 10 0 14" fill="none" />
    <rect x="28" y="5" width="8" height="6" rx="2" fill="#cfd3dc" />
    <path d="M24 22l3-11h10l3 11z" fill="#cfd3dc" />
    <rect x="20" y="21" width="24" height="7" rx="3" fill="#b4bccb" />
    <path d="M22 28h20l-3 29H25z" fill="#cfd3dc" />
    <path d="M27 33l1 18" fill="none" stroke="#ffffff" />
  </Art>
);

export const StirArt = ({ size }: ArtProps) => (
  <Art size={size}>
    <path d="M17 22h30l-3 34H20z" fill="#dff3ee" />
    <path d="M19.5 34h25l-2 20h-21z" fill="#e9a65a" stroke="none" />
    <path d="M17 22h30l-3 34H20z" fill="none" />
    <path d="M44 4L33 46" fill="none" />
    <circle cx="44.5" cy="4" r="2.5" fill="#cfd3dc" />
    <path d="M24 40c4-3 12-3 16 0" fill="none" stroke="#fbf3e4" />
  </Art>
);

// Each drink drawn in its own glass and colour, for menus and pickers.
type GlassShape = 'coupe' | 'rocks' | 'highball' | 'mug' | 'hurricane';
const drinkLooks: Record<string, [GlassShape, string, string]> = {
  old_fashioned: ['rocks', '#c8782e', '#d8344a'],
  margarita: ['coupe', '#e4e3a0', '#7bbf5a'],
  manhattan: ['coupe', '#8e2f1f', '#d8344a'],
  moscow_mule: ['mug', '#eadcb0', '#7bbf5a'],
  daiquiri: ['coupe', '#f1efd2', '#7bbf5a'],
  bloody_mary: ['rocks', '#c8352c', '#96d27a'],
  long_island: ['highball', '#8a5a2e', '#f6d34a'],
  wisconsin_old_fashioned: ['rocks', '#c98a3c', '#f29a3a'],
  rose_mary: ['coupe', '#e6c86a', '#f6d34a'],
  summer_hummer: ['highball', '#f2eea6', '#7bbf5a'],
  rum_runner: ['hurricane', '#d9573a', '#f29a3a'],
  cherry_lemonade: ['highball', '#f07a8c', '#d8344a'],
  cherry_mule: ['mug', '#d94a5c', '#d8344a'],
  vodka_cherry: ['highball', '#b3263a', '#d8344a'],
};
export const DrinkArt = ({ size, id }: ArtProps & { id: string }) => {
  const [shape, liquid, garnish] = drinkLooks[id] ?? ['coupe', '#ff8a65', '#d8344a'];
  return (
    <Art size={size}>
      {shape === 'coupe' && (
        <>
          <path d="M12 14h40L32 36z" fill="#dff3ee" />
          <path d="M17 17.5h30L32 32z" fill={liquid} stroke="none" />
          <path d="M12 14h40L32 36z" fill="none" />
          <path d="M32 36v16M22 54h20" fill="none" />
          <circle cx="45" cy="12" r="5" fill={garnish} />
        </>
      )}
      {shape === 'rocks' && (
        <>
          <path d="M14 24h36l-3 32H17z" fill="#dff3ee" />
          <path d="M15.5 34h33l-2.2 20H17.7z" fill={liquid} stroke="none" />
          <rect x="22" y="30" width="9" height="9" rx="2" fill="#effaf8" stroke="none" />
          <path d="M14 24h36l-3 32H17z" fill="none" />
          <circle cx="44" cy="24" r="5" fill={garnish} />
        </>
      )}
      {shape === 'highball' && (
        <>
          <path d="M20 8h24l-2 48H22z" fill="#dff3ee" />
          <path d="M20.8 20h22.4l-1.6 34H22.4z" fill={liquid} stroke="none" />
          <path d="M20 8h24l-2 48H22z" fill="none" />
          <path d="M38 4l-4 22" fill="none" stroke="#e04f5f" />
          <circle cx="43" cy="12" r="5" fill={garnish} />
        </>
      )}
      {shape === 'mug' && (
        <>
          <path d="M44 26h4a6 6 0 0 1 0 12h-4" fill="none" />
          <rect x="14" y="18" width="30" height="38" rx="5" fill="#c97b4a" />
          <rect x="16.5" y="20.5" width="25" height="7" rx="2" fill={liquid} stroke="none" />
          <path d="M20 34v14" fill="none" stroke="#e8a77a" />
          <circle cx="42" cy="18" r="5" fill={garnish} />
        </>
      )}
      {shape === 'hurricane' && (
        <>
          <path
            d="M22 6h20c0 9-6 12-6 20 0 7 7 10 7 18 0 5-4 8-11 8s-11-3-11-8c0-8 7-11 7-18 0-8-6-11-6-20z"
            fill="#dff3ee"
          />
          <path
            d="M27.5 30c0 4-6 7-6 14 0 4 4 6 10.5 6s10.5-2 10.5-6c0-7-6-10-6-14z"
            fill={liquid}
            stroke="none"
          />
          <path
            d="M22 6h20c0 9-6 12-6 20 0 7 7 10 7 18 0 5-4 8-11 8s-11-3-11-8c0-8 7-11 7-18 0-8-6-11-6-20z"
            fill="none"
          />
          <path d="M32 52v4M24 58h16" fill="none" />
          <circle cx="42" cy="8" r="5" fill={garnish} />
        </>
      )}
    </Art>
  );
};

/** Empty glassware, for choosing what to build and serve in. */
export const GlassShapeArt = ({ size, shape }: ArtProps & { shape: GlassShape }) => (
  <Art size={size}>
    {shape === 'coupe' && (
      <>
        <path d="M12 14h40L32 36z" fill="#dff3ee" />
        <path d="M32 36v16M22 54h20" fill="none" />
      </>
    )}
    {shape === 'rocks' && (
      <>
        <path d="M14 26h36l-3 30H17z" fill="#dff3ee" />
        <path d="M17.5 50h29" fill="none" stroke="#9fe3d8" />
      </>
    )}
    {shape === 'highball' && (
      <>
        <path d="M20 6h24l-2 50H22z" fill="#dff3ee" />
        <path d="M23 50h18" fill="none" stroke="#9fe3d8" />
      </>
    )}
    {shape === 'mug' && (
      <>
        <path d="M44 26h4a6 6 0 0 1 0 12h-4" fill="none" />
        <rect x="14" y="18" width="30" height="38" rx="5" fill="#c97b4a" />
        <path d="M20 26v20" fill="none" stroke="#e8a77a" />
      </>
    )}
    {shape === 'hurricane' && (
      <>
        <path
          d="M22 4h20c0 9-6 12-6 20 0 7 7 10 7 18 0 5-4 8-11 8s-11-3-11-8c0-8 7-11 7-18 0-8-6-11-6-20z"
          fill="#dff3ee"
        />
        <path d="M32 50v5M24 58h16" fill="none" />
      </>
    )}
  </Art>
);

/** A bottle, jug, can or shaker in the colour of what's inside, by kind. */
export const BottleArt = ({ size, kind, color }: ArtProps & { kind: string; color: string }) => (
  <Art size={size}>
    {(kind === 'spirit' || kind === 'vermouth') && (
      <>
        <rect x="27" y="4" width="10" height="7" rx="2" fill="#5a3a2c" />
        <path
          d="M28 11h8v9c6 2 9 6 9 12v22a4 4 0 0 1-4 4H23a4 4 0 0 1-4-4V32c0-6 3-10 9-12z"
          fill={color}
        />
        <rect x="23" y="34" width="18" height="12" rx="2" fill="#fbf3e4" />
      </>
    )}
    {kind === 'liqueur' && (
      <>
        <rect x="28" y="4" width="8" height="7" rx="2" fill="#5a3a2c" />
        <path d="M29 11h6v12a15 15 0 1 1-6 0z" fill={color} />
        <circle cx="32" cy="40" r="7" fill="#fbf3e4" />
      </>
    )}
    {kind === 'bitters' && (
      <>
        <rect x="28" y="8" width="8" height="8" rx="2" fill="#e8d6b0" />
        <path d="M27 16h10l3 6v32a3 3 0 0 1-3 3H27a3 3 0 0 1-3-3V22z" fill={color} />
        <rect x="21" y="28" width="22" height="16" rx="2" fill="#fbf3e4" />
      </>
    )}
    {(kind === 'juice' || kind === 'water') && (
      <>
        <path d="M44 24h3a6 6 0 0 1 0 12h-3" fill="none" />
        <path d="M18 10h26l-2 6v38a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4z" fill="#dff3ee" />
        <path d="M19.5 26h23v28a3 3 0 0 1-3 3h-17a3 3 0 0 1-3-3z" fill={color} stroke="none" />
        <path d="M18 10h26l-2 6v38a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4z" fill="none" />
      </>
    )}
    {kind === 'mixer' && (
      <>
        <rect x="19" y="10" width="26" height="46" rx="5" fill={color} />
        <path d="M19 16h26M19 50h26" fill="none" />
        <rect x="24" y="24" width="16" height="18" rx="2" fill="#fbf3e4" />
      </>
    )}
    {kind === 'seasoning' && (
      <>
        <path d="M22 18a10 10 0 0 1 20 0z" fill="#cfd3dc" />
        <rect x="20" y="18" width="24" height="38" rx="5" fill={color} />
        {[27, 32, 37].map((x) => (
          <circle key={x} cx={x} cy="12" r="1.3" fill="#231a24" stroke="none" />
        ))}
      </>
    )}
    {(kind === 'sweetener' ||
      ![
        'spirit',
        'vermouth',
        'liqueur',
        'bitters',
        'juice',
        'water',
        'mixer',
        'seasoning',
      ].includes(kind)) && (
      <>
        <rect x="18" y="12" width="28" height="8" rx="3" fill="#d9a35c" />
        <rect x="16" y="20" width="32" height="36" rx="6" fill="#dff3ee" />
        <rect x="18.5" y="30" width="27" height="23.5" rx="4" fill={color} stroke="none" />
        <rect x="16" y="20" width="32" height="36" rx="6" fill="none" />
      </>
    )}
  </Art>
);

// A citrus wheel: rind, pith and segments.
const Wheel = ({ rind, flesh }: { rind: string; flesh: string }) => (
  <>
    <circle cx="32" cy="32" r="22" fill={rind} />
    <circle cx="32" cy="32" r="17" fill="#fbf3e4" stroke="none" />
    <circle cx="32" cy="32" r="15" fill={flesh} stroke="none" />
    {[0, 45, 90, 135].map((r) => (
      <path
        key={r}
        d="M32 17v30"
        fill="none"
        stroke="#fbf3e4"
        strokeWidth="2"
        transform={`rotate(${r} 32 32)`}
      />
    ))}
    <circle cx="32" cy="32" r="22" fill="none" />
  </>
);

/** Garnishes as they look on the drink. */
export const GarnishArt = ({ size, id }: ArtProps & { id: string }) => (
  <Art size={size}>
    {id === 'cocktail_cherry' && (
      <>
        <path d="M24 38C26 22 34 12 46 8M40 40c0-12 2-22 6-32" fill="none" stroke="#5a3a2c" />
        <circle cx="23" cy="44" r="10" fill="#d8344a" />
        <circle cx="41" cy="46" r="10" fill="#c22a40" />
        <circle cx="19" cy="40" r="2.5" fill="#f4a3ab" stroke="none" />
        <path d="M46 8c4 0 7 2 8 5-4 1-7 0-8-5z" fill="#7bbf5a" />
      </>
    )}
    {id === 'orange_slice' && (
      <>
        <path d="M8 38a24 24 0 0 1 48 0z" fill="#f29a3a" />
        <path d="M13 38a19 19 0 0 1 38 0z" fill="#fbf3e4" stroke="none" />
        <path d="M15 38a17 17 0 0 1 34 0z" fill="#f7b04f" stroke="none" />
        <path d="M32 38V22M32 38l-12-9M32 38l12-9" fill="none" stroke="#fbf3e4" strokeWidth="2" />
        <path d="M8 38a24 24 0 0 1 48 0z" fill="none" />
      </>
    )}
    {id === 'orange_zest' && (
      <>
        <path
          d="M12 46c6-2 6-12 14-12s8 10 14 10 8-12 14-16l2 6c-6 4-8 14-16 14s-8-10-14-10-8 10-14 12z"
          fill="#f29a3a"
        />
      </>
    )}
    {id === 'half_salt_rim' && (
      <>
        <path d="M12 18h40L32 44z" fill="#dff3ee" />
        <path d="M32 44v10M24 56h16" fill="none" />
        <path d="M12 18h20v4H14z" fill="#ffffff" />
        {[15, 20, 25, 30].map((x) => (
          <circle key={x} cx={x} cy="16" r="1.8" fill="#ffffff" />
        ))}
      </>
    )}
    {id === 'lime_slice' && <Wheel rind="#5fa246" flesh="#a7d68c" />}
    {id === 'lemon_slice' && <Wheel rind="#f2c430" flesh="#fbe58a" />}
    {id === 'mint_sprig' && (
      <>
        <path d="M32 58V20" fill="none" stroke="#4f8a37" />
        <path d="M32 24c-8-2-14-8-14-16 8 0 14 6 14 16z" fill="#7bbf5a" />
        <path d="M32 24c8-2 14-8 14-16-8 0-14 6-14 16z" fill="#5fa246" />
        <path d="M32 40c-9-1-15-7-16-15 9 0 15 6 16 15z" fill="#5fa246" />
        <path d="M32 40c9-1 15-7 16-15-9 0-15 6-16 15z" fill="#7bbf5a" />
      </>
    )}
    {id === 'celery_stick' && (
      <>
        <path d="M27 58l4-38h6l-2 38z" fill="#b9dd7f" />
        <path d="M31 24l-1 32" fill="none" stroke="#8fc160" />
        <path d="M34 20c-6-4-12-4-14-12 6-2 12 2 14 12z" fill="#7bbf5a" />
        <path d="M34 20c4-6 10-8 16-6-1 7-8 9-16 6z" fill="#5fa246" />
        <path d="M34 20c0-8 2-14 6-16 3 6 0 12-6 16z" fill="#96d27a" />
      </>
    )}
  </Art>
);
