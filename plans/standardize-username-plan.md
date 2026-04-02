# Plan: Standardize on Username Instead of Display Name

## Problem Analysis
The app currently uses both `username` (from User collection) and `displayName` (from PlayerProfile collection), which is confusing. Player cards and references should consistently use `username` everywhere. This eliminates redundancy and simplifies the data model.

### Current Issues Identified:
1. **Dual Name Fields**: User collection has `username`, PlayerProfile has `displayName`, causing confusion
2. **Inconsistent Usage**: Some places use `displayName`, others use `username`
3. **Data Synchronization**: Updates need to sync both fields
4. **Validation Complexity**: Both fields need validation

## Solution Steps

### 1. Update PlayerProfile Schema
- Remove `displayName` field from PlayerProfile model
- Update schema and migration scripts
- Ensure backward compatibility during transition

### 2. Update Server-Side Code
- **PlayerProfileService**: Remove displayName references, use username from User
- **Profile Routes**: Update GET/PUT endpoints to use username instead of displayName
- **Validation**: Remove displayName validation, rely on username validation
- **Migration Script**: Update existing profiles to remove displayName

### 3. Update Client-Side Code
- **usePlayerProfile**: Remove displayName from interfaces and logic
- **useLobbyMock, useOnlinePlayConnection, useLobbyState, useServerProfile**: Update to use username
- **PlayerCard Component**: Simplify display logic to always use username
- **Lobby Components**: Update player display to use username consistently

### 4. Update API Responses
- Ensure all profile endpoints return username as the primary name field
- Update socket handlers to use username
- Maintain backward compatibility for existing clients during transition

### 5. Update Tests and Scripts
- Update test scripts to use username
- Update migration and fix scripts
- Update validation utilities

### 6. Data Migration
- Run migration to clean up existing displayName fields
- Ensure all profiles have proper username references

## Files to Modify
### Server Side:
- `multiplayer/server/models/PlayerProfile.js`
- `multiplayer/server/services/PlayerProfileService.js`
- `multiplayer/server/routes/profile.js`
- `multiplayer/server/utils/validation.js`
- `multiplayer/server/scripts/fix-profiles.js`
- `multiplayer/server/scripts/test-profile-system.js`

### Client Side:
- `hooks/usePlayerProfile.ts`
- `hooks/useLobbyMock.ts`
- `hooks/useOnlinePlayConnection.ts`
- `hooks/useLobbyState.ts`
- `hooks/useServerProfile.ts`
- `components/lobby/PlayerCard.tsx`
- `components/lobby/Lobby.tsx`

### Other:
- Remove displayName from all type definitions
- Update any references in plans/docs

## Testing Requirements
- Test profile creation and updates
- Test lobby player display
- Test multiplayer game player references
- Test backward compatibility
- Test data migration

## Success Criteria
- All player references use username consistently
- PlayerProfile collection no longer has displayName field
- Profile updates sync username properly
- No confusion between username and displayName
- All components display username correctly

## Implementation Order
1. Update server models and services
2. Update client hooks and components
3. Run data migration
4. Update tests and scripts
5. Test end-to-end functionality</content>
<parameter name="filePath">C:\Users\LB\Desktop\Linda Baloyi\MadGames\dev\casino-game\plans\standardize-username-plan.md