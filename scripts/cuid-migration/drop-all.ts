import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const tables = [
  "github_events", "github_automations", "comments", "saved_queries",
  "work_item_links", "status_history", "attachments", "work_item_snapshots",
  "work_items", "sprints", "workflow_states", "project_invites",
  "team_project_access", "team_members", "ip_allowlist", "verified_domains",
  "sso_configurations", "audit_log", "device_codes", "api_keys",
  "projects", "org_roles", "organization_invitations", "organization_members",
  "teams", "organizations", "platform_settings",
  "verificationToken", "session", "account", "user",
];

async function main() {
  for (const t of tables) {
    await sql.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
    console.log(`dropped ${t}`);
  }
  console.log("\nAll tables dropped.");
}

main().catch(console.error);
