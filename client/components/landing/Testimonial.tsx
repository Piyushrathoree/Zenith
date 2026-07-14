"use client";
import React from "react";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { AnimationWrapper } from "@/components/ui/animation-wrapper";

/*
  Placeholder testimonials. The names, roles, and quotes below are fictional
  and should be swapped out for real customer testimonials before launch.
*/
type Hue = "work" | "personal" | "health" | "brand";

type TestimonialItem = {
  quote: string;
  name: string;
  role: string;
  hue: Hue;
};

const testimonials: TestimonialItem[] = [
  {
    quote:
      "Zenith is the first planner that made my mornings feel quiet instead of reactive. I open one board, see the day, and get to work.",
    name: "Maya R.",
    role: "Product designer",
    hue: "work",
  },
  {
    quote:
      "I used to live in ten tabs. Now the day board is the only thing open, and I actually finish what I start.",
    name: "Devon K.",
    role: "Indie founder",
    hue: "personal",
  },
  {
    quote:
      "The evening review takes two minutes and saves my next morning. I end the day knowing exactly where I left off.",
    name: "Aria T.",
    role: "Engineering lead",
    hue: "health",
  },
  {
    quote:
      "Planning used to feel like more work. With Zenith it is a calm five minutes before everything else.",
    name: "Ravi S.",
    role: "Freelance writer",
    hue: "brand",
  },
  {
    quote:
      "Focus mode plus one clean board is the whole trick. Less noise, more done, no burnout.",
    name: "Lena M.",
    role: "Design lead",
    hue: "personal",
  },
];

const hueClass: Record<Hue, string> = {
  work: "bg-work-soft text-tag-work",
  personal: "bg-personal-soft text-tag-personal",
  health: "bg-health-soft text-tag-health",
  brand: "bg-brand-soft text-brand",
};

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const testimonialCardClassName =
  "rounded-2xl border border-white/75 bg-white/30 shadow-[0_4px_28px_rgb(0_0_0_/_0.08),inset_0_1px_1px_rgb(255_255_255_/_0.85)] backdrop-blur-2xl backdrop-saturate-200 dark:border-white/15 dark:bg-white/[0.06] dark:shadow-[0_4px_28px_rgb(0_0_0_/_0.32),inset_0_1px_0_rgb(255_255_255_/_0.12)]";

const cardSpring = {
  type: "spring" as const,
  stiffness: 520,
  damping: 32,
  mass: 0.45,
};

const CardContent = ({ item }: { item: TestimonialItem }) => (
  <div className="flex h-full min-h-[15rem] flex-col p-5">
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${hueClass[item.hue]}`}
    >
      <Quote className="h-3.5 w-3.5" />
    </span>
    <p className="mt-3 flex-1 text-xs leading-relaxed text-foreground">
      {item.quote}
    </p>
    <div className="mt-auto flex items-center gap-2.5 border-t border-border/60 pt-3">
      <span
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${hueClass[item.hue]}`}
      >
        {initialsOf(item.name)}
      </span>
      <div>
        <p className="text-xs font-medium text-foreground">{item.name}</p>
        <p className="text-[11px] text-muted-foreground">{item.role}</p>
      </div>
    </div>
  </div>
);

const baseRotate = [-13, -6.5, 0, 6.5, 13];
const baseY = [40, 14, 0, 14, 40];
const baseZ = [10, 20, 30, 20, 10];

export const Testimonial = () => {
  return (
    <section className="w-full overflow-hidden bg-paper py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <AnimationWrapper className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Loved by calm people
          </p>
          <h2 className="mt-3 font-instrument text-3xl md:text-4xl font-semibold text-foreground leading-tight text-shadow-soft">
            Calm words from calm people.
          </h2>
        </AnimationWrapper>

        <AnimationWrapper delay={0.05} duration={0.35}>
          {/* Desktop: fanned, pinned card spread */}
          <div className="relative mt-14 hidden items-start justify-center md:flex">
            {testimonials.map((item, i) => (
              <motion.div
                key={item.name}
                className={`${i === 0 ? "" : "-ml-14"} flex w-64 min-h-[16rem] cursor-default flex-col ${testimonialCardClassName} hover:border-white/90 hover:bg-white/45 hover:shadow-[0_20px_44px_-20px_rgb(0_0_0/0.2)] dark:hover:bg-white/[0.1]`}
                style={{ zIndex: baseZ[i] }}
                initial={false}
                animate={{ rotate: baseRotate[i], y: baseY[i] }}
                whileHover={{ rotate: 0, y: -10, scale: 1.03, zIndex: 60 }}
                transition={cardSpring}
              >
                <CardContent item={item} />
              </motion.div>
            ))}
          </div>

          {/* Mobile: plain straight stack */}
          <div className="mt-10 flex flex-col gap-4 md:hidden">
            {testimonials.map((item) => (
              <div
                key={item.name}
                className={`flex w-full min-h-[14rem] flex-col ${testimonialCardClassName}`}
              >
                <CardContent item={item} />
              </div>
            ))}
          </div>
        </AnimationWrapper>
      </div>
    </section>
  );
};
