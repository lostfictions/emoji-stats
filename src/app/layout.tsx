import { Inter_Tight } from "next/font/google";

import type { Metadata } from "next";

import "./index.css";

const inter = Inter_Tight({
  weight: "variable",
  subsets: ["latin"],
  display: "auto",
});

export const metadata: Metadata = {
  title: "emoji stats",
};

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
