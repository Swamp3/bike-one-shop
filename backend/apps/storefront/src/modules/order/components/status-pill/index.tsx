import { clx } from "@modules/common/components/ui"
import type { StatusLabel } from "@modules/order/lib/order-status"

/** Status badge shared by the order list and the order details page. */
const StatusPill = ({
  status,
  className,
  ...rest
}: {
  status: StatusLabel
  className?: string
  "data-testid"?: string
}) => (
  <span
    className={clx(
      "whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide",
      status.ok ? "bg-bo-ok-bg text-bo-ok" : "bg-bo-wait-bg text-bo-wait",
      "print:border print:border-black print:bg-transparent print:text-black",
      className
    )}
    {...rest}
  >
    {status.label}
  </span>
)

export default StatusPill
