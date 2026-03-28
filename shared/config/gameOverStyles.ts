/**
 * Game Over Style Configuration
 * Centralized styling for GameOverModal to ensure consistent presentation
 * across all game modes (tournament, head-to-head, group play, party mode)
 */

import { Animated, StyleSheet, DimensionValue, FlexAlignType } from 'react-native';

// ============================================================================
// COLOR SCHEME
// ============================================================================

export const GAME_OVER_COLORS = {
  // Primary colors
  background: '#1B5E20',
  gold: '#FFD700',
  white: '#FFFFFF',
  
  // Overlay and transparency
  overlay: 'rgba(0, 0, 0, 0.85)',
  panelBackground: 'rgba(255, 255, 255, 0.08)',
  separator: 'rgba(255, 255, 255, 0.2)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  
  // Text variations
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.75)',
  
  // Special elements
  activeBonus: '#FFD700',
  winnerText: '#FFD700',
  
  // Tournament badges
  qualifiedBadge: 'rgba(76, 175, 80, 0.9)',
  knockedOutBadge: 'rgba(244, 67, 54, 0.9)',
  
  // Buttons
  buttonBackground: '#FFD700',
  buttonText: '#1B5E20',
  backButtonText: 'rgba(255, 255, 255, 0.7)',
  
  // Team colors for party mode
  teamABackground: 'rgba(220, 38, 38, 0.25)',
  teamABorder: '#DC2626',
  teamAText: '#FCA5A5',
  teamBBackground: 'rgba(37, 99, 235, 0.25)',
  teamBBorder: '#2563EB',
  teamBText: '#93C5FD',
};

// ============================================================================
// TYPOGRAPHY SIZES
// ============================================================================

export const GAME_OVER_SIZES = {
  // Modal
  modalRadius: 12,
  panelRadius: 8,
  
  // Title and headers
  titleSize: 28,
  scoresTitleSize: 13,
  winnerTextSize: 20,
  
  // Player/Team names
  playerNameSize: 15,
  teamNameSize: 16,
  
  // Scores
  playerScoreSize: 22,
  teamScoreSize: 20,
  
  // Breakdown text
  labelSize: 11,
  breakdownValueSize: 11,
  statsLabelSize: 11,
  statsValueSize: 11,
  
  // Contribution labels
  contributionLabelSize: 11,
  contributionValueSize: 11,
  breakdownTitleSize: 10,
  
  // Badges
  badgeFontSize: 11,
  
  // Buttons
  buttonTextSize: 16,
  backButtonSize: 14,
  
  // Party mode team tiles (larger for visibility)
  partyTeamTileMinHeight: 90,
  partyTeamTilePadding: 16,
  partyTeamTileMarginHorizontal: 6,
  partyTeamScoreSize: 26,
  partyTeamNameSize: 18,
};

// ============================================================================
// SPACING AND LAYOUT
// ============================================================================

export const GAME_OVER_LAYOUT: {
  // Modal padding
  modalPadding: number;
  modalWidth: DimensionValue;
  modalMaxWidth: number;
  modalMaxHeight: DimensionValue;
  
  // Sections
  sectionMarginVertical: number;
  sectionMarginBottom: number;
  
  // Panels
  panelPadding: number;
  panelMarginHorizontal: number;
  teamPanelPadding: number;
  teamPanelMarginBottom: number;
  
  // Player header
  playerHeaderMarginBottom: number;
  playerHeaderPaddingBottom: number;
  playerHeaderBorderWidth: number;
  
  // Team header
  teamHeaderMarginBottom: number;
  teamHeaderPaddingBottom: number;
  teamHeaderBorderWidth: number;
  
  // Breakdown rows
  breakdownRowPaddingVertical: number;
  pointsContainerMarginBottom: number;
  statsContainerMarginTop: number;
  
  // Separators
  separatorMarginVertical: number;
  
  // Winner text
  winnerTextMarginVertical: number;
  
  // Buttons
  buttonPaddingVertical: number;
  buttonPaddingHorizontal: number;
  buttonMarginTop: number;
  backButtonMarginTop: number;
  
  // Badges
  badgePaddingHorizontal: number;
  badgePaddingVertical: number;
  badgeMarginBottom: number;
  badgeAlignSelf: FlexAlignType;
  
  // Team row spacing
  teamRowPaddingHorizontal: number;
  teamRowMarginVertical: number;
  
  // Players section
  playersSectionPaddingTop: number;
  playersSectionMarginTop: number;
  playersSectionBorderTopWidth: number;
  
  // Party mode team tiles
  partyTeamTileMarginHorizontal: number;
} = {
  // Modal padding
  modalPadding: 20,
  modalWidth: '92%',
  modalMaxWidth: 560,
  modalMaxHeight: '90%',
  
  // Sections
  sectionMarginVertical: 10,
  sectionMarginBottom: 12,
  
  // Panels
  panelPadding: 10,
  panelMarginHorizontal: 3,
  teamPanelPadding: 12,
  teamPanelMarginBottom: 8,
  
  // Player header
  playerHeaderMarginBottom: 10,
  playerHeaderPaddingBottom: 6,
  playerHeaderBorderWidth: 1,
  
  // Team header
  teamHeaderMarginBottom: 8,
  teamHeaderPaddingBottom: 6,
  teamHeaderBorderWidth: 1,
  
  // Breakdown rows
  breakdownRowPaddingVertical: 2,
  pointsContainerMarginBottom: 4,
  statsContainerMarginTop: 4,
  
  // Separators
  separatorMarginVertical: 6,
  
  // Winner text
  winnerTextMarginVertical: 14,
  
  // Buttons
  buttonPaddingVertical: 12,
  buttonPaddingHorizontal: 24,
  buttonMarginTop: 6,
  backButtonMarginTop: 2,
  
  // Badges
  badgePaddingHorizontal: 8,
  badgePaddingVertical: 4,
  badgeMarginBottom: 8,
  badgeAlignSelf: 'center',
  
  // Team row spacing
  teamRowPaddingHorizontal: 20,
  teamRowMarginVertical: 4,
  
  // Players section
  playersSectionPaddingTop: 8,
  playersSectionMarginTop: 8,
  playersSectionBorderTopWidth: 1,
  
  // Party mode team tiles
  partyTeamTileMarginHorizontal: 6,
};

// ============================================================================
// ANIMATION CONFIGURATION
// ============================================================================

export const GAME_OVER_ANIMATION = {
  // Fade animation
  fadeDuration: 500,
  
  // Spring animation
  springFriction: 8,
  springTension: 40,
  
  // Initial values
  initialFade: 0,
  initialScale: 0.8,
  
  // Helper to create animated values
  createAnimations: () => ({
    fadeAnim: new Animated.Value(0),
    scaleAnim: new Animated.Value(0.8),
  }),
  
  // Play entrance animation
  playEntrance: (fadeAnim: Animated.Value, scaleAnim: Animated.Value, onComplete?: () => void) => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(onComplete);
  },
};

// ============================================================================
// SCORING LABELS
// ============================================================================

export const SCORING_LABELS = {
  // Card bonuses
  tenDiamond: '10♦',
  twoSpade: '2♠',
  aces: 'Aces',
  
  // Count bonuses
  spades: (count: number) => `Spades (${count})`,
  cards: (count: number) => `Cards (${count})`,
  
  // Simple labels
  spadesSimple: 'Spades',
  cardsSimple: 'Cards',
  
  // Team section
  contributions: 'Contributions',
  playerLabel: (index: number) => `P${index + 1}`,
  
  // Badges
  qualified: '✓ Qualified',
  knockedOut: '✗ Knocked Out',
  
  // Title and headers
  title: 'Game Over',
  scoresTitle: 'Final Scores',
  
  // Winner text
  winnerTie: "It's a Tie!",
  winnerFormat: (winner: string) => `${winner} Wins!`,
  
  // Buttons
  playAgain: 'Play Again',
  backToMenu: 'Back to Menu',
  
  // Player names
  playerName: (index: number) => `Player ${index + 1}`,
  teamName: (team: string) => team,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format score with proper sign for display
 */
export const formatScore = (score: number): string => {
  if (score > 0) return `+${score}`;
  if (score < 0) return `${score}`;
  return '0';
};

/**
 * Get score color based on value
 */
export const getScoreColor = (score: number): string => {
  if (score > 0) return GAME_OVER_COLORS.gold;
  if (score < 0) return '#FF6B6B'; // Red for negative
  return GAME_OVER_COLORS.white;
};

/**
 * Check if score should show bonus styling
 */
export const hasBonusPoints = (breakdown: {
  tenDiamondPoints?: number;
  twoSpadePoints?: number;
  acePoints?: number;
  spadeBonus?: number;
  cardCountBonus?: number;
}): boolean => {
  return (
    (breakdown.tenDiamondPoints ?? 0) > 0 ||
    (breakdown.twoSpadePoints ?? 0) > 0 ||
    (breakdown.acePoints ?? 0) > 0 ||
    (breakdown.spadeBonus ?? 0) > 0 ||
    (breakdown.cardCountBonus ?? 0) > 0
  );
};

/**
 * Generate winner text based on game mode and scores
 */
export const getWinnerText = (
  scores: number[],
  playerCount: number,
  isPartyMode?: boolean
): string => {
  const getMaxScore = () => Math.max(...scores.filter((s) => s !== undefined && s !== null));
  const maxScore = getMaxScore();
  
  if (playerCount === 4 && isPartyMode) {
    const teamAScore = (scores[0] ?? 0) + (scores[1] ?? 0);
    const teamBScore = (scores[2] ?? 0) + (scores[3] ?? 0);
    
    if (teamAScore > teamBScore) return 'Team A Wins!';
    if (teamBScore > teamAScore) return 'Team B Wins!';
    return SCORING_LABELS.winnerTie;
  }
  
  const winners = scores
    .map((score, index) => (score === maxScore ? `Player ${index + 1}` : null))
    .filter(Boolean);
  
  if (winners.length === 1) return `${winners[0]} Wins!`;
  return SCORING_LABELS.winnerTie;
};

export default {
  GAME_OVER_COLORS,
  GAME_OVER_SIZES,
  GAME_OVER_LAYOUT,
  GAME_OVER_ANIMATION,
  SCORING_LABELS,
  formatScore,
  getScoreColor,
  hasBonusPoints,
  getWinnerText,
};