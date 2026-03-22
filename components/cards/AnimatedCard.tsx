/**
 * AnimatedCard
 * A simple slide-in animation component.
 * Cards slide from off-screen left into their final positions with spring animation.
 * No rotation, scaling, or deck-based movement - just clean slide-in.
 */

import React, { useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface AnimatedCardProps {
  card: Card;
  shouldAnimate: boolean;
  delayMs: number;
  onAnimationComplete: (cardId: string) => void;
  /** The final X position of this card within its container (for calculating slide-in start position) */
  finalPosition?: number;
  /** The width of each card (for calculating slide-in distance) */
  cardWidth?: number;
  children: React.ReactNode;
}

const { width: screenWidth } = Dimensions.get('window');
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 100,
  mass: 1,
};

export function AnimatedCard({
  card,
  shouldAnimate,
  delayMs,
  onAnimationComplete,
  finalPosition = 0,
  cardWidth = 56,
  children,
}: AnimatedCardProps) {
  // Calculate start position: slide in from left of final position
  // Each card starts off-screen relative to where it will land
  const startPosition = finalPosition - screenWidth;
  
  // Start at the calculated position (off-screen left relative to final position)
  const translateX = useSharedValue(startPosition);
  const animationCompleted = useRef(false);

  useEffect(() => {
    if (shouldAnimate && !animationCompleted.current) {
      const timer = setTimeout(() => {
        // Animate to final position (0 relative offset) with completion callback
        translateX.value = withSpring(0, SPRING_CONFIG, (isFinished) => {
          if (isFinished && !animationCompleted.current) {
            animationCompleted.current = true;
            const cardId = `${card.rank}${card.suit}`;
            onAnimationComplete(cardId);
          }
        });
      }, delayMs);

      return () => clearTimeout(timer);
    }
  }, [shouldAnimate, delayMs, translateX, card, onAnimationComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

export default AnimatedCard;
