import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WagmiProvider } from "@/components/providers/WagmiProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Property Tycoon - Real Estate Investment Game",
  description: "Build your property portfolio, earn yield, and compete on Mantle Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <WagmiProvider>{children}</WagmiProvider>
      </body>
    </html>
  );
}
