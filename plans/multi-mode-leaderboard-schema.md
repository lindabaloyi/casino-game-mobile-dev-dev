# Multi-Mode Leaderboards Architecture

## Current State

Currently, `GameStats` tracks only aggregate wins/losses:
- `totalGames`, `wins`, `losses` - no mode breakdown

## Game Modes Supported

| Mode Key | Display Name | Players |
|----------|--------------|---------|
| `two-hands` | ⚔️ 2 Hands | 2 |
| `three-hands` | 🎴 3 Hands | 3 |
| `four-hands` | 🎯 4 Hands | 4 |
| `party` | 🎉 Party (2v2) | 4 |
| `freeforall` | 🎴 Free For All | 4 |
| `tournament` | 🏆 Tournament | 4 |

---

## Schema Design

### Option A: Embedded Mode Stats (Recommended)

Modify `GameStats` schema to include per-mode stats:

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  totalGames: number,
  wins: number,
  losses: number,
  modeStats: {
    'two-hands': { games: 10, wins: 7, losses: 3 },
    'three-hands': { games: 5, wins: 2, losses: 3 },
    'four-hands': { games: 8, wins: 4, losses: 4 },
    'party': { games: 3, wins: 2, losses: 1 },
    'freeforall': { games: 12, wins: 6, losses: 6 },
    'tournament': { games: 2, wins: 1, losses: 1 }
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Pros:** Single document, atomic updates, easy aggregation  
**Cons:** Grows with mode count (acceptable - fixed 6 modes)

### Option B: Separate Collection

Create `GameModeStats` collection with compound index:

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  mode: 'two-hands' | 'three-hands' | etc,
  games: number,
  wins: number,
  losses: number
}
// Index: { userId: 1, mode: 1 } unique
```

**Pros:** Cleaner separation  
**Cons:** More queries, transaction needed for atomicity

---

## Database Changes

### 1. Migration (MongoDB)

```javascript
// Add modeStats to existing documents
db.gameStats.updateMany(
  { modeStats: { $exists: false } },
  { 
    $set: { 
      modeStats: {
        'two-hands': { games: 0, wins: 0, losses: 0 },
        'three-hands': { games: 0, wins: 0, losses: 0 },
        'four-hands': { games: 0, wins: 0, losses: 0 },
        'party': { games: 0, wins: 0, losses: 0 },
        'freeforall': { games: 0, wins: 0, losses: 0 },
        'tournament': { games: 0, wins: 0, losses: 0 }
      }
    }
  }
)
```

### 2. New Indexes

```javascript
// For leaderboard queries by mode
db.gameStats.createIndex({ 'modeStats.two-hands.wins': -1 })
db.gameStats.createIndex({ 'modeStats.tournament.wins': -1 })
// ... etc
```

---

## API Changes

### GET /api/profile/leaderboard

Add `mode` query parameter:

```bash
GET /api/profile/leaderboard?mode=two-hands&limit=10
```

Response:
```javascript
{
  success: true,
  leaderboard: [
    { rank: 1, userId: "...", username: "Player1", wins: 50, games: 60, winRate: 83 },
    { rank: 2, userId: "...", username: "Player2", wins: 45, games: 55, winRate: 82 }
  ],
  mode: "two-hands",
  pagination: { limit: 10, offset: 0, hasMore: true }
}
```

### GET /api/profile/:userId/stats

Add `mode` query parameter:

```bash
GET /api/profile/69b6eb.../stats?mode=tournament
```

---

## Backend Implementation

### GameStats.js Updates

```javascript
// Update method signature
static async updateAfterGame(userId, gameResult, mode = 'two-hands') {
  // Increment mode-specific stats
  const modePath = `modeStats.${mode}`;
  const update = {
    $inc: {
      totalGames: 1,
      wins: won ? 1 : 0,
      losses: lost ? 1 : 0,
      [`${modePath}.games`]: 1,
      [`${modePath}.wins`]: won ? 1 : 0,
      [`${modePath}.losses`]: lost ? 1 : 0
    }
  };
}

// New method: get leaderboard by mode
static async getLeaderboardByMode(mode, limit = 10) {
  const modePath = `modeStats.${mode}`;
  return db.collection(COLLECTION_NAME)
    .find({})
    .sort({ [`${modePath}.wins`]: -1 })
    .limit(limit)
    .toArray();
}
```

### Profile Routes Updates

- `GET /leaderboard?mode=xxx` - route handler
- Validate mode against allowed values
- Call appropriate GameStats method

---

## Frontend Changes

### Hook: useLeaderboard

```typescript
interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  wins: number;
  games: number;
  winRate: number;
}

function useLeaderboard(mode: GameMode, limit = 10) {
  // Fetch from GET /api/profile/leaderboard?mode=${mode}
}
```

### UI: Leaderboard Screen

- Dropdown/tabs to select game mode
- Display mode-specific rankings
- Show "All Modes" as default (aggregate)

---

## Data Flow Diagram

```mermaid
graph LR
    A[Game Ends] --> B[recordWin/recordLoss]
    B --> C[API: POST /stats/win]
    C --> D[GameStats.updateAfterGame]
    D --> E[MongoDB: Increment both total + modeStats]
    F[GET /leaderboard?mode=two-hands] --> G[GameStats.getLeaderboardByMode]
    G --> H[MongoDB: Sort by modeStats.{mode}.wins]
```

---

## Summary

| Component | Change Required |
|-----------|----------------|
| GameStats.js | Add modeStats field, update methods |
| MongoDB | Migration script, indexes |
| Profile Routes | Add mode parameter to endpoints |
| Frontend Hook | Add mode selection |
| Leaderboard UI | Mode filter dropdown |

This design maintains backward compatibility while enabling mode-specific rankings.