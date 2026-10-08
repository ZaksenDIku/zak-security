import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zak Security",
  description:
    "White-hat security posture dashboard for authorized work. Discover, authorize, observe, verify, prioritize, fix, re-test.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <div className="relative z-10 flex min-h-dvh">
          <div className="hidden md:flex">
            <Sidebar />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
            <footer className="border-t border-line px-6 py-3 text-[11px] text-fg-subtle">
              Zak Security prototype. All findings require recorded evidence. Authorized scope only.
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
