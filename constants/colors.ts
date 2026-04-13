export type ThemeColors = {
  bg: string;
  elevated: string;
  card: string;
  border: string;
  accent: string;
  accentDim: string;
  accentBg: string;
  accentText: string;       // verde legible sobre el fondo del tema
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
};

export const dark: ThemeColors = {
  bg:               '#0b0b0f',
  elevated:         '#141418',
  card:             'rgba(255,255,255,0.04)',
  border:           'rgba(255,255,255,0.12)',
  accent:           '#18acb4',
  accentDim:        '#317b8b',
  accentBg:         'rgba(24,172,180,0.18)',
  accentText:       '#18acb4',
  textPrimary:      '#f3f4f6',
  textSecondary:    '#9ca3af',
  textMuted:        '#6b7280',
  red:              '#F87171',
  redBg:            'rgba(239,68,68,0.12)',
  inputBg:          'rgba(255,255,255,0.05)',
  inputBorder:      'rgba(255,255,255,0.14)',
  inputBorderError: 'rgba(248,113,113,0.5)',
  skeletonBase:     'rgba(255,255,255,0.1)',
  tabBg:            'rgba(11,11,15,0.96)',
  tabBorder:        'rgba(255,255,255,0.14)',
};

export const light: ThemeColors = {
  bg:               '#f3f4f6',
  elevated:         '#e5e7eb',
  card:             'rgba(17,24,39,0.04)',
  border:           'rgba(17,24,39,0.12)',
  accent:           '#18acb4',
  accentDim:        '#317b8b',
  accentBg:         'rgba(24,172,180,0.14)',
  accentText:       '#317b8b',
  textPrimary:      '#111827',
  textSecondary:    '#4b5563',
  textMuted:        '#6b7280',
  red:              '#DC2626',
  redBg:            'rgba(220,38,38,0.08)',
  inputBg:          'rgba(17,24,39,0.04)',
  inputBorder:      'rgba(17,24,39,0.16)',
  inputBorderError: 'rgba(220,38,38,0.4)',
  skeletonBase:     'rgba(17,24,39,0.08)',
  tabBg:            'rgba(243,244,246,0.96)',
  tabBorder:        'rgba(17,24,39,0.12)',
};
