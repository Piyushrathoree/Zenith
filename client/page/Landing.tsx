import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import { BentoShowcase } from "@/components/landing/BentoShowcase";
import { Features } from "@/components/landing/Features";
import { Rhythm } from "@/components/landing/Rhythm";
import { Integration } from "@/components/landing/Integration";
import { Testimonial } from "@/components/landing/Testimonial";
import { FAQ } from "@/components/landing/FAQ";
import { Pricing } from "@/components/landing/Pricing";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const Landing = () => {
  return (
    <div className="relative min-h-screen w-full bg-muted/50 font-alan text-foreground">
      <Header />
      {/* Framed content column: hairline rails down both sides of the page */}
      <div className="mx-auto w-full max-w-[78rem] border-x border-border bg-background">
        <main>
          <Hero />
          <BentoShowcase />
          <Features />
          <Rhythm />
          <Integration />
          <Testimonial />
          <FAQ />
          <Pricing />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Landing;
