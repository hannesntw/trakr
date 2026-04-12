import { describe, it, expect } from "vitest";
import { query, EXPECTED } from "@/test/helpers";

describe("TraQL text output (SELECT format)", () => {
  it('format("{title} (#{id})") WHERE sprint:active — lines match pattern', async () => {
    const r = await query('SELECT format("{title} (#{id})") WHERE sprint:active');
    expect(r.type).toBe("text");
    expect(r.text!.length).toBeGreaterThan(0);
    for (const line of r.text!) {
      expect(line).toMatch(/^.+ \(#[A-Z]+-\d+\)$/);
    }
  });

  it('format("- [{title}]({url})") WHERE sprint:active — lines contain markdown links', async () => {
    const r = await query('SELECT format("- [{title}]({url})") WHERE sprint:active');
    expect(r.type).toBe("text");
    expect(r.text!.length).toBeGreaterThan(0);
    for (const line of r.text!) {
      // Markdown link pattern: - [some title](/projects/KEY/work-items/ID)
      expect(line).toMatch(/^- \[.+\]\(\/projects\/.+\/work-items\/[A-Z]+-\d+\)$/);
    }
  });

  it('format("{assignee}: {title}") GROUP BY assignee — grouped output with ## headers', async () => {
    const r = await query(
      'SELECT format("{assignee}: {title}") GROUP BY assignee WHERE sprint:active',
    );
    expect(r.type).toBe("text");
    expect(r.text!.length).toBeGreaterThan(0);

    const headers = r.text!.filter((line) => line.startsWith("## "));
    expect(headers.length).toBeGreaterThan(0);

    // Each header should be followed by at least one content line
    for (let i = 0; i < r.text!.length; i++) {
      if (r.text![i].startsWith("## ")) {
        // Next non-empty line should be a content line (assignee: title)
        const nextContent = r.text![i + 1];
        expect(nextContent).toBeDefined();
        expect(nextContent).not.toBe("");
        expect(nextContent).toContain(": ");
      }
    }
  });
});
