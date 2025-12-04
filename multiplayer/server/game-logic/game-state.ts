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
}

export function initializeGame(): GameState {
  console.log('Initializing game state...');

  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  let deck: Card[] = [];

  // Create deck
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        value: rank === 'A' ? 1 : parseInt(rank, 10)
      });
    }
  }

  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // Deal cards
  const playerHands: Card[][] = [[], []];
  for (let i = 0; i < 10; i++) {
    playerHands[0].push(deck.pop()!);
    playerHands[1].push(deck.pop()!);
  }

  return {
    deck,
    playerHands,
    tableCards: [],
    playerCaptures: [[], []],
    currentPlayer: 0,
    round: 1,
    scores: [0, 0],
    gameOver: false,
    winner: null,
    lastCapturer: null,
    scoreDetails: null,
  };
}
