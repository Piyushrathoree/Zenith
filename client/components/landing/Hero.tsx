import React from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import { Sparkles } from "lucide-react";
import { AnimationWrapper } from "../ui/animation-wrapper";

const Hero = () => {
  return (
    <div className="z-50 relative flex min-h-screen flex-col items-center justify-center gap-12 md:gap-24 overflow-hidden pb-20">
      <h1 className="z-50 -mt-30 md:mt-20 text-center font-instrument text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-semibold tracking-wider text-black/90 flex flex-col items-center">
        <AnimationWrapper>
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full bg-[#F97E2C]/10 text-[#F97E2C] text-xs md:text-sm font-medium font-alan tracking-normal mb-4">
            <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
            The calm way to manage your day
          </div>
        </AnimationWrapper>

        <AnimationWrapper delay={0.1}>
          <div className="mt-4 md:mt-0 max-sm:text-6xl">
            Start Calm. <br /> Stay Focused. <br /> End Confident.
          </div>
        </AnimationWrapper>

        <AnimationWrapper delay={0.2}>
          <div className="font-alan tracking-normal flex flex-row items-center justify-center gap-3 mt-6 md:mt-8">
            {" "}
            <Button className="bg-[#F97E2C] text-white hover:bg-[#F97E2C]/90 text-base md:text-lg p-4 px-8 md:p-6 md:px-12 rounded-2xl">
              Get Started
            </Button>{" "}
            <Button
              variant="outline"
              className="text-base md:text-lg p-4 px-8 md:p-6 md:px-12 rounded-2xl"
            >
              Watch Demo
            </Button>
          </div>
        </AnimationWrapper>

        <AnimationWrapper delay={0.3}>
          <p className="mt-5 text-xs md:text-sm text-black/30 font-light font-alan tracking-normal">
            No credit card required • Free 14-day trial • Cancel anytime
          </p>
        </AnimationWrapper>
      </h1>
      <AnimationWrapper
        delay={0.4}
        className="relative w-full px-4 mt-8 md:mt-16 flex flex-col items-center justify-center"
      >
        <div className="absolute -top-10 -left-10 md:-top-20 md:left-[20%] w-32 h-32 md:w-72 md:h-72 bg-[#F97E2C]/20 rounded-full blur-3xl z-0" />
        <div className="absolute -bottom-10 -right-10 md:-bottom-20 md:right-[20%] w-40 h-40 md:w-80 md:h-80 bg-[#F97E2C]/15 rounded-full blur-3xl z-0" />

        <div className="relative w-full max-w-sm md:max-w-4xl lg:max-w-5xl group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#F97E2C]/20 to-orange-200/30 rounded-3xl md:rounded-[40px] transform rotate-3 scale-[1.02] transition-transform duration-500 group-hover:rotate-2 group-hover:scale-[1.03]" />

          <div className="relative bg-white rounded-3xl md:rounded-[40px] p-3 md:p-6 shadow-2xl shadow-black/10 border border-black/5 z-10 transition-transform duration-500 group-hover:-translate-y-1">
            <div className="flex items-center justify-between px-2 md:px-4 pb-2 md:pb-4 mb-2 md:mb-4 border-b border-black/5">
              <div className="flex items-center gap-1.5 md:gap-3">
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#F97E2C]" />
                <span className="text-[10px] md:text-sm font-medium text-black/50 font-alan">
                  Zenith Dashboard
                </span>
              </div>
              <div className="flex gap-1 md:gap-2">
                <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-black/20" />
                <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-black/20" />
                <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-black/20" />
              </div>
            </div>

            <Image
              src="/assets/hero.png"
              alt="Hero Dashboard"
              width={1400}
              height={900}
              quality={100}
              className="rounded-xl md:rounded-3xl w-full h-auto"
            />

            <div className="flex items-center justify-center gap-2 mt-3 md:mt-6 pb-1">
              <div className="w-8 h-1 md:w-20 md:h-1.5 rounded-full bg-black/10" />
            </div>
          </div>
        </div>

        <div className="flex md:hidden justify-center gap-3 mt-6">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full border border-black/5 shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] font-medium text-black/60 font-alan">
              Github
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full border border-black/5 shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F97E2C]" />
            <span className="text-[10px] font-medium text-black/60 font-alan">
              Gmail
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full border border-black/5 shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] font-medium text-black/60 font-alan">
              Notion
            </span>
          </div>
        </div>

        
      </AnimationWrapper>
    </div>
  );
};

export default Hero;
