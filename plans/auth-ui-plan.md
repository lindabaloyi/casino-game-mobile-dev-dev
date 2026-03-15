# Login/Register UI System Plan

## Overview
Create a sign in/sign out UI system that matches the home screen color scheme (green background, gold accents) and connects to the MongoDB authentication system.

## Home Screen Aesthetic
- **Background**: Green (#0f4d0f)
- **Accent/Primary**: Gold (#FFD700)
- **Menu Background**: Darker green (#1a5c1a)
- **Buttons**: Semi-transparent black with gold borders
- **Text**: White and gold

## Implementation Plan

### 1. Auth Hook (hooks/useAuth.ts)
- Create React hook for authentication state management
- Store user session in AsyncStorage
- Provide login, register, logout functions
- Auto-load session on app start
- Handle token-based authentication

### 2. Login Screen (app/auth/login.tsx)
- Match home screen aesthetic (green background, gold accents)
- Username/email and password input fields
- "Sign In" button (gold with green text)
- "Don't have an account? Register" link
- Error handling for invalid credentials
- Loading state while authenticating

### 3. Register Screen (app/auth/register.tsx)
- Match home screen aesthetic
- Username, email, password fields
- "Create Account" button (gold with green text)
- "Already have an account? Sign In" link
- Password validation (min 6 chars)
- Error handling for existing users

### 4. Update Home Screen (app/(tabs)/index.tsx)
- Show login button when not authenticated
- Show user info + logout when authenticated
- Integrate with existing profile card area

### 5. Session Persistence
- Store auth token in AsyncStorage
- Auto-restore session on app launch
- Clear session on logout

## File Structure
```
app/auth/
  login.tsx    - Login form
  register.tsx  - Registration form
  _layout.tsx   - Auth stack layout

hooks/
  useAuth.ts    - Authentication hook

components/
  auth/
    AuthButton.tsx    - Reusable gold button
    AuthInput.tsx    - Styled input field
    AuthForm.tsx     - Form container
```

## API Integration
- Login: POST /api/auth/login
- Register: POST /api/auth/register  
- Verify: POST /api/auth/verify (for session restore)

## Error Handling
- Invalid credentials: "Invalid username or password"
- Network error: "Unable to connect. Please try again."
- Existing user: "Username already taken"
- Existing email: "Email already registered"
