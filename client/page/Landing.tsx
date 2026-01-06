import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import CTA from "@/components/landing/CTA";
import Pricing from "@/components/landing/Pricing";
import Testimonial from "@/components/landing/Testimonial";
import Footer from "@/components/landing/Footer";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Features } from "@/components/landing/Features";
import { Integration } from "@/components/landing/Integration";

const Landing = () => {
  return (
    <div className="min-h-screen font-alan w-screen overflow-x-hidden px-[10%] bg-gradient-to-br from-[#F97E2C]/5 via-transparent to-[#F97E2C]/10">
      <BackgroundBeams className="-z-10" />
      <Header />
      <Hero />
      <Features />
      <Integration /> 
      <CTA />
      <Footer />
    </div>
  );
};

export default Landing;
