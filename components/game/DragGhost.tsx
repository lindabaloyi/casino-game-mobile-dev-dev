import React from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { useDragContext } from '../../hooks/drag/DragContext';
import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';

export const DragGhost = React.memo(function DragGhost() {
  const { draggingCard, dragX, dragY, isDragging, isMyTurn } = useDragContext();
  
  const ghostStyle = useAnimatedStyle(() => {
    const isActive = isDragging.value && draggingCard.value != null;
    const shouldShow = isActive && isMyTurn.value;
    
    return {
      position: 'absolute' as const,
      left: dragX.value - CARD_WIDTH / 2,
      top: dragY.value - CARD_HEIGHT / 2,
      zIndex: 1000,
      opacity: shouldShow ? 1 : 0,
    };
  });

  return (
    <Animated.View style={ghostStyle} pointerEvents="none">
      <PlayingCard
        rank={draggingCard.value?.rank ?? '?'}
        suit={draggingCard.value?.suit ?? '?'}
      />
    </Animated.View>
  );
});

export default DragGhost;