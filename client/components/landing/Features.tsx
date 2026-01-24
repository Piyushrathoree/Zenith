"use client";
import React from "react";
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
import { AnimationWrapper } from "../ui/animation-wrapper";

export function Features() {
  return (
    <div className="w-full max-w-7xl mx-auto my-16 md:my-30 mb-10 px-4">
      <div className="md:hidden flex justify-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#F97E2C]/30 text-[#F97E2C] text-sm font-medium font-alan bg-white/50 backdrop-blur-sm">
          <Sun className="w-4 h-4" />
          Start your Day
        </div>
      </div>

      <div className="w-full mx-auto antialiased pt-4 relative px-4 md:px-10 lg:px-20 rounded-2xl md:rounded-[3rem] flex flex-col justify-center shadow-[inset_0_0_80px_rgba(249,126,44,0.08)] mt-8 md:mt-32 pb-10">
        <div className="hidden md:flex absolute top-10 left-10 lg:left-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#F97E2C]/30 text-[#F97E2C] text-sm font-medium font-alan bg-white/50 backdrop-blur-sm">
            <Sun className="w-4 h-4" />
            Start your Day
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 lg:gap-30 items-center mt-8 md:mt-20">
          <AnimationWrapper>
            <h2 className="font-instrument text-4xl md:text-5xl lg:text-7xl font-semibold text-black/90 leading-tight mb-4">
              Start each <br />
              day with <span className="text-[#F97E2C]">clarity</span>
            </h2>
            <p className="font-alan text-base md:text-lg text-black/60 leading-relaxed">
              Plan your day with intention by aligning your goals, prioritizing
              tasks, and setting a realistic workload.
            </p>
          </AnimationWrapper>

          <AnimationWrapper
            delay={0.2}
            className="bg-white rounded-2xl p-4 md:p-6 shadow-xl shadow-black/5 border border-black/5"
          >
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
          </AnimationWrapper>
        </div>

        <AnimationWrapper
          delay={0.4}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-10 justify-evenly mt-8 md:mt-16"
        >
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
        </AnimationWrapper>
      </div>

      <div className="mb-16 md:mb-32 relative">
        <div className="w-full mx-auto antialiased pt-4 relative px-4 md:px-10 lg:px-20 rounded-2xl md:rounded-[3rem] flex flex-col justify-center shadow-[inset_0_0_80px_rgba(249,126,44,0.08)] mt-8 md:mt-32 pb-10">
          <div className="hidden md:flex absolute top-10 left-10 lg:left-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#F97E2C]/30 text-[#F97E2C] text-sm font-medium font-alan bg-white/50 backdrop-blur-sm">
              <Clock className="w-4 h-4" />
              Work through your day
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 lg:gap-30 items-center mt-8 md:mt-20">
            <AnimationWrapper
              delay={0.2}
              className="bg-white rounded-2xl p-4 md:p-6 shadow-xl shadow-black/5 border border-black/5 order-2 lg:order-1"
            >
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
            </AnimationWrapper>

            <AnimationWrapper className="order-1 lg:order-2">
              <h2 className="font-instrument text-4xl md:text-5xl lg:text-7xl font-semibold text-black/90 leading-tight mb-4">
                Stay <span className="text-[#F97E2C]">focused</span> and on{" "}
                <br className="hidden md:block" />
                track all day
              </h2>
              <p className="font-alan text-base md:text-lg text-black/60 leading-relaxed">
                Easily adjust your daily plan without losing focus or taking on
                too much.
              </p>
            </AnimationWrapper>
          </div>

          <AnimationWrapper
            delay={0.4}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-10 justify-evenly mt-8 md:mt-16"
          >
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
          </AnimationWrapper>
        </div>
      </div>

      <div className="mb-16 md:mb-32 relative">
        <div className="w-full mx-auto antialiased pt-4 relative px-4 md:px-10 lg:px-20 rounded-2xl md:rounded-[3rem] flex flex-col justify-center shadow-[inset_0_0_80px_rgba(249,126,44,0.08)] mt-8 md:mt-32 pb-10">
          <div className="hidden md:flex absolute top-10 left-10 lg:left-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#F97E2C]/30 text-[#F97E2C] text-sm font-medium font-alan bg-white/50 backdrop-blur-sm">
              <Moon className="w-4 h-4" />
              End your Day
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 lg:gap-30 items-center mt-8 md:mt-20">
            <AnimationWrapper>
              <h2 className="font-instrument text-4xl md:text-5xl lg:text-7xl font-semibold text-black/90 leading-tight mb-4">
                Reflect and <br />
                end <span className="text-[#F97E2C]">confident</span>
              </h2>
              <p className="font-alan text-base md:text-lg text-black/60 leading-relaxed">
                Review what you accomplished, celebrate your wins, and set
                yourself up for success tomorrow.
              </p>
            </AnimationWrapper>

            <AnimationWrapper
              delay={0.2}
              className="bg-white rounded-2xl p-4 md:p-6 shadow-xl shadow-black/5 border border-black/5"
            >
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
            </AnimationWrapper>
          </div>

          {/* Feature cards row */}
          <AnimationWrapper
            delay={0.4}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-10 justify-evenly mt-8 md:mt-16"
          >
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
          </AnimationWrapper>
        </div>
      </div>

      <div className="text-center pb-10 md:pb-20">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-transparent border border-[#F97E2C]/20 text-[#F97E2C] text-sm font-medium font-alan">
            <Sun className="w-4 h-4" />
            Make every day count
          </div>
        </div>
      </div>
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
    <div className="bg-white rounded-xl p-4 md:p-5 border border-black/5 shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-[#F97E2C]/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="font-alan text-sm md:text-md text-black/70 leading-relaxed">
        {title}
      </p>
    </div>
  );
}
