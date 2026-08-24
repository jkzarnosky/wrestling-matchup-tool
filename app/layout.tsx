import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wrestling Matchup Tool",
  description: "Data entry and weekly matchmaking for a youth recreational wrestling league.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
