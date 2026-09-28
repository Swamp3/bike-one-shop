import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { Inter, JetBrains_Mono, Oswald } from "next/font/google"
import { Toaster } from "sonner"
import "styles/globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      data-mode="light"
      className={`${inter.variable} ${oswald.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-bo-bg text-bo-ink font-sans antialiased">
        <main className="relative">{props.children}</main>
        <Toaster
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast:
                "!rounded-lg !border !border-bo-line !bg-bo-ink !text-bo-bg !shadow-lg",
              title: "!font-sans !text-[13.5px] !font-semibold",
            },
          }}
        />
      </body>
    </html>
  )
}
