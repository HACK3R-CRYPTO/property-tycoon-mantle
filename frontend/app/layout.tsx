import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import ContextProvider from '@/context';

export const metadata: Metadata = {
  title: "Property Tycoon - Real Estate Investment Game",
  description: "Build your property portfolio, earn yield, and compete on Mantle Network",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  // Get the cookie header string - format as "name=value; name2=value2"
  const cookieHeader = cookieStore.getAll()
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ') || null;
  
  return (
    <html lang="en">
      <body>
        <ContextProvider cookies={cookieHeader}>{children}</ContextProvider>
      </body>
    </html>
  );
}
