// ─────────────────────────────────────────────────────────────
// Spacing & Dimensions — Ported 1:1 from Flutter
// ─────────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
  huge: 48,
  massive: 64,

  // ── Screen Padding
  screenHorizontal: 20,
  screenVertical: 24,
  screenTop: 16,

  // ── Card / Section
  cardPadding: 16,
  sectionSpacing: 24,
  itemSpacing: 12,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  full: 999,

  // ── Common Shapes
  card: 16,
  button: 12,
  chip: 8,
  dialog: 20,
  bottomSheet: 24,
} as const;

export const Dimensions = {
  // ── Button
  buttonHeightLg: 56,
  buttonHeightMd: 48,
  buttonHeightSm: 40,

  // ── Icon
  iconXs: 12,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXl: 32,
  iconXxl: 48,

  // ── App Bar
  appBarHeight: 60,

  // ── Bottom Nav
  bottomNavHeight: 72,

  // ── Card
  cardMinHeight: 80,

  // ── Avatar
  avatarSm: 32,
  avatarMd: 40,
  avatarLg: 56,

  // ── Scanner
  scannerOverlaySize: 280,
  scannerBorderWidth: 3,
} as const;
