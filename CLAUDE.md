# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite application using shadcn/ui components with Tailwind CSS v4. The project uses Rolldown (a Rust-based bundler) instead of standard Vite for improved performance.

## Development Commands

```bash
# Start development server with HMR
npm run dev

# Build for production (runs TypeScript compiler first, then Vite build)
npm run build

# Lint the codebase
npm run lint

# Preview production build locally
npm run preview
```

## Architecture

### Build System
- **Vite**: Uses `rolldown-vite@7.1.14` (specified in package.json overrides) - a Rolldown-based Vite implementation
- **Bundler**: Rolldown (Rust-based) with oxc for Fast Refresh instead of Babel
- **TypeScript**: Compilation happens before Vite build (`tsc -b && vite build`)

### UI Component System
- **Framework**: shadcn/ui components (installable via shadcn CLI or MCP server)
- **Style**: "new-york" variant (see components.json:3)
- **Component Location**: `src/components/ui/` (aliased as `@/components/ui`)
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Icons**: lucide-react

### Path Aliases
Configured in both vite.config.ts:10-12 and tsconfig.json:12-14:
- `@/` → `./src/`
- `@/components` → `./src/components`
- `@/lib` → `./src/lib`
- `@/hooks` → `./src/hooks`

### Styling Architecture
- **Tailwind Config**: CSS-based (v4) - no separate tailwind.config.js file
- **CSS Variables**: Enabled for theme customization (components.json:10)
- **Base Color**: slate (components.json:9)
- **Utility Function**: `cn()` in src/lib/utils.ts combines clsx and tailwind-merge for conditional classes

### Component Patterns
shadcn/ui components follow these patterns:
- Use `class-variance-authority` (cva) for variant-based styling
- Support `asChild` prop via `@radix-ui/react-slot` for composition
- Export both component and variants (e.g., `Button` and `buttonVariants`)
- TypeScript props extend native HTML element props + VariantProps

## MCP Integration

The project has an MCP server configured (.mcp.json:1-11) for shadcn component management:
```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```

This allows Claude Code to interact with shadcn components through MCP tools (listing and adding components).

## Adding shadcn Components

Components can be added via:
1. MCP tools: `mcp__shadcn__list_items_in_registries` and related tools
2. CLI: `npx shadcn@latest add <component-name>`

All components install to `src/components/ui/` per components.json:17.

## Technology Stack Notes

- **React**: v19.1.1 (latest)
- **Tailwind CSS**: v4.1.16 (using new CSS-based configuration)
- **Vite Plugin**: @tailwindcss/vite handles Tailwind integration
- **ESLint**: v9 with flat config (eslint.config.js pattern expected)
