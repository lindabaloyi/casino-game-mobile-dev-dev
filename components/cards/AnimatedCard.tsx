/**
 * AnimatedCard
 * A simple slide-in animation component.
 * Cards slide from off-screen left into their final positions with spring animation.
 * Only animates during initial card deal - during gameplay, cards render normally.
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
  // If not animating, start at final position (0) - no slide effect
  // If animating, start off-screen to the left relative to final position
  const startPosition = shouldAnimate ? (finalPosition - screenWidth) : 0;
  
  // Start at the appropriate position
  const translateX = useSharedValue(startPosition);
  const animationCompleted = useRef(false);

  useEffect(() => {
    console.log('[AnimatedCard] card:', card.rank + card.suit, 'shouldAnimate:', shouldAnimate, 'delayMs:', delayMs, 'startPosition:', startPosition);
    
    if (shouldAnimate && !animationCompleted.current) {
      console.log('[AnimatedCard] Starting animation for:', card.rank + card.suit);
      const timer = setTimeout(() => {
        // Animate to final position (0 relative offset) with completion callback
        translateX.value = withSpring(0, SPRING_CONFIG, (isFinished) => {
          if (isFinished && !animationCompleted.current) {
            animationCompleted.current = true;
            const cardId = `${card.rank}${card.suit}`;
            console.log('[AnimatedCard] Animation complete for:', cardId);
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
