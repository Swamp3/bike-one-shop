import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261029081633 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tridata_order_map" add column if not exists "id_bump" integer not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tridata_order_map" drop column if exists "id_bump";`);
  }

}
