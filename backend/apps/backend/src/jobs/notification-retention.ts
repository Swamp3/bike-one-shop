import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const ACTIVATION_DAYS = 7

/**
 * Medusa stores every sent mail with recipient and full content. The
 * activation mail holds a one-time link (valid 15 minutes) and has no
 * retention duty, so its copies go after 7 days. Order confirmations are
 * business letters (6 years, § 257 HGB) and stay.
 */
export default async function notificationRetention(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const notifications = container.resolve(Modules.NOTIFICATION) as unknown as {
    listNotifications(filters: object, config?: object): Promise<{ id: string }[]>
    deleteNotifications(ids: string[]): Promise<void>
  }
  const cutoff = new Date(Date.now() - ACTIVATION_DAYS * 24 * 60 * 60 * 1000)
  const old = await notifications.listNotifications(
    { template: "account-activation", created_at: { $lt: cutoff } },
    { take: 1000 }
  )
  if (old.length) {
    await notifications.deleteNotifications(old.map((n) => n.id))
  }
  logger.info(`[notification-retention] deleted ${old.length} activation mail copy(ies) older than ${ACTIVATION_DAYS} days`)
}

export const config = {
  name: "notification-retention",
  schedule: "0 4 * * *",
}
