"use client";
import React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { AnimationWrapper } from "@/components/ui/animation-wrapper";

const faqs = [
  {
    question: "Is there a free plan?",
    answer:
      "Yes. Free gives you the day board and daily planner, up to 4 active tasks, and planning for today and tomorrow.",
  },
  {
    question: "What do I get on Pro?",
    answer:
      "Unlimited tasks, planning as far ahead as you like, and all integrations (GitHub, Gmail, Notion). Every new account starts with a 7 day trial.",
  },
  {
    question: "Do I need a credit card to try Pro?",
    answer: "No. The 7 day trial starts with your account, no card needed.",
  },
  {
    question: "Which tools does Zenith connect to?",
    answer:
      "GitHub issues and pull requests, Gmail, and Notion pages, brought into one task list.",
  },
  {
    question: "Is my data private?",
    answer: "Your planning data is yours.",
  },
  {
    question: "What is the focus timer?",
    answer:
      "A built in Pomodoro style timer so you can work on one task at a time.",
  },
];

export const FAQ = () => {
  return (
    <section className="bg-background px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl">
        <AnimationWrapper className="mb-14 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            FAQ
          </p>
          <h2 className="mt-3 font-instrument text-3xl font-normal tracking-tight text-foreground md:text-4xl text-shadow-soft">
            Questions, answered.
          </h2>
        </AnimationWrapper>

        <AnimationWrapper delay={0.1}>
          <Accordion
            type="single"
            collapsible
            className="w-full rounded-2xl border border-border bg-card px-6 shadow-inset-soft"
          >
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.question}
                value={faq.question}
                className="border-b border-border last:border-b-0"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </AnimationWrapper>
      </div>
    </section>
  );
};
