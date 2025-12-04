📘 PRD: Multiplayer Card Game Server Refactor
1. Overview

The current Node.js/Socket.IO matchmaking and game server is monolithic and mixes networking, business logic, game rules, validation, and state mutation in a single file. This PRD defines a clean modular architecture that separates concerns, improves maintainability, simplifies testing, and reduces regression risks.

The goal is to refactor the existing system into a layered, testable, extensible architecture while preserving all existing functionality.

2. Objectives
Primary Goals

Separate game logic from network (Socket.IO) logic.

Create a modular action-handling system for game interactions.

Centralize game-state mutation into a single authoritative module.

Improve readability, maintainability, and debugging.

Enable unit testing for pure game-logic functions.

Support upcoming features without further code explosion.

What Will Not Change

Existing game rules and mechanics

Message structure (game-start, game-update, game-action, etc.)

Matchmaking behavior (2 players per match)

The overall gameplay flow

3. High-Level Architecture Requirements

The system shall be refactored into the following layers:

3.1 Networking Layer (Socket Server)
Requirements:

Only manages:

player connections

matchmaking

event routing

broadcasting game updates

Must not contain any game rule logic.

Must call into a game-manager or action-router for any game-changing operation.

Deliverables:

server.js (or socket-server.js) with <300 lines, only networking.

3.2 Game Manager Layer

A dedicated module that:

Requirements:

Holds game state instance(s)

Provides methods like:

startGame()

applyAction(playerId, action)

determineActions(draggedItem, targetInfo)

Delegates execution to individual action modules

Ensures turn order, error handling, and state validation

Deliverables:

/game/GameManager.js

3.3 Game State Layer

Responsible for owning and mutating the game state.

Requirements:

Represent full game state

Provide pure helpers:

clone()

validate()

isTerminal()

Should not contain any networking code.

Deliverables:

/game/GameState.js

3.4 Action Modules (One file per action)

Currently the server file mixes:

trail

capture

build

add-to-build

staging creation

staging expansion

staging finalize

staging cancellation

tableCardDrop

etc.

Requirements:

Each action must have its own module:

module.exports = function handleTrail(gameState, payload, playerIndex) { ... }


Must be pure functions whenever possible.

GameManager invokes these based on action type.

Deliverables:

/game/actions/trail.js

/game/actions/capture.js

/game/actions/build.js

/game/actions/createStagingStack.js

/game/actions/addToStagingStack.js

/game/actions/finalizeStagingStack.js

/game/actions/cancelStagingStack.js

/game/actions/addToOpponentBuild.js

/game/actions/addToOwnBuild.js

/game/actions/tableCardDrop.js

/game/actions/index.js (aggregator)

3.5 Action Router

Instead of massive switch statements, create:

Requirements:

A single router that maps action types to handlers

Ensures unknown action types throw structured errors

Validates turn order before execution

Example:

const ACTION_HANDLERS = {
  trail: require('./trail'),
  capture: require('./capture'),
  build: require('./build'),
  createStagingStack: require('./createStagingStack'),
  ...
};

Deliverables:

/game/ActionRouter.js

3.6 determineActions Module

This module already exists but must be isolated and extended.

Requirements:

Input: (draggedItem, targetInfo, gameState)

Returns:

possible actions

whether modal is required

validation errors

Must become standalone pure logic.

Deliverables:

/game/logic/determineActions.js

3.7 Staging Logic Module
Requirements:

All staging validation and logic must live here:

validateCreation

validateAddition

evaluateFinalizeOptions

No direct state mutation—only return transformed data.

Deliverables:

/game/logic/staging.js

3.8 Build Logic Module
Requirements:

All build-specific logic isolated:

calculate build values

add to builds

expand builds

validate build legality

Deliverables:

/game/logic/builds.js

4. Functional Requirements
4.1 All existing server features must continue working

Including:

Matchmaking for two players

Game initialization

Turn-based enforcement

All existing card operations

Staging and build workflows

Card drop inference logic

Event emissions

4.2 No logic may reside in server.js

All logic must be invoked from modules.

4.3 Pure Functions for Game Logic

Game logic modules must be:

deterministic

side-effect free

independently testable

4.4 Error Messaging

Action Router must return:

user-friendly error messages

internal error logs

structured server responses

5. Non-Functional Requirements
5.1 Maintainability

All modules must be <300 lines

Clear boundaries between layers

No circular imports

5.2 Testability

At least 80% of game-logic should be testable without running a server.

5.3 Debugging

Logging moved into a logger util

Consistent format for action logs

5.4 Performance

No deep cloning except when required

State updates should be O(n) where n = cards on table

6. Success Criteria

The refactor is considered successful when:

server.js contains no game logic

All actions live in their own modules

A GameManager controls the state

determineActions is pure and isolated

All tests from pre-refactor still pass

New features can be added without altering server.js

7. Proposed Folder Structure
/server
  server.js

/game
  GameManager.js
  GameState.js
  ActionRouter.js

  /actions
    trail.js
    capture.js
    build.js
    createStagingStack.js
    addToStagingStack.js
    finalizeStagingStack.js
    cancelStagingStack.js
    addToOpponentBuild.js
    addToOwnBuild.js
    tableCardDrop.js
    index.js

  /logic
    determineActions.js
    staging.js
    builds.js
    capture.js  (optional split)
    cardUtils.js

/utils
  logger.js
