# HomeScreen Refactoring Plan

## Overview
Refactor `app/(tabs)/index.tsx` to separate concerns by extracting UI sections into dedicated component files.

## Current State
The HomeScreen file is ~840 lines and mixes:
- State management (useState hooks)
- Custom hooks (useNotifications, useUserSearch, usePlayerProfile, useAuth)
- Responsive dimension calculations
- Navigation handlers
- Multiple UI modals (Search, Menu, Notification)
- Inline styles + StyleSheet

## Target Architecture

### New File Structure
```
components/home/
├── useHomeScreen.ts          # Custom hook for state & handlers
├── HeaderButtons.tsx         # Burger menu + notification bell
├── ProfileCard.tsx           # Top-right profile preview
├── GameButtons.tsx           # Vs AI, Multiplayer, Private Room, Party Mode
├── SearchPlayersModal.tsx    # Search players modal
├── HomeMenuModal.tsx        # Side menu drawer
└── index.ts                 # Barrel export

app/(tabs)/
└── index.tsx               # Main screen - now just composes components
```

### Component Responsibilities

#### 1. useHomeScreen.ts
```typescript
// Returns:
- notificationPanelVisible, setNotificationPanelVisible
- searchModalVisible, setSearchModalVisible  
- menuVisible, setMenuVisible
- unreadCount
- handlers: handleCpuGame, handleMultiplayer, handlePrivateRoom, 
  handlePartyMode, handleProfile, handleFriends, handleSearchPlayers, handleLogout
- computed: currentAvatar, winRate
- profile, user, isAuthenticated
```

#### 2. HeaderButtons.tsx
- Burger menu button (top-left)
- Notification bell with badge (top-right)
- Props: onMenuPress, onNotificationPress, unreadCount

#### 3. ProfileCard.tsx
- Compact profile display (top-right)
- Shows avatar, username, wins/losses/winRate
- Props: profile, currentAvatar, onPress

#### 4. GameButtons.tsx
- Vs AI button
- Multiplayer button  
- Private Room button
- Party Mode button
- Props: onCpuGame, onMultiplayer, onPrivateRoom, onPartyMode

#### 5. SearchPlayersModal.tsx
- Modal with search input
- Results list with add friend button
- Uses useUserSearch hook internally
- Props: visible, onClose, onUserPress

#### 6. HomeMenuModal.tsx
- Slide-in drawer from left
- Menu items: Search Players, Friends, Vs AI, Multiplayer, Private Room, Party Mode
- Profile preview at top
- Sign In/Out based on auth state
- Props: visible, onClose, handlers, profile, currentAvatar

## Implementation Order
1. Create `components/home/` directory
2. Create `useHomeScreen.ts` hook
3. Create each component file
4. Create barrel export `index.ts`
5. Refactor `app/(tabs)/index.tsx` to use new components
6. Verify TypeScript compilation
