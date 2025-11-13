# Tech Stack

## Frontend Framework & Build System

### Core Framework
- **React 19.1.1** - Latest React version with improved concurrent features and automatic batching for optimal real-time UI updates
- **TypeScript** - Type safety for component props, Supabase client interactions, and data models; reduces runtime errors in collaborative features

### Build System & Tooling
- **Vite with Rolldown** - Rust-based bundler (rolldown-vite@7.1.14) providing faster build times than standard Vite; uses oxc for Fast Refresh instead of Babel
- **ESLint** - Code linting with v9 flat config for consistent code quality
- **TypeScript Compiler** - Runs before Vite build to ensure type safety (`tsc -b && vite build`)

### Development Server
- **Vite Dev Server** - Hot module replacement (HMR) for rapid development iterations
- **npm** - Package manager for dependency management

## UI Components & Styling

### Component Library
- **shadcn/ui** - High-quality React components with "new-york" variant for professional appearance
  - Uses Radix UI primitives for accessibility
  - Components located in `src/components/ui/` (aliased as `@/components/ui`)
  - Installable via MCP server integration (`.mcp.json`) or CLI (`npx shadcn@latest add`)
  - Key components needed: Button, Card, Badge, Dialog, Select, Textarea, Avatar, Tooltip

### Styling System
- **Tailwind CSS v4.1.16** - CSS-based configuration (no separate tailwind.config.js) with utility-first styling
- **@tailwindcss/vite** - Vite plugin for Tailwind integration
- **CSS Variables** - Enabled for theme customization with slate as base color
- **class-variance-authority (cva)** - Variant-based component styling used by shadcn/ui components
- **clsx + tailwind-merge** - Combined in `cn()` utility (`src/lib/utils.ts`) for conditional class handling

### Icons
- **lucide-react** - Icon library for UI elements (voting cards, status indicators, emoji selectors, navigation)

## Backend & Infrastructure

### Backend as a Service
- **Supabase** - Comprehensive backend platform providing:
  - **PostgreSQL Database** - Structured data storage for rooms, participants, votes, stories
  - **Real-time Subscriptions** - WebSocket-based live updates for collaborative voting experience
  - **Supabase Auth** - User authentication and session management (for future team workspaces feature)
  - **Row Level Security (RLS)** - Database-level access control policies
  - **RESTful API** - Automatic API generation from database schema

### Supabase Client
- **@supabase/supabase-js** - Official JavaScript client library for:
  - Database queries and mutations
  - Real-time subscription management
  - Authentication flows
  - Type-safe database operations (via TypeScript)

## Routing & State Management

### Routing
- **React Router v6** - Client-side routing for:
  - Landing/room creation page
  - Room join page (with room code parameter)
  - Active room/voting page
  - Future: Analytics dashboard, settings pages
  - Path aliases supported: uses Vite config `@/` → `./src/` resolution

### State Management
- **React Context API** - For local UI state and user preferences
- **Supabase Real-time** - Serves as distributed state management layer; backend broadcasts state changes to all connected clients
- **React Hooks** - Custom hooks in `src/hooks/` for:
  - Supabase real-time subscriptions
  - Room state management
  - Participant tracking
  - Vote aggregation logic

## Data Layer Architecture

### Database Schema (Supabase PostgreSQL)
**rooms** table:
- id (uuid, primary key)
- room_code (unique string for joining)
- name (room display name)
- leader_id (references participants)
- point_scale (Fibonacci, T-shirt, custom)
- created_at, updated_at

**participants** table:
- id (uuid, primary key)
- room_id (foreign key to rooms)
- name (display name)
- is_leader (boolean)
- is_active (boolean for presence tracking)
- joined_at

**stories** table:
- id (uuid, primary key)
- room_id (foreign key)
- title, description
- is_active (current story being estimated)
- final_average (nullable, set after consensus)
- created_at

**votes** table:
- id (uuid, primary key)
- story_id (foreign key)
- participant_id (foreign key)
- point_value (selected estimate)
- sentiment (emoji indicator)
- is_revealed (boolean)
- created_at

### Real-time Subscriptions
- Subscribe to `votes` changes filtered by active story
- Subscribe to `participants` changes filtered by room
- Subscribe to `stories` changes for current room
- Automatic reconnection handling for network interruptions

## Development Tools & Configuration

### Path Aliases
Configured in `vite.config.ts` and `tsconfig.json`:
- `@/` → `./src/`
- `@/components` → `./src/components`
- `@/lib` → `./src/lib`
- `@/hooks` → `./src/hooks`

### MCP Integration
- `.mcp.json` configured with shadcn MCP server
- Enables Claude Code to list and add shadcn components via MCP tools
- Command: `npx shadcn@latest mcp`

### Environment Variables
Required `.env.local` file:
```
VITE_SUPABASE_URL=<project-url>
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

## Testing & Quality (Future Enhancement)

### Testing Framework
- **Vitest** - Unit and integration testing (from global standards, not yet implemented)
- **React Testing Library** - Component testing
- Test location: `src/**/*.test.ts` or `src/**/*.test.tsx`

### Code Quality
- **ESLint** - Linting with v9 flat config
- **Prettier** - Code formatting (from global standards)
- **TypeScript strict mode** - Maximum type safety

## Deployment & Hosting

### Hosting Platform
- **Netlify** - Static site hosting with:
  - Automatic deployments from git
  - Environment variable management
  - Edge network for global performance
  - Serverless function support (if needed for webhooks)

### CI/CD
- **GitHub Actions** - Automated build and deployment pipeline
  - Run linting and type checking
  - Build production bundle
  - Deploy to Netlify on merge to main

## Architecture Decisions

### Why Supabase for Real-time?
- **Instant Synchronization**: Built-in WebSocket infrastructure eliminates need for custom real-time server
- **Reduced Complexity**: Single platform provides database, real-time, and future auth needs
- **Cost Effective**: Generous free tier suitable for MVP and small teams
- **PostgreSQL Foundation**: Robust, scalable database with excellent TypeScript support
- **Row Level Security**: Database-level access control reduces backend security logic

### Why shadcn/ui Components?
- **Customizable**: Source code included in project, fully modifiable
- **Accessible**: Built on Radix UI primitives with ARIA compliance
- **Type Safe**: Full TypeScript support with proper prop types
- **Consistent**: Variant-based styling maintains design system coherence
- **Modern**: Uses latest React patterns and Tailwind CSS v4

### Why Rolldown/Vite?
- **Performance**: Rust-based bundler faster than JavaScript alternatives
- **Developer Experience**: Fast HMR for productive development
- **Modern**: Uses oxc instead of Babel for improved build speed
- **Future Proof**: Vite is becoming the standard React build tool

### Why No Traditional Backend Server?
- **Faster Development**: Supabase eliminates need to build REST API, authentication, real-time infrastructure
- **Reduced Maintenance**: No server infrastructure to manage, monitor, or scale
- **Cost Efficiency**: Serverless architecture scales to zero when not in use
- **Focus on Product**: Team can focus on user experience rather than backend plumbing
