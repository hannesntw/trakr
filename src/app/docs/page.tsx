"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Code2, Cpu, Layers, GitBranch, Search } from "lucide-react";
import { StoriLogo } from "@/components/StoriLogo";

const quickLinks = [
  { href: "/docs/api", label: "REST API Reference", icon: Code2, desc: "Full endpoint documentation with examples" },
  { href: "/docs/traql", label: "TraQL Reference", icon: Search, desc: "Query language syntax and examples" },
  { href: "/docs/mcp", label: "MCP Tools", icon: Cpu, desc: "Model Context Protocol integration" },
  { href: "/docs/workflow", label: "Workflows", icon: GitBranch, desc: "Configurable workflow states" },
];

const concepts = [
  {
    title: "Projects",
    description:
      "Projects are the top-level container. Each project has a unique 2\u20135 character key (e.g. PIC, TRK), its own workflow configuration, sprints, and work items. Projects can be public or private.",
  },
  {
    title: "Work Items",
    description:
      "Work items are organized in a hierarchy: Epic \u2192 Feature \u2192 Story / Bug / Task. Every work item has a type, state, optional assignee, priority, and story points. Items link to each other via parent\u2013child relationships or explicit links (blocks, relates_to, duplicates).",
  },
  {
    title: "Sprints",
    description:
      "Time-boxed iterations that group work items. Sprints move through three states: planning \u2192 active \u2192 closed. Each sprint belongs to a single project and can have a goal, start date, and end date.",
  },
  {
    title: "Workflow States",
    description:
      'Each project has a configurable set of workflow states. Every state belongs to one of three categories: todo, in_progress, or done. States have a display name, slug, color, and position. You can use presets (simple, standard, delivery_pipeline) or build your own.',
  },
  {
    title: "TraQL",
    description:
      "Stori Query Language \u2014 a structured query language for searching and aggregating work items. Supports field filters, hierarchy traversal, date arithmetic, cross-project queries, sorting, and aggregations. See the TraQL Reference for full syntax.",
  },
];

export default function DocsGettingStartedPage() {
  return (
    <div className="min-h-screen bg-content-bg">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <StoriLogo size={32} className="shrink-0" />
            <h1 className="text-2xl font-bold text-text-primary">Getting Started with Stori</h1>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            Stori is an agile project management tool with boards, backlogs, sprints, configurable
            workflows, and TraQL &mdash; a powerful query language for work items.
          </p>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group bg-surface border border-border rounded-lg p-4 hover:border-accent/40 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <link.icon className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {link.label}
                </span>
                <ArrowRight className="w-3 h-3 text-text-tertiary ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-text-tertiary">{link.desc}</p>
            </Link>
          ))}
        </div>

        {/* Key Concepts */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent" />
            Key Concepts
          </h2>
          <div className="space-y-3">
            {concepts.map((c) => (
              <div key={c.title} className="bg-surface border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-text-primary mb-1">{c.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{c.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Getting Started with the API */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-accent" />
            Getting Started with the API
          </h2>
          <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">Base URL</h3>
              <code className="text-xs bg-content-bg border border-border rounded px-2 py-1 font-mono text-text-secondary">
                http://localhost:3100/api
              </code>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">Authentication</h3>
              <p className="text-xs text-text-secondary mb-2">
                Include a Bearer token in the <code className="text-[11px] bg-content-bg border border-border rounded px-1 py-0.5 font-mono">Authorization</code> header.
                Public endpoints (listing projects) may work without auth.
              </p>
              <pre className="text-xs text-text-secondary font-mono bg-content-bg rounded-md p-3 overflow-x-auto">
{`Authorization: Bearer <your-token>`}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-2">Quick Example</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">1. Create a project</p>
                  <pre className="text-xs text-text-secondary font-mono bg-content-bg rounded-md p-3 overflow-x-auto">
{`curl -X POST http://localhost:3100/api/projects \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Project", "key": "MYP"}'`}
                  </pre>
                </div>
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">2. Create a work item</p>
                  <pre className="text-xs text-text-secondary font-mono bg-content-bg rounded-md p-3 overflow-x-auto">
{`curl -X POST http://localhost:3100/api/work-items \\
  -H "Content-Type: application/json" \\
  -d '{"projectId": 1, "title": "Build login page", "type": "story"}'`}
                  </pre>
                </div>
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">3. List work items</p>
                  <pre className="text-xs text-text-secondary font-mono bg-content-bg rounded-md p-3 overflow-x-auto">
{`curl http://localhost:3100/api/work-items?projectId=1`}
                  </pre>
                </div>
              </div>
            </div>
            <p className="text-xs text-text-tertiary">
              See the{" "}
              <Link href="/docs/api" className="text-accent hover:underline">
                REST API Reference
              </Link>{" "}
              for full endpoint documentation.
            </p>
          </div>
        </div>

        {/* Getting Started with MCP */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-accent" />
            Getting Started with MCP
          </h2>
          <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
            <p className="text-xs text-text-secondary leading-relaxed">
              The Stori MCP server lets AI assistants like Claude interact with Stori directly &mdash;
              creating projects, managing work items, running TraQL queries, and more.
            </p>
            <div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">1. Install the MCP server</p>
              <pre className="text-xs text-text-secondary font-mono bg-content-bg rounded-md p-3 overflow-x-auto">
{`cd stori/mcp-server && npm install`}
              </pre>
            </div>
            <div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">2. Configure in your MCP client</p>
              <pre className="text-xs text-text-secondary font-mono bg-content-bg rounded-md p-3 overflow-x-auto">
{`// .mcp.json
{
  "mcpServers": {
    "stori": {
      "command": "node",
      "args": ["stori/mcp-server/index.ts"],
      "env": { "STORI_URL": "http://localhost:3100" }
    }
  }
}`}
              </pre>
            </div>
            <div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">3. Use in Claude Code</p>
              <p className="text-xs text-text-secondary leading-relaxed">
                Once configured, Claude can call tools like <code className="text-[11px] bg-content-bg border border-border rounded px-1 py-0.5 font-mono">create_work_item</code>,{" "}
                <code className="text-[11px] bg-content-bg border border-border rounded px-1 py-0.5 font-mono">list_work_items</code>,{" "}
                and <code className="text-[11px] bg-content-bg border border-border rounded px-1 py-0.5 font-mono">update_sprint</code>{" "}
                directly.
              </p>
            </div>
            <p className="text-xs text-text-tertiary">
              See the{" "}
              <Link href="/docs/mcp" className="text-accent hover:underline">
                MCP Tools
              </Link>{" "}
              page for the full list of available tools.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-text-tertiary">
          Stori &mdash; Agile project management, built for teams and AI.
        </div>
      </div>
    </div>
  );
}
