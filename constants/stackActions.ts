/**
 * constants/stackActions.ts
 * Design token configuration for every pending-stack action type.
 *
 * Adding a new stack type (e.g. extend_build):
 *   1. Add an entry here with label / badge / button colours.
 *   2. StackActionStrip and TempStackView/StackView pick it up automatically —
 *      no other UI changes needed.
 */

export const STACK_CONFIG = {

  // ── Temporary stack (hand/table card ↔ table card, pending confirm) ────────
  temp_stack: {
    label:       'TEMP',
    badgeColor:  '#17a2b8',   // teal
    acceptLabel: '✓  Accept',
    cancelLabel: '✕  Cancel',
    acceptTheme: { bg: '#d4edda', border: '#28a745' },
    cancelTheme: { bg: '#f8d7da', border: '#dc3545' },
  },

  // ── Build stack (accepted build, shows owner indicator) ─────────────────────
  build_stack: {
    label:       'BUILD',
    badgeColor:  '#f59e0b',   // amber
    acceptLabel: '✓  Confirm Build',
    cancelLabel: '✕  Cancel',
    acceptTheme: { bg: '#fef3c7', border: '#d97706' },
    cancelTheme: { bg: '#f8d7da', border: '#dc3545' },
  },

  // ── Extend build (player is extending an existing build) ──────────────────
  extend_build: {
    label:       'EXTEND',
    badgeColor:  '#8b5cf6',   // purple
    acceptLabel: '✓  Confirm',
    cancelLabel: '✕  Cancel',
    acceptTheme: { bg: '#ede9fe', border: '#7c3aed' },
    cancelTheme: { bg: '#f8d7da', border: '#dc3545' },
  },

} as const;

export type StackType = keyof typeof STACK_CONFIG;

/** Returns the config for a stack type, or undefined for unknown types. */
export function getStackConfig(type: string) {
  return STACK_CONFIG[type as StackType] ?? null;
}
