import React from 'react';
import Animated from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';

interface DragGhostProps {
  draggingCard: any;
  ghostStyle: any;
}

export const DragGhost = React.memo(function DragGhost({ draggingCard, ghostStyle }: DragGhostProps) {
  if (!draggingCard) return null;
  
  return (
    <Animated.View style={ghostStyle} pointerEvents="none">
      <PlayingCard
        rank={draggingCard.rank}
        suit={draggingCard.suit}
      />
    </Animated.View>
  );
});
