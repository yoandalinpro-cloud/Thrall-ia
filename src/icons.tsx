// Petites icônes SVG (trait 1.8, couleur = currentColor)
const P = (d: string | string[]) => (props: { size?: number }) => (
  <svg width={props.size ?? 20} height={props.size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {(Array.isArray(d) ? d : [d]).map((x, i) => <path key={i} d={x} />)}
  </svg>
);

export const IMenu = P(['M4 6h16', 'M4 12h16', 'M4 18h16']);
export const IPlus = P(['M12 5v14', 'M5 12h14']);
export const INew = P(['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z']);
export const ISend = P(['M12 19V5', 'M5 12l7-7 7 7']);
export const IStop = P('M7 7h10v10H7z');
export const IMic = P(['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v3']);
export const IGlobe = P(['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z', 'M2 12h20', 'M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z']);
export const IClip = P('M21.4 11.1 12.2 20.3a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5');
export const ICopy = P(['M9 9h11v11H9z', 'M5 15H4V4h11v1']);
export const ICheck = P('M5 12l5 5L20 7');
export const IRefresh = P(['M3 12a9 9 0 0 1 15.5-6.3L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-15.5 6.3L3 16', 'M3 21v-5h5']);
export const IEdit = P(['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z']);
export const ITrash = P(['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6']);
export const IPin = P(['M12 17v5', 'M9 3h6l-1 7 4 3H6l4-3Z']);
export const IGear = P(['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z']);
export const IChevron = P('M6 9l6 6 6-6');
export const ISearch = P(['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M21 21l-4.3-4.3']);
export const IClose = P(['M18 6 6 18', 'M6 6l12 12']);
export const IFile = P(['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6']);
export const IBrain = P(['M9.5 2A2.5 2.5 0 0 0 7 4.5v.3A3 3 0 0 0 4 8a3 3 0 0 0 .6 1.8A3.5 3.5 0 0 0 4 15.5 3.5 3.5 0 0 0 7.5 19 2.5 2.5 0 0 0 12 20V4.5A2.5 2.5 0 0 0 9.5 2Z', 'M14.5 2A2.5 2.5 0 0 1 17 4.5v.3A3 3 0 0 1 20 8a3 3 0 0 1-.6 1.8 3.5 3.5 0 0 1 .6 5.7A3.5 3.5 0 0 1 16.5 19 2.5 2.5 0 0 1 12 20']);
export const ILogout = P(['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9']);

export function Crest({ theme, size = 28 }: { theme: 'horde' | 'alliance'; size?: number }) {
  // Emblèmes originaux (pas les logos officiels) : hache croisée / lion stylisé simplifié en bouclier
  return theme === 'horde' ? (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2 4 8v8c0 7 5 12 12 14 7-2 12-7 12-14V8Z" fill="var(--accent)" opacity=".18" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M10 9l12 14M22 9 10 23" stroke="var(--accent-2)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8 8.5c2.5-.5 4 .5 4.5 3M24 8.5c-2.5-.5-4 .5-4.5 3" stroke="var(--accent)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2 4 8v8c0 7 5 12 12 14 7-2 12-7 12-14V8Z" fill="var(--accent)" opacity=".18" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M16 7v18M10 12h12" stroke="var(--accent-2)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 21l4 3 4-3" stroke="var(--accent)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}
