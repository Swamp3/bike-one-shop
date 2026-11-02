import { Button, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { tridataFetch } from "../lib/tridata-api"

type Action = "mark_sent" | "reupload_with_new_id"

const PROMPTS: Record<Action, { title: string; description: string; confirmText: string }> = {
  mark_sent: {
    title: "Mark as sent?",
    description:
      "Only confirm if you checked in TriBike that the existing order with this WebShopOrderID IS this shop order. It will be treated as uploaded (the paid flag is re-sent if the order is paid).",
    confirmText: "Yes, it is this order",
  },
  reupload_with_new_id: {
    title: "Upload again with a new WebShopOrderID?",
    description:
      "Only do this if the existing TriBike order belongs to something else. A new WebShopOrderID is assigned and the order is uploaded again; TriBike will then have both records.",
    confirmText: "Upload with new ID",
  },
}

/** Buttons for a `conflict` row: confirm-prompted, logged server-side with the admin user id. */
export const TriconResolveConflict = ({ orderId }: { orderId: string }) => {
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const resolve = useMutation({
    mutationFn: (action: Action) =>
      tridataFetch<{
        result: { status: string; web_shop_order_id?: number; error?: string }
      }>(`/orders/${orderId}/resolve`, { method: "POST", body: { action } }),
    onSuccess: (res) => {
      if (res.result.status === "resolved") {
        toast.success(`Resolved (WebShopOrderID ${res.result.web_shop_order_id})`, {
          description: res.result.error,
        })
      } else {
        toast.error(`Not resolved: ${res.result.status}`, { description: res.result.error })
      }
      queryClient.invalidateQueries({ queryKey: ["tridata"] })
    },
    onError: (e: Error) => toast.error("Resolve failed", { description: e.message }),
  })
  const run = async (action: Action) => {
    const confirmed = await prompt({ ...PROMPTS[action], cancelText: "Cancel" })
    if (confirmed) {
      resolve.mutate(action)
    }
  }
  return (
    <div className="flex gap-x-2">
      <Button
        size="small"
        variant="secondary"
        isLoading={resolve.isPending && resolve.variables === "mark_sent"}
        onClick={() => run("mark_sent")}
      >
        Mark sent
      </Button>
      <Button
        size="small"
        variant="secondary"
        isLoading={resolve.isPending && resolve.variables === "reupload_with_new_id"}
        onClick={() => run("reupload_with_new_id")}
      >
        Re-upload, new ID
      </Button>
    </div>
  )
}
