import React from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { useDragContext } from '../../hooks/drag/DragContext';
import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';

interface DragGhostProps {
  draggingCard: any;
  ghostStyle: any;
}

export const DragGhost = React.memo(function DragGhost({ draggingCard, ghostStyle }: DragGhostProps) {
  // Read directly from DragContext for UI-thread positioning
  const { dragX, dragY, draggingCard: contextDraggingCard } = useDragContext();
  
  // Use context card if available, otherwise fall back to prop
  const displayCard = contextDraggingCard.value || draggingCard;
  
  if (!displayCard) return null;
  
  const ghostStyleFromContext = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: dragX.value - CARD_WIDTH / 2,
    top: dragY.value - CARD_HEIGHT / 2,
    zIndex: 1000,
  }));
  
  return (
    <Animated.View style={[ghostStyle, ghostStyleFromContext]} pointerEvents="none">
      <PlayingCard
        rank={displayCard.rank}
        suit={displayCard.suit}
      />
    </Animated.View>
  );
});

export default DragGhost;