import { TextStyle, Platform } from 'react-native';
import { Colors } from './colors';

// ─────────────────────────────────────────────────────────────
// Typography System — Ported 1:1 from Flutter AppTypography
// Font: Inter (loaded via expo-font)
// ─────────────────────────────────────────────────────────────

const fontFamily = Platform.select({
  web: 'Inter, system-ui, -apple-system, sans-serif',
  default: 'Inter',
});

export const Typography = {
  // ── Display ───────────────────────────────────────────────
  displayLarge: {
    fontFamily,
    fontSize: 57,
    fontWeight: '800',
    lineHeight: 64,
    letterSpacing: -0.25,
    color: Colors.textPrimary,
  } as TextStyle,

  displayMedium: {
    fontFamily,
    fontSize: 45,
    fontWeight: '700',
    lineHeight: 52,
    color: Colors.textPrimary,
  } as TextStyle,

  displaySmall: {
    fontFamily,
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 44,
    color: Colors.textPrimary,
  } as TextStyle,

  // ── Headline ──────────────────────────────────────────────
  headlineLarge: {
    fontFamily,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    color: Colors.textPrimary,
  } as TextStyle,

  headlineMedium: {
    fontFamily,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 36,
    color: Colors.textPrimary,
  } as TextStyle,

  headlineSmall: {
    fontFamily,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: Colors.textPrimary,
  } as TextStyle,

  // ── Title ─────────────────────────────────────────────────
  titleLarge: {
    fontFamily,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
    color: Colors.textPrimary,
  } as TextStyle,

  titleMedium: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0.15,
    color: Colors.textPrimary,
  } as TextStyle,

  titleSmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.1,
    color: Colors.textPrimary,
  } as TextStyle,

  // ── Body ──────────────────────────────────────────────────
  bodyLarge: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0.15,
    color: Colors.textPrimary,
  } as TextStyle,

  bodyMedium: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.25,
    color: Colors.textSecondary,
  } as TextStyle,

  bodySmall: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: 0.4,
    color: Colors.textSecondary,
  } as TextStyle,

  // ── Label ─────────────────────────────────────────────────
  labelLarge: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.1,
    color: Colors.textPrimary,
  } as TextStyle,

  labelMedium: {
    fontFamily,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
    color: Colors.textSecondary,
  } as TextStyle,

  labelSmall: {
    fontFamily,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
    color: Colors.textTertiary,
  } as TextStyle,

  // ── Special ───────────────────────────────────────────────
  caption: {
    fontFamily,
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: 0.4,
    color: Colors.textTertiary,
  } as TextStyle,

  button: {
    fontFamily,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.textPrimary,
  } as TextStyle,

  overline: {
    fontFamily,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 1.5,
    color: Colors.textTertiary,
  } as TextStyle,
} as const;
