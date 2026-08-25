# Story Pointer - Planning Poker for Agile Teams

[![CI](https://github.com/peterclark/pointing.page/actions/workflows/ci.yml/badge.svg)](https://github.com/peterclark/pointing.page/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpeterclark%2Fpointing.page%2Fbadges%2Fcoverage.json)](https://github.com/peterclark/pointing.page/actions/workflows/ci.yml)

> These badges render publicly only once the repository is public. See
> [docs/ci-and-badges.md](./docs/ci-and-badges.md) for the private-repo alternative.

A real-time collaborative planning poker application built with React, TypeScript, Vite, and Supabase.

## Project Overview

Story Pointer enables agile teams to conduct estimation sessions collaboratively with features including:
- Real-time voting and reveals
- Multiple estimation scales (Fibonacci, T-shirt sizes)
- Room-based sessions with shareable codes
- Live participant tracking
- Session history and analytics

## Tech Stack

- **Frontend**: React 19.1.1, TypeScript, Vite with Rolldown
- **UI Components**: shadcn/ui with Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Real-time, Auth)
- **Hosting**: Netlify (recommended)

For detailed tech stack information, see [Tech Stack Documentation](./agent-os/product/tech-stack.md).

## Getting Started

### Prerequisites

- Node.js v18+
- npm or yarn
- A Supabase account (free tier is sufficient)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/shadcn-mcp.git
cd shadcn-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase projects and environment variables:

Follow the comprehensive guides in the `/docs` directory:
- [Supabase Project Setup Guide](./docs/supabase-project-setup.md) - Create dev and prod projects
- [Environment Setup Guide](./docs/environment-setup.md) - Configure local development environment

Quick setup:
```bash
# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with your Supabase credentials
# VITE_SUPABASE_URL=https://your-project-ref.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

4. Link to your Supabase development project:
```bash
npx supabase link --project-ref YOUR_DEV_PROJECT_REF
```

5. Apply database migrations:
```bash
npx supabase db push
```

This will apply all 5 migrations:
- Initial schema (tables, constraints, indexes)
- Functions and triggers (automation)
- RLS policies (security)
- Policy fixes (anonymous access)

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Database Infrastructure

Story Pointer uses Supabase for its backend infrastructure, providing:
- **PostgreSQL Database** - Structured data for rooms, participants, votes, and stories
- **Real-time Subscriptions** - Live updates for collaborative features
- **Authentication** - Magic link authentication for user management
- **Row Level Security** - Database-level access control

### Database Schema

The application uses 5 core tables:

- **profiles** - User identity across rooms
- **rooms** - Planning poker sessions with unique shareable codes
- **participants** - User participation in specific rooms with leader tracking
- **stories** - Items being estimated in a session
- **votes** - Participant estimates with reveal control

See [Database Schema Documentation](./docs/database-schema.md) for complete schema details including ERD, relationships, indexes, and constraints.

### Environment Configuration

The application uses separate Supabase projects for each environment:

| Environment | Purpose | Configuration |
|-------------|---------|---------------|
| Development | Local development and testing | `.env.local` (not committed) |
| Production | Live application | `.env.production` (not committed) |

**Note**: Staging environment is skipped due to Supabase free tier limitations.

### Documentation

Comprehensive documentation is available in the `/docs` directory:

#### Setup and Configuration
- **[Supabase Project Setup](./docs/supabase-project-setup.md)** - Step-by-step guide for creating Supabase projects
- **[Environment Setup](./docs/environment-setup.md)** - Configure local development environment
- **[Authentication Setup](./docs/authentication-setup.md)** - Configure magic link authentication
- **[Authentication Testing](./docs/authentication-testing.md)** - Testing authentication flows
- **[Authentication Flow](./docs/authentication-flow.md)** - Integration with room joining

#### Database
- **[Database Schema](./docs/database-schema.md)** - Complete schema reference with ERD and relationships
- **[Database Migrations](./docs/database-migrations.md)** - Migration workflow and best practices
- **[Database Operations](./docs/database-operations.md)** - Developer guide for common operations

#### Security and Real-time
- **[RLS Policies](./docs/rls-policies.md)** - Row Level Security policies and access control
- **[Real-time Subscriptions](./docs/realtime-subscriptions.md)** - Live updates and subscription patterns

#### Deployment
- **[Production Deployment](./docs/production-deployment.md)** - Production deployment guide and checklist

### Quick Reference

#### Common Database Operations

```typescript
// Create a room
const room = await createRoom('Sprint Planning', 'fibonacci');
console.log('Room code:', room.room_code);

// Join room
const participant = await joinRoom(roomId, userId, 'Alice');

// Submit vote
await submitVote(storyId, participantId, '5', 'confident');

// Reveal votes (leader only)
await revealVotes(storyId);
```

See [Database Operations Guide](./docs/database-operations.md) for complete examples.

#### Real-time Subscriptions

```typescript
// Subscribe to room participants
const participants = useRoomParticipants(roomId);

// Subscribe to story votes
const votes = useStoryVotes(storyId);
```

See [Real-time Subscriptions Guide](./docs/realtime-subscriptions.md) for complete patterns.

## Project Structure

```
shadcn-mcp/
├── agent-os/               # Agent OS specifications and standards
│   ├── product/           # Product documentation
│   ├── specs/             # Feature specifications
│   └── standards/         # Development standards
├── docs/                  # Project documentation
│   ├── supabase-project-setup.md
│   ├── environment-setup.md
│   ├── database-schema.md
│   ├── database-migrations.md
│   ├── database-operations.md
│   ├── rls-policies.md
│   ├── realtime-subscriptions.md
│   ├── authentication-*.md
│   └── production-deployment.md
├── src/
│   ├── components/       # React components
│   │   └── ui/          # shadcn/ui components
│   ├── lib/             # Utility functions
│   │   └── supabase/   # Database client and queries
│   ├── hooks/           # Custom React hooks
│   ├── tests/           # Test files
│   └── App.tsx          # Main application component
├── supabase/            # Supabase configuration
│   ├── migrations/      # Database migration files (5 total)
│   └── config.toml      # Local Supabase configuration
└── public/              # Static assets
```

## Development Commands

```bash
# Start development server with HMR
npm run dev

# Build for production (runs TypeScript compiler first, then Vite build)
npm run build

# Lint the codebase
npm run lint

# Type-check without emitting
npm run typecheck

# Preview production build locally
npm run preview

# Run the test suite once
npm test

# Re-run tests on change
npm run test:watch

# Run tests with a coverage report
npm run test:coverage
```

## Supabase Commands

```bash
# Check Supabase CLI version
npx supabase --version

# Link to Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Check migration status
npx supabase migration list

# Apply migrations to linked project
npx supabase db push

# Create a new migration
npx supabase migration new migration_name

# Check for schema drift
npx supabase db diff

# Generate TypeScript types from database schema
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

See [Database Migrations Guide](./docs/database-migrations.md) for complete migration workflow.

## Architecture Notes

### Build System
- **Vite**: Uses `rolldown-vite@7.1.14` (specified in package.json overrides) - a Rolldown-based Vite implementation
- **Bundler**: Rolldown (Rust-based) with oxc for Fast Refresh instead of Babel
- **TypeScript**: Compilation happens before Vite build (`tsc -b && vite build`)

### UI Component System
- **Framework**: shadcn/ui components (installable via shadcn CLI or MCP server)
- **Style**: "new-york" variant
- **Component Location**: `src/components/ui/` (aliased as `@/components/ui`)
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Icons**: lucide-react

### Path Aliases
- `@/` → `./src/`
- `@/components` → `./src/components`
- `@/lib` → `./src/lib`
- `@/hooks` → `./src/hooks`

### Database Architecture
- **5 Core Tables**: profiles, rooms, participants, stories, votes
- **18 RLS Policies**: Comprehensive access control at database level
- **3 Functions**: Room code generation, profile auto-creation, leader promotion
- **4 Triggers**: Automatic room codes, profile creation, leader disconnection handling
- **Real-time Enabled**: Live updates for all collaborative features

See [Database Schema Documentation](./docs/database-schema.md) for complete architecture details.

## Security Best Practices

1. **Never commit `.env.local`** - Already configured in `.gitignore`
2. **Use different credentials** for dev and production
3. **Rotate API keys regularly** - Especially after any security incident
4. **Use environment-specific keys** - Never use production keys in development
5. **Monitor usage** - Check Supabase dashboard for unusual activity
6. **Keep dependencies updated** - Run `npm audit` regularly
7. **RLS policies enforced** - All access control at database level
8. **Anon key is safe to expose** - Service role key never exposed to frontend

See [RLS Policies Documentation](./docs/rls-policies.md) for security details.

## Troubleshooting

### Database Issues

See [Database Migrations Guide](./docs/database-migrations.md#troubleshooting) for:
- Migration failures
- Schema drift
- RLS policy issues
- Foreign key violations

### Environment Issues

See [Environment Setup Guide](./docs/environment-setup.md#troubleshooting) for:
- "Invalid API key" errors
- "CORS error" when calling Supabase
- "Database not connected" issues
- Project linking problems

### Real-time Issues

See [Real-time Subscriptions Guide](./docs/realtime-subscriptions.md#troubleshooting) for:
- Subscriptions not receiving events
- Connection failures
- Event filtering issues
- Performance problems

## Testing

Tests come in two tiers.

**Default suite** — unit, component and integration tests. Every Supabase call
is mocked at the module boundary, so these need no credentials and no running
services. This is what CI runs.

```bash
# Run once (what CI runs)
npm test

# Re-run on change
npm run test:watch

# With a coverage report (also enforces the thresholds in vitest.config.ts)
npm run test:coverage

# A single file
npm test -- src/lib/utils.test.ts
```

Covers: consensus and vote-privacy utilities, the Supabase query layer,
form validation, the voting-flow components and pages, routing, auth state,
and end-to-end room/account workflows.

**Live-database suite** (`src/tests/db/`) — exercises schema constraints,
triggers, RLS policies and real-time channels against a real Supabase instance.
Excluded from `npm test` and from CI because it needs infrastructure.

```bash
npm run supabase:start      # start a local stack
npm run supabase:use-local  # point .env.local at it
npm run test:db
```

> **Never point the live-database suite at production.** Its cleanup helper
> deletes every room whose name begins with `Test`.

See [docs/ci-and-badges.md](./docs/ci-and-badges.md) for how these run in CI.

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the coding standards in `agent-os/standards/`
3. Write tests for new functionality
4. Run tests and ensure they pass
5. Update documentation if needed
6. Submit a pull request with a clear description

### Database Changes

When making database changes:
1. Create migration file: `npx supabase migration new <description>`
2. Write idempotent SQL
3. Test in dev environment
4. Document in migration comments
5. Include rollback plan
6. Update schema documentation if needed

See [Database Migrations Guide](./docs/database-migrations.md) for details.

## License

[Add your license information here]

## Additional Resources

- [CLAUDE.md](./CLAUDE.md) - Project guidance for Claude Code
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Project Status

### Current Implementation

Phase 1-7 complete:
- Database schema implemented with 5 tables
- Row Level Security policies configured (18 policies)
- Real-time subscriptions enabled for all tables
- Authentication setup with magic link
- TypeScript integration with generated types
- Query utility functions for all operations
- Real-time subscription hooks
- Comprehensive test suite (16/26 passing)

### Next Steps

Phase 8 (Documentation and Deployment):
- Production deployment to Supabase
- Final documentation updates
- Deployment verification

See [Project Tasks](./agent-os/specs/2025-11-08-database-schema-supabase-setup/tasks.md) for complete implementation status.
