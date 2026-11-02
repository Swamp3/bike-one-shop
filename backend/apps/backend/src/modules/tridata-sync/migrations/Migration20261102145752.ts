import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261102145752 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tridata_order_map" drop column if exists "payload_hash";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tridata_order_map" add column if not exists "payload_hash" text null;`);
  }

}
