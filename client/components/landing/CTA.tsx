import React from "react";
import { Button } from "../ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const CTA = () => {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 " />

      {/* Decorative blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#F97E2C]/20 blur-3xl rounded-full opacity-30" />

      <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F97E2C]/10 text-[#F97E2C] text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          Start your journey today
        </div>

        {/* Heading */}
        <h2 className="font-instrument text-5xl md:text-6xl lg:text-7xl font-semibold tracking-wide text-black/90 mb-6">
          Ready to Transform <br className="hidden md:block" />
          Your Productivity?
        </h2>

        {/* Subheading */}
        <p className="font-alan text-lg md:text-xl text-black/60 max-w-2xl mx-auto mb-10 leading-relaxed">
          Join thousands of professionals who have already discovered the calm,
          focused way to manage their tasks and achieve their goals.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button className="bg-[#F97E2C] text-white hover:bg-[#F97E2C]/90 text-lg p-6  px-10 rounded-2xl font-alan group">
            Get Started Free
           
          </Button>
          <Button
            variant="outline"
            className="text-lg p-6 px-10 rounded-2xl font-alan border-black/20 "
          >
            Schedule a Demo
          </Button>
        </div>

        {/* Trust indicators */}
        <p className="mt-8 text-sm text-black/40 font-alan">
          No credit card required • Free 14-day trial • Cancel anytime
        </p>
      </div>
    </section>
  );
};

export default CTA;
