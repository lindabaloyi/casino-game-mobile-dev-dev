/**
 * Modal Design System
 * 
 * Unified design constants for all casino-game modals.
 * Ensures visual consistency while maintaining flexibility.
 * 
 * Usage:
 *   import { MODAL_DIMENSIONS, MODAL_COLORS, MODAL_TYPOGRAPHY, MODAL_BUTTONS } from './ModalDesignSystem';
 */

import { ViewStyle, TextStyle } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSIONS
// ─────────────────────────────────────────────────────────────────────────────

export const MODAL_DIMENSIONS = {
  // Container sizing
  width: '85%' as const,
  maxWidth: 320,
  minWidth: 260,
  // Padding & radius
  padding: 16,
  borderRadius: 12,
};

// ─────────────────────────────────────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────────────────────────────────────

export const MODAL_COLORS = {
  // Backgrounds
  background: '#1a472a',       // Casino green dark (primary)
  backgroundAlt: '#4a1a1a',   // Red variant for special cases (capture/steal)
  backgroundLight: '#2a5a3a',   // Lighter green for sections
  // Borders  
  border: '#28a745',           // Green accent
  borderAlt: '#dc2626',         // Red accent (capture/steal)
  borderHighlight: '#34d058',   // Brighter green
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  // Text
  titleGold: '#fbbf24',         // Gold for titles
  textPrimary: '#ffffff',       // White for primary text
  textSecondary: '#9ca3af',  // Muted gray for labels
  textSuccess: '#34d058',      // Green for success
  textDanger: '#f87171',        // Red for warnings
  // Buttons
  buttonPrimary: '#28a745',     // Green action buttons
  buttonSecondary: '#7c3aed',   // Purple secondary
  buttonDanger: '#dc2626',       // Red danger
  buttonCancel: '#374151',      // Gray cancel
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────────────────────────────────────────

export const MODAL_TYPOGRAPHY = {
  // Title
  title: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: MODAL_COLORS.titleGold,
  } as TextStyle,
  // Subtitle/Label  
  subtitle: {
    fontSize: 12,
    color: MODAL_COLORS.textSecondary,
    marginBottom: 12,
  } as TextStyle,
  // Body text
  body: {
    fontSize: 14,
    color: MODAL_COLORS.textPrimary,
  } as TextStyle,
};

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON STYLES
// ────────────────────────────────────────────────────────────────────────────��

export const MODAL_BUTTONS = {
  // Base button style
  base: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    width: '100%' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  } as ViewStyle,
  // Primary button (green)
  primary: {
    backgroundColor: MODAL_COLORS.buttonPrimary,
    borderColor: MODAL_COLORS.borderHighlight,
  } as ViewStyle,
  // Secondary button (purple)
  secondary: {
    backgroundColor: MODAL_COLORS.buttonSecondary,
    borderColor: '#a78bfa',
  } as ViewStyle,
  // Danger button (red)
  danger: {
    backgroundColor: MODAL_COLORS.buttonDanger,
    borderColor: '#f87171',
  } as ViewStyle,
  // Cancel button (gray)
  cancel: {
    backgroundColor: MODAL_COLORS.buttonCancel,
    borderColor: MODAL_COLORS.buttonCancel,
  } as ViewStyle,
  // Text
  text: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: MODAL_COLORS.textPrimary,
  } as TextStyle,
};

// ─────────────────────────────────────────────────────────────────────────────
// Z-INDEX
// ─────────────────────────────────────────────────────────────────────────────

export const MODAL_Z_INDEX = {
  overlay: 2000,
  content: 2001,
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────────────────────────────────────────

export const MODAL_STYLES = {
  overlay: {
    flex: 1,
    backgroundColor: MODAL_COLORS.overlay,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: MODAL_Z_INDEX.overlay,
  } as ViewStyle,
  modalContent: {
    backgroundColor: MODAL_COLORS.background,
    borderRadius: MODAL_DIMENSIONS.borderRadius,
    borderWidth: 2,
    borderColor: MODAL_COLORS.border,
    padding: MODAL_DIMENSIONS.padding,
    width: MODAL_DIMENSIONS.width,
    maxWidth: MODAL_DIMENSIONS.maxWidth,
    minWidth: MODAL_DIMENSIONS.minWidth,
    alignItems: 'center' as const,
    zIndex: MODAL_Z_INDEX.content,
  } as ViewStyle,
  clickOutside: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  cardsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    gap: 2,
  } as ViewStyle,
  cardWrapper: {
    marginHorizontal: -4,
  } as ViewStyle,
  plusSign: {
    fontSize: 20,
    color: MODAL_COLORS.titleGold,
    fontWeight: 'bold' as const,
    marginHorizontal: 4,
  } as TextStyle,
};

// ─────────────────────────────────────────────────────────────────────────────
// ALTERNATIVE RED THEME (for capture/steal modals)
// ─────────────────────────────────────────────────────────────────────────────

export const MODAL_RED_THEME = {
  background: '#4a1a1a',
  border: '#dc2626',
  title: {
    ...MODAL_TYPOGRAPHY.title,
    color: '#fbbf24',
  } as TextStyle,
};

export default {
  DIMENSIONS: MODAL_DIMENSIONS,
  COLORS: MODAL_COLORS,
  TYPOGRAPHY: MODAL_TYPOGRAPHY,
  BUTTONS: MODAL_BUTTONS,
  Z_INDEX: MODAL_Z_INDEX,
  STYLES: MODAL_STYLES,
};