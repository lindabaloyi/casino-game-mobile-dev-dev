# Rules Page Plan - app/rules.tsx

## Design Pattern
- Use same styling as leaderboards.tsx and FriendsList.tsx
- In-game color scheme: `#0f4d0f` background, `#1a5c1a` header, `#FFD700` gold accents
- Tab-based navigation with category sections
- Card-based rule display with icons

## Segmented Rule Categories

### 1. Capture Section (🃏)
Rules for capturing cards from the table:

| Rule | Description |
|------|-------------|
| **Match Rank** | Capture a loose card by playing a card of the same rank (e.g., 7 captures 7) |
| **Capture Build** | Capture a build stack by playing a card matching its total value |
| **Capture Own Build** | Capture your own build or temp stack with a matching card |
| **Capture Opponent Build** | Steal and capture an opponent's build with a matching card |
| **Multi-Card Capture** | Drop multiple cards to capture - last card's value determines target |
| **Auto-Capture** | When multiple cards can capture, highest value capture is automatic |
| **End Turn** | Capturing ends your turn automatically |

### 2. Build Section (🧱)
Rules for creating and extending builds:

| Rule | Description |
|------|-------------|
| **Sum Build** | Create a build by combining cards that sum to 10 or less |
| **Difference Build** | Create a build using the largest card minus others (base build) |
| **Multi-Build** | Partition cards into multiple builds with same total value |
| **Temp Stack** | Temporary stack - must capture or accept within same round |
| **Accept Build** | Convert temp stack to permanent build |
| **Extend Build** | Add cards to your existing build to increase its value |
| **Steal Build** | Add a card to opponent's build to take ownership |
| **Merge Builds** | Two builds with same value automatically merge |
| **Max Hand Cards** | Maximum 2 cards from hand per temp stack per turn |
| **Cannot Steal Base** | Base (difference) builds cannot be stolen |
| **Cannot Steal 10** | Builds worth exactly 10 cannot be stolen |

### 3. Trail Section (📤)
Rules for trailing cards:

| Rule | Description |
|------|-------------|
| **Trail Any Card** | Place any card from hand onto the table |
| **No Duplicate Rank** | Cannot trail a card if its rank already exists on table as loose card |
| **No Matching Build** | Cannot trail a card that matches any active build's value |
| **End Turn** | Trailing ends your turn automatically |
| **Trail Card Goes to Last Capturer** | At game end, uncaught trail cards go to player who made last capture |

### 4. Scoring Section (⭐)
How points are calculated:

| Rule | Description |
|------|-------------|
| **Total 11 Points** | 11 points available per deal |
| **Card Points** | Each card in capture pile scores its face value (A=1, J=11, Q=12, K=13) |
| **Most Cards** | 1 point for capturing the most cards |
| **Most Spades** | 1 point for capturing most spade cards |
| **Spade 10** | 2 points for capturing the 10 of Spades |
| **Spade 2** | 1 point for capturing the 2 of Spades |
| **Two Aces** | 1 point for capturing both Aces of Spades |
| **Last Capture** | All remaining table cards go to last capturer |
| **Tie-Breaker** | In ties, player with fewer cards in capture pile wins |

### 5. Party Mode Section (🎉)
4-Player team-based rules:

| Rule | Description |
|------|-------------|
| **Teams** | Players 0+2 are Team A, Players 1+3 are Team B |
| **Teammate Builds** | Teammates can add to and capture each other's builds |
| **Cooperative Rebuild** | When opponent captures teammate's build, other teammate can rebuild |
| **Team Scoring** | Both teammates' scores combine into team total |
| **Shiya Recall** | Teammate can "shiya" (recall) a captured build within 4 seconds |
| **Recall Action** | Tap captured build to offer recall to teammates |
| **Accept Recall** | Teammate accepts recall, rebuilds the captured stack |
| **Out of Turn** | In party mode, can shiya/recall even when it's not your turn |
| **Card Counting** | Both teams see combined captures (transparency) |

### 6. Game Modes Section (🎮)

| Mode | Description |
|------|-------------|
| **2 Hands** | 2 players, 4 cards each, 52-card deck |
| **3 Hands** | 3 players, 4 cards each, 1 card on table, 51-card deck |
| **4 Hands** | 4 players, 4 cards each, no teams (free-for-all) |
| **4H Party** | 4 players, 4 cards each, 2v2 teams |
| **4H Knockout** | Tournament-style with elimination each round |

### 7. Turn & Flow Section (🔄)

| Rule | Description |
|------|-------------|
| **Deal 4 Cards** | Each player receives 4 cards at round start |
| **Card on Table** | For 3+ players, one card placed face-up on table |
| **First Play** | Player with lowest card on table (or card on table in 3-player) plays first |
| **Play Order** | Players take turns clockwise around the table |
| **Must Play if Possible** | Must capture or build if able; otherwise must trail |
| **Turn Timer** | 15 seconds per turn (30 seconds for first turn) |
| **Hand Depleted** | When hand is empty, new 4 cards dealt from deck |
| **Game End** | Game ends when deck is empty and all players have played all cards |

---

## UI Layout Plan

```
┌─────────────────────────────────────┐
│  HEADER: "RULES" + LIVE indicator  │
├─────────────────────────────────────┤
│  TABS: Capture | Build | Trail |   │
│        Scoring | Party | Modes     │
├─────────────────────────────────────┤
│                                     │
│  Rule Cards (scrollable list):     │
│  ┌─────────────────────────────┐   │
│  │ 📌 Rule Title               │   │
│  │    Rule description...      │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

## Implementation Notes

1. **Data Structure**: Create a `rulesData` object with categories and rule arrays
2. **State**: Use `useState` for selected tab/category
3. **Components**: Reuse card styling from FriendsList.tsx
4. **Icons**: Use Ionicons for section icons (hand-right, construct, arrow-forward, star, people, game-controller)
5. **Accessibility**: Add rule icons for visual differentiation

---

**Status**: Plan ready for implementation