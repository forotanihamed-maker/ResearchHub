/* eslint-disable @typescript-eslint/no-explicit-any -- test helper, not app code */
// Usage (TEST database only, never production):
//   set TEST_DATABASE_URL=postgresql://...   (CMD)   |   $env:TEST_DATABASE_URL="..." (PowerShell)
//   npx tsx scripts/verify-ai-schema.ts
if (!process.env.TEST_DATABASE_URL) { console.error("Set TEST_DATABASE_URL to a TEST database first."); process.exit(1); }
import { getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "../src/db/schema";
import { Pool } from "pg";

const NEW = ["issue_reports","error_events","ai_tasks","ai_task_sources","ai_analysis_runs","ai_budget","ai_tool_calls","ai_pending_actions"];
const typeMap: Record<string,string> = { PgSerial:"integer", PgInteger:"integer", PgVarchar:"character varying", PgText:"text", PgTimestamp:"timestamp without time zone", PgEnumColumn:"USER-DEFINED", PgBoolean:"boolean", PgNumeric:"numeric", PgReal:"real", PgJsonb:"jsonb", PgArray:"ARRAY" };

(async () => {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  let problems = 0;
  const tables = Object.values(schema).filter((v:any)=> v && typeof v==="object" && Symbol.for("drizzle:Name") in v) as any[];
  for (const t of tables) {
    const cfg = getTableConfig(t);
    if (!NEW.includes(cfg.name)) continue;
    const { rows } = await pool.query(`select column_name,data_type,is_nullable,column_default,character_maximum_length,numeric_precision,numeric_scale from information_schema.columns where table_name=$1`, [cfg.name]);
    const db = new Map(rows.map((r:any)=>[r.column_name,r]));
    for (const c of cfg.columns) {
      const r:any = db.get(c.name);
      if (!r) { console.log("MISSING COLUMN", cfg.name, c.name); problems++; continue; }
      const exp = typeMap[c.columnType] ?? c.columnType;
      if (exp !== r.data_type) { console.log("TYPE MISMATCH", cfg.name, c.name, exp, r.data_type); problems++; }
      const nullable = r.is_nullable === "YES";
      const wantNullable = !c.notNull;
      if (c.columnType==="PgSerial") continue;
      if (nullable !== wantNullable) { console.log("NULLABILITY MISMATCH", cfg.name, c.name, {schemaNotNull:c.notNull, dbNullable:nullable}); problems++; }
      if ((c as any).length && (c as any).length !== r.character_maximum_length) { console.log("LENGTH MISMATCH", cfg.name, c.name); problems++; }
      if (c.columnType==="PgNumeric") { const s:any=c; if (s.precision!==r.numeric_precision || s.scale!==r.numeric_scale) { console.log("NUMERIC MISMATCH", cfg.name, c.name, s.precision, s.scale, r.numeric_precision, r.numeric_scale); problems++; } }
      if (c.hasDefault && !r.column_default && c.columnType!=="PgSerial") { console.log("DEFAULT MISSING in DB", cfg.name, c.name); problems++; }
      if (!c.hasDefault && r.column_default && c.columnType!=="PgSerial") { console.log("DB HAS EXTRA DEFAULT", cfg.name, c.name, r.column_default); problems++; }
    }
    for (const r of rows) if (!cfg.columns.find((c:any)=>c.name===r.column_name)) { console.log("EXTRA DB COLUMN", cfg.name, r.column_name); problems++; }
    // indexes
    const idx = await pool.query(`select indexname, indexdef from pg_indexes where tablename=$1`, [cfg.name]);
    for (const i of cfg.indexes) {
      const n = (i as any).config.name as string;
      const found = idx.rows.find((x:any)=>x.indexname===n);
      if (!found) { console.log("MISSING INDEX", cfg.name, n); problems++; continue; }
      const uniq = (i as any).config.unique === true;
      if (uniq !== /UNIQUE/.test(found.indexdef)) { console.log("UNIQUE MISMATCH", n); problems++; }
    }
    // foreign keys
    const fk = await pool.query(`select kcu.column_name, ccu.table_name ref_table, rc.delete_rule from information_schema.table_constraints tc join information_schema.key_column_usage kcu on tc.constraint_name=kcu.constraint_name join information_schema.referential_constraints rc on rc.constraint_name=tc.constraint_name join information_schema.constraint_column_usage ccu on ccu.constraint_name=rc.constraint_name where tc.constraint_type='FOREIGN KEY' and tc.table_name=$1`, [cfg.name]);
    for (const f of cfg.foreignKeys) {
      const ref = f.reference(); const col = ref.columns[0].name; const refTable = getTableConfig(ref.foreignTable).name;
      const want = (f.onDelete ?? "no action").toUpperCase();
      const got = fk.rows.find((x:any)=>x.column_name===col);
      if (!got || got.ref_table!==refTable || got.delete_rule.toUpperCase()!==want.replace("_"," ")) { console.log("FK MISMATCH", cfg.name, col, {want, got}); problems++; }
    }
    console.log(`checked ${cfg.name}: ${cfg.columns.length} cols, ${cfg.indexes.length} idx, ${cfg.foreignKeys.length} fk`);
  }
  // enums
  const en = await pool.query(`select t.typname, array_agg(e.enumlabel::text order by e.enumsortorder) labels from pg_type t join pg_enum e on e.enumtypid=t.oid group by 1`);
  const dbEnums = new Map(en.rows.map((r:any)=>[r.typname, r.labels]));
  for (const v of Object.values(schema) as any[]) {
    if (v && typeof v==="function" && v.enumName) {
      const got = dbEnums.get(v.enumName);
      if (!got || JSON.stringify(got)!==JSON.stringify(v.enumValues)) { console.log("ENUM MISMATCH", v.enumName, v.enumValues, got); problems++; }
    }
  }
  console.log(problems===0 ? "SCHEMA == DB for new tables and all enums" : `PROBLEMS: ${problems}`);
  await pool.end();
})();
