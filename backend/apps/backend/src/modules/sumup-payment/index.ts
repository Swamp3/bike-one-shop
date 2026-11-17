import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import SumupPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [SumupPaymentProviderService],
})
