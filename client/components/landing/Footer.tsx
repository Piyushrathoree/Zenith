import React from "react";
import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { AnimationWrapper } from "../ui/animation-wrapper";

const Footer = () => {
  return (
    <footer className="w-full pt-20 pb-12 overflow-hidden border-t-4 border-white">
      <AnimationWrapper className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col items-center">
        {/* Main Links */}
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 mb-8 font-medium  text-lg text-black/80">
          <Link href="#" className="hover:text-[#F97E2C] transition-colors">
            Product
          </Link>
          <Link href="#" className="hover:text-[#F97E2C] transition-colors">
            About Us
          </Link>
          <Link href="#" className="hover:text-[#F97E2C] transition-colors">
            Pricing
          </Link>
          <Link href="#" className="hover:text-[#F97E2C] transition-colors">
            FAQ
          </Link>
          <Link href="#" className="hover:text-[#F97E2C] transition-colors">
            Contact
          </Link>
          <Link
            href="#"
            className="hover:text-[#F97E2C] transition-colors flex items-center gap-1"
          >
            Twitter <ArrowUpRight className="w-4 h-4" />
          </Link>
          <Link
            href="#"
            className="hover:text-[#F97E2C] transition-colors flex items-center gap-1"
          >
            LinkedIn <ArrowUpRight className="w-4 h-4" />
          </Link>
          <Link
            href="#"
            className="hover:text-[#F97E2C] transition-colors flex items-center gap-1"
          >
            GitHub
            <span className="flex items-center gap-0.5 bg-black/5 px-1.5 py-0.5 rounded-full text-xs font-semibold">
              <Star className="w-3 h-3 fill-current" /> 1.2k
            </span>
          </Link>
        </div>

        {/* Secondary Links */}
        <div className="mb-20">
          <Link
            href="#"
            className="text-sm text-black/40 hover:text-[#F97E2C] font-alan transition-colors"
          >
            Privacy Policy
          </Link>
        </div>

        {/* Big Text */}
        <div className="relative flex justify-center items-center select-none pointer-events-none -mb-16 md:-mb-24 w-full">
          <h1 className="font-alan font-bold text-[31vw] sm:text-[20vw] md:text-[18vw] leading-[0.8] tracking-normal mix-blend-multiply bg-linear-to-b from-black/5 to-[#F97E2C]/20 bg-clip-text text-transparent">
            Zenith
          </h1>
          <div className="absolute inset-0 bg-linear-to-t from-white via-transparent to-transparent h-20 bottom-0 top-auto" />
        </div>
      </AnimationWrapper>
    </footer>
  );
};

export default Footer;
