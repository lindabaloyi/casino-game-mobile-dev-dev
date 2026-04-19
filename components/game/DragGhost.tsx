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
  // Hook 1: ALWAYS call useDragContext first
  const { dragX, dragY } = useDragContext();
  
  // Hook 2: ALWAYS call useAnimatedStyle - never conditionalize it
  const ghostStyleFromContext = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: dragX.value - CARD_WIDTH / 2,
    top: dragY.value - CARD_HEIGHT / 2,
    zIndex: 1000,
  }));
  
  // JS variable - not a hook, can be conditional
  const displayCard = draggingCard;
  
  // Now conditionally render content after hooks are called
  if (!displayCard) {
    return null;
  }
  
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