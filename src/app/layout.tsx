import { Inter_Tight } from "next/font/google";

import { AUTH_URL } from "~/env";

import type { Metadata } from "next";

import "./index.css";

const inter = Inter_Tight({
  weight: "variable",
  subsets: ["latin"],
  display: "auto",
});

export const metadata: Metadata = {
  title: "emoji stats",
  description: "see what custom emojos are in vogue",
};
if (AUTH_URL) {
  metadata.openGraph = { images: new URL("/og.png", AUTH_URL) };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-900 text-slate-50`}>
        {children}
      </body>
    </html>
  );
}
