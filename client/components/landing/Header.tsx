"use client";
import React, { useState } from "react";
import { Button } from "../ui/button";
import { Menu, X } from "lucide-react";
import Image from "next/image";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="z-100 h-[70px] flex items-center justify-between px-4 md:px-[8%] lg:px-[15%]">
        <div className="flex items-center gap-5">
          <Image src="/assets/logo.svg" alt="logo" width={100} height={100} />
        </div>

        <div className="hidden md:flex items-center gap-8">
          <div>Features</div>
          <div>How it works</div>
          <div>Testimonials</div>
          <div>Pricing</div>
        </div>

        <div className="hidden md:flex items-center gap-1">
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

        <button
          className="md:hidden p-2 hover:bg-[#F97E2C]/10 rounded-lg transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[70px] bg-white z-[120] animate-fade-in border-t border-black/5">
          <div className="flex flex-col items-center gap-6 pt-8 px-6">
            <div className="flex flex-col items-center gap-4 text-lg font-medium text-black/80">
              <div className="py-2 hover:text-[#F97E2C] transition-colors">
                Features
              </div>
              <div className="py-2 hover:text-[#F97E2C] transition-colors">
                How it works
              </div>
              <div className="py-2 hover:text-[#F97E2C] transition-colors">
                Testimonials
              </div>
              <div className="py-2 hover:text-[#F97E2C] transition-colors">
                Pricing
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
              <Button
                variant="ghost"
                className="bg-orange-100/2  0 hover:bg-orange-100/40 w-full"
              >
                Login
              </Button>
              <Button className="bg-[#F97E2C] text-white hover:bg-[#F97E2C]/90 w-full">
                Start for Free
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
