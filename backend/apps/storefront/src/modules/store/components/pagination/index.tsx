"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

export function Pagination({
  page,
  totalPages,
  "data-testid": dataTestid,
}: {
  page: number
  totalPages: number
  "data-testid"?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const goTo = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div
      className="flex items-center justify-center gap-4 pb-1 pt-7"
      data-testid={dataTestid}
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => goTo(page - 1)}
        className="rounded-[7px] border border-bo-line bg-bo-surface px-4 py-2.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← Zurück
      </button>
      <span className="font-mono text-[12px] text-bo-ink-muted">
        Seite {page} von {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => goTo(page + 1)}
        className="rounded-[7px] border border-bo-line bg-bo-surface px-4 py-2.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        Weiter →
      </button>
    </div>
  )
}
