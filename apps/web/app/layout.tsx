import { Geist, Geist_Mono, Manrope, Noto_Serif } from "next/font/google"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils";
import ContextMenuInterceptor from "@/components/ContextMenuInterceptor";
const notoSerifHeading = Noto_Serif({ subsets: ['latin'], variable: '--font-heading' });

const manrope = Manrope({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", manrope.variable, notoSerifHeading.variable)}
    >
      <body>
        <ContextMenuInterceptor />
        <ThemeProvider>
          <main>
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
