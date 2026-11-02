import { Module } from "@medusajs/framework/utils"
import TridataSyncModuleService from "./service"

export const TRIDATA_SYNC_MODULE = "tridata_sync"

export default Module(TRIDATA_SYNC_MODULE, {
  service: TridataSyncModuleService,
})
