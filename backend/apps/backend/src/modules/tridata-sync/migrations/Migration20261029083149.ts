import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261029083149 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tridata_order_map" add column if not exists "medusa_applied_state" text null, add column if not exists "medusa_applied_at" timestamptz null, add column if not exists "medusa_apply_error" text null, add column if not exists "medusa_apply_pending" boolean not null default false, add column if not exists "attention" text null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tridata_order_map_medusa_apply_pending" ON "tridata_order_map" ("medusa_apply_pending") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_tridata_order_map_medusa_apply_pending";`);
    this.addSql(`alter table if exists "tridata_order_map" drop column if exists "medusa_applied_state", drop column if exists "medusa_applied_at", drop column if exists "medusa_apply_error", drop column if exists "medusa_apply_pending", drop column if exists "attention";`);
  }

}
