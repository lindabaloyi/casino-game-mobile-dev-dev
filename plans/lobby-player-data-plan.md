# Plan: Display Real Player Data in Game Lobby

## Problem
When players connect to the lobby, the system shows placeholder names like "Player 1" with random profile pictures instead of actual player data from the database.

## Root Cause
The matchmaking and room services only store socket IDs, not user profile data:
- `UnifiedMatchmakingService` stores: `{ id: socket.id, ... }`
- `RoomService` stores: `{ socketId, isHost, joinedAt }`
- When creating games, players are stored as: `{ playerId: "player0", name: "Player 1", ... }`

## Solution
Fetch player profile data when players join matchmaking queues or rooms, and pass this data through to the lobby.

## Files to Modify

### 1. Server-Side Changes

#### `multiplayer/server/socket-server.js`
- When player authenticates via `authenticate` event, store their `userId` with the socket
- Pass `userId` to matchmaking queues

#### `multiplayer/server/services/UnifiedMatchmakingService.js`
- Update queue entries to include: `{ id, socketId, userId }`
- When creating games, use userId to fetch profile data

#### `multiplayer/server/services/RoomService.js`
- When player joins room, store their `userId` with the player object
- When serializing room, include profile data

#### `multiplayer/server/models/PlayerProfile.js`
- Add method to fetch multiple player profiles by userId array

### 2. Database Queries Required

```javascript
// Get multiple player profiles
PlayerProfile.findByUserIds([userId1, userId2, ...])
// Returns: [{ userId, displayName, avatar, bio, ... }]
```

### 3. Integration Points

1. **Join Queue** → Store userId with queue entry
2. **Create Room** → Store userId with room player
3. **Game Start** → Fetch player profiles, inject into game state
4. **Lobby Broadcast** → Include player profile data in lobby updates

## Implementation Steps

### Step 1: Add findByUserIds to PlayerProfile
```javascript
static async findByUserIds(userIds) {
  const database = await db.getDb();
  return database.collection(COLLECTION_NAME)
    .find({ userId: { $in: userIds.map(id => new ObjectId(id)) } })
    .toArray();
}
```

### Step 2: Update socket-server.js
- On `authenticate` event, store userId with socket
- Pass userId when joining queues

### Step 3: Update UnifiedMatchmakingService
- Store userId in queue entries
- Fetch profiles when starting game, inject into game state players

### Step 4: Update RoomService
- Store userId when player joins room
- Fetch profiles for room serialization

### Step 5: Frontend Updates (if needed)
- Update lobby components to display profile data instead of placeholders

## Expected Data Flow

```
User Login → Socket authenticate → Store userId on socket
     ↓
User joins queue → Queue entry includes userId
     ↓
Game starts → Fetch player profiles by userIds
     ↓
Inject into gameState.players → Lobby shows real names/avatars
```
