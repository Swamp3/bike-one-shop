"use client"

import { resetOnboardingState } from "@lib/data/onboarding"

const OnboardingCta = ({ orderId }: { orderId: string }) => {
  return (
    <div className="mb-3 flex flex-col items-center gap-2 rounded-xl border border-bo-line bg-bo-surface-2 p-4 text-center">
      <p className="m-0 text-[15px] font-semibold text-bo-ink">
        Deine Testbestellung wurde erfolgreich angelegt!
      </p>
      <p className="m-0 text-[13px] text-bo-ink-muted">
        Du kannst die Einrichtung deines Stores jetzt im Admin abschließen.
      </p>
      <button
        onClick={() => resetOnboardingState(orderId)}
        className="mt-1 rounded border-[1.5px] border-bo-ink bg-bo-ink px-4 py-2 text-[13.5px] font-semibold text-bo-bg hover:border-bo-accent hover:bg-bo-accent hover:text-bo-accent-ink"
      >
        Einrichtung im Admin abschließen
      </button>
    </div>
  )
}

export default OnboardingCta
