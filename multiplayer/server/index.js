const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  }
});

const {
  handleCreateStagingStack,
  handleAddToStagingStack,
  handleFinalizeStagingStack,
  handleCreateBuildWithValue,
  handleCancelStagingStack,
  handleAddToOpponentBuild,
  handleAddToOwnBuild,
  handleCapture,
  handleTrail,
  handleBuild,
  handleTableCardDrop,
  handleAddToTemporaryCaptureStack
} = require('./game-logic/game-actions.js');

// Import staging validation functions
const {
  validateStagingCreation,
  validateStagingAddition
} = require('./game-logic/staging-validation.js');

// Import shared type-safe functions (maintains JavaScript compatibility)
const { initializeGame: sharedInitializeGame, validateGameState, determineActions } = require('./game-logic/shared-game-logic.js');

console.log('[SERVER] Imported functions:', {
  handleCreateStagingStack: typeof handleCreateStagingStack,
  handleFinalizeStagingStack: typeof handleFinalizeStagingStack,
  handleCancelStagingStack: typeof handleCancelStagingStack,
  sharedInitializeGame: typeof sharedInitializeGame
});

// Middleware for logging all connections and data
io.use((socket, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}][SERVER] Handshake attempt for socket ${socket.id}, client IP: ${socket.handshake.address}`);
  console.log(`[${timestamp}][SERVER] Handshake data:`, {
    address: socket.handshake.address,
    xdomain: socket.handshake.xdomain,
    secure: socket.handshake.secure,
    issued: socket.handshake.issued,
    url: socket.handshake.url,
    query: socket.handshake.query
  });
  next();
});

io.engine.on('connection_error', (err) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}][SERVER] Connection error:`, err);
});

const PORT = process.env.PORT || 3001;

let waitingPlayers = []; // Array of waiting socket objects before game start
let activeGameSockets = []; // Array of active players during game
let gameState = null;

function initializeGame() {
  console.log('[SERVER] Initializing game state...');

  // Helper to get card value
  const rankValue = (rank) => {
    if (rank === 'A') return 1;
    return parseInt(rank, 10);
  };

  // Helper to shuffle the deck
  const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // 1. Create Deck (40 cards: A-10 for each suit)
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  let deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: rankValue(rank) });
    }
  }

  // 2. Shuffle Deck
  deck = shuffleDeck(deck);

  // 3. Deal Cards (10 cards each to 2 players)
  const playerHands = [[], []];
  for (let i = 0; i < 10; i++) {
    playerHands[0].push(deck.pop()); // Player 0
    playerHands[1].push(deck.pop()); // Player 1
  }

  // 4. Return Initial Game State
  return {
    deck,
    playerHands,
    tableCards: [],
    playerCaptures: [[], []],
    currentPlayer: 0, // Player 0 starts
    round: 1,
    scores: [0, 0],
    gameOver: false,
    winner: null,
    lastCapturer: null,
    scoreDetails: null,
  };
}

io.on('connection', (socket) => {
  console.log("Client connected:", socket.id); // PRD Section 5.3: Log connections

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}][SERVER] New connection established: socket=${socket.id}`);
  console.log(`[${timestamp}][SERVER] Connection details:`, {
    id: socket.id,
    connected: socket.connected,
    handshake: {
      address: socket.handshake.address,
      transport: socket.handshake.transport,
      time: socket.handshake.time,
      issued: socket.handshake.issued,
      secure: socket.handshake.secure
    }
  });
  waitingPlayers.push(socket); // Add to waiting queue
  console.log(`[${timestamp}][SERVER] Added to waiting queue. Total waiting players: ${waitingPlayers.length}`);

  // If two players are waiting, start the game
  if (waitingPlayers.length === 2) {
    console.log('[SERVER] Two players found. Starting game...');
    gameState = initializeGame();

    // Assign player numbers and emit game-start event
    activeGameSockets = waitingPlayers.slice(); // Copy to active players
    waitingPlayers = []; // Clear waiting queue

    activeGameSockets.forEach((playerSocket, index) => {
      const playerNumber = index; // 0-indexed
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}][SERVER] Emitting game-start to ${playerSocket.id} as Player ${playerNumber}`);
      playerSocket.emit('game-start', { gameState, playerNumber: index });
    });
  }

  socket.on('disconnect', (reason) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}][SERVER] Disconnect event for socket ${socket.id}, reason: ${reason}`);
    console.log(`[${timestamp}][SERVER] Disconnect details:`, {
      id: socket.id,
      connected: socket.connected,
      disconnected: socket.disconnected
    });
    // Remove from waiting queue or active players
    waitingPlayers = waitingPlayers.filter(p => p.id !== socket.id);
    activeGameSockets = activeGameSockets.filter(p => p.id !== socket.id);
    console.log(`[${timestamp}][SERVER] After cleanup - Waiting: ${waitingPlayers.length}, Active: ${activeGameSockets.length}`);

    if (activeGameSockets.length < 2) {
      gameState = null;
      console.log(`[${timestamp}][SERVER] Game reset due to insufficient active players`);
    }
  });

  // Action processing with turn validation
  socket.on('game-action', (data) => {
    console.log(`[SERVER] Received game-action: ${data.type} from socket ${socket.id}`);
    if (!gameState || activeGameSockets.length < 2) {
      console.log('[SERVER] Ignoring action, game not started or not enough players.');
      return;
    }

    // 🔑 CRITICAL: Find player by socket ID in activeGameSockets array
    const playerIndex = activeGameSockets.findIndex(p => p.id === socket.id);
    if (playerIndex !== gameState.currentPlayer) {
      console.log(`[SERVER] Rejected action from playerIndex ${playerIndex} because it's player ${gameState.currentPlayer}'s turn.`);
      return socket.emit('error', { message: "It's not your turn." });
    }

    console.log(`[SERVER] Processing ${data.type} from player ${gameState.currentPlayer}`);

    // Process action (trail, capture, etc.)
    let newGameState = gameState;

    try {
      switch (data.type) {
        case 'trail':
          console.log(`[SERVER] Player ${playerIndex} trailed card:`, data.payload.card);
          // Find and remove card from player's hand
          const playerHand = gameState.playerHands[playerIndex];
          const cardIndex = playerHand.findIndex(c =>
            c.rank === data.payload.card.rank && c.suit === data.payload.card.suit
          );
          if (cardIndex === -1) {
            return socket.emit('error', { message: "Card not found in hand." });
          }

          // Add to table and advance turn
          const trailedCard = playerHand.splice(cardIndex, 1)[0];
          newGameState = {
            ...gameState,
            playerHands: gameState.playerHands.map((hand, idx) =>
              idx === playerIndex ? playerHand : hand
            ),
            tableCards: [...gameState.tableCards, { ...trailedCard, type: 'loose' }],
            currentPlayer: (gameState.currentPlayer + 1) % 2
          };
          console.log(`[SERVER] Player ${playerIndex} trailed ${trailedCard.rank}${trailedCard.suit}`);
          break;

        case 'capture':
          console.log(`[SERVER] Player ${playerIndex} captured:`, data.payload);
          newGameState = handleCapture(gameState, data.payload.draggedItem, data.payload.selectedTableCards, data.payload.opponentCard || null);
          break;

        case 'build':
          console.log(`[SERVER] Player ${playerIndex} building:`, data.payload);
          const { draggedItem: buildDraggedItem, tableCardsInBuild, buildValue, biggerCard, smallerCard } = data.payload;

          // Find and remove dragged card from player's hand
          const buildPlayerHand = gameState.playerHands[playerIndex];
          const buildCardIndex = buildPlayerHand.findIndex(c =>
            c.rank === buildDraggedItem.card.rank && c.suit === buildDraggedItem.card.suit
          );
          if (buildCardIndex === -1) {
            return socket.emit('error', { message: "Card not found in hand." });
          }

          // Remove dragged card from hand
          const buildCard = buildPlayerHand.splice(buildCardIndex, 1)[0];

          // Create build object
          const build = {
            type: 'build',
            value: buildValue,
            cards: [biggerCard, smallerCard],
            owner: playerIndex,
            buildId: `build-${Date.now()}`
          };

          // Remove table cards that are part of the build
          let buildUpdatedTableCards = [...gameState.tableCards];
          tableCardsInBuild.forEach(tableCard => {
            buildUpdatedTableCards = buildUpdatedTableCards.filter(tc => {
              if (tc.type === 'loose') {
                return !(tc.rank === tableCard.rank && tc.suit === tableCard.suit);
              }
              return true;
            });
          });

          // Add build to table
          buildUpdatedTableCards.push(build);

          newGameState = {
            ...gameState,
            playerHands: gameState.playerHands.map((hand, idx) =>
              idx === playerIndex ? buildPlayerHand : hand
            ),
            tableCards: buildUpdatedTableCards,
            currentPlayer: (gameState.currentPlayer + 1) % 2
          };
          console.log(`[SERVER] Player ${playerIndex} created build with value ${buildValue}`);
          break;

        case 'createStagingStack':
          console.log(`[SERVER] Player ${playerIndex} creating staging stack:`, data.payload);
          console.log(`[SERVER] About to call handleCreateStagingStack, function exists:`, typeof handleCreateStagingStack);
          try {
            newGameState = handleCreateStagingStack(gameState, data.payload.handCard, data.payload.tableCard, playerIndex);
            console.log(`[SERVER] handleCreateStagingStack returned successfully`);
            console.log(`[SERVER] New tableCards count:`, newGameState.tableCards?.length || 0);
          } catch (error) {
            console.error(`[SERVER] Error in handleCreateStagingStack:`, error);
            newGameState = gameState; // Keep original state on error
          }
          break;

        case 'addToStagingStack':
          console.log(`[SERVER] Player ${playerIndex} adding to staging stack:`, data.payload);
          newGameState = handleAddToStagingStack(gameState, data.payload.draggedItem, data.payload.targetStack);
          break;

        case 'finalizeStagingStack':
          console.log(`[SERVER] Player ${playerIndex} finalizing staging stack:`, data.payload);
          const finalizeResult = handleFinalizeStagingStack(gameState, data.payload.stack);
          if (finalizeResult.error) {
            return socket.emit('error', { message: finalizeResult.message });
          }
          if (finalizeResult.options) {
            // Multiple build options - send back to client for selection
            return socket.emit('build-options', finalizeResult);
          }
          newGameState = finalizeResult;
          break;

        case 'createBuildWithValue':
          console.log(`[SERVER] Player ${playerIndex} creating build with specific value:`, data.payload);
          newGameState = handleCreateBuildWithValue(gameState, data.payload.stack, data.payload.buildValue);
          break;

        case 'executeCaptureFromStack':
          console.log(`[SERVER] Player ${playerIndex} executing capture from stack:`, data.payload);
          const { stack: captureStack, targetCard, captureValue } = data.payload;
          const handCardInStack = captureStack.cards.find(c => c.source === 'hand');
          if (handCardInStack) {
            newGameState = handleCapture(gameState, {
              card: { ...handCardInStack, source: undefined },
              source: 'hand'
            }, [captureStack], null);
          } else {
            console.error('[SERVER] No hand card found in capture stack');
            newGameState = gameState;
          }
          break;

        case 'cancelStagingStack':
          console.log(`[SERVER] Player ${playerIndex} canceling staging stack:`, data.payload);
          newGameState = handleCancelStagingStack(gameState, data.payload.stackToCancel, playerIndex);
          break;

    case 'addToOpponentBuild':
      console.log(`[SERVER] Player ${playerIndex} adding to opponent build:`, data.payload);
      newGameState = handleAddToOpponentBuild(gameState, data.payload.draggedItem, data.payload.buildToAddTo, playerIndex);
      break;

    case 'addToOwnBuild':
      console.log(`[SERVER] Player ${playerIndex} adding to own build:`, data.payload);
      newGameState = handleAddToOwnBuild(gameState, data.payload.draggedItem, data.payload.buildToAddTo, playerIndex);
      break;

    case 'tableCardDrop':
      console.log(`🎯 Table drop: ${data.payload.draggedCard.rank}${data.payload.draggedCard.suit} → ${data.payload.targetCard.rank}${data.payload.targetCard.suit}`);
      const { draggedCard: tableDraggedCard, targetCard: tableTargetCard } = data.payload;
      newGameState = handleTableCardDrop(gameState, tableDraggedCard, tableTargetCard, playerIndex);
      break;

        // ... other action cases remain the same ...

        default:
          return socket.emit('error', { message: `Unknown action type: ${data.type}` });
      }
    } catch (e) {
      console.error("[SERVER] Error processing game action:", e);
      return socket.emit('action-error', { message: e.message });
    }

    // 🔑 CRITICAL: Update global game state
    gameState = newGameState;
    console.log(`[SERVER] Updated global gameState. Table cards:`, gameState.tableCards.map(c => c.type ? `${c.type}(${c.owner || 'none'})` : `${c.rank}${c.suit}`));
    console.log(`[SERVER] Full gameState to broadcast:`, JSON.stringify(gameState, null, 2));

    // 🔑 CRITICAL: Broadcast to ALL players (not just active ones)
    console.log(`[SERVER] About to emit game-update to ${activeGameSockets.length} players`);
    const stateToSend = JSON.parse(JSON.stringify(gameState)); // Deep clone to ensure no references
    io.emit('game-update', stateToSend);
    console.log(`[SERVER] Broadcasted game-update: currentPlayer=${stateToSend.currentPlayer}, tableCardsCount=${stateToSend.tableCards?.length || 0}`);
    console.log(`[SERVER] Emitted state tableCards:`, stateToSend.tableCards.map(c => c.type ? `${c.type}(${c.owner || 'none'})` : `${c.rank}${c.suit}`));
  });

  // Phase 2: Server-centric card drop handling
  socket.on('card-drop', (data) => {
    console.log(`🎯 [CARD_DROP] RECEIVED from socket ${socket.id}:`, {
      draggedItem: data.draggedItem,
      targetInfo: data.targetInfo,
      requestId: data.requestId
    });

    if (!gameState) {
      console.error(`❌ [CARD_DROP] No active game state`);
      return socket.emit('error', { message: 'No active game' });
    }

    const playerIndex = activeGameSockets.findIndex(p => p.id === socket.id);
    console.log(`👤 [CARD_DROP] Player index: ${playerIndex}, currentPlayer: ${gameState.currentPlayer}`);

    if (playerIndex !== gameState.currentPlayer) {
      console.error(`❌ [CARD_DROP] Not player's turn (playerIndex: ${playerIndex}, currentPlayer: ${gameState.currentPlayer})`);
      return socket.emit('error', { message: "Not your turn" });
    }

    try {
      // 🔵 STAGING INTERCEPT: Check if this is a hand card dropped on loose table card
      // This must happen BEFORE determineActions to create staging instead of build modal
      if (data.draggedItem.source === 'hand' && data.targetInfo.type === 'loose') {
        console.log(`🎯 [STAGING_INTERCEPT] Detected hand→loose drop: ${data.draggedItem.card.rank}${data.draggedItem.card.suit} → ${data.targetInfo.card?.rank}${data.targetInfo.card?.suit}`);

        // Find the actual table card from gameState
        const tableCard = gameState.tableCards.find(tc =>
          tc.type === 'loose' && tc.rank === data.targetInfo.card?.rank && tc.suit === data.targetInfo.card?.suit
        );

        if (tableCard) {
          // Validate staging creation
          const stagingValidation = validateStagingCreation(gameState, data.draggedItem.card, tableCard);
          if (stagingValidation.valid) {
            console.log(`✅ [STAGING_INTERCEPT] Validation passed, creating staging stack...`);

            const newState = handleCreateStagingStack(gameState, data.draggedItem.card, tableCard, playerIndex);
            gameState = newState;

            // Notify client of staging creation
            socket.emit('staging-created', {
              requestId: data.requestId,
              stack: gameState.tableCards.find(tc => tc.type === 'temporary_stack' && tc.owner === playerIndex)
            });
            console.log(`📡 [STAGING_INTERCEPT] Emitted staging-created event to client`);

            // Broadcast the updated game state to all players
            const stateToSend = JSON.parse(JSON.stringify(gameState));
            io.emit('game-update', stateToSend);
            console.log(`📊 [STAGING_INTERCEPT] Game state updated with staging stack`);

            return; // Don't continue to determineActions
          } else {
            console.warn(`⚠️ [STAGING_INTERCEPT] Validation failed: ${stagingValidation.message}`);
            // Fall through to normal determineActions flow
          }
        } else {
          console.warn(`⚠️ [STAGING_INTERCEPT] Could not find target table card in gameState`);
        }
      }

      console.log(`🔍 [CARD_DROP] Calling determineActions...`);
      // Use existing determineActions function from shared-game-logic.js
      const result = determineActions(data.draggedItem, data.targetInfo, gameState);
      console.log(`🔍 [CARD_DROP] determineActions result:`, {
        hasActions: result.actions?.length || 0,
        requiresModal: result.requiresModal,
        errorMessage: result.errorMessage
      });

      if (result.errorMessage) {
        console.error(`❌ [CARD_DROP] determineActions error: ${result.errorMessage}`);
        return socket.emit('error', { message: result.errorMessage });
      }

      if (result.actions.length === 1 && !result.requiresModal) {
        console.log(`⚡ [CARD_DROP] Single action found: ${result.actions[0].type}`);
        // Execute single action automatically
        const newState = executeAction(gameState, result.actions[0], playerIndex);
        console.log(`✅ [CARD_DROP] Auto-executed ${result.actions[0].type}, updating game state`);

        gameState = newState;
        io.emit('game-update', gameState);

        console.log(`📡 [CARD_DROP] Emitted game-update, currentPlayer now: ${gameState.currentPlayer}`);
      } else {
        console.log(`🎛️ [CARD_DROP] Multiple actions (${result.actions.length}), sending choices to client`);
        // Send choices to client
        socket.emit('action-choices', {
          requestId: data.requestId,
          actions: result.actions
        });
        console.log(`📡 [CARD_DROP] Emitted action-choices for ${result.actions.length} options`);
      }
    } catch (error) {
      console.error(`💥 [CARD_DROP] Unexpected error:`, error);
      socket.emit('error', { message: 'Invalid move' });
    }
  });

  // Handle user's action choice
  socket.on('execute-action', (data) => {
    const playerIndex = activeGameSockets.findIndex(p => p.id === socket.id);
    if (playerIndex !== gameState.currentPlayer) {
      return socket.emit('error', { message: "Not your turn" });
    }

    try {
      const newState = executeAction(gameState, data.action, playerIndex);
      gameState = newState;
      io.emit('game-update', gameState);
    } catch (error) {
      socket.emit('error', { message: 'Action failed' });
    }
  });
});

// Helper function to execute actions
function executeAction(gameState, action, playerIndex) {
  console.log(`🔧 [EXECUTE_ACTION] Executing:`, action.type, `for Player ${playerIndex}`);
  switch (action.type) {
    case 'trail':
      console.log(`🔧 [EXECUTE_ACTION] Routing to handleTrail with card:`, action.payload.card);
      // Implement trail logic (move from existing handler)
      return handleTrail(gameState, action.payload.card, playerIndex);
    case 'capture':
      console.log(`🔧 [EXECUTE_ACTION] Routing to handleCapture`);
      return handleCapture(gameState, action.payload.draggedItem, action.payload.selectedTableCards, playerIndex);
    case 'build':
      console.log(`🔧 [EXECUTE_ACTION] Routing to handleBuild`);
      return handleBuild(gameState, action.payload, playerIndex);
    case 'createStagingStack':
      console.log(`🔧 [EXECUTE_ACTION] Routing to handleCreateStagingStack`);
      return handleCreateStagingStack(gameState, action.payload.handCard, action.payload.tableCard, playerIndex);
    case 'addToStagingStack':
      console.log(`🔧 [EXECUTE_ACTION] Routing to handleAddToStagingStack`);
      return handleAddToStagingStack(gameState, action.payload.draggedItem, action.payload.targetStack);
    case 'addToOpponentBuild':
      console.log(`🔧 [EXECUTE_ACTION] Routing to handleAddToOpponentBuild`);
      return handleAddToOpponentBuild(gameState, action.payload.draggedItem, action.payload.buildToAddTo, playerIndex);
    case 'addToOwnBuild':
      console.log(`🔧 [EXECUTE_ACTION] Routing to handleAddToOwnBuild`);
      return handleAddToOwnBuild(gameState, action.payload.draggedItem, action.payload.buildToAddTo, playerIndex);
    case 'tableCardDrop':
      console.log(`🔧 [EXECUTE_ACTION] Routing to handleTableCardDrop`);
      return handleTableCardDrop(gameState, action.payload.draggedCard, action.payload.targetCard, playerIndex);
    default:
      console.error(`❌ [EXECUTE_ACTION] Unknown action type: ${action.type}`);
      throw new Error(`Unknown action type: ${action.type}`);
  }
}



server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] Matchmaking server listening on all interfaces at port ${PORT}`);
});
