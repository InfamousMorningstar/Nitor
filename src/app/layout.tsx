import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/state/theme";
import { RepositoryProvider } from "@/state/RepositoryProvider";
import { SessionProvider } from "@/state/SessionProvider";
import { GlassFilterDefs } from "@/components/glass/GlassFilterDefs";
import { Loader } from "@/components/brand/Loader";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Nitor — habits that tell you why",
  description: "A habit tracker with a forgiving streak and insights that explain your success.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} min-h-full flex flex-col`}
      >
        <ThemeProvider>
          <SessionProvider>
            <RepositoryProvider>
              <GlassFilterDefs />
              <Loader />
              {children}
            </RepositoryProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
