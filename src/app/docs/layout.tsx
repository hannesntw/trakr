import Link from "next/link";
import { StoriLogo } from "@/components/StoriLogo";

const NAV = [
  { href: "/docs", label: "Getting Started" },
  { href: "/docs/traql", label: "TraQL Reference" },
  { href: "/docs/api", label: "REST API" },
  { href: "/docs/mcp", label: "MCP Tools" },
  { href: "/docs/workflow", label: "Workflows" },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-content-bg flex">
      {/* Sidebar */}
      <nav className="w-56 shrink-0 border-r border-border bg-surface p-6 sticky top-0 h-screen overflow-auto">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <StoriLogo size={24} className="shrink-0" />
          <span className="text-sm font-semibold text-text-primary">Stori Docs</span>
        </Link>
        <ul className="space-y-1">
          {NAV.map(item => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block px-3 py-1.5 rounded-md text-sm text-text-secondary hover:text-text-primary hover:bg-content-bg transition-colors"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 pt-4 border-t border-border">
          <Link href="/" className="text-xs text-text-tertiary hover:text-accent transition-colors">
            Back to Stori
          </Link>
        </div>
      </nav>
      {/* Content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
