import React from "react";
import Image from "next/image";

const Hero = () => {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-24">
      <h1 className="z-50 mt-40 text-center font-instrument text-8xl font-semibold tracking-wider text-black/90">
        Start Calm <br /> Stay Focused <br /> End Confident
      </h1>
      <div className="flex items-center justify-center">
        <Image
          src="/assets/bg-blur.svg"
          alt="Background Blur"
          width={800}
          height={800}
          className="absolute bottom-90 left-90 blur-3xl z-0"
        />
        <div className="flex h-[76vh] w-[75vw] items-center justify-center rounded-[25px] border bg-neutral-200/50 backdrop-blur-sm">
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
