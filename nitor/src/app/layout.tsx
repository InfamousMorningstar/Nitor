import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/state/theme";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
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
        className={`${GeistSans.variable} ${GeistMono.variable} ${bricolage.variable} min-h-full flex flex-col`}
      >
        <ThemeProvider>
          {/* RepositoryProvider (Task 8) and GlassFilterDefs (Task 9) will wrap
              {children} here once those tasks land. */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
