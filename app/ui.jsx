// ui.jsx — visual primitives for "Ramo" (brand: Hairstyled by Joana)
// Loaded after data.jsx. Exports primitives to window.

// ─────────────────────────────────────────────────────────────
// Icon set — Lucide-style, 1.5px stroke, thin & rare per brand
// ─────────────────────────────────────────────────────────────
function Icon({ name, size = 22, color = 'currentColor', stroke = 1.6, fill = 'none', style }) {
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    home: <><path d="M3 10.5 12 4l9 6.5" {...p}/><path d="M5 9.5V20h14V9.5" {...p}/></>,
    chat: <><path d="M4 5h16v11H8l-4 3.5V5Z" {...p}/></>,
    deals: <><path d="M4 8h16v11H4z" {...p}/><path d="M9 8V6a3 3 0 0 1 6 0v2" {...p}/></>,
    calendar: <><rect x="4" y="5" width="16" height="16" rx="2" {...p}/><path d="M4 9h16M8 3v4M16 3v4" {...p}/></>,
    wallet: <><path d="M4 7h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7Z" {...p}/><path d="M4 7c0-1.1.9-2 2-2h10" {...p}/><circle cx="16.5" cy="13" r="1.2" fill={color} stroke="none"/></>,
    chevR: <path d="M9 6l6 6-6 6" {...p}/>,
    chevL: <path d="M15 6l-6 6 6 6" {...p}/>,
    chevD: <path d="M6 9l6 6 6-6" {...p}/>,
    plus: <path d="M12 5v14M5 12h14" {...p}/>,
    check: <path d="M5 12.5l4.5 4.5L19 6.5" {...p}/>,
    clock: <><circle cx="12" cy="12" r="8" {...p}/><path d="M12 8v4.5l3 2" {...p}/></>,
    pin: <><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" {...p}/><circle cx="12" cy="10" r="2.4" {...p}/></>,
    phone: <path d="M6 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5V21a1 1 0 0 1-1 1A16 16 0 0 1 5 5a1 1 0 0 1 1-1Z" {...p}/>,
    sparkle: <><path d="M12 4.5l1.6 4.4 4.4 1.6-4.4 1.6L12 16.5l-1.6-4.4L6 10.5l4.4-1.6L12 4.5Z" {...p}/><path d="M19 4v3M20.5 5.5h-3" {...p}/></>,
    search: <><circle cx="11" cy="11" r="6.5" {...p}/><path d="M20 20l-3.6-3.6" {...p}/></>,
    x: <path d="M6 6l12 12M18 6 6 18" {...p}/>,
    send: <path d="M5 12 20 5l-5 15-3.5-6.5L5 12Z" {...p}/>,
    file: <><path d="M7 3h7l4 4v14H7z" {...p}/><path d="M14 3v4h4" {...p}/><path d="M10 13h6M10 16h4" {...p}/></>,
    bell: <><path d="M7 10a5 5 0 0 1 10 0c0 5 2 6 2 6H5s2-1 2-6Z" {...p}/><path d="M10.5 20a1.7 1.7 0 0 0 3 0" {...p}/></>,
    filter: <path d="M4 6h16l-6 7v5l-4 2v-7L4 6Z" {...p}/>,
    dots: <><circle cx="6" cy="12" r="1.4" fill={color} stroke="none"/><circle cx="12" cy="12" r="1.4" fill={color} stroke="none"/><circle cx="18" cy="12" r="1.4" fill={color} stroke="none"/></>,
    users: <><circle cx="9" cy="8" r="3" {...p}/><path d="M3.5 20a5.5 5.5 0 0 1 11 0" {...p}/><path d="M16 5.2a3 3 0 0 1 0 5.6M17 14.2a5.5 5.5 0 0 1 3.5 5.1" {...p}/></>,
    alert: <><path d="M12 4 21 19H3L12 4Z" {...p}/><path d="M12 10v4" {...p}/><circle cx="12" cy="16.6" r="0.9" fill={color} stroke="none"/></>,
    user: <><circle cx="12" cy="8" r="3.5" {...p}/><path d="M5 20a7 7 0 0 1 14 0" {...p}/></>,
    euro: <><path d="M16 7a6 6 0 1 0 0 10" {...p}/><path d="M5 10.5h7M5 13.5h6" {...p}/></>,
    arrowR: <path d="M5 12h14M13 6l6 6-6 6" {...p}/>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" {...p}/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" {...p}/></>,
    edit: <><path d="M5 19h14M14 5l4 4-9 9H5v-4l9-9Z" {...p}/></>,
    instagram: <><rect x="4" y="4" width="16" height="16" rx="4.5" {...p}/><circle cx="12" cy="12" r="3.4" {...p}/><circle cx="17" cy="7" r="0.9" fill={color} stroke="none"/></>,
    check2: <><circle cx="12" cy="12" r="8.2" {...p}/><path d="M8.5 12.2l2.4 2.4 4.6-4.8" {...p}/></>,
    flask: <path d="M9 3h6M10 3v6l-4.5 8a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 9V3" {...p}/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0, ...style }}>
      {paths[name] || null}
    </svg>
  );
}

// Service-specific tiny glyphs for chips
function ServiceGlyph({ k, size = 14, color }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const m = {
    makeup: <path d="M8 3l3 3-5 13a1.4 1.4 0 0 1-2.7 0L8 3Z" {...p}/>,
    hair: <><path d="M6 4c4 2 8 2 12 0" {...p}/><path d="M6 9c4 2 8 2 12 0M6 14c3 1.5 6 1.5 9 .2" {...p}/></>,
    photo: <><rect x="3" y="7" width="18" height="13" rx="2.4" {...p}/><circle cx="12" cy="13.5" r="3.2" {...p}/><path d="M8 7l1.5-2.5h5L16 7" {...p}/></>,
    dj: <><circle cx="12" cy="12" r="8" {...p}/><circle cx="12" cy="12" r="2.4" {...p}/></>,
    music: <><path d="M9 18V6l9-2v12" {...p}/><circle cx="6.5" cy="18" r="2.4" {...p}/><circle cx="15.5" cy="16" r="2.4" {...p}/></>,
    planning: <><rect x="5" y="4" width="14" height="17" rx="2" {...p}/><path d="M9 9h6M9 13h6M9 17h3" {...p}/></>,
    video: <><rect x="3" y="6" width="13" height="12" rx="2" {...p}/><path d="M16 10l5-3v10l-5-3" {...p}/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>{m[k]}</svg>;
}

// ─────────────────────────────────────────────────────────────
// Eucalyptus mark (the brand symbol) — inline so it tints with accent
// ─────────────────────────────────────────────────────────────
function Eucalyptus({ size = 22, stem = PALETTE.terracotta, leaf = PALETTE.sage, style }) {
  return (
    <svg width={size} height={size * 1.55} viewBox="0 0 40 62" style={{ display: 'block', ...style }}>
      <circle cx="20" cy="5" r="3.4" fill={stem}/>
      <path d="M20 8 V58" stroke={stem} strokeWidth="2.2" strokeLinecap="round"/>
      <g fill={leaf}>
        <ellipse cx="11" cy="20" rx="8" ry="5" transform="rotate(-28 11 20)"/>
        <ellipse cx="29" cy="27" rx="8" ry="5" transform="rotate(28 29 27)"/>
        <ellipse cx="11" cy="34" rx="7.5" ry="4.6" transform="rotate(-28 11 34)"/>
        <ellipse cx="28" cy="41" rx="7" ry="4.4" transform="rotate(28 28 41)"/>
        <ellipse cx="13" cy="48" rx="6" ry="3.8" transform="rotate(-28 13 48)"/>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Label (Jost uppercase, wide tracking)
// ─────────────────────────────────────────────────────────────
function Label({ children, color = PALETTE.inkSoft, size = 11, style }) {
  return (
    <div style={{
      fontFamily: 'var(--sans)', textTransform: 'uppercase', letterSpacing: '0.28em',
      fontWeight: 500, fontSize: size, color, ...style,
    }}>{children}</div>
  );
}

// Serif heading
function Serif({ children, size = 26, color = PALETTE.nearBlack, weight = 500, style }) {
  return (
    <div style={{ fontFamily: 'var(--serif-display)', fontWeight: weight, fontSize: size, color, lineHeight: 1.1, letterSpacing: '0.005em', ...style }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────
function Avatar({ initials, color = PALETTE.terracotta, size = 44, ring = false, style }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: hexToRgba(color, 0.16), color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: size * 0.4,
      border: ring ? `1px solid ${hexToRgba(color, 0.5)}` : 'none', ...style,
    }}>{initials}</div>
  );
}

// Stacked avatar group
function AvatarStack({ ids, size = 30 }) {
  const members = ids.map(teamById).filter(Boolean);
  return (
    <div style={{ display: 'flex' }}>
      {members.map((m, i) => (
        <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -10, border: '2px solid var(--paper-card)', borderRadius: '50%' }}>
          <Avatar initials={m.initials} color={m.color} size={size} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Status chip
// ─────────────────────────────────────────────────────────────
function Chip({ tone, children, dot = true, size = 12 }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
      borderRadius: 50, background: tone.bg, color: tone.fg,
      fontFamily: 'var(--sans)', fontWeight: 500, fontSize: size, letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: tone.dot }} />}
      {children}
    </span>
  );
}

function ServiceChip({ k, lang }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 8px',
      borderRadius: 50, background: hexToRgba(PALETTE.sage, 0.13), color: PALETTE.ink,
      fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 12.5,
    }}>
      <ServiceGlyph k={k} color={PALETTE.sage} size={14} />
      {SERVICE_LABEL[lang][k]}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────
function Card({ children, onClick, style, sage = false, pad = 18 }) {
  return (
    <div onClick={onClick} style={{
      background: sage ? 'var(--surface-sage)' : 'var(--paper-card)',
      borderRadius: 18, padding: pad,
      boxShadow: sage ? 'none' : '0 6px 22px rgba(74,63,53,0.07)',
      border: sage ? '1px solid rgba(147,160,126,0.45)' : '1px solid rgba(74,63,53,0.05)',
      cursor: onClick ? 'pointer' : 'default', ...style,
    }}>{children}</div>
  );
}

// Pill button
function Btn({ children, onClick, variant = 'solid', accent, full = false, size = 'md', icon, style }) {
  const ac = accent || PALETTE.terracotta;
  const pad = size === 'sm' ? '9px 16px' : '13px 22px';
  const fs = size === 'sm' ? 12 : 13;
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'var(--sans)', textTransform: 'uppercase', letterSpacing: '0.16em',
    fontWeight: 500, fontSize: fs, padding: pad, borderRadius: 50, cursor: 'pointer',
    width: full ? '100%' : 'auto', border: `1px solid ${ac}`, transition: 'all .2s ease',
    boxSizing: 'border-box',
  };
  const variants = {
    solid: { background: ac, color: 'var(--paper-card)' },
    ghost: { background: 'transparent', color: ac },
    soft: { background: hexToRgba(ac, 0.12), color: ac, border: `1px solid transparent` },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {icon && <Icon name={icon} size={16} color={variants[variant].color} stroke={1.8} />}
      {children}
    </button>
  );
}

// thin rule with gold dot
function Rule({ dot = false, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...style }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(74,63,53,0.12)' }} />
      {dot && <div style={{ width: 5, height: 5, borderRadius: '50%', background: PALETTE.gold }} />}
      {dot && <div style={{ flex: 1, height: 1, background: 'rgba(74,63,53,0.12)' }} />}
    </div>
  );
}

// AI accent wrapper — sage botanic treatment + sparkle + "IA"
function AIBadge({ label = 'IA' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px 3px 7px',
      borderRadius: 50, background: hexToRgba(PALETTE.sage, 0.18), color: PALETTE.terracottaDark,
      fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 10.5, letterSpacing: '0.18em',
      textTransform: 'uppercase',
    }}>
      <Icon name="sparkle" size={12} color={PALETTE.sage} stroke={1.8} />{label}
    </span>
  );
}

Object.assign(window, {
  Icon, ServiceGlyph, Eucalyptus, Label, Serif, Avatar, AvatarStack,
  Chip, ServiceChip, Card, Btn, Rule, AIBadge,
});
