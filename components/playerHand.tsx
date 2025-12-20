import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import DraggableCard from './DraggableCard';
import { CardType } from './card';

interface PlayerHandProps {
  player: number;
  cards: CardType[];
  isCurrent: boolean;
  onDragStart?: (card: CardType) => void;
  onDragEnd?: (draggedItem: any, dropPosition: any) => void;
  onDragMove?: (card: CardType, position: { x: number; y: number }) => void;
  currentPlayer: number;
  tableCards?: any[];
  cardToReset?: { rank: string; suit: string } | null;
}

const PlayerHand = memo<PlayerHandProps>(({
  player,
  cards,
  isCurrent,
  onDragStart,
  onDragEnd,
  onDragMove,
  currentPlayer,
  tableCards = [],
  cardToReset
}) => {
  // Basic logic - can be enhanced later
  const canDragHandCards = isCurrent;

  return (
    <View style={styles.playerHand}>
      {cards.map((card, index) => {
        const handKey = `hand-p${player}-${index}-${card.rank}-${card.suit}`;

        // Check if this card should be reset due to server error
        const shouldReset = Boolean(cardToReset &&
          cardToReset.rank === card.rank &&
          cardToReset.suit === card.suit);

        return (
          <DraggableCard
            key={handKey}
            card={card}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragMove={onDragMove}
            draggable={canDragHandCards}
            disabled={!canDragHandCards}
            size="normal"
            currentPlayer={currentPlayer}
            source="hand"
            triggerReset={shouldReset}
          />
        );
      })}
    </View>
  );
});

// Add display name for React DevTools and linting
PlayerHand.displayName = 'PlayerHand';

const styles = StyleSheet.create({
  playerHand: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    flexWrap: 'wrap', // Allow cards to wrap if needed
    paddingHorizontal: 2,
  },
});

export default PlayerHand;
