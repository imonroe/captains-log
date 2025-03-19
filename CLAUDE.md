# CLAUDE.md - Coding Guidelines

## Project: Captain's Log
A Star Trek-inspired application for recording, transcribing, and managing audio logs across web, iOS, and Android platforms.

## Core Commands
- Build: TBD (project is in requirements phase)
- Lint: TBD
- Test: TBD

## Code Style Guidelines
- **Architecture**: Cross-platform app using React Native/Flutter with shared backend services
- **Naming**: Use descriptive camelCase for variables/functions, PascalCase for components/classes
- **Database**: UUID-based identification for all entities (users, logs, recordings)
- **Error Handling**: Provide user-friendly error messages and log detailed errors server-side
- **UI**: Follow LCARS-inspired design (dark theme with orange/yellow/blue accents)
- **Data Flow**: Implement secure end-to-end encryption for all user data
- **Testing**: Target mobile devices (iOS 14+, Android 8.0+) and modern browsers

## Key Technologies
- Backend: RESTful API, cloud storage, vector database for semantic search
- Frontend: Cross-platform framework with PWA for web version
- Services: OpenAI Whisper API (or similar) for speech-to-text processing

## Rules
- Prefer to use Yarn instead of NPM when possible.
