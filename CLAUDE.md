# Trakr — Project Management Tool

Agile PM tool with boards, backlogs, and sprint planning. Built with Next.js 16, Tailwind v4, Drizzle ORM, Neon Postgres.

## Quick start

```bash
npm run dev -- -p 3100     # Start dev server
npm run db:push            # Push schema changes
npm run db:seed            # Reset and seed demo data
```

## Architecture

- **Database:** Neon Postgres via Drizzle ORM. Local dev uses the same Neon instance.
- **API:** REST routes in `src/app/api/`. All endpoints support JSON.
- **UI:** Server components by default, client components where needed (`"use client"`).
- **MCP Server:** `mcp-server/` — separate package wrapping the REST API.

## Key paths

- `src/db/schema.ts` — Drizzle table definitions (projects, work_items, sprints, comments)
- `src/db/seed.ts` — Demo seed data
- `src/app/api/` — REST API routes
- `src/app/projects/[key]/` — Project-scoped UI pages (board, backlog, sprints, work-items)
- `src/components/` — Shared UI components
- `src/lib/constants.ts` — Types, colors, labels
- `mcp-server/index.ts` — MCP server entry point

## Conventions

- All work items and sprints are scoped to a project via `projectId`.
- Project keys are 2-5 uppercase chars (e.g. PIC, TRK).
- Use Zod schemas for API input validation.
- Design tokens are in `src/app/globals.css` using CSS custom properties + Tailwind `@theme`.

@AGENTS.md
