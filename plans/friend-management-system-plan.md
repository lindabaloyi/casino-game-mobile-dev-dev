# Friend Management System Implementation Plan

## Overview
Implement a comprehensive player search and friend management system for the casino game multiplayer environment with real-time notifications.

## Current System Analysis

### Existing Components
- **PlayerProfile Model**: Has basic `friends` array (ObjectId[]), `blockedUsers` array
- **User Model**: Contains username, avatar, createdAt, email
- **GameStats Model**: Contains totalGames, wins, losses, rank
- **Profile Routes**: GET/PUT /api/profile, GET /api/profile/:userId
- **Authentication**: useAuth hook with token-based auth
- **Socket.IO**: Available in multiplayer server for real-time events
- **UI Theme**: Casino aesthetic (green #0f4d0f, gold #FFD700)

### Missing Components
- Friend request system (pending requests)
- User search API
- Real-time notification system
- Friend management UI

---

## Implementation Plan

### Phase 1: Backend Database & Models

#### 1.1 Create FriendRequest Model
**File**: `multiplayer/server/models/FriendRequest.js`
- Schema:
  - `fromUserId`: ObjectId (who sent request)
  - `toUserId`: ObjectId (who receives request)
  - `status`: 'pending' | 'accepted' | 'declined'
  - `createdAt`: Date
  - `updatedAt`: Date
- Methods:
  - `create(fromUserId, toUserId)` - Send friend request
  - `getPendingRequests(userId)` - Get incoming requests
  - `getSentRequests(userId)` - Get outgoing requests
  - `acceptRequest(requestId)` - Accept request
  - `declineRequest(requestId)` - Decline request
  - `cancelRequest(requestId)` - Cancel sent request
  - `removeFriends(userId, friendId)` - Remove friendship

#### 1.2 Create Friends Routes
**File**: `multiplayer/server/routes/friends.js`

Endpoints:
- `GET /api/friends` - Get user's friends list with profile info
- `GET /api/friends/requests` - Get pending friend requests (incoming + outgoing)
- `POST /api/friends/request/:userId` - Send friend request
- `POST /api/friends/accept/:requestId` - Accept friend request
- `POST /api/friends/decline/:requestId` - Decline friend request
- `DELETE /api/friends/:friendId` - Remove friend
- `GET /api/users/search?q=username` - Search users by username

#### 1.3 Update User Model
Add static method:
- `searchByUsername(query, limit)` - Search users by username (partial match)

#### 1.4 Update PlayerProfile Model
Add methods:
- `getFriendsWithInfo(userId)` - Get friends with username, avatar, stats

---

### Phase 2: Socket.IO Events

#### 2.1 Socket Events
**File**: `multiplayer/server/socket-server.js`

Add event handlers:
- `friend-request-received` - Notify user of incoming request
- `friend-request-accepted` - Notify request sender of acceptance
- `friend-request-declined` - Notify request sender of decline
- `friend-removed` - Notify user when removed from friends

#### 2.2 Notification System
Create notification types:
- `FRIEND_REQUEST` - New friend request
- `FRIEND_ACCEPTED` - Friend request accepted
- `FRIEND_REMOVED` - Removed from friends

---

### Phase 3: Frontend Hooks

#### 3.1 Create useFriends Hook
**File**: `hooks/useFriends.ts`

```typescript
interface Friend {
  _id: string;
  username: string;
  avatar: string;
  createdAt: string;
  stats: {
    totalGames: number;
    wins: number;
    losses: number;
    rank: number;
  };
}

interface FriendRequest {
  _id: string;
  fromUser: {
    _id: string;
    username: string;
    avatar: string;
  };
  status: 'pending';
  createdAt: string;
}

interface UseFriendsResult {
  friends: Friend[];
  pendingRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  unreadCount: number;
  sendRequest: (userId: string) => Promise<{ success: boolean; error?: string }>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  refreshFriends: () => Promise<void>;
}
```

#### 3.2 Create useUserSearch Hook
**File**: `hooks/useUserSearch.ts`

```typescript
interface SearchResult {
  _id: string;
  username: string;
  avatar: string;
}

interface UseUserSearchResult {
  searchResults: SearchResult[];
  isSearching: boolean;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
}
```

#### 3.3 Create useNotifications Hook
**File**: `hooks/useNotifications.ts`

Handle real-time notification updates via Socket.IO

---

### Phase 4: UI Components

#### 4.1 PlayerSearch Component
**File**: `components/friends/PlayerSearch.tsx`

Features:
- TextInput for username search
- Debounced search (300ms)
- Dropdown showing results (max 5)
- Click result to navigate to profile
- Consistent with casino theme (green/gold)

#### 4.2 UserProfilePage
**File**: `app/user/[userId].tsx` (Dynamic route)

Display:
- Username (large)
- Avatar emoji
- Player level (based on games played)
- Total games played
- Win rate percentage
- Account creation date
- "Add Friend" / "Friend" / "Request Pending" button

#### 4.3 NotificationPanel Component
**File**: `components/friends/NotificationPanel.tsx`

Features:
- Slide-in panel from right
- Unread indicator badge (red dot with count)
- List of notifications:
  - Friend requests (with Accept/Decline buttons)
  - Accepted requests
  - Friend removed notices
- Real-time updates via Socket.IO
- Smooth animations for panel transitions

#### 4.4 FriendsList Component
**File**: `components/friends/FriendsList.tsx`

Display:
- Grid/list of friends
- Avatar, username, online status
- Tap to view profile

---

### Phase 5: Integration

#### 5.1 Update HomeScreen (app/(tabs)/index.tsx)
- Add notification bell icon in header
- Show unread count badge
- Tap to open NotificationPanel

#### 5.2 Add Navigation Routes
- `/user/[userId]` - User profile page
- `/friends` - Friends list page

#### 5.3 Update Profile Routes
- Add authentication middleware
- Return JWT token with responses

---

## File Structure

```
multiplayer/server/
├── models/
│   ├── FriendRequest.js    (NEW)
│   └── ...

routes/
├── friends.js             (NEW)
├── index.js               (UPDATE - add friendsRoutes)

socket-server.js           (UPDATE - add socket events)

hooks/
├── useFriends.ts          (NEW)
├── useUserSearch.ts       (NEW)
├── useNotifications.ts    (NEW)

components/friends/
├── PlayerSearch.tsx       (NEW)
├── NotificationPanel.tsx  (NEW)
├── FriendsList.tsx        (NEW)

app/
├── user/
│   └── [userId].tsx      (NEW)
├── friends.tsx            (NEW)
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users/search | Search users by username |
| GET | /api/friends | Get friends list |
| GET | /api/friends/requests | Get pending requests |
| POST | /api/friends/request/:userId | Send friend request |
| POST | /api/friends/accept/:requestId | Accept request |
| POST | /api/friends/decline/:requestId | Decline request |
| DELETE | /api/friends/:friendId | Remove friend |

---

## Socket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| friend-request | Server→Client | { requestId, fromUser } |
| friend-accepted | Server→Client | { friendId, friend } |
| friend-removed | Server→Client | { friendId } |
| notification-read | Client→Server | - |

---

## Database Collections

### friendRequests
```json
{
  "_id": ObjectId,
  "fromUserId": ObjectId,
  "toUserId": ObjectId,
  "status": "pending" | "accepted" | "declined",
  "createdAt": Date,
  "updatedAt": Date
}
```

---

## Implementation Order

1. **Database**: FriendRequest model + User search method
2. **API**: Friends routes + Socket.IO handlers
3. **Frontend Hooks**: useFriends, useUserSearch, useNotifications
4. **UI Components**: Search, Profile page, Notification Panel
5. **Integration**: HomeScreen, Navigation

---

## Notes

- All friend-related data persisted in MongoDB
- Friends integrated with existing auth (userId from token)
- UI consistent with casino game aesthetic
- Real-time updates via existing Socket.IO infrastructure
- Add friend requires authentication (must be logged in)
