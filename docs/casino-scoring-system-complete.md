# Casino Game Scoring System - Complete Implementation

## Overview
The Casino/All Fours game uses a traditional scoring system where **11 points are available per deal**. Points are calculated from captured cards with specific rules for individual card values and bonuses.

## Scoring Rules

### Individual Card Points (4 points total)
- **10 of Diamonds** (♢): **2 points** (called the "dix")
- **2 of Spades** (♠): **1 point**
- **Each Ace** (A): **1 point**

### Bonuses (7 points total)

#### Spades Bonus (2 points)
- Player with **6 or more spades**: **+2 points**

#### Card Count Bonus (5 points)
- **21 or more cards**: **+2 points**
- **Exactly 20 cards**: **+1 point**

## Game Modes and Total Points

### 2-Player Mode
- Each player gets 10 cards per round
- 2 rounds total
- Winner determined by total points across both rounds
- Final scores should total 22 points (2 rounds × 11 points = 22 total)

### 3-Player Mode
- Single round game (10 cards each)
- Each player competes individually
- Highest score wins (scores total 11 points)

### 4-Player Party Mode (2v2 Teams)
- Single round game (10 cards each)
- Players team up: Players 0+1 vs Players 2+3
- Team with highest combined score wins
- Team bonuses apply to combined card counts

### 4-Player Free-for-All
- Single round game (10 cards each)
- Each player competes individually
- Highest individual score wins

## Server-Side Implementation

### Core Scoring Functions

#### `multiplayer/server/game/scoring.js`

```javascript
/**
 * Calculate points for an individual card
 */
function calculateCardPoints(card) {
  // 10 Diamond = 2 points
  if (card.rank === "10" && card.suit === "♦") {
    return 2;
  }

  // 2 Spade = 1 point
  if (card.rank === "2" && card.suit === "♠") {
    return 1;
  }

  // Each Ace = 1 point
  if (card.rank === "A") {
    return 1;
  }

  return 0;
}

/**
 * Calculate score for a player's captured cards
 */
function calculatePlayerScore(capturedCards) {
  if (!capturedCards || !Array.isArray(capturedCards)) {
    return 0;
  }

  let score = 0;

  // 1. Individual card points
  score += capturedCards.reduce((sum, card) => {
    if (!card || typeof card !== "object") return sum;
    return sum + calculateCardPoints(card);
  }, 0);

  // 2. Count spades and total cards for bonuses
  const spadeCount = capturedCards.filter(
    (card) => card && card.suit === "♠",
  ).length;

  const totalCards = capturedCards.length;

  // 3. Spades bonus: Player with 6 spades has 2 points
  if (spadeCount >= 6) {
    score += 2;
    logger.debug(`♠ Spades bonus: ${spadeCount} spades ≥ 6, +2 points`);
  }

  // 4. Card count bonuses:
  //    - 21 or more cards → 2 points
  //    - Exactly 20 cards   → 1 point
  if (totalCards >= 21) {
    score += 2;
    logger.debug(`🃏 Card count bonus: ${totalCards} cards ≥ 21, +2 points`);
  } else if (totalCards === 20) {
    score += 1;
    logger.debug(`🃏 Card count bonus: exactly 20 cards, +1 point`);
  }

  logger.debug(`Player score calculation: ${score} points`, {
    totalCards,
    spadeCount,
    cardPoints: capturedCards.reduce(
      (sum, card) => sum + calculateCardPoints(card),
      0,
    ),
    hasSpadesBonus: spadeCount >= 6,
    hasCardCountBonus: totalCards >= 21,
  });

  return score;
}

/**
 * Get detailed score breakdown for a player
 */
function getScoreBreakdown(capturedCards) {
  if (!capturedCards || !Array.isArray(capturedCards)) {
    return {
      totalCards: 0,
      spadeCount: 0,
      cardPoints: 0,
      spadeBonus: 0,
      cardCountBonus: 0,
      totalScore: 0,
      cards: [],
      // Detailed breakdown by card type
      tenDiamondCount: 0,
      tenDiamondPoints: 0,
      twoSpadeCount: 0,
      twoSpadePoints: 0,
      aceCount: 0,
      acePoints: 0,
    };
  }

  // Count specific cards for detailed breakdown
  const tenDiamondCards = capturedCards.filter(
    (card) => card && card.rank === "10" && card.suit === "♦"
  );
  const twoSpadeCards = capturedCards.filter(
    (card) => card && card.rank === "2" && card.suit === "♠"
  );
  const aceCards = capturedCards.filter(
    (card) => card && card.rank === "A"
  );

  const tenDiamondCount = tenDiamondCards.length;
  const tenDiamondPoints = tenDiamondCount * 2; // 10♦ = 2 points each

  const twoSpadeCount = twoSpadeCards.length;
  const twoSpadePoints = twoSpadeCount * 1; // 2♠ = 1 point each

  const aceCount = aceCards.length;
  const acePoints = aceCount * 1; // Ace = 1 point each

  // Count spades
  const spadeCount = capturedCards.filter(
    (card) => card && card.suit === "♠"
  ).length;

  // Count total cards
  const totalCards = capturedCards.length;

  // Calculate card points (sum of all individual card points)
  const cardPoints = capturedCards.reduce((sum, card) => {
    if (!card || typeof card !== "object") return sum;
    return sum + calculateCardPoints(card);
  }, 0);

  // Calculate bonuses
  let spadeBonus = 0;
  let cardCountBonus = 0;

  if (spadeCount >= 6) {
    spadeBonus = 2;
  }

  if (totalCards >= 21) {
    cardCountBonus = 2;
  } else if (totalCards === 20) {
    cardCountBonus = 1;
  }

  // Format cards for display
  const formattedCards = capturedCards.map(card => {
    if (!card) return null;
    const suitSymbols = { '♠': '♠', '♥': '♥', '♦': '♦', '♣': '♣' };
    const suitSymbol = suitSymbols[card.suit] || card.suit;
    return {
      rank: card.rank,
      suit: card.suit,
      value: card.value,
      display: `${card.rank} ${suitSymbol}`,
      points: calculateCardPoints(card),
    };
  }).filter(Boolean);

  return {
    totalCards,
    spadeCount,
    cardPoints,
    spadeBonus,
    cardCountBonus,
    totalScore: cardPoints + spadeBonus + cardCountBonus,
    cards: formattedCards,
    // Detailed breakdown by card type
    tenDiamondCount,
    tenDiamondPoints,
    twoSpadeCount,
    twoSpadePoints,
    aceCount,
    acePoints,
  };
}

/**
 * Get detailed team score breakdown aggregating players on each team
 */
function getTeamScoreBreakdown(players) {
  if (!players || !Array.isArray(players)) {
    return {
      teamA: getEmptyTeamBreakdown(),
      teamB: getEmptyTeamBreakdown(),
    };
  }

  // Get all cards for each team
  const teamACards = [];
  const teamBCards = [];
  const playerBreakdowns = [];

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const captures = player?.captures || [];
    const playerBreakdown = getScoreBreakdown(captures);
    playerBreakdowns.push(playerBreakdown);

    // Determine team
    const team = player?.team || (i < 2 ? 'A' : 'B');

    if (team === 'A') {
      teamACards.push(...captures);
    } else {
      teamBCards.push(...captures);
    }
  }

  // Calculate team totals
  const teamABreakdown = calculateTeamTotalBreakdown(teamACards);
  const teamBBreakdown = calculateTeamTotalBreakdown(teamBCards);

  return {
    teamA: {
      ...teamABreakdown,
      players: [
        { playerIndex: 0, ...playerBreakdowns[0] },
        { playerIndex: 1, ...playerBreakdowns[1] },
      ],
    },
    teamB: {
      ...teamBBreakdown,
      players: [
        { playerIndex: 2, ...playerBreakdowns[2] },
        { playerIndex: 3, ...playerBreakdowns[3] },
      ],
    },
  };
}

function calculateTeamTotalBreakdown(cards) {
  // Count specific cards
  const tenDiamondCount = cards.filter(
    (c) => c && c.rank === "10" && c.suit === "♦"
  ).length;
  const twoSpadeCount = cards.filter(
    (c) => c && c.rank === "2" && c.suit === "♠"
  ).length;
  const aceCount = cards.filter((c) => c && c.rank === "A").length;

  // Calculate points
  const tenDiamondPoints = tenDiamondCount * 2;
  const twoSpadePoints = twoSpadeCount * 1;
  const acePoints = aceCount * 1;
  const cardPoints = tenDiamondPoints + twoSpadePoints + acePoints;

  // Count spades
  const spadeCount = cards.filter((c) => c && c.suit === "♠").length;
  const totalCards = cards.length;

  // Calculate bonuses (team-based)
  let spadeBonus = 0;
  let cardCountBonus = 0;

  // In team mode: 6+ spades = +2 for the team
  if (spadeCount >= 6) {
    spadeBonus = 2;
  }

  // Team card bonus: 20+ cards = +2, exactly 20 = +1
  if (totalCards >= 21) {
    cardCountBonus = 2;
  } else if (totalCards === 20) {
    cardCountBonus = 1;
  }

  return {
    totalCards,
    spadeCount,
    cardPoints,
    spadeBonus,
    cardCountBonus,
    totalScore: cardPoints + spadeBonus + cardCountBonus,
    tenDiamondCount,
    tenDiamondPoints,
    twoSpadeCount,
    twoSpadePoints,
    aceCount,
    acePoints,
  };
}
```

#### `shared/game/scoring.js`

```javascript
/**
 * Casino Scoring System
 * Calculates points based on captured cards with specific rules
 * Total available points per deal: 11
 *
 * Scoring rules:
 * - 10 of diamonds (dix): 2 points
 * - 2 of spades: 1 point
 * - Each Ace: 1 point
 * - Spades bonus: 6+ spades = +2 points
 * - Card count bonus: 21+ cards = +2 points, exactly 20 cards = +1 point
 */

/**
 * Calculate points for an individual card
 */
function calculateCardPoints(card) {
  // 10 Diamond = 2 points (the "dix")
  if (card.rank === "10" && card.suit === "♦") {
    return 2;
  }

  // 2 Spade = 1 point
  if (card.rank === "2" && card.suit === "♠") {
    return 1;
  }

  // Each Ace = 1 point
  if (card.rank === "A") {
    return 1;
  }

  return 0;
}

/**
 * Calculate score for a player's captured cards
 * Uses standard Casino scoring (total 11 points available)
 */
function calculatePlayerScore(capturedCards) {
  if (!capturedCards || !Array.isArray(capturedCards)) {
    return 0;
  }

  let score = 0;

  // 1. Individual card points
  score += capturedCards.reduce((sum, card) => {
    if (!card || typeof card !== "object") return sum;
    return sum + calculateCardPoints(card);
  }, 0);

  // 2. Count spades and total cards for bonuses
  const spadeCount = capturedCards.filter(
    (card) => card && card.suit === "♠",
  ).length;

  const totalCards = capturedCards.length;

  // 3. Spades bonus: Player with 6 spades has 2 points
  if (spadeCount >= 6) {
    score += 2;
  }

  // 4. Card count bonuses:
  //    - 21 or more cards → 2 points
  //    - Exactly 20 cards   → 1 point
  if (totalCards >= 21) {
    score += 2;
  } else if (totalCards === 20) {
    score += 1;
  }

  return score;
}

/**
 * Calculate score breakdown for a player (for debugging/display)
 */
function getScoreBreakdown(capturedCards) {
  if (!capturedCards || !Array.isArray(capturedCards)) {
    return {
      totalCards: 0,
      spadeCount: 0,
      cardPoints: 0,
      spadeBonus: 0,
      cardCountBonus: 0,
      totalScore: 0,
    };
  }

  const cardPoints = capturedCards.reduce((sum, card) => {
    if (!card || typeof card !== "object") return sum;
    return sum + calculateCardPoints(card);
  }, 0);

  const spadeCount = capturedCards.filter(
    (card) => card && card.suit === "♠",
  ).length;

  const totalCards = capturedCards.length;

  let spadeBonus = 0;
  let cardCountBonus = 0;

  if (spadeCount >= 6) {
    spadeBonus = 2;
  }

  if (totalCards >= 21) {
    cardCountBonus = 2;
  } else if (totalCards === 20) {
    cardCountBonus = 1;
  }

  return {
    totalCards,
    spadeCount,
    cardPoints,
    spadeBonus,
    cardCountBonus,
    totalScore: cardPoints + spadeBonus + cardCountBonus,
  };
}
```

### Game State Score Updates

#### `multiplayer/server/game/scoring.js - updateScores()`

```javascript
/**
 * Update scores and determine winner in game state
 */
function updateScores(gameState) {
  if (!gameState) {
    logger.error("No game state provided for score update");
    return gameState;
  }

  const players = gameState.players || [];
  const playerCount = gameState.playerCount || players.length;

  // Calculate per-player scores
  const perPlayerScores = players.map(p =>
    calculatePlayerScore(p.captures || [])
  );
  gameState.scores = perPlayerScores;

  // Detect party mode: 4 players with team properties
  const isPartyMode = playerCount === 4 && players.some(p => p.team);

  // Calculate team scores for 4-player party mode only (when teams exist)
  if (playerCount === 4 && isPartyMode) {
    const teamScores = calculateTeamScores(players);
    gameState.teamScores = teamScores;

    // Determine team winner
    gameState.winner = determineWinner(perPlayerScores, playerCount, teamScores);

    logger.info(`📊 Scores updated: [${perPlayerScores.join(', ')}], Teams: [${teamScores.join(', ')}], Winner: ${gameState.winner !== null ? `Team ${gameState.winner}` : 'Tie'}`);
  } else if (playerCount === 3) {
    // 3-player mode: each player for themselves
    gameState.winner = determineWinner(perPlayerScores, playerCount);

    logger.info(`📊 Scores updated: [${perPlayerScores.join(', ')}], Winner: ${gameState.winner !== null ? `Player ${gameState.winner}` : 'Tie'}`);
  } else if (playerCount === 4) {
    // 4-player free-for-all: each player for themselves
    gameState.winner = determineWinner(perPlayerScores, playerCount);
    gameState.teamScores = null; // No team scores for free-for-all

    logger.info(`📊 Scores updated (4-player free-for-all): [${perPlayerScores.join(', ')}], Winner: ${gameState.winner !== null ? `Player ${gameState.winner}` : 'Tie'}`);
  } else {
    // 2-player mode
    const newScores = calculateFinalScores(players.map(p => p.captures || []));
    gameState.scores = newScores;
    gameState.winner = determineWinner(newScores, playerCount);

    logger.info(`📊 Scores updated: [${newScores[0]}, ${newScores[1]}], Winner: ${gameState.winner !== null ? `Player ${gameState.winner}` : 'Tie'}`);
  }

  return gameState;
}
```

### Game Coordinator Service - Score Calculation for Game Over

#### `multiplayer/server/services/GameCoordinatorService.js`

```javascript
_handleGameOver(gameId, finalState, isPartyGame, forceFinalize) {
  const finalizedState = forceFinalize ? finalizeGame(finalState) : finalState;

  scoring.updateScores(finalizedState);

  const finalScores = finalizedState.scores || [0, 0];
  const playerCount = finalizedState.playerCount || 2;

  const capturedCards = [];
  const scoreBreakdowns = [];
  const tableCardsRemaining = finalizedState.tableCards?.length || 0;
  const deckRemaining = finalizedState.deck?.length || 0;

  const isPartyMode = playerCount === 4 && finalizedState.players.some(p => p.team);
  const teamScoreBreakdowns = isPartyMode && playerCount === 4
    ? scoring.getTeamScoreBreakdown(finalizedState.players)
    : null;

  const isTournamentMode = finalizedState.tournamentMode === 'knockout';
  const playerStatuses = finalizedState.playerStatuses || null;
  const qualifiedPlayers = finalizedState.qualifiedPlayers || null;

  for (let i = 0; i < playerCount; i++) {
    capturedCards.push(finalizedState.players[i]?.captures?.length || 0);
    const captures = finalizedState.players[i]?.captures || [];
    scoreBreakdowns.push(scoring.getScoreBreakdown(captures));
  }

  finalizedState.gameOver = true;
  this.gameManager.saveGameState(gameId, finalizedState);

  this.persistence.saveGame(gameId, finalizedState, isPartyGame);

  this.broadcaster.broadcastToGame(gameId, 'game-over', {
    winner: RoundValidator.determineRoundWinner(finalizedState),
    finalScores,
    capturedCards,
    tableCardsRemaining,
    deckRemaining,
    scoreBreakdowns,
    teamScoreBreakdowns,
    isPartyMode,
    isTournamentMode,
    playerStatuses,
    qualifiedPlayers,
    // Tournament transition data...
  }, this.unifiedMatchmaking);
}
```

## Client-Side Implementation

### Game State Sync Hook - Receiving Scores

#### `hooks/multiplayer/useGameStateSync.ts`

```typescript
// Handle game-over event
useEffect(() => {
  if (!socket) return;

  const handleGameOver = (data: GameOverData) => {
    console.log('[useGameStateSync] Received game-over event:', JSON.stringify(data, null, 2));
    console.log('[useGameStateSync] Tournament transition data:', {
      nextGameId: data.nextGameId,
      nextPhase: data.nextPhase,
      transitionType: data.transitionType,
      countdownSeconds: data.countdownSeconds,
      eliminatedPlayers: data.eliminatedPlayers,
      qualifiedPlayers: data.qualifiedPlayers
    });
    console.log('[useGameStateSync] Final scores from server:', data.finalScores);
    console.log('[useGameStateSync] Score breakdowns from server:', JSON.stringify(data.scoreBreakdowns, null, 2));
    setGameOverData(data);

    // Record win/loss for player with game mode
    if (playerNumber !== null) {
      const isWinner = data.winner === playerNumber;

      // Get game mode from gameState or infer from player count
      // Map server game modes to our stats model modes
      let gameMode = 'two-hands'; // default

      if (gameState) {
        const serverMode = gameState.gameMode;
        if (serverMode === 'party' || serverMode === 'four-hands') {
          gameMode = 'four-hands'; // 4-player mode
        } else if (serverMode === 'three-hands') {
          gameMode = 'three-hands';
        } else if (serverMode === 'freeforall') {
          gameMode = 'freeforall';
        } else if (serverMode === 'tournament') {
          gameMode = 'tournament';
        } else {
          gameMode = 'two-hands'; // default two-player
        }
      } else if (data.isPartyMode) {
        gameMode = 'four-hands';
      }

      if (isWinner) {
        recordWin(gameMode);
      } else {
        recordLoss(gameMode);
      }
    }
  };

  socket.on('game-over', handleGameOver);

  return () => {
    socket.off('game-over', handleGameOver);
  };
}, [socket, playerNumber, recordWin, recordLoss, gameState]);
```

### Game Board Component - Modal Display Logic

#### `components/game/GameBoard.tsx`

```typescript
const isGameOver = useMemo(() =>
  (gameState.gameOver || !!gameOverData) || false,
  [gameState.gameOver, gameOverData]
);

const shouldShowStandardGameOver = useMemo(() => {
  console.log('[DEBUG] shouldShowStandardGameOver check:', {
    isGameOver,
    tournamentMode: gameState.tournamentMode,
    gameOverData: gameOverData ? {
      nextGameId: gameOverData.nextGameId,
      nextPhase: gameOverData.nextPhase,
      countdownSeconds: gameOverData.countdownSeconds,
      qualifiedPlayers: gameOverData.qualifiedPlayers,
      eliminatedPlayers: gameOverData.eliminatedPlayers,
      isTournamentMode: gameOverData.isTournamentMode
    } : null,
    gameOver: gameState.gameOver,
    hasGameOverData: !!gameOverData
  });

  if (!isGameOver) {
    console.log('[DEBUG] Not showing - isGameOver is false');
    return false;
  }

  // Show modal for all games (tournament and non-tournament) - same behavior
  console.log('[DEBUG] Showing GameOverModal - game ended');
  return true;
}, [isGameOver, gameState.tournamentMode, gameOverData]);
```

### Game Over Modal - Score Display

#### `components/modals/GameOverModal.tsx`

```typescript
interface PlayerBreakdown {
  totalCards: number;
  spadeCount: number;
  cardPoints: number;
  spadeBonus: number;
  cardCountBonus: number;
  totalScore: number;
  tenDiamondCount: number;
  tenDiamondPoints: number;
  twoSpadeCount: number;
  twoSpadePoints: number;
  aceCount: number;
  acePoints: number;
}

interface TeamBreakdown {
  totalCards: number;
  spadeCount: number;
  cardPoints: number;
  spadeBonus: number;
  cardCountBonus: number;
  totalScore: number;
  tenDiamondCount: number;
  tenDiamondPoints: number;
  twoSpadeCount: number;
  twoSpadePoints: number;
  aceCount: number;
  acePoints: number;
  players: {
    playerIndex: number;
    totalCards: number;
    spadeCount: number;
    cardPoints: number;
    spadeBonus: number;
    cardCountBonus: number;
    totalScore: number;
  }[];
}

// Player breakdown rendering
const renderPlayerBreakdown = (playerName: string, score: number, bd: PlayerBreakdown) => {
  const hasPoints =
    bd.tenDiamondPoints > 0 ||
    bd.twoSpadePoints > 0 ||
    bd.acePoints > 0 ||
    bd.spadeBonus > 0 ||
    bd.cardCountBonus > 0;

  return (
    <View style={styles.playerPanel}>
      <View style={styles.playerHeader}>
        <Text style={styles.playerName}>{playerName}</Text>
        <Text style={styles.playerScore}>{score}</Text>
      </View>

      {hasPoints && (
        <View style={styles.pointsContainer}>
          {bd.tenDiamondPoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>10♦</Text>
              <Text style={styles.breakdownValue}>{bd.tenDiamondPoints} pts</Text>
            </View>
          )}
          {bd.twoSpadePoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>2♠</Text>
              <Text style={styles.breakdownValue}>{bd.twoSpadePoints} pts</Text>
            </View>
          )}
          {bd.acePoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Aces</Text>
              <Text style={styles.breakdownValue}>{bd.acePoints} pts</Text>
            </View>
          )}
          {bd.spadeBonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Spades ({bd.spadeCount})</Text>
              <Text style={[styles.breakdownValue, styles.activeBonus]}>+{bd.spadeBonus}</Text>
            </View>
          )}
          {bd.cardCountBonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Cards ({bd.totalCards})</Text>
              <Text style={[styles.breakdownValue, styles.activeBonus]}>+{bd.cardCountBonus}</Text>
            </View>
          )}
        </View>
      )}

      {/* Separator only if there are points to show above */}
      {hasPoints && <View style={styles.separator} />}

      {/* Always show cards and spades */}
      <View style={styles.statsContainer}>
        <View style={styles.breakdownRow}>
          <Text style={styles.statsLabel}>Cards</Text>
          <Text style={styles.statsValue}>{bd.totalCards}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.statsLabel}>Spades</Text>
          <Text style={styles.statsValue}>{bd.spadeCount}</Text>
        </View>
      </View>
    </View>
  );
};

// Team breakdown rendering
const renderTeamBreakdown = (teamName: string, team: TeamBreakdown | null, teamScore: number) => {
  console.log(`[GameOverModal] renderTeamBreakdown called: ${teamName}, team=`, team, 'teamScore=', teamScore);
  // If no team data, return null so caller can use simple card instead
  if (!team) {
    console.log(`[GameOverModal] No team data for ${teamName}, returning null`);
    return null;
  }

  const hasPoints =
    team.tenDiamondPoints > 0 ||
    team.twoSpadePoints > 0 ||
    team.acePoints > 0 ||
    team.spadeBonus > 0 ||
    team.cardCountBonus > 0;

  return (
    <View style={styles.teamPanel}>
      <View style={styles.teamHeader}>
        <Text style={styles.teamName}>{teamName}</Text>
        <Text style={styles.teamScore}>{teamScore}</Text>
      </View>

      {hasPoints && (
        <View style={styles.pointsContainer}>
          {team.tenDiamondPoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>10♦</Text>
              <Text style={styles.breakdownValue}>{team.tenDiamondPoints} pts</Text>
            </View>
          )}
          {team.twoSpadePoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>2♠</Text>
              <Text style={styles.breakdownValue}>{team.twoSpadePoints} pts</Text>
            </View>
          )}
          {team.acePoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Aces</Text>
              <Text style={styles.breakdownValue}>{team.acePoints} pts</Text>
            </View>
          )}
          {team.spadeBonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Spades ({team.spadeCount})</Text>
              <Text style={[styles.breakdownValue, styles.activeBonus]}>+{team.spadeBonus}</Text>
            </View>
          )}
          {team.cardCountBonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Cards ({team.totalCards})</Text>
              <Text style={[styles.breakdownValue, styles.activeBonus]}>+{team.cardCountBonus}</Text>
            </View>
          )}
        </View>
      )}

      {/* Always show cards and spades for team */}
      <View style={styles.statsContainer}>
        <View style={styles.breakdownRow}>
          <Text style={styles.statsLabel}>Cards</Text>
          <Text style={styles.statsValue}>{team.totalCards}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.statsLabel}>Spades</Text>
          <Text style={styles.statsValue}>{team.spadeCount}</Text>
        </View>
      </View>
    </View>
  );
};
```

## Round Validator (Note: Different Implementation)

#### `multiplayer/server/game/utils/RoundValidator.js`

**Note:** This implementation simply counts captured cards, not using the full Casino scoring system. It's used for basic game state validation but not for final scoring.

```javascript
/**
 * Calculate scores from captured cards.
 * @param {object} state - Game state
 * @returns {{ scores: number[], details: object }}
 */
static calculateScores(state) {
  const playerCount = state.playerCount || state.players?.length || 2;
  const players = state.players || [];

  // Calculate scores for ALL players
  const scores = new Array(playerCount).fill(0);
  const details = {};

  for (let i = 0; i < playerCount; i++) {
    const captures = players[i]?.captures || [];
    scores[i] = captures.length;  // Just count cards, not proper scoring
    details[`player${i}Captures`] = captures.length;
  }

  // Detect party mode: 4 players with team properties
  const isPartyMode = playerCount === 4 && players.some(p => p.team);

  // For 4-player party mode, also calculate team scores
  if (playerCount === 4 && isPartyMode) {
    const teamAScore = scores[0] + scores[1]; // Players 0 and 1
    const teamBScore = scores[2] + scores[3]; // Players 2 and 3
    details.teamAScore = teamAScore;
    details.teamBScore = teamBScore;
  }

  return { scores, details };
}
```

## Scoring Flow Summary

### Server-Side Flow:
1. **Game ends** → `GameCoordinatorService._handleGameOver()` called
2. **Update scores** → `scoring.updateScores(gameState)` calculates all scores
3. **Get breakdowns** → `scoring.getScoreBreakdown()` for each player
4. **Team scores** → `scoring.getTeamScoreBreakdown()` for 4-player party mode
5. **Broadcast** → Send `game-over` event with all score data

### Client-Side Flow:
1. **Receive event** → `useGameStateSync` handles `game-over` event
2. **Set data** → `setGameOverData(data)` stores score information
3. **Show modal** → `GameBoard` detects `isGameOver = true`
4. **Display scores** → `GameOverModal` renders detailed breakdowns

## Key Points:
- **Total points per deal**: 11 (2-player rounds) or 22 (across 2 rounds)
- **Server uses**: `multiplayer/server/game/scoring.js` for full scoring logic
- **Shared uses**: `shared/game/scoring.js` for client/server compatibility
- **Client displays**: Detailed breakdowns in `GameOverModal`
- **Team mode**: Aggregates individual scores with team bonuses