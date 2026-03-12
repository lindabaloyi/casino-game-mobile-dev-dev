/**
 * Tutorial Data
 * 
 * Defines tutorial scenarios for learning game mechanics.
 * Each tutorial includes pre-configured table states and step-by-step actions.
 * 
 * Format: Auto-playing animated demonstrations for Duel mode (2 players)
 */

// Card helper to create card objects
const card = (rank, suit) => ({
  rank,
  suit,
  value: getCardValue(rank),
  cardId: `${rank}${suit}`,
});

function getCardValue(rank) {
  const values = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 10, 'Q': 10, 'K': 10
  };
  return values[rank] || 0;
}

// Tutorial definitions
const tutorials = {
  /**
   * Tutorial 1: How to Trail
   * Learn to place cards from hand to table
   */
  trail: {
    id: 'trail',
    title: 'How to Trail',
    icon: 'card-outline',
    description: 'Learn to place cards on the table when you can\'t capture or build.',
    difficulty: 'beginner',
    rules: [
      'You can trail any card from your hand',
      'You cannot trail a card if its rank already exists on the table',
      'Trailing ends your turn'
    ],
    steps: [
      {
        id: 'intro',
        title: 'The Trail Action',
        description: 'When you can\'t capture or build, trail a card to the table. Let\'s see how it works!',
        tableCards: [
          card('5', '♠'),
          card('9', '♥'),
        ],
        hands: {
          0: [card('K', '♠'), card('3', '♦')],
          1: [card('7', '♣'), card('J', '♦')],
        },
        currentPlayer: 0,
        highlightZone: 'hand-0',
      },
      {
        id: 'action',
        title: 'Playing the King',
        description: 'Player 1 plays the King. Notice there\'s no matching card on the table, so they trail it.',
        tableCards: [
          card('5', '♠'),
          card('9', '♥'),
          card('K', '♠'),
        ],
        hands: {
          0: [card('3', '♦')],
          1: [card('7', '♣'), card('J', '♦')],
        },
        currentPlayer: 0,
        animation: {
          type: 'trail',
          player: 0,
          cardIndex: 0,
        },
      },
      {
        id: 'complete',
        title: 'Turn Ends',
        description: 'The King is now on the table. Player 2\'s turn! Remember: you cannot have duplicate ranks on the table.',
        tableCards: [
          card('5', '♠'),
          card('9', '♥'),
          card('K', '♠'),
        ],
        hands: {
          0: [card('3', '♦')],
          1: [card('7', '♣'), card('J', '♦')],
        },
        currentPlayer: 1,
      },
    ],
  },

  /**
   * Tutorial 2: How to Capture Loose Cards
   * Learn to capture single cards from the table
   */
  captureLoose: {
    id: 'captureLoose',
    title: 'Capture Loose Cards',
    icon: 'hand-right-outline',
    description: 'Capture a matching card from the table to add to your capture pile.',
    difficulty: 'beginner',
    rules: [
      'You can only capture cards that match the rank of your played card',
      'Both cards go to your capture pile',
      'Capture ends your turn'
    ],
    steps: [
      {
        id: 'intro',
        title: 'Capture a Match',
        description: 'Player 1 has a 7 in hand. There\'s a 7 on the table. They can capture it!',
        tableCards: [
          card('7', '♠'),
          card('K', '♥'),
        ],
        hands: {
          0: [card('7', '♦'), card('5', '♣')],
          1: [card('9', '♠'), card('Q', '♥')],
        },
        currentPlayer: 0,
        highlightZone: 'table-0',
      },
      {
        id: 'action',
        title: 'Playing the 7',
        description: 'Player 1 plays their 7♦ and captures the 7♠ from the table. Both cards go to their capture pile!',
        tableCards: [
          card('K', '♥'),
        ],
        hands: {
          0: [card('5', '♣')],
          1: [card('9', '♠'), card('Q', '♥')],
        },
        currentPlayer: 0,
        captures: {
          0: [card('7', '♠'), card('7', '♦')],
        },
        animation: {
          type: 'capture',
          player: 0,
          cardIndex: 0,
          targetIndex: 0,
        },
      },
      {
        id: 'complete',
        title: 'Capture Complete!',
        description: 'The 7♦ and 7♠ are now in Player 1\'s capture pile. Player 2\'s turn!',
        tableCards: [
          card('K', '♥'),
        ],
        hands: {
          0: [card('5', '♣')],
          1: [card('9', '♠'), card('Q', '♥')],
        },
        currentPlayer: 1,
        captures: {
          0: [card('7', '♠'), card('7', '♦')],
        },
      },
    ],
  },

  /**
   * Tutorial 3: How to Build (Create Temp Stack)
   * Learn to create temporary stacks
   */
  buildTemp: {
    id: 'buildTemp',
    title: 'Build Temp Stack',
    icon: 'layers-outline',
    description: 'Create a temporary stack by combining cards to reach a target value.',
    difficulty: 'beginner',
    rules: [
      'Drop a card onto another card to create a temp stack',
      'The stack value is the sum of all cards',
      'You can capture the entire stack if you have a card matching the total value',
      'Temp stacks are temporary - must be captured or accepted within the same round'
    ],
    steps: [
      {
        id: 'intro',
        title: 'Creating a Temp Stack',
        description: 'Player 1 has a 5 in hand and there\'s a 3 on the table. They can drop the 5 on the 3 to create a temp stack worth 8!',
        tableCards: [
          card('3', '♠'),
          card('K', '♥'),
        ],
        hands: {
          0: [card('5', '♦'), card('8', '♣')],
          1: [card('9', '♠'), card('Q', '♥')],
        },
        currentPlayer: 0,
        highlightZone: 'table-0',
      },
      {
        id: 'action',
        title: 'Building the Stack',
        description: 'Player 1 drops the 5♦ onto the 3♠. A temp stack is created with value 8 (3+5).',
        tableCards: [
          { type: 'temp_stack', stackId: 'temp-1', cards: [card('3', '♠'), card('5', '♦')], value: 8, owner: 0 },
          card('K', '♥'),
        ],
        hands: {
          0: [card('8', '♣')],
          1: [card('9', '♠'), card('Q', '♥')],
        },
        currentPlayer: 0,
        animation: {
          type: 'build',
          player: 0,
          cardIndex: 0,
          targetIndex: 0,
        },
      },
      {
        id: 'capture',
        title: 'Capturing the Build',
        description: 'Now Player 1 plays the 8♣ and captures the entire temp stack! The 8, 5, and 3 all go to their capture pile.',
        tableCards: [
          card('K', '♥'),
        ],
        hands: {
          0: [],
          1: [card('9', '♠'), card('Q', '♥')],
        },
        currentPlayer: 0,
        captures: {
          0: [card('8', '♣'), card('5', '♦'), card('3', '♠')],
        },
        animation: {
          type: 'captureBuild',
          player: 0,
          cardIndex: 0,
          targetStackId: 'temp-1',
        },
      },
      {
        id: 'complete',
        title: 'Great Play!',
        description: 'Player 1 captured 3 cards at once! This is called a "build" - combining cards to capture more.',
        tableCards: [
          card('K', '♥'),
        ],
        hands: {
          0: [],
          1: [card('9', '♠'), card('Q', '♥')],
        },
        currentPlayer: 1,
        captures: {
          0: [card('8', '♣'), card('5', '♦'), card('3', '♠')],
        },
      },
    ],
  },

  /**
   * Tutorial 4: Capture Build Stack
   * Learn to capture existing builds
   */
  captureBuild: {
    id: 'captureBuild',
    title: 'Capture Build Stack',
    icon: 'trophy-outline',
    description: 'Capture an existing build stack to collect all its cards.',
    difficulty: 'intermediate',
    rules: [
      'You need a card matching the build\'s total value',
      'When captured, all cards in the build go to your capture pile',
      'You can capture builds you created or opponent created'
    ],
    steps: [
      {
        id: 'intro',
        title: 'Opponent\'s Build',
        description: 'Player 2 (opponent) has a build on the table worth 9. Player 1 has a 9 and can capture it!',
        tableCards: [
          { type: 'build_stack', stackId: 'build-1', cards: [card('4', '♠'), card('5', '♦')], value: 9, owner: 1, hasBase: true },
          card('K', '♥'),
        ],
        hands: {
          0: [card('9', '♣'), card('3', '♠')],
          1: [card('7', '♦'), card('J', '♥')],
        },
        currentPlayer: 0,
        highlightZone: 'table-0',
      },
      {
        id: 'action',
        title: 'Capturing the Build',
        description: 'Player 1 plays 9♣ and captures the build! All cards (4, 5, 9) go to their capture pile.',
        tableCards: [
          card('K', '♥'),
        ],
        hands: {
          0: [card('3', '♠')],
          1: [card('7', '♦'), card('J', '♥')],
        },
        currentPlayer: 0,
        captures: {
          0: [card('9', '♣'), card('4', '♠'), card('5', '♦')],
        },
        animation: {
          type: 'captureBuild',
          player: 0,
          cardIndex: 0,
          targetStackId: 'build-1',
        },
      },
      {
        id: 'complete',
        title: 'Build Captured!',
        description: 'Player 1 now has the entire build in their capture pile. This is a great way to score points!',
        tableCards: [
          card('K', '♥'),
        ],
        hands: {
          0: [card('3', '♠')],
          1: [card('7', '♦'), card('J', '♥')],
        },
        currentPlayer: 1,
        captures: {
          0: [card('9', '♣'), card('4', '♠'), card('5', '♦')],
        },
      },
    ],
  },

  /**
   * Tutorial 5: Steal Build
   * Learn to steal opponent's builds
   */
  stealBuild: {
    id: 'stealBuild',
    title: 'Steal a Build',
    icon: 'heart-outline',
    description: 'Add a card to an opponent\'s build to take ownership of it.',
    difficulty: 'intermediate',
    rules: [
      'You can add any card to an opponent\'s build',
      'After adding your card, you own the build',
      'You cannot steal base builds',
      'If you have a build with the same value, they merge together'
    ],
    steps: [
      {
        id: 'intro',
        title: 'Finding a Build to Steal',
        description: 'Player 2 has a build worth 7 on the table. Player 1 has a 3 and can add it to make a new value!',
        tableCards: [
          { type: 'build_stack', stackId: 'build-1', cards: [card('4', '♠'), card('3', '♦')], value: 7, owner: 1 },
          card('K', '♥'),
        ],
        hands: {
          0: [card('3', '♣'), card('5', '♠')],
          1: [card('7', '♦'), card('J', '♥')],
        },
        currentPlayer: 0,
        highlightZone: 'table-0',
      },
      {
        id: 'action',
        title: 'Stealing the Build',
        description: 'Player 1 drops 3♣ onto the opponent\'s build. The build is now worth 10 (4+3+3) and belongs to Player 1!',
        tableCards: [
          { type: 'build_stack', stackId: 'build-1', cards: [card('4', '♠'), card('3', '♦'), card('3', '♣')], value: 10, owner: 0 },
          card('K', '♥'),
        ],
        hands: {
          0: [card('5', '♠')],
          1: [card('7', '♦'), card('J', '♥')],
        },
        currentPlayer: 0,
        animation: {
          type: 'steal',
          player: 0,
          cardIndex: 0,
          targetStackId: 'build-1',
        },
      },
      {
        id: 'complete',
        title: 'Build Stolen!',
        description: 'Player 1 successfully stole the build! Now they own it and can capture it on their next turn.',
        tableCards: [
          { type: 'build_stack', stackId: 'build-1', cards: [card('4', '♠'), card('3', '♦'), card('3', '♣')], value: 10, owner: 0 },
          card('K', '♥'),
        ],
        hands: {
          0: [card('5', '♠')],
          1: [card('7', '♦'), card('J', '♥')],
        },
        currentPlayer: 1,
      },
    ],
  },

  /**
   * Tutorial 6: Merge Builds
   * Learn to merge builds with same value
   */
  mergeBuilds: {
    id: 'mergeBuilds',
    title: 'Merge Builds',
    icon: 'git-merge-outline',
    description: 'Combine two builds with the same value into one.',
    difficulty: 'intermediate',
    rules: [
      'When you have two builds with the same value, they merge',
      'All cards from both builds combine into one',
      'The merged build keeps the same value'
    ],
    steps: [
      {
        id: 'intro',
        title: 'Two Builds Same Value',
        description: 'Player 1 has two builds on the table, both worth 9! When this happens, they merge automatically.',
        tableCards: [
          { type: 'build_stack', stackId: 'build-1', cards: [card('5', '♠'), card('4', '♦')], value: 9, owner: 0 },
          { type: 'build_stack', stackId: 'build-2', cards: [card('6', '♣'), card('3', '♥')], value: 9, owner: 0 },
        ],
        hands: {
          0: [card('K', '♠'), card('7', '♦')],
          1: [card('9', '♠'), card('Q', '♥')],
        },
        currentPlayer: 0,
        highlightZone: 'table',
      },
      {
        id: 'action',
        title: 'Merging',
        description: 'The two builds merge! All cards (5,4,6,3) combine into one build worth 9.',
        tableCards: [
          { type: 'build_stack', stackId: 'build-1', cards: [card('5', '♠'), card('4', '♦'), card('6', '♣'), card('3', '♥')], value: 9, owner: 0 },
        ],
        hands: {
          0: [card('K', '♠'), card('7', '♦')],
          1: [card('9', '♠'), card('Q', '♥')],
        },
        currentPlayer: 0,
        animation: {
          type: 'merge',
          player: 0,
          fromStackId: 'build-2',
          toStackId: 'build-1',
        },
      },
      {
        id: 'complete',
        title: 'Merged!',
        description: 'The builds merged into one! Now Player 1 can capture this bigger build on their next turn.',
        tableCards: [
          { type: 'build_stack', stackId: 'build-1', cards: [card('5', '♠'), card('4', '♦'), card('6', '♣'), card('3', '♥')], value: 9, owner: 0 },
        ],
        hands: {
          0: [card('K', '♠'), card('7', '♦')],
          1: [card('9', '♠'), card('Q', '♥')],
        },
        currentPlayer: 1,
      },
    ],
  },
};

module.exports = tutorials;
