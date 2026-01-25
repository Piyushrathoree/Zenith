import Header from "@/components/landing/Header";
import { Reveal } from "@/components/ui/reveal";
import Hero from "@/components/landing/Hero";
import CTA from "@/components/landing/CTA";
// import Pricing from "@/components/landing/Pricing";
// import Testimonial from "@/components/landing/Testimonial";
import Footer from "@/components/landing/Footer";
import { Features } from "@/components/landing/Features";
import { Integration } from "@/components/landing/Integration";

const Landing = () => {
  return (
    <div className="relative min-h-screen font-alan w-full px-4 sm:px-6 md:px-[6%] lg:px-[10%] bg-linear-to-br from-[#F97E2C]/5 via-transparent to-[#F97E2C]/10">
      <Header />
      <Reveal width="100%">
        <Hero />
      </Reveal>
      <Reveal width="100%">
        <Features />
      </Reveal>
      <Reveal width="100%">
        <Integration />
      </Reveal>
      <Reveal width="100%">
        <CTA />
      </Reveal>
      <Reveal width="100%">
        <Footer />
      </Reveal>
    </div>
  );
};

export default Landing;
