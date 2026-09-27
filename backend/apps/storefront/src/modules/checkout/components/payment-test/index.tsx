import { clx } from "@modules/common/components/ui"

const PaymentTest = ({ className }: { className?: string }) => {
  return (
    <div
      className={clx(
        "inline-flex items-center gap-1.5 rounded-[5px] bg-bo-wait-bg px-2 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wide text-bo-wait",
        className
      )}
    >
      Nur zum Testen — kein echter Zahlungsanbieter aktiv
    </div>
  )
}

export default PaymentTest
