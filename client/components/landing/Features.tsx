"use client";
import React from "react";
import { TracingBeam } from "../ui/tracing-beam";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Bell,
  Coffee,
  ListTodo,
  Target,
  Zap,
  Moon,
  Sun,
} from "lucide-react";

export function Features() {
  return (
    <TracingBeam className="w-full max-w-none my-30 mb-10 pt-px">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#F97E2C]/30 text-[#F97E2C] text-sm font-medium font-alan mb-8 absolute top-1 left-0 pl-8">
        <Sun />
        Start your Day
      </div>
      {/* started here */}
      <div className="w-full mx-auto antialiased pt-4 relative px-10 lg:px-20 rounded-[3rem] flex flex-col justify-center shadow-[inset_0_0_80px_rgba(249,126,44,0.08)] mt-32 pb-10    ">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-30 items-center mt-20 ">
          <div>
            <h2 className="font-instrument text-7xl font-semibold text-black/90 leading-tight mb-4">
              Start each <br />
              day with <span className="text-[#F97E2C]">clarity</span>
            </h2>
            <p className="font-alan text-lg text-black/60 leading-relaxed">
              Plan your day with intention by aligning your goals, <br />
              prioritizing tasks, and setting a realistic workload.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-xl shadow-black/5 border border-black/5">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#F97E2C]/10 p-2 rounded-lg">
                <Calendar className="w-5 h-5 text-[#F97E2C]" />
              </div>
              <div>
                <p className="font-alan font-medium text-black/90">Today</p>
                <p className="font-alan text-sm text-black/50">Calendar</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                "Complete project proposal",
                "Review team feedback",
                "Schedule weekly sync",
              ].map((task, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg"
                >
                  <CheckCircle2
                    className={`w-5 h-5 ${
                      i === 0 ? "text-[#F97E2C]" : "text-black/20"
                    }`}
                  />
                  <span
                    className={`font-alan text-sm ${
                      i === 0 ? "line-through text-black/40" : "text-black/70"
                    }`}
                  >
                    {task}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature cards row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 justify-evenly mt-16 ">
          <FeatureCard
            title="Plan what you need to get done today, without losing focus on tomorrow"
            icon={<ListTodo className="w-5 h-5 text-[#F97E2C]" />}
          />
          <FeatureCard
            title="Visualize and block time for work on your calendar"
            icon={<Calendar className="w-5 h-5 text-[#F97E2C]" />}
          />
          <FeatureCard
            title="Unify your work across your different tools and organize it"
            icon={<Target className="w-5 h-5 text-[#F97E2C]" />}
          />
        </div>
      </div>

      {/* Badge */}
      <div className="absolute top-[790px] left-4 pl-8 flex items-center">
        <BeamConnector />
        <div className="inline-flex items-center -ml-9 gap-2 px-4 py-1.5 rounded-full border border-[#F97E2C]/30 text-[#F97E2C] text-sm font-medium font-alan bg-white/50 backdrop-blur-sm z-10">
          <Clock className="w-4 h-4" />
          Work through your day
        </div>
      </div>
      {/* Section 2: Work Through Your Day */}
      <div className="mb-32 relative">
        <div className="w-full mx-auto antialiased pt-4 relative px-10 lg:px-20 rounded-[3rem] flex flex-col justify-center shadow-[inset_0_0_80px_rgba(249,126,44,0.08)] mt-32 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-30 items-center mt-20">
            {/* Left: Text content */}

            <div className="bg-white rounded-2xl p-6 shadow-xl shadow-black/5 border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F97E2C] to-orange-400 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-alan font-medium text-black/90">
                    Focus Mode
                  </span>
                </div>
                <span className="font-alan text-sm text-black/50">2:30</span>
              </div>
              <div className="p-4 bg-neutral-50 rounded-lg mb-4">
                <p className="font-alan font-medium text-black/80 mb-2">
                  Respond to user feedback
                </p>
                <ul className="space-y-2">
                  {[
                    "Review previous threads",
                    "Create a demo of new approach",
                    "Upload help docs",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-black/60 font-alan"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#F97E2C]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-sm text-black/50 font-alan">
                <p className="font-medium text-black/70 mb-1">
                  Highlights from previous
                </p>
                <p className="text-xs italic">
                  I&apos;m struggling to fit this into workflow. I don&apos;t
                  like the events...
                </p>
              </div>
            </div>
            {/* Right: Task detail preview */}
            <div>
              <h2 className="font-instrument text-7xl font-semibold text-black/90 leading-tight mb-4">
                Stay <span className="text-[#F97E2C]">focused</span> and on{" "}
                <br />
                track all day
              </h2>
              <p className="font-alan text-lg text-black/60 leading-relaxed">
                Easily adjust your daily plan without losing focus or taking on
                too much.
              </p>
            </div>
          </div>

          {/* Feature cards row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 justify-evenly mt-16">
            <FeatureCard
              title="Pull in new tasks or events as you work"
              icon={<ListTodo className="w-5 h-5 text-[#F97E2C]" />}
            />
            <FeatureCard
              title="Mute apps to reduce distractions"
              icon={<Bell className="w-5 h-5 text-[#F97E2C]" />}
            />
            <FeatureCard
              title="Automatic reminders to help you take breaks and maintain energy"
              icon={<Coffee className="w-5 h-5 text-[#F97E2C]" />}
            />
          </div>
        </div>
      </div>

      {/* Badge */}
      <div className="absolute top-[1570px] left-4 pl-8  flex items-center">
        <BeamConnector />
        <div className="inline-flex items-center gap-2 -ml-9 px-4 py-1.5 rounded-full border border-[#F97E2C]/30 text-[#F97E2C] text-sm font-medium font-alan bg-white/50 backdrop-blur-sm z-10">
          <Moon className="w-4 h-4" />
          End your Day
        </div>
      </div>
      {/* Section 3: End Your Day */}
      <div className="mb-32 relative">
        <div className="w-full mx-auto antialiased pt-4 relative px-10 lg:px-20 rounded-[3rem] flex flex-col justify-center shadow-[inset_0_0_80px_rgba(249,126,44,0.08)] mt-32 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-30 items-center mt-20">
            {/* Left: Text content */}
            <div>
              <h2 className="font-instrument text-7xl font-semibold text-black/90 leading-tight mb-4">
                Reflect and <br />
                end <span className="text-[#F97E2C]">confident</span>
              </h2>
              <p className="font-alan text-lg text-black/60 leading-relaxed">
                Review what you accomplished, celebrate your wins, and set
                yourself up for success tomorrow.
              </p>
            </div>

            {/* Right: Daily summary preview */}
            <div className="bg-white rounded-2xl p-6 shadow-xl shadow-black/5 border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F97E2C] to-orange-400 flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-alan font-medium text-black/90">
                    Daily Summary
                  </span>
                </div>
                <span className="font-alan text-sm text-black/50">Today</span>
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-alan text-sm text-green-700">
                    Tasks Completed
                  </span>
                  <span className="font-alan font-medium text-green-700">
                    8/10
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F97E2C]/10 rounded-lg">
                  <span className="font-alan text-sm text-[#F97E2C]">
                    Focus Time
                  </span>
                  <span className="font-alan font-medium text-[#F97E2C]">
                    4h 32m
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="font-alan text-sm text-black/60">
                    Streak
                  </span>
                  <span className="font-alan font-medium text-black/70">
                    🔥 7 days
                  </span>
                </div>
              </div>
              <p className="text-xs text-black/40 font-alan italic">
                Great job today! You completed 80% of your planned tasks.
              </p>
            </div>
          </div>

          {/* Feature cards row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 justify-evenly mt-16">
            <FeatureCard
              title="Review your daily accomplishments and progress"
              icon={<CheckCircle2 className="w-5 h-5 text-[#F97E2C]" />}
            />
            <FeatureCard
              title="Track your focus streaks and productivity patterns"
              icon={<Zap className="w-5 h-5 text-[#F97E2C]" />}
            />
            <FeatureCard
              title="Plan tomorrow before you finish today"
              icon={<Calendar className="w-5 h-5 text-[#F97E2C]" />}
            />
          </div>
        </div>
      </div>

      {/* Final Badge: Make Every Day Count */}
      <div className="text-center pb-20">
        <div className="absolute bottom-18 left-4 pl-8 flex items-center">
          <BeamConnector />
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-transparent border border-[#F97E2C]/20 text-[#F97E2C] text-sm font-medium font-alan -ml-8 -mt-1">
            <Sun className="w-4 h-4" />
            Make every day count
          </div>
        </div>
      </div>
    </TracingBeam>
  );
}

function BeamConnector() {
  return (
    <div className="absolute top-5 -left-[80px] -translate-y-1/2 pointer-events-none">
      {/* Actually, I'll use the exact path from TracingBeam for consistency but adjust coordinates. */}
      <svg
        viewBox="0 0 100 40"
        width="100"
        height="40"
        className="block -mt-[8px]"
      >
        <path
          d="M 80 20 L 21 20 Q 1 20 1 0"
          fill="none"
          stroke="#F97E2C"
          strokeOpacity="0.36"
        />
      </svg>
    </div>
  );
}

function FeatureCard({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-black/5 shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-[#F97E2C]/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="font-alan text-md text-black/70 leading-relaxed">{title}</p>
    </div>
  );
}
