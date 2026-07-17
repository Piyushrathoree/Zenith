import type { Metadata } from "next";
import { Instrument_Serif, Alan_Sans } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const alanSans = Alan_Sans({
  variable: "--font-alan",
  subsets: ["latin"],
  weight: ["400", "800"],
});
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Zenith | The calm way to manage your day",
  description: "Start Calm. Stay Focused. End Confident",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "Zenith | The calm way to manage your day",
    description: "Start Calm. Stay Focused. End Confident",
    url: "https://zenith.piyushh.me",
    siteName: "Zenith",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zenith | The calm way to manage your day",
    description: "Start Calm. Stay Focused. End Confident",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
    <head> <Script
  defer
  src="https://t.raah.dev/script.js"
  data-pid="proj_5smmgmdw39by6a0g"
  data-domain="app-zenith-git-main-piyushrathorees-projects.vercel.app"
             strategy="afterInteractive"
/>
    </head>
      <body
        className={`${alanSans.variable} ${instrumentSerif.variable} antialiased font-alan`}
      >
        <Analytics />
        {children}
      </body>
    </html>
  );
}
