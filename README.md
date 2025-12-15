# Personal Assistant - Project Repository

This is the project workspace for the [**Build a Personal Assistant in TypeScript**](https://www.aihero.dev/cohorts/build-your-own-ai-personal-assistant-in-typescript) workshop. You'll implement techniques learned in the skill-building exercises here to build a functional AI assistant.

## What You'll Build

During this workshop, you'll add these capabilities to your assistant:

- **Hybrid retrieval system** (BM25 + semantic embeddings + rank fusion) to search 547 emails
- **Memory system** with semantic recall, working memory, and episodic learning
- **Agentic tools** with metadata-first retrieval patterns
- **Evaluation framework** using tool call testing and LLM-as-judge scorers
- **Human-in-the-loop** approval system for destructive actions
- **MCP integration** for external tool access

## Workshop Structure

- **Skill-building exercises**: Learn techniques in separate repo
- **Project work**: Implement those techniques here
- **Iteration**: Learn → Build → Test

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- pnpm package manager
- API keys for AI providers (Google/Anthropic/OpenAI)
- Completed AI SDK v5 Crash Course (workshop pre-requisite)

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables (`.env.local`):

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here  # optional
OPENAI_API_KEY=your_key_here      # optional
```

3. Run dev server:

```bash
pnpm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

Starting scaffold includes:

- `/src/app/api/chat/route.ts` - Basic chat endpoint (you'll add agent + tools here)
- `/src/components/ai-elements/` - Chat UI components (message, response, reasoning, etc.)
- `/src/lib/persistence-layer.ts` - Chat history + memory persistence
- `/data/emails.json` - 547 emails for retrieval exercises
- `/data/db.local.json` - Local storage for chats + memories

You'll add during workshop:

- Search algorithms (BM25, embeddings, RRF)
- Agent tools (search, filter, get emails)
- Memory extraction + retrieval
- HITL system
- Evals

## Tech Stack

- **Framework**: Next.js 15 (App Router + Turbopack)
- **AI SDK**: Vercel AI SDK v5 (provider-agnostic)
- **Models**: Google Gemini 2.5 Flash (default), Claude, GPT-4
- **UI**: Radix UI + Tailwind CSS 4
- **TypeScript**: Full type safety

## Available Scripts

- `pnpm run dev` - Start dev server (Turbopack)
- `pnpm run build` - Build for production
- `pnpm start` - Start production server
