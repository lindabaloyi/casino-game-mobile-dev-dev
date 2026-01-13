// Game state types for casino card game
export interface Card {
  suit: string;
  rank: string;
  value: number;
  source?: string; // For tracking csard origin in temp stacksssss
}

export interface TemporaryStack {
  stackId: string;
  type: 'temporary_stack';
  cards: Card[];
  owner: number;
}

export interface Build {
  buildId: string;
  type: 'build';
  cards: Card[];
  value: number;
  owner: number;
  isExtendable: boolean;
}

export type TableCard = Card | TemporaryStack | Build;

export interface GameState {
  deck: Card[];
  playerHands: Card[][];
  tableCards: TableCard[];
  playerCaptures: Card[][][];
  currentPlayer: number;
  round: number;
  scores: number[];
  gameOver: boolean;
  winner: number | null;
  lastCapturer: number | null;
  scoreDetails: any;
  // Build augmentation pending state
  pendingBuildAdditions?: {
    [buildId: string]: {
      card: Card;
      playerId: number;
      source: string;
      timestamp: number;
    };
  };
  // Temp stack hand card usage tracking (one per turn per player)
  tempStackHandCardUsedThisTurn?: boolean[];
}
