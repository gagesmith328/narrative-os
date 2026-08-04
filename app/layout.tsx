import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NarrativeOS — Live Memecoin Narrative Radar",
  description:
    "Track emerging token narratives, momentum, liquidity, activity, and paid promotion signals in one live dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
