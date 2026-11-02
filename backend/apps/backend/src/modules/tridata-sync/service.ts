import { MedusaService } from "@medusajs/framework/utils"
import TridataOrderMap from "./models/tridata-order-map"
import TridataProductMap from "./models/tridata-product-map"
import TridataSyncCursor from "./models/tridata-sync-cursor"
import TridataSyncLog from "./models/tridata-sync-log"

class TridataSyncModuleService extends MedusaService({
  TridataProductMap,
  TridataOrderMap,
  TridataSyncLog,
  TridataSyncCursor,
}) {}

export default TridataSyncModuleService
