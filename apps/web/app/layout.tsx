import { Geist_Mono, Manrope, Noto_Serif } from "next/font/google";

import "@workspace/ui/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@workspace/ui/lib/utils";
import ContextMenuInterceptor from "@/components/ContextMenuInterceptor";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import { LocaleInitializer } from "@workspace/ui/lib/i18n";
const notoSerifHeading = Noto_Serif({
  subsets: ["latin"],
  variable: "--font-heading",
});

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): ReactNode {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        manrope.variable,
        notoSerifHeading.variable,
      )}
    >
      <body>
        <LocaleInitializer />
        <ContextMenuInterceptor />
        <ThemeProvider>
          <Providers>
            <main>{children}</main>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
