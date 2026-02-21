# Card Interaction Logic

This document provides a comprehensive analysis of how card interactions work in the game, from the moment a player drops a card to the server-side logic that handles the action.

## Client-Side Logic

The client-side logic is responsible for rendering the game board, handling user input, and sending actions to the server.

### `GameBoard` Component

The `GameBoard` component (`components/core/GameBoard.tsx`) is the main component for the game. It orchestrates the rendering of the game board and handles user interactions. It uses the `useDrag` hook to track the positions of cards and drop zones.

When a player drops a card, the `GameBoard` component determines the type of action based on the drop location and the target card (if any). It then calls the `sendAction` function to send the action to the server.

Here are the main actions that can be triggered by a card drop:

*   **`handleTrail`**: A hand card is dropped anywhere on the table. This sends a `trail` action to the server.
*   **`handleCardDrop`**: A hand card is dropped onto a specific table card. This sends a `createTemp` action to the server.
*   **`handleTableCardDropOnCard`**: A table card is dropped onto another loose table card. This sends a `createTempFromTable` action to the server.
*   **`handleTableCardDropOnTemp`**: A table card is dropped onto its own temp stack. This sends an `addToTemp` action to the server.

### `useDrag` Hook

The `useDrag` hook (`hooks/useDrag.ts`) is a custom hook that manages the positions of the cards and temp stacks on the table. It provides functions to register, unregister, and find cards and temp stacks at a given point on the screen.

The `useDrag` hook uses `useRef` to store the positions, so they can be updated without causing re-renders. This is important for performance, as it avoids re-rendering the entire game board every time a card is moved.

## Server-Side Logic

The server-side logic is responsible for handling game actions, updating the game state, and broadcasting the new state to the clients.

### `socket-server.js`

The `socket-server.js` file (`multiplayer/server/socket-server.js`) sets up the Express and Socket.IO server. It listens for incoming connections and handles game-related events.

When a client sends a `game-action` event, the `GameCoordinatorService` handles it.

### `GameCoordinatorService`

The `GameCoordinatorService` (`multiplayer/server/services/GameCoordinatorService.js`) is the central point for handling game actions. It receives the action from the socket, resolves the player and game, and then executes the action using the `ActionRouter`.

If the action is successful, the `GameCoordinatorService` broadcasts the new game state to all clients in the game.

### `ActionRouter`

The `ActionRouter` (`multiplayer/server/game/ActionRouter.js`) is responsible for routing incoming game actions to the correct handler function. It loads the action handlers from the `multiplayer/server/game/actions/index.js` file.

The `executeAction` method in the `ActionRouter` does the following:

1.  It checks if the action type is registered.
2.  It gets the current game state from the `GameManager`.
3.  It checks if it's the correct player's turn.
4.  It executes the action handler, which is a pure function that returns a new game state.
5.  It saves the new game state to the `GameManager`.
6.  It returns the new game state to the `GameCoordinatorService`.

### Action Handlers

The action handlers are located in the `multiplayer/server/game/actions` directory. Each handler is a pure function that takes the current game state and the action payload as input and returns a new game state.

For example, the `trail.js` handler (`multiplayer/server/game/actions/trail.js`) handles the `trail` action. It takes the card from the player's hand, adds it to the table, and returns the new game state.

## Conclusion

The card interaction logic in this game is well-structured and follows a clear separation of concerns between the client and the server. The use of a custom `useDrag` hook on the client-side allows for efficient drag and drop interactions, while the server-side logic ensures that the game state is updated consistently and securely.
