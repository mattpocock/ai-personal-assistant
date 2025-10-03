# AI Personal Assistant

This is a starter repository for building an AI-powered personal assistant using Next.js and the Vercel AI SDK. It serves as the foundation for a course on building sophisticated AI applications with modern web technologies.

## What is this?

This project demonstrates how to build a conversational AI interface with advanced features like:

- **Streaming AI responses** with real-time message updates
- **Extended thinking** with model reasoning capabilities
- **Source citations** and references in responses
- **Rich markdown rendering** with syntax highlighting
- **Modern UI** built with Radix UI and Tailwind CSS
- **Model flexibility** - swap AI providers without changing your UI code

The codebase is structured to be educational, showcasing best practices for integrating AI into web applications while maintaining clean, maintainable code.

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- pnpm package manager
- API key from your chosen AI provider (Anthropic, OpenAI, etc.)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ai-personal-assistant
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up your environment variables:

```bash
# Create a .env.local file with your API key
# For Anthropic (default):
ANTHROPIC_API_KEY=your_api_key_here

# Or for OpenAI:
# OPENAI_API_KEY=your_api_key_here
```

4. Run the development server:

```bash
pnpm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to start chatting with your AI assistant.

## Tech Stack

- **Framework**: Next.js 15 (App Router with Turbopack)
- **AI SDK**: Vercel AI SDK (provider-agnostic)
- **Default Model**: Claude Sonnet 4.5 (easily swappable)
- **UI**: Radix UI components + Tailwind CSS 4
- **Markdown**: Streamdown for rendering
- **TypeScript**: Full type safety throughout

## Project Structure

- `src/app/api/chat/route.ts` - Chat API endpoint with streaming
- `src/app/page.tsx` - Main chat interface
- `src/components/ai-elements/` - Reusable AI chat components
- `src/components/ui/` - Generic UI components

## Available Scripts

- `pnpm run dev` - Start development server with Turbopack
- `pnpm run build` - Build for production
- `pnpm start` - Start production server

## Learn More

This repository is designed to teach modern AI application development patterns. As you explore the code, you'll learn about:

- Streaming AI responses to the UI
- Managing conversation state
- Rendering complex AI outputs (reasoning, sources, markdown)
- Building composable AI UI components
- Working with the Vercel AI SDK's provider-agnostic approach
