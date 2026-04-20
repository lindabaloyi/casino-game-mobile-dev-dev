import React from 'react';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface DragGhostProps {
  draggingCard?: Card | null;
  overlayX: SharedValue<number>;
  overlayY: SharedValue<number>;
  isDragging: SharedValue<boolean>;
}

export const DragGhost = React.memo(function DragGhost({
  draggingCard,
  overlayX,
  overlayY,
  isDragging,
}: DragGhostProps) {
  // Create animated style that subscribes directly to shared values
  // This ensures the subscription is attached correctly on mobile
  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: overlayX.value,
    top: overlayY.value,
    zIndex: 1000,
    opacity: isDragging.value ? 1 : 0,
    // Hardware acceleration
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  }));

  if (!draggingCard) return null;

  return (
    <Animated.View
      style={animatedStyle}
      pointerEvents="none"
      renderToHardwareTextureAndroid={true}
    >
      <PlayingCard
        rank={draggingCard.rank}
        suit={draggingCard.suit}
      />
    </Animated.View>
  );
});
