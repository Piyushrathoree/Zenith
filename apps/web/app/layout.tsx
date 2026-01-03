"use client"; 
import "./globals.css";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import Navbar from "./components/custom/Navbar";
import path from "path";

const dmSans = DM_Sans({ subsets: ["latin"] });


// export const metadata: Metadata = {
//   title: "Zenith",
//   description: "Your personal productivity tool",
// };


import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body className={`${dmSans.className} ${pathname == "/" ? "" : ""} min-h-screen max-w-screen relative overflow-x-hidden`}>
        <img
          src="/bg-blur.svg"
          alt=""
          className="absolute -top-30 -right-90 -z-10 opacity-100 blur-3xl"
        />
        <div className=" min-h-screen z-100">
          {pathname == "/" && <Navbar />}
          {children}
        </div>
      </body>
    </html>
  );
}
