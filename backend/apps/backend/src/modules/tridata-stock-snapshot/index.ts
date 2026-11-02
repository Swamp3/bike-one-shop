import { Module } from "@medusajs/framework/utils"
import TridataStockSnapshotModuleService from "./service"

export const TRIDATA_STOCK_SNAPSHOT_MODULE = "tridata_stock_snapshot"

export default Module(TRIDATA_STOCK_SNAPSHOT_MODULE, {
  service: TridataStockSnapshotModuleService,
})
