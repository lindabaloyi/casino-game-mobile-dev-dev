import { memo, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import CardStack from './CardStack';

interface CapturedCardsProps {
  captures: any[][]; // Array of capture groups
  playerIndex: number;
  isOpponent?: boolean;
  onCardPress?: (card: any, source: string) => void;
  isMinimal?: boolean; // Compact display mode
  isActivePlayerTurn?: boolean; // Whether it's the active player's turn
  onOppTopCardDragStart?: (card: any, metadata: any) => void;
  onOppTopCardDragEnd?: (draggedItem: any, dropPosition: any) => void;
}

const CapturedCards = memo<CapturedCardsProps>(({
  captures,
  playerIndex,
  isOpponent = false,
  onCardPress,
  isMinimal = false,
  isActivePlayerTurn = false,
  onOppTopCardDragStart,
  onOppTopCardDragEnd
}) => {
  // Flatten all capture groups for display
  const allCapturedCards = useMemo(() => captures.flat(), [captures]);

  // Check if there are any captures
  const hasCards = allCapturedCards.length > 0;

  // Only allow opponent's top card to be used (can't access captured cards in the middle)
  // Only draggable if it's opponent's cards AND active player's turn has any cards
  const isOpponentTopCardDraggable =
    isOpponent && isActivePlayerTurn && hasCards;

  // Get top card for display
  const topCard = allCapturedCards[allCapturedCards.length - 1];

  // 🐛 DEBUG: Log captured card rendering decision
  console.log(`[CapturedCards:DEBUG] 🎴 Rendering captured cards for player ${playerIndex}:`, {
    isOpponent,
    isActivePlayerTurn,
    hasCards,
    cardCount: allCapturedCards.length,
    isOpponentTopCardDraggable,
    allCards: allCapturedCards.map(c => `${c.rank}${c.suit}`),
    topCard: topCard ? `${topCard.rank}${topCard.suit}` : 'none',
    renderingMode: isOpponentTopCardDraggable ? 'SINGLE_TOP_CARD_DRAGGABLE' : 'FULL_STACK_NON_DRAGGABLE'
  });

  const handlePress = () => {
    if (isOpponent && onCardPress && topCard) {
      onCardPress(topCard, 'opponentCapture');
    }
  };

  return (
    <View style={isMinimal ? styles.minimalCaptures : styles.captures}>
      {hasCards ? (
        <View style={styles.captureStackContainer}>
          {/* Display capturable cards - only top card if opponent's */}
          {isOpponentTopCardDraggable ? (
            <CardStack
              stackId={`captures-${playerIndex}`}
              cards={[topCard]} // Only top card is accessible for dragging
              isBuild={false}
              draggable={true}
              currentPlayer={playerIndex}
              dragSource="captured"
              onDragStart={(card) => onOppTopCardDragStart?.(card, { opponentId: playerIndex })}
              onDragEnd={onOppTopCardDragEnd}
            />
          ) : (
            <TouchableOpacity
              style={styles.stackTouchable}
              onPress={handlePress}
              activeOpacity={isOpponent ? 0.7 : 1.0}
              disabled={!isOpponent}
            >
              <CardStack
                stackId={`captures-${playerIndex}`}
                cards={allCapturedCards}
                isBuild={true}
                buildValue={allCapturedCards.length} // Show total card count
                draggable={false}
                currentPlayer={playerIndex}
                dragSource="captured"
              />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={isMinimal ? styles.emptyMinimalCaptures : styles.emptyCaptures}>
          {/* Empty capture pile indicator */}
        </View>
      )}
    </View>
  );
});

// Add display name for React DevTools and linting
CapturedCards.displayName = 'CapturedCards';

const styles = StyleSheet.create({
  captures: {
    alignItems: 'center',
    padding: 4,
  },
  minimalCaptures: {
    alignItems: 'center',
    padding: 2,
  },
  stackTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureStackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCaptures: {
    width: 50,
    height: 70,
    borderWidth: 2,
    borderColor: '#999',
    borderStyle: 'dotted',
    borderRadius: 8,
    margin: 2,
  },
  emptyMinimalCaptures: {
    width: 40,
    height: 60,
    borderWidth: 1,
    borderColor: '#999',
    borderStyle: 'dotted',
    borderRadius: 6,
    margin: 2,
  },
});

export default CapturedCards;
