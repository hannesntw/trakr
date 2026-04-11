import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  // Check if session table has the right PK
  const sessSchema = await client.execute("PRAGMA table_info(session)");
  console.log("session columns:");
  for (const col of sessSchema.rows) {
    console.log(`  ${col.name} pk=${col.pk} notnull=${col.notnull} type=${col.type}`);
  }

  // Check user table
  const userSchema = await client.execute("PRAGMA table_info(user)");
  console.log("\nuser columns:");
  for (const col of userSchema.rows) {
    console.log(`  ${col.name} pk=${col.pk} notnull=${col.notnull} type=${col.type}`);
  }

  // Check account table
  const accSchema = await client.execute("PRAGMA table_info(account)");
  console.log("\naccount columns:");
  for (const col of accSchema.rows) {
    console.log(`  ${col.name} pk=${col.pk} notnull=${col.notnull} type=${col.type}`);
  }

  // Try a test query the adapter would do
  try {
    const r = await client.execute({
      sql: 'SELECT "id", "name", "email", "emailVerified", "image" FROM "user" WHERE "user"."email" = ?',
      args: ["test@test.com"],
    });
    console.log("\nAdapter query works, rows:", r.rows.length);
  } catch (e: any) {
    console.log("\nAdapter query failed:", e.message);
  }
}

run().catch(console.error);
