"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { AnimationWrapper } from "../ui/animation-wrapper";
import { NotionMark } from "@/components/brand/NotionMark";

const integrations = [
  {
    name: "GitHub",
    description: "Issues and pull requests flow into your day board.",
    icon: "/integrations/github.svg",
    iconClassName: "dark:invert",
  },
  {
    name: "Gmail",
    description: "Turn important threads into tasks you can act on.",
    icon: "/integrations/gmail.svg",
    iconClassName: "",
  },
  {
    name: "Notion",
    description: "Pages and docs show up beside everything else.",
    icon: null,
    iconClassName: "",
  },
] as const;

export const Integration = () => {
  return (
    <section
      id="integrations"
      className="mx-auto w-full max-w-6xl border-t border-border bg-background px-6 py-24 md:py-32"
    >
      <AnimationWrapper className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Integrations
        </p>
        <h2 className="mt-3 font-instrument text-3xl font-semibold leading-tight text-foreground text-shadow-soft md:text-4xl">
          Works with the tools you already use.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
          Bring GitHub, Gmail, and Notion into one calm task list — no tab
          hopping, no copy-paste.
        </p>
      </AnimationWrapper>

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-3 md:mt-16">
        {integrations.map((item, i) => (
          <AnimationWrapper key={item.name} delay={0.1 + i * 0.08}>
            <motion.div
              className="group h-full"
              whileHover={{ y: -6 }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 22,
              }}
            >
              <div className="relative flex h-full flex-col items-center overflow-hidden rounded-2xl border border-border bg-card px-6 py-8 text-center shadow-inset-soft transition-shadow duration-300 group-hover:shadow-[inset_0_16px_32px_-18px_rgb(249_126_44_/_0.14),inset_0_1px_0_rgb(255_255_255_/_0.55)] md:px-8 md:py-10">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-20 w-[75%] rounded-full bg-brand/20 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-70"
                />
                <div className="relative z-10 flex h-full flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-inset-soft">
                  {item.icon ? (
                    <Image
                      src={item.icon}
                      alt={`${item.name} logo`}
                      width={56}
                      height={56}
                      className={`h-14 w-14 object-contain ${item.iconClassName}`}
                    />
                  ) : (
                    <NotionMark />
                  )}
                </div>
                <h3 className="mt-5 text-base font-medium text-foreground">
                  {item.name}
                </h3>
                <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
                </div>
              </div>
            </motion.div>
          </AnimationWrapper>
        ))}
      </div>
    </section>
  );
};
