import React from 'react';
import { GestureResponderEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type CardType = {
  rank: string;
  suit: string;
  value?: number;
};

type CardProps = {
  card: CardType;
  onPress?: (card: CardType) => void;
  onDragStart?: (event: GestureResponderEvent) => void;
  onDragEnd?: (event: GestureResponderEvent) => void;
  draggable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  size?: "normal" | "small" | "large";
};

const Card: React.FC<CardProps> = ({
  card,
  onPress,
  onDragStart,
  onDragEnd,
  draggable = false,
  selected = false,
  disabled = false,
  size = 'normal',
}) => {
  const isRed = card.suit === '♥' || card.suit === '♦';
  const color = isRed ? '#CC0000' : '#1a1a1a';

  const getCardSize = (): { width: number; height: number } => {
    switch (size) {
      case 'small':  return { width: 40, height: 56 };
      case 'large':  return { width: 80, height: 112 };
      default:       return { width: 60, height: 84 };
    }
  };

  /** Font sizes that scale with the card size */
  const getFontSizes = () => {
    switch (size) {
      case 'small':
        return { cornerRank: 7, cornerSuit: 6, centerSuit: 16 };
      case 'large':
        return { cornerRank: 13, cornerSuit: 11, centerSuit: 38 };
      default:
        return { cornerRank: 10, cornerSuit: 9, centerSuit: 26 };
    }
  };

  const cardSize   = getCardSize();
  const fontSizes  = getFontSizes();
  const cornerPadH = size === 'small' ? 3 : 5;
  const cornerPadV = size === 'small' ? 2 : 3;

  return (
    <TouchableOpacity
      onPress={() => onPress?.(card)}
      onPressIn={onDragStart}
      onPressOut={onDragEnd}
      disabled={disabled}
      style={[
        styles.card,
        cardSize,
        selected  && styles.selectedCard,
        disabled  && styles.disabledCard,
      ]}
    >
      {/* ── Top-left corner ── */}
      <View style={[styles.cornerTopLeft, { paddingLeft: cornerPadH, paddingTop: cornerPadV }]}>
        <Text style={[styles.cornerRank, { color, fontSize: fontSizes.cornerRank }]}>
          {card.rank}
        </Text>
        <Text style={[styles.cornerSuit, { color, fontSize: fontSizes.cornerSuit }]}>
          {card.suit}
        </Text>
      </View>

      {/* ── Centre suit symbol ── */}
      <View style={styles.center}>
        <Text style={[styles.centerSuit, { color, fontSize: fontSizes.centerSuit }]}>
          {card.suit}
        </Text>
      </View>

      {/* ── Bottom-right corner (rotated 180°) ── */}
      <View
        style={[
          styles.cornerBottomRight,
          { paddingRight: cornerPadH, paddingBottom: cornerPadV },
        ]}
      >
        <View style={styles.rotated}>
          <Text style={[styles.cornerRank, { color, fontSize: fontSizes.cornerRank }]}>
            {card.rank}
          </Text>
          <Text style={[styles.cornerSuit, { color, fontSize: fontSizes.cornerSuit }]}>
            {card.suit}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C8C8C8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 5,
    margin: 2,
    overflow: 'hidden',
  },
  selectedCard: {
    borderColor: '#007AFF',
    borderWidth: 2.5,
    backgroundColor: '#EBF5FF',
  },
  disabledCard: {
    opacity: 0.5,
  },

  /* ── Corner labels ── */
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rotated: {
    transform: [{ rotate: '180deg' }],
    alignItems: 'center',
  },
  cornerRank: {
    fontWeight: '800',
    lineHeight: undefined, // let fontSize drive it
    includeFontPadding: false,
  },
  cornerSuit: {
    lineHeight: undefined,
    includeFontPadding: false,
    marginTop: -1,
  },

  /* ── Centre suit ── */
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSuit: {
    fontWeight: '400',
    includeFontPadding: false,
  },
});

export default Card;
