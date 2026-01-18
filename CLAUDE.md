# CLAUDE.md

## Project Overview

Cotton is a React Native boilerplate project built with Expo, TypeScript, and Back4App Parse Server.

## Critical Constraints

### Expo Go Only
- **NO native code** - no CocoaPods, Gradle, ios/, android/ folders
- **NO pod install** - never run it or create Podfiles
- Only use libraries that work in Expo Go without native linking

### Never Do These
- `useMasterKey` in client code (only in Cloud Code)
- `Alert.alert()` - use `useToast()` instead
- `ActivityIndicator` for screens - use skeleton loaders
- `any` type - always proper TypeScript types
- Direct Parse queries in components - use services
- Relative imports - use `@/` paths

## Tech Stack

- **Frontend**: React Native (Expo), TypeScript, NativeWind v4
- **State**: Jotai + AsyncStorage
- **Backend**: Back4App Parse Server

## Project Structure

```
src/
├── app/                 # Expo Router screens
│   ├── _layout.tsx      # Root layout
│   ├── index.tsx        # Entry screen
│   ├── auth/            # Auth screens
│   └── tabs/            # Tab screens
├── components/
│   ├── ui/              # Reusable UI components
│   └── common/          # Shared components
├── config/              # App configuration
├── constants/           # Constants (colors, routes, etc.)
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
├── models/              # Parse model classes
├── services/            # API services
├── store/               # Jotai atoms
├── types/               # TypeScript types
└── utils/               # Utility functions
```

## Code Patterns

### Service Layer
All API calls go through services that return `ApiResponse<T>`:
```typescript
const result = await SomeService.method();
if (result.success) {
  // use result.data
} else {
  showError(result.error.message);
}
```

### Jotai State Management
```typescript
// Atom with AsyncStorage persistence
export const userAtom = atomWithStorage<IUser | null>(
  STORAGE_KEYS.USER,
  null,
  createAtomStorageAdapter<IUser | null>()
);

// In components
const [user, setUser] = useAtom(userAtom);
```

### Icons
```typescript
import { Lucide } from "@react-native-vector-icons/lucide";
<Lucide name="home" size={24} color={COLORS.primary} />
```
Icon names are **kebab-case**: `"home"`, `"user"`, `"settings"`

### Imports
```typescript
import { useState } from "react";           // React first
import { useRouter } from "expo-router";    // Third-party
import { useAuth } from "@/hooks/useAuth";  // Local with @/ paths
```

### Routes
Use `ROUTES` constants from `@/constants/routes.ts`:
```typescript
router.push(ROUTES.HOME);
router.replace(ROUTES.AUTH);
```

### SafeAreaView
- Tab screens: `edges={["top", "left", "right"]}` (exclude bottom)
- Non-tab screens: no edges prop (all edges)

## Back4App Configuration

**App ID:** `FCUqIKx4ZaZxK0ZhFtYkYg60iSWwJFc5KQvWbftk`
**Master Key:** `hSR6KjbtsZel5Lkn5GACpZ1RmPe3wbClUQXVHx91`
**JavaScript Key:** `lfwVvVco2YMoYp2NVO9p7qNzevooey5aGnZiXB7z`

### Deploy Cloud Code via MCP
```
mcp__back4app__deploy_cloud_code_files
  applicationId: FCUqIKx4ZaZxK0ZhFtYkYg60iSWwJFc5KQvWbftk
  files: [{"path": "cloud/main.js", "localPath": "/Users/mukesh/Code/cotton/cloud/main.js"}]
```

## Commands

```bash
npm install    # Install dependencies
npm start      # Start Expo dev server
npm run lint   # Run ESLint
```

## Adding Features Checklist

1. **Types**: `types/models/feature.ts`, export from barrel
2. **Model**: `models/Feature.model.ts` with transform function
3. **Service**: `services/feature.service.ts` returning `ApiResponse<T>`
4. **Components**: `components/feature/` using `components/ui/`
5. **Routes**: Add to `constants/routes.ts`
