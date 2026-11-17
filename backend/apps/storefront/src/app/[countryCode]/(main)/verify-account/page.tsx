import { Metadata } from "next"
import { Suspense } from "react"

import VerifyAccount from "@modules/account/components/verify-account"

// The URL carries a one-time code: keep it out of search indexes and Referer headers.
export const metadata: Metadata = {
  title: "Konto aktivieren",
  description: "Bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default function VerifyAccountPage() {
  return (
    <div className="w-full flex justify-center px-8 py-12">
      <Suspense
        fallback={
          <p className="text-base-regular text-ui-fg-base">
            Verifying your email...
          </p>
        }
      >
        <VerifyAccount />
      </Suspense>
    </div>
  )
}
