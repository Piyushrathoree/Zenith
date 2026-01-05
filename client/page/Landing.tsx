import Header from '@/components/landing/Header'
import Hero from '@/components/landing/Hero'
import CTA from '@/components/landing/CTA'
import Pricing from '@/components/landing/Pricing'
import Testimonial from '@/components/landing/Testimonial'
import Footer from '@/components/landing/Footer'

const Landing = () => {
  return (
    <div className='bg-[#f8f4ecd8] min-h-screen font-alan w-screen overflow-x-hidden px-[10%]'>
      <Header />
      <Hero />
      <CTA />
      <Pricing />
      <Testimonial />
      <Footer />
    </div>
  )
}

export default Landing