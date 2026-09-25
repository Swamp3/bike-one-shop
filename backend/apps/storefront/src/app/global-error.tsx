"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-gray-500">
            An unexpected error occurred. Please try again.
          </p>
          <button
            className="px-4 py-2 border rounded"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
