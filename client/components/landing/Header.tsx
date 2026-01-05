import React from "react";
import { Button } from "../ui/button";

import Image from "next/image";

const Header = () => {
  return (
    <>
      <header className=" h-[70px] flex items-center justify-between px-[15%] ">
        <div className="flex items-center gap-5">
            <Image src="/assets/zenith.svg" alt="logo" width={100} height={100} />
        </div>
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

export default Header;
