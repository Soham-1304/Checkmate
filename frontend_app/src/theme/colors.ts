// ─────────────────────────────────────────────────────────────
// BlueTick Color Palette
// Ported 1:1 from Flutter AppColors
// ─────────────────────────────────────────────────────────────

export const Colors = {
  // ── Brand ─────────────────────────────────────────────────
  primary: '#055756', // Deep Teal
  primaryLight: '#8DC8BA', // Soft Teal
  primaryDark: '#033B3A', // Darker variant of Deep Teal

  accent: '#E5771E', // Amber
  accentLight: '#F39C12', // Lighter Amber
  accentDark: '#B35B13', // Darker Amber

  // ── Semantic ──────────────────────────────────────────────
  success: '#8DC8BA', // Soft Teal for success
  successLight: '#D1EAE3',
  warning: '#FDB617', // Sunshine
  warningLight: '#FEE0A1',
  error: '#D32F2F',
  errorLight: '#FFCDD2',
  info: '#0288D1',
  infoLight: '#B3E5FC',

  // ── Compliance Status ─────────────────────────────────────
  compliant: '#055756', // Deep Teal
  nonCompliant: '#E5771E', // Amber
  needsReview: '#E5771E', // Amber
  inProgress: '#FDB617', // Sunshine
  unknown: '#CFD8DC',

  // ── Neutrals (Light Theme) ─────────────────────────────────
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F4F8',
  surfaceElevated: '#FFFFFF',
  cardBackground: '#FFFFFF',

  border: '#E0E0E0',
  borderLight: '#EEEEEE',
  divider: '#E0E0E0',

  // ── Text ─────────────────────────────────────────────────
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textDisabled: '#CBD5E1',
  textInverse: '#FFFFFF',

  // ── Glassmorphism ─────────────────────────────────────────
  glassBackground: 'rgba(255,255,255,0.6)',
  glassBorder: 'rgba(0,0,0,0.2)',

  // ── Shadows ───────────────────────────────────────────────
  shadowDark: 'rgba(0,0,0,0.1)',
  shadowPrimary: 'rgba(0,77,64,0.2)',
} as const;
