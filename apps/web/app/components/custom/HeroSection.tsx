'use client '

import React from 'react'
import { Button } from '../ui/button';
import { AvatarCircles } from '../ui/avatar-circles';

const HeroSection = () => {
  return (
    <div className="flex justify-between items-center mt-15">
      <div className="flex flex-col justify-start items-start gap-5 w-[40%] ">
        <h1 className="main_text text-6xl font-custom font-black italic ml-3 ">
          {" "}
          Zenith
        </h1>
        <h3 className="text-6xl">
          Start Calm.
          <br /> Stay Focused.
          <br /> End Confident.
        </h3>
        <p className="w-[70%]">
          The only task manager, calendar, and daily planner for modern
          professionals. Eliminate distractions, find flow, and do more
          high-impact work without burning out.The digital daily planner that
          helps you feel calm and stay focused.
        </p>
        <div className="flex gap-5 mt-5 items-center">
          <Button />
          Star Us on Github
        </div>
        <div className="flex gap-5 mt-5 items-center">
          <AvatarCircles />
          <p className="mt-3 w-[60%] text-[13px]">
            Build for new Developers and <br /> Student who want to be
            productive.
          </p>
        </div>
      </div>
      <div>
        {" "}
        <img src="/sunsama.svg" alt="" className="h-165" />
      </div>
    </div>
  );
}

export default HeroSection;