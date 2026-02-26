---
id: mobile-react-native
name: React Native + Expo
description: Cross-platform mobile app with Expo and TypeScript
category: mobile
tags: [react-native, expo, typescript, mobile, ios, android]
---

# Project Overview
[Describe the mobile app, its target platform(s), and core user journeys.]

## Tech Stack
- Framework: React Native with Expo SDK 50+
- Language: TypeScript strict
- Navigation: Expo Router (file-based)
- State: Zustand or Redux Toolkit
- API: React Query + Axios

## Key Directories
- `app/` - Screens and navigation (Expo Router)
- `components/` - Reusable UI components
- `hooks/` - Custom React hooks
- `services/` - API clients and external integrations
- `store/` - Global state management

## Development Commands
- `npx expo start` - Start Expo dev server
- `npx expo run:ios` - Run on iOS simulator
- `npx expo run:android` - Run on Android emulator
- `npm run typecheck` - TypeScript check

## Code Standards
- Use StyleSheet.create for all styles (avoid inline styles)
- Handle platform differences with Platform.select
- Test on both iOS and Android before opening PRs
- Use React.memo for list item components
- Handle offline states gracefully

## Git Workflow
- Feature branches from `main`
- Include screenshots/recordings in PRs for visual changes
- Run on both platforms before merging
