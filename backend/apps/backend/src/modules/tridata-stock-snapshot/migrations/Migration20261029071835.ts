import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261029071835 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tridata_stock_snapshot" drop constraint if exists "tridata_stock_snapshot_inventory_item_id_stock_location_id_unique";`);
    this.addSql(`create table if not exists "tridata_stock_snapshot" ("id" text not null, "inventory_item_id" text not null, "stock_location_id" text not null, "variant_id" text null, "sku" text null, "filialname" text not null, "source" text check ("source" in ('branch', 'color_size_branch')) not null, "lagerbestand" real not null default 0, "reserviert" real not null default 0, "bestellt" real not null default 0, "menge_verfuegbar" real not null default 0, "tribike_last_change" text null, "payload_hash" text null, "last_synced_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tridata_stock_snapshot_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tridata_stock_snapshot_deleted_at" ON "tridata_stock_snapshot" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tridata_stock_snapshot_inventory_item_id_stock_location_id_unique" ON "tridata_stock_snapshot" ("inventory_item_id", "stock_location_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "tridata_stock_snapshot" cascade;`);
  }

}
