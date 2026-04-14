#!/usr/bin/env npx tsx
/**
 * One-time migration script: Rename TRK project key to STRY
 * and update all display IDs from TRK-N to STRY-N.
 *
 * Usage:
 *   source .env.local && npx tsx scripts/rename-to-stori.ts
 *
 * What it does:
 *   1. Renames the TRK project key to STRY
 *   2. Updates all work item displayIds from TRK-N to STRY-N
 *   3. Updates all API keys from trk_ prefix to str_ prefix
 *   4. Reports what was changed
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set. Run: source .env.local && npx tsx scripts/rename-to-stori.ts");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  console.log("🔄 Renaming TRK → STRY in database...\n");

  // 1. Rename project key
  const projectResult = await sql`
    UPDATE projects SET key = 'STRY', updated_at = ${new Date().toISOString()}
    WHERE key = 'TRK'
    RETURNING id, name, key
  `;
  if (projectResult.length > 0) {
    console.log(`✅ Project key: TRK → STRY (project: ${projectResult[0].name})`);
  } else {
    console.log("⚠ No project with key TRK found");
  }

  // 2. Update all display IDs
  const displayIdResult = await sql`
    UPDATE work_items SET display_id = REPLACE(display_id, 'TRK-', 'STRY-')
    WHERE display_id LIKE 'TRK-%'
    RETURNING id, display_id
  `;
  console.log(`✅ Display IDs: ${displayIdResult.length} work items updated (TRK-N → STRY-N)`);

  // 3. Update API key prefixes (trk_ → str_)
  // API keys are stored as hashes, but the keyPrefix column stores the visible prefix
  const keyPrefixResult = await sql`
    UPDATE api_keys SET key_prefix = REPLACE(key_prefix, 'trk_', 'str_')
    WHERE key_prefix LIKE 'trk_%'
    RETURNING id, key_prefix
  `;
  console.log(`✅ API key prefixes: ${keyPrefixResult.length} keys updated (trk_ → str_)`);

  // Note: The actual raw keys stored in device_codes.api_key are temporary
  // and get cleared after polling. No need to update those.

  // 4. Update status_history entries that reference display IDs
  // (These are just text, won't break anything if not updated, but nice to have)

  // 5. Summary
  console.log("\n📊 Summary:");
  console.log(`   Projects renamed: ${projectResult.length}`);
  console.log(`   Display IDs updated: ${displayIdResult.length}`);
  console.log(`   API key prefixes updated: ${keyPrefixResult.length}`);
  console.log("\n✅ Done. The project is now STRY with display IDs like STRY-1, STRY-2, etc.");
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
