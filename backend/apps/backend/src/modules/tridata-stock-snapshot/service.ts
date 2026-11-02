import { MedusaService } from "@medusajs/framework/utils"
import TridataStockSnapshot from "./models/tridata-stock-snapshot"

class TridataStockSnapshotModuleService extends MedusaService({
  TridataStockSnapshot,
}) {}

export default TridataStockSnapshotModuleService
