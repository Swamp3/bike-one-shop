import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261029071833 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tridata_sync_cursor" drop constraint if exists "tridata_sync_cursor_stream_unique";`);
    this.addSql(`alter table if exists "tridata_product_map" drop constraint if exists "tridata_product_map_artikel_gr_fa_kombi_id_unique";`);
    this.addSql(`alter table if exists "tridata_product_map" drop constraint if exists "tridata_product_map_variant_id_unique";`);
    this.addSql(`alter table if exists "tridata_order_map" drop constraint if exists "tridata_order_map_web_shop_order_id_unique";`);
    this.addSql(`alter table if exists "tridata_order_map" drop constraint if exists "tridata_order_map_order_id_unique";`);
    this.addSql(`create table if not exists "tridata_order_map" ("id" text not null, "order_id" text not null, "web_shop_order_id" integer not null, "upload_status" text check ("upload_status" in ('pending', 'sent', 'failed', 'skipped')) not null default 'pending', "attempts" integer not null default 0, "last_error" text null, "next_attempt_at" timestamptz null, "sent_at" timestamptz null, "bezahlt_sent" boolean not null default false, "paid_sent_at" timestamptz null, "storno_sent_at" timestamptz null, "tribike_state" text null, "state_checked_at" timestamptz null, "last_correlation_id" text null, "payload_hash" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tridata_order_map_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tridata_order_map_deleted_at" ON "tridata_order_map" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tridata_order_map_order_id_unique" ON "tridata_order_map" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tridata_order_map_web_shop_order_id_unique" ON "tridata_order_map" ("web_shop_order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tridata_order_map_upload_status_next_attempt_at" ON "tridata_order_map" ("upload_status", "next_attempt_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "tridata_product_map" ("id" text not null, "variant_id" text not null, "product_id" text not null, "artikel_id" text not null, "artikel_gr_fa_kombi_id" text null, "artikelnummer" text null, "match_key" text not null, "grfa" boolean not null default false, "ean" text null, "payload_hash" text null, "last_synced_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tridata_product_map_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tridata_product_map_deleted_at" ON "tridata_product_map" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tridata_product_map_variant_id_unique" ON "tridata_product_map" ("variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tridata_product_map_artikel_gr_fa_kombi_id_unique" ON "tridata_product_map" ("artikel_gr_fa_kombi_id") WHERE deleted_at IS NULL AND artikel_gr_fa_kombi_id IS NOT NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tridata_product_map_artikel_id" ON "tridata_product_map" ("artikel_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "tridata_sync_cursor" ("id" text not null, "stream" text not null, "last_change" text null, "last_run_at" timestamptz null, "last_success_at" timestamptz null, "last_error" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tridata_sync_cursor_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tridata_sync_cursor_deleted_at" ON "tridata_sync_cursor" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tridata_sync_cursor_stream_unique" ON "tridata_sync_cursor" ("stream") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "tridata_sync_log" ("id" text not null, "direction" text check ("direction" in ('inbound', 'outbound')) not null, "function_name" text not null, "entity_type" text null, "entity_id" text null, "correlation_id" text null, "status" text check ("status" in ('success', 'failed', 'skipped')) not null, "duration_ms" integer null, "error" text null, "summary" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tridata_sync_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tridata_sync_log_deleted_at" ON "tridata_sync_log" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tridata_sync_log_function_name" ON "tridata_sync_log" ("function_name") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tridata_sync_log_status" ON "tridata_sync_log" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tridata_sync_log_entity_type_entity_id" ON "tridata_sync_log" ("entity_type", "entity_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tridata_sync_log_created_at" ON "tridata_sync_log" ("created_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "tridata_order_map" cascade;`);

    this.addSql(`drop table if exists "tridata_product_map" cascade;`);

    this.addSql(`drop table if exists "tridata_sync_cursor" cascade;`);

    this.addSql(`drop table if exists "tridata_sync_log" cascade;`);
  }

}
