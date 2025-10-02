# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start dev server**: `npm run dev` (uses Turbopack, runs on http://localhost:3000)
- **Build**: `npm run build` (uses Turbopack)
- **Start production**: `npm start`

## Architecture

This is a Next.js 15 AI chat application using the Vercel AI SDK with Anthropic's Claude.

### Key Technologies

- **Framework**: Next.js 15 (App Router)
- **AI SDK**: Vercel AI SDK (`ai` package) with `@ai-sdk/anthropic` and `@ai-sdk/react`
- **Model**: Claude Sonnet 4.5
- **Streaming**: Uses `streamText` API with UI message streaming
- **Markdown**: `streamdown` for markdown rendering
- **UI**: Radix UI components + Tailwind CSS 4

### Directory Structure

- `src/app/api/chat/route.ts` - Chat API endpoint using `streamText` with Anthropic
- `src/app/page.tsx` - Main chat interface using `useChat` hook
- `src/components/ai-elements/` - Reusable AI chat UI components (conversation, message, prompt-input, response, reasoning, sources, etc.)
- `src/components/ui/` - Generic Radix UI components

### API Route Pattern

The chat endpoint (`/api/chat`) validates UI messages using `safeValidateUIMessages`, converts them to model messages, and streams responses with sources and reasoning enabled:

```typescript
return result.toUIMessageStreamResponse({
  sendSources: true,
  sendReasoning: true,
});
```

### Message Parts System

Messages have a `parts` array that can contain multiple types:
- `text` - Regular text content
- `reasoning` - Extended thinking content from Claude
- `source-url` - URLs referenced in responses

The UI renders each part type differently in the conversation.

### Component Architecture

AI elements are composable primitives:
- **Conversation**: Container with scroll management
- **Message/MessageContent**: Individual message bubbles
- **PromptInput**: Complex input component with attachments, model selection, and submit controls
- **Response**: Wrapper around `Streamdown` for markdown rendering with syntax highlighting
- **Reasoning**: Collapsible extended thinking blocks
- **Sources**: Collapsible source citations

### Styling Pattern

Uses object-based function parameters (per CLAUDE.md instructions) and `cn()` utility from `@/lib/utils` for conditional classnames with `tailwind-merge`.
