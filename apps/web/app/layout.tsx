
import "./globals.css";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import Navbar from "./components/custom/Navbar";

const dmSans = DM_Sans({ subsets: ["latin"] });


export const metadata: Metadata = {
  title: "Zenith",
  description: "Your personal productivity tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.className} px-[15%] min-h-screen max-w-screen relative overflow-x-hidden`}>
        <img
          src="/bg-blur.svg"
          alt=""
          className="absolute -top-30 -right-90 -z-10 opacity-100 blur-3xl"
        />
        <div className=" min-h-screen z-100">
          <Navbar />
          {children}
        </div>
      </body>
    </html>
  );
}
  