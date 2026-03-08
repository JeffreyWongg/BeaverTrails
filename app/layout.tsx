import type { Metadata } from "next";
import localFont from "next/font/local";
import { Newsreader } from "next/font/google";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import WebXRPolyfillLoader from "@/components/WebXRPolyfill";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "BeaverTrails",
  description:
    "BeaverTrails is a travel assistant that helps you plan your trip to Canada.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased`}
      >
        <WebXRPolyfillLoader />
        <Auth0Provider>
          {children}
        </Auth0Provider>
      </body>
    </html>
  );
}
