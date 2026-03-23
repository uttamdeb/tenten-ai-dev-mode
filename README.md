# TenTen AI Dev Mode

TenTen AI Dev Mode is an internal testing frontend for TenTen, built to validate chat flows, prompt behavior, API integrations, subject routing, and debugging workflows before production rollout.

The app provides a multi-mode chat interface for working with TenTen AI services across Git, Video, Exam, and supporting developer tools such as token generation, evaluation mode, exam explanation, and knowledge-base vectorization.

## What This Project Does

- Provides a chat-first interface for testing TenTen AI responses
- Supports multiple backend modes and endpoint environments
- Persists sessions and messages with Supabase
- Exposes debugging information for requests and responses
- Includes internal tools for token generation and evaluation workflows
- Supports image attachments and markdown/math rendering
- Includes a mobile-friendly web UI and PWA support

## Core Features

- Multi-mode API configuration
- Subject-aware chat routing
- Session history sidebar
- Persistent chat sessions and messages
- Markdown and KaTeX rendering
- Image attachment upload support
- Debug panels for webhook request and response inspection
- Theme toggle and authenticated user profile menu
- Special simulator CTA support when the configured URL appears in assistant output

## Supported Modes

The app currently supports these API modes:

- `tenten-git`
- `tenten-video`
- `tenten-exam`
- `tenten-exam-explanation`
- `n8n` is still represented in the configuration model, though the UI is currently focused on TenTen service modes

For Git-backed modes, the app supports these endpoint targets:

- `prod`
- `stage`
- `local`

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui and Radix UI
- Supabase
- React Router
- React Markdown
- KaTeX

## Project Structure

Key directories:

- `src/components` UI components and feature modules
- `src/hooks` app hooks for auth, config, uploads, profile, and mobile behavior
- `src/pages` route-level pages
- `src/integrations/supabase` Supabase client and generated types
- `src/utils` utility helpers such as thread mapping and PWA helpers
- `supabase/migrations` database migration history
- `public` static assets and service worker files

Important components:

- `src/components/ChatInterface.tsx` main chat shell and interaction flow
- `src/components/SettingsPanel.tsx` developer configuration console
- `src/components/SessionSidebar.tsx` session history and navigation
- `src/components/ChatMessage.tsx` message rendering, reasoning, and debug panels
- `src/components/MarkdownRenderer.tsx` markdown and math rendering

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

### Run linting

```bash
npm run lint
```

## Configuration

API configuration is managed in the app through the settings panel and persisted in local storage.

The configuration model includes:

- API mode
- authorization token
- session ID
- thread ID
- Git endpoint
- optional custom Git URL
- content type and content ID
- segment ID
- exam ID
- exam session ID
- question ID

The local storage key used by the app is:

```text
tenten-ai-api-config
```

## Authentication and Persistence

- User authentication is handled with Supabase Auth
- Chat sessions are stored in the `chat_sessions` table
- Chat messages are stored in the `chat_messages` table
- Feedback and profile data are also managed through Supabase-backed flows

## Developer Tools Included

The settings panel exposes internal tools for testing and support workflows:

- Access token generation
- Evaluation mode
- Exam explanation flow
- Knowledge base vectorization

## UI and Design Notes

The current UI follows a premium dark glassmorphism direction with a red-accent TenTen visual system. The app includes:

- responsive desktop and mobile layouts
- persistent mobile composer behavior
- branded empty state and developer-facing shell
- message-level reasoning and debug surfaces

## Validation

Recommended validation commands:

```bash
./node_modules/.bin/tsc --noEmit
npm run build
npm run lint
```

## Notes

- This project is intended for internal testing and development workflows
- Some defaults in the developer configuration are optimized for internal TenTen environments
- Supabase configuration and migrations are included in the repository for backend alignment
