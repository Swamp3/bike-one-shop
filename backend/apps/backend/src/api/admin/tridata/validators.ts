import { z } from "@medusajs/framework/zod"

const pagination = {
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
}

export const AdminTridataSyncLogsQuery = z.object({
  ...pagination,
  function_name: z.string().max(100).optional(),
  status: z.enum(["success", "failed", "skipped"]).optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  entity_id: z.string().max(100).optional(),
})
export type AdminTridataSyncLogsQueryType = z.infer<typeof AdminTridataSyncLogsQuery>

export const AdminTridataOrdersQuery = z.object({
  ...pagination,
  upload_status: z.enum(["pending", "sent", "failed", "skipped", "conflict"]).optional(),
})
export type AdminTridataOrdersQueryType = z.infer<typeof AdminTridataOrdersQuery>

export const AdminTridataStockSnapshotsQuery = z.object({
  ...pagination,
  sku: z.string().max(100).optional(),
  filialname: z.string().max(100).optional(),
})
export type AdminTridataStockSnapshotsQueryType = z.infer<
  typeof AdminTridataStockSnapshotsQuery
>

export const AdminTridataSyncStockBody = z.object({
  force: z.boolean().optional().default(false),
})
export type AdminTridataSyncStockBodyType = z.infer<typeof AdminTridataSyncStockBody>

export const AdminTridataEmptyBody = z.object({}).strict()

export const AdminTridataResolveBody = z.object({
  action: z.enum(["mark_sent", "reupload_with_new_id"]),
})
export type AdminTridataResolveBodyType = z.infer<typeof AdminTridataResolveBody>
