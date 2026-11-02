import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261029074006 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tridata_order_map" drop constraint if exists "tridata_order_map_upload_status_check";`);

    this.addSql(`alter table if exists "tridata_order_map" add column if not exists "last_attempt_at" timestamptz null;`);
    this.addSql(`alter table if exists "tridata_order_map" add constraint "tridata_order_map_upload_status_check" check("upload_status" in ('pending', 'sent', 'failed', 'skipped', 'conflict'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tridata_order_map" drop constraint if exists "tridata_order_map_upload_status_check";`);

    this.addSql(`alter table if exists "tridata_order_map" drop column if exists "last_attempt_at";`);

    this.addSql(`alter table if exists "tridata_order_map" add constraint "tridata_order_map_upload_status_check" check("upload_status" in ('pending', 'sent', 'failed', 'skipped'));`);
  }

}
