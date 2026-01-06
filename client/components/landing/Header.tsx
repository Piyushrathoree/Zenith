import React from "react";
import { Button } from "../ui/button";
import Link from "next/link";
import Image from "next/image";
import { Target } from "lucide-react";

const Header = () => {
  return (
    <>
      <header className="z-100 h-[70px] flex items-center justify-between px-[15%] ">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-black text-white group-hover:bg-[#F97E2C] transition-colors duration-300">
            <Target className="w-4 h-4" />
          </div>
          <span className="font-instrument text-xl font-medium tracking-tight text-black group-hover:text-[#F97E2C] transition-colors duration-300">
            Zenith
          </span>
        </Link>
        <div className="flex items-center gap-8 ">
          <div>Features</div>
          <div>How it works</div>
          <div>Testimonials</div>
          <div>Pricing</div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            className="bg-transparent hover:bg-[#F97E2C]/10"
          >
            Login
          </Button>
          <Button className="bg-[#F97E2C] text-white hover:bg-[#F97E2C]/90">
            Start for Free
          </Button>
        </div>
      </header>
    </>
  );
};
;
export default Header;
<p className="font-alan text-lg md:text-xl text-black/60 max-w-xl text-center leading-relaxed -mt-6">
  A beautifully minimal task manager designed to help you stay calm, focused,
  and productive throughout your day.
</p>;