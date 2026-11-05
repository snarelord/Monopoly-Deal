import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";

config.autoAddCss = false;

const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas-neue" });
const inter = Inter({ weight: "400", subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "[Deal]",
  description: "A MULTIPLAYER PROPERTY CARD GAME",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
