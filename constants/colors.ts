export type ThemeColors = {
  bg: string;
  elevated: string;
  card: string;
  border: string;
  accent: string;
  accentDim: string;
  accentBg: string;
  accentText: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  red: string;
  redBg: string;
  inputBg: string;
  inputBorder: string;
  inputBorderError: string;
  skeletonBase: string;
  tabBg: string;
  tabBorder: string;
  // ── Liquid Glass tokens ──
  glass: string;
  glassBorder: string;
  glassHighlight: string;
  accentGlow: string;
  shadowAccent: string;
  shadowDark: string;
};

export const dark: ThemeColors = {
  // ── Deep backgrounds ──
  bg:               '#050508',
  elevated:         '#0C0C12',
  card:             'rgba(255,255,255,0.05)',
  border:           'rgba(255,255,255,0.10)',

  // ── Emerald bioluminescent accent ──
  accent:           '#00E5A0',
  accentDim:        '#00B87D',
  accentBg:         'rgba(0,229,160,0.12)',
  accentText:       '#00E5A0',

  // ── Text hierarchy ──
  textPrimary:      '#F0F2F5',
  textSecondary:    '#7A7F94',
  textMuted:        '#404560',

  // ── Feedback ──
  red:              '#FF6B6B',
  redBg:            'rgba(255,107,107,0.10)',

  // ── Inputs ──
  inputBg:          'rgba(255,255,255,0.04)',
  inputBorder:      'rgba(255,255,255,0.10)',
  inputBorderError: 'rgba(255,107,107,0.45)',

  // ── Skeleton ──
  skeletonBase:     'rgba(255,255,255,0.08)',

  // ── Tab bar ──
  tabBg:            'rgba(8,8,14,0.88)',
  tabBorder:        'rgba(255,255,255,0.12)',

  // ── Liquid Glass ──
  glass:            'rgba(255,255,255,0.06)',
  glassBorder:      'rgba(255,255,255,0.12)',
  glassHighlight:   'rgba(255,255,255,0.18)',
  accentGlow:       'rgba(0,229,160,0.15)',
  shadowAccent:     'rgba(0,229,160,0.08)',
  shadowDark:       'rgba(0,0,0,0.50)',
};

export const light: ThemeColors = {
  // ── Light backgrounds ──
  bg:               '#F2F3F7',
  elevated:         '#E8E9EF',
  card:             'rgba(255,255,255,0.70)',
  border:           'rgba(0,0,0,0.08)',

  // ── Emerald accent (darker for light mode legibility) ──
  accent:           '#00C78A',
  accentDim:        '#00A874',
  accentBg:         'rgba(0,199,138,0.10)',
  accentText:       '#00845C',

  // ── Text hierarchy ──
  textPrimary:      '#0A0A14',
  textSecondary:    '#5A5E72',
  textMuted:        '#9A9EB2',

  // ── Feedback ──
  red:              '#E03E3E',
  redBg:            'rgba(224,62,62,0.08)',

  // ── Inputs ──
  inputBg:          'rgba(255,255,255,0.60)',
  inputBorder:      'rgba(0,0,0,0.10)',
  inputBorderError: 'rgba(224,62,62,0.35)',

  // ── Skeleton ──
  skeletonBase:     'rgba(0,0,0,0.06)',

  // ── Tab bar ──
  tabBg:            'rgba(242,243,247,0.88)',
  tabBorder:        'rgba(0,0,0,0.08)',

  // ── Liquid Glass ──
  glass:            'rgba(255,255,255,0.55)',
  glassBorder:      'rgba(255,255,255,0.80)',
  glassHighlight:   'rgba(255,255,255,0.95)',
  accentGlow:       'rgba(0,199,138,0.12)',
  shadowAccent:     'rgba(0,199,138,0.06)',
  shadowDark:       'rgba(0,0,0,0.12)',
};
