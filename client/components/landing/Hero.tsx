import React from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import { Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <div className="z-100 relative flex min-h-screen flex-col items-center justify-center gap-24">
      <h1 className="z-50 mt-20 text-center font-instrument text-8xl font-semibold tracking-wider text-black/90">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F97E2C]/10 text-[#F97E2C] text-sm font-medium font-alan tracking-normal">
          <Sparkles className="w-4 h-4" />
          The calm way to manage your day
        </div>{" "}
        <div>
          Start Calm. <br /> Stay Focused. <br /> End Confident.
        </div>
        <div className="font-alan tracking-normal ">
          {" "}
          <Button className="bg-[#F97E2C] text-white hover:bg-[#F97E2C]/90 text-lg p-6 px-12 rounded-2xl">
            Get Started
          </Button>{" "}
          <Button variant="outline" className="text-lg p-6 px-12 rounded-2xl">
            Watch Demo
          </Button>
        </div>
        <p className="mt-5 text-sm text-black/30 font-light font-alan tracking-normal">
          No credit card required • Free 14-day trial • Cancel anytime
        </p>
      </h1>
      <div className="flex items-center justify-center">
        <Image
          src="/assets/bg-blur.svg"
          alt="Background Blur"
          width={800}
          height={800}
          className="absolute bottom-90 left-90 blur-3xl z-0"
        />
        <div className="flex h-[78vh] w-[75vw] items-center justify-center rounded-[25px] border-dashed border-[#F97E2C]/20 border-2 bg-neutral-200/50 backdrop-blur-sm">
          <Image
            src="/assets/hero.png"
            alt="Hero Dashboard"
            width={1400}
            height={1400}
            className="rounded-2xl z-100 shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default Hero;

