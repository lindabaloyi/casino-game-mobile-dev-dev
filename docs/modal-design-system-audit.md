# Modal Design System Audit

## Current State Analysis

### Modals Reviewed (11 total):
1. CaptureOrAddModal.tsx
2. CaptureOrStealModal.tsx
3. ConfirmTempBuildModal.tsx
4. DisqualifiedPlayerModal.tsx
5. ExtendBuildModal.tsx
6. GameOverModal.tsx
7. OpponentProfileModal.tsx
8. PlayOptionsModal.tsx
9. RoundEndModal.tsx
10. ShiyaRecallModal.tsx
11. StealBuildModal.tsx

## Inconsistencies Found

### 1. Container Dimensions
| Modal | Width | maxWidth | minWidth | Padding |
|-------|-------|---------|---------|---------|
| CaptureOrAddModal | 100% (no %) | none | 260px | 24 |
| CaptureOrStealModal | 85% | 340 | 260 | 16 |
| ConfirmTempBuildModal | 75% | 280 | none | 16 |
| DisqualifiedPlayerModal | 85% | 340 | none | 16 |
| ExtendBuildModal | 85% | 300 | none | 16 |
| GameOverModal | varies | 340/380 | none | varies |
| OpponentProfileModal | 85% | 320 | none | 16 |
| PlayOptionsModal | 75% | 260 | none | 16 |
| RoundEndModal | 70-85% | 240-340 | none | 24 |
| ShiyaRecallModal | 75% | 260 | none | 16 |
| StealBuildModal | 75% | 260 | none | 16 |

**Standardization Proposal:** width: '85%', maxWidth: 320, minWidth: 260

### 2. Background Colors
- Green theme: #1a472a (most common), #1B5E20 (RoundEndModal)
- Red theme: #4a1a1a (CaptureOrStealModal)
- White: #fff (RoundEndModal regular)

**Standardization Proposal:** #1a472a (casino green dark)

### 3. Border Colors
- Green: #28a745 (most common), #2e7d32, #34d058
- Red: #dc2626 (CaptureOrStealModal)
- Purple: #a78bfa (CaptureOrAddModal)

**Standardization Proposal:** #28a745 (green accent)

### 4. Title Typography
| Modal | FontSize | Color | Weight |
|-------|---------|-------|--------|
| CaptureOrAddModal | 28 | #fbbf24 | bold |
| CaptureOrStealModal | 20 | #fbbf24 | bold |
| ConfirmTempBuildModal | 20 | #f59e0b | bold |
| DisqualifiedPlayerModal | 24 | #fbbf24 | bold |
| ExtendBuildModal | 22 | #f59e0b | bold |
| PlayOptionsModal | 20 | #f59e0b | bold |
| RoundEndModal | 24 | #1B5E20/#fff | bold |
| ShiyaRecallModal | 20 | #f59e0b | bold |
| StealBuildModal | 22 | #f59e0b | bold |

**Standardization Proposal:** fontSize: 22, color: #fbbf24 (gold), fontWeight: bold

### 5. Subtitle/Label Typography
| Modal | FontSize | Color |
|-------|---------|-------|
| Most | 11-14 | #9ca3af |

**Standardization Proposal:** fontSize: 12, color: #9ca3af (muted gray)

### 6. Button Styles
| Modal | BorderRadius | Padding | Border Width |
|-------|-------------|---------|-------------|
| CaptureOrAddModal | 12 | 14/24 | 1 |
| CaptureOrStealModal | 8 | 12/24 | 1 |
| ConfirmTempBuildModal | 8 | 12/24 | 1 |
| PlayOptionsModal | 8 | 12/24 | 1 |
| ShiyaRecallModal | 8 | 12/24 | 1 |
| StealBuildModal | 8 | 12/24 | 1 |

**Standardization Proposal:** borderRadius: 8, paddingVertical: 12-14, borderWidth: 1

### 7. Cancel Button Styles
- Background: #374151 (gray) - consistent
- Border radius: 6-10px (inconsistent)
- Padding: 8-10 vertical

**Standardization Proposal:** background: #374151, borderRadius: 8, paddingVertical: 10

### 8. Animation
- Most use: animationType="fade"
- RoundEndModal uses custom Animated API

**Standardization Proposal:** animationType: "fade" (standard)

### 9. Overlay
- Most: backgroundColor: 'rgba(0, 0, 0, 0.7)'
- Some: 0.6, 0.65

**Standardization Proposal:** 'rgba(0, 0, 0, 0.7)'

### 10. Z-Index
- Most: zIndex: 2000 (overlay), 2001 (content)

**Standardization Proposal:** 2000/2001 (maintain)

---

## Proposed Unified Modal Design System

### File: components/modals/ModalDesignSystem.ts

```typescript
// Modal Design System Constants

export const MODAL_DIMENSIONS = {
  // Container sizing
  width: '85%',
  maxWidth: 320,
  minWidth: 260,
  // Padding & radius
  padding: 16,
  borderRadius: 12,
};

export const MODAL_COLORS = {
  // Backgrounds
  background: '#1a472a',       // Casino green dark
  backgroundAlt: '#4a1a1a',  // Red variant for special cases
  // Borders  
  border: '#28a745',
  borderAlt: '#dc2626',        // Red accent
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const MODAL_TYPOGRAPHY = {
  // Title
  titleFontSize: 22,
  titleColor: '#fbbf24',      // Gold
  // Subtitle/Label  
  subtitleFontSize: 12,
  subtitleColor: '#9ca3af', // Muted gray
  // Body text
  bodyFontSize: 14,
  bodyColor: '#d1d5db',
};

export const MODAL_BUTTONS = {
  // Primary button
  primaryBackground: '#28a745',
  primaryBorder: '#34d058',
  primaryText: '#fff',
  // Secondary button  
  secondaryBackground: '#7c3aed',
  secondaryBorder: '#a78bfa',
  // Cancel button
  cancelBackground: '#374151',
  cancelText: '#9ca3af',
  // Common
  borderRadius: 8,
  paddingVertical: 12,
  paddingHorizontal: 24,
  borderWidth: 1,
  fontSize: 18,
  fontWeight: 'bold' as const,
};

export const MODAL_Z_INDEX = {
  overlay: 2000,
  content: 2001,
};

// Base Modal Container Component
// Reusable sub-components:
// - ModalHeader
// - ModalBody  
// - ModalButtonGroup
// - ModalCardDisplay
// - ModalFooter
```

---

## Migration Priority

### Tier 1 - Critical (visually inconsistent modals):
1. CaptureOrStealModal - red theme different from others
2. CaptureOrAddModal - no width %, different padding
3. GameOverModal - white background, complex layout

### Tier 2 - Important (match the standard):
4. ExtendBuildModal - width 85%, maxWidth 300
5. DisqualifiedPlayerModal - width 85%, maxWidth 340
6. RoundEndModal - two different styles

### Tier 3 - Nice to have:
7. ConfirmTempBuildModal
8. ShiyaRecallModal
9. PlayOptionsModal
10. StealBuildModal
11. OpponentProfileModal

---

## Implementation Notes

All new modals should:
1. Use the design system constants
2. Extend from base ModalContainer when possible
3. Maintain unique functionality and content
4. Follow the same animation pattern (fade)
5. Test on both portrait and landscape