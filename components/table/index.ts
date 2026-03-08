// Table components barrel export
export { TableArea, default } from './TableArea';
export { CapturedCardsView, default as CapturedCardsViewDefault } from './CapturedCardsView';
export { CapturePile } from './CapturePile';
export { DraggableOpponentCard } from './DraggableOpponentCard';

// Types
export type { Card, TempStack, BuildStack, AnyStack, TableItem } from './types';
export { isLooseCard, isTempStack, isBuildStack, isAnyStack } from './types';

// Layout
export { TableGrid } from './layout/TableGrid';
export { TableRow } from './layout/TableRow';
export { useTableLayout, calculateRowDistribution } from './layout/useTableLayout';
export type { TableLayoutResult } from './layout/useTableLayout';

// Items
export { TableItemRenderer } from './items/TableItemRenderer';
export { LooseCardItem } from './items/LooseCardItem';
export { TempStackItem } from './items/TempStackItem';
export { BuildStackItem } from './items/BuildStackItem';

// Overlays
export { DropHint } from './overlays/DropHint';
export { StackOverlay } from './overlays/StackOverlay';
export { ExtensionOverlay } from './overlays/ExtensionOverlay';

// Utilities
export { useCardVisibility } from './utils/cardVisibility';
