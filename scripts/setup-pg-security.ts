// Set up Postgres security features for TraQL
import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("Set DATABASE_URL"); process.exit(1); }

  const sql = neon(url);

  console.log("Setting up Postgres security for TraQL...\n");

  // 1. Create a read-only role for TraQL queries
  console.log("1. Creating traql_reader role...");
  try {
    await sql`CREATE ROLE traql_reader NOLOGIN`;
  } catch (e: any) {
    if (e.code === "42710") console.log("   (already exists)");
    else throw e;
  }

  // Grant SELECT-only on the tables TraQL needs
  await sql`GRANT SELECT ON work_items, projects, sprints, workflow_states, work_item_links TO traql_reader`;
  console.log("   Granted SELECT on work_items, projects, sprints, workflow_states, work_item_links");

  // 2. Set statement_timeout for the main role (neondb_owner)
  console.log("\n2. Setting statement timeout...");
  await sql`ALTER ROLE neondb_owner SET statement_timeout = '10s'`;
  console.log("   Set 10s statement timeout for neondb_owner");

  // 3. Enable RLS on work_items
  console.log("\n3. Enabling Row Level Security on work_items...");
  await sql`ALTER TABLE work_items ENABLE ROW LEVEL SECURITY`;

  // Create policy: allow all for the owner role (our app uses this role)
  // RLS policies will be enforced when we create a restricted role later
  try {
    await sql`CREATE POLICY work_items_owner_all ON work_items FOR ALL TO neondb_owner USING (true)`;
  } catch (e: any) {
    if (e.code === "42710") console.log("   (policy already exists)");
    else throw e;
  }

  // Force RLS even for table owner (so it applies when we SET ROLE)
  await sql`ALTER TABLE work_items FORCE ROW LEVEL SECURITY`;
  console.log("   RLS enabled and forced on work_items");

  // 4. Create a project-scoped RLS policy for the traql_reader role
  // This will be useful when we implement SET ROLE traql_reader for queries
  try {
    await sql`
      CREATE POLICY traql_project_access ON work_items FOR SELECT TO traql_reader
      USING (
        project_id IN (
          SELECT id FROM projects WHERE visibility = 'public'
        )
      )
    `;
  } catch (e: any) {
    if (e.code === "42710") console.log("   (traql policy already exists)");
    else throw e;
  }
  console.log("   RLS policy: traql_reader can only read public project items");

  // 5. Verify
  console.log("\n--- Verification ---");
  const timeout = await sql`SHOW statement_timeout`;
  console.log(`Statement timeout: ${timeout[0].statement_timeout}`);

  const rls = await sql`SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'work_items'`;
  console.log(`RLS enabled: ${rls[0].relrowsecurity}, forced: ${rls[0].relforcerowsecurity}`);

  const policies = await sql`SELECT policyname, permissive, roles, qual FROM pg_policies WHERE tablename = 'work_items'`;
  for (const p of policies) {
    console.log(`Policy: ${p.policyname} → roles: ${p.roles}, permissive: ${p.permissive}`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
