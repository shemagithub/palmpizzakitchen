import PromoCarousel from "@/components/PromoCarousel";
import HomeDealsStrip from "@/components/HomeDealsStrip";
import PalmPickSection from "@/components/PalmPickSection";
import QuickCategories from "@/components/QuickCategories";
import Features from "@/components/Features";
import Categories from "@/components/Categories";
import Bestsellers from "@/components/Bestsellers";
import CombosSides from "@/components/CombosSides";
import Testimonials from "@/components/Testimonials";
import OrderCTA from "@/components/OrderCTA";
import { SEO } from "@/lib/seo";

/** One responsive landing - same sections on phone and large screens */
export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">
        {SEO.name} - pizza delivery in Kigali, Rwanda. {SEO.tagline}
      </h1>
      <PromoCarousel />
      <HomeDealsStrip />
      <PalmPickSection />
      <QuickCategories />
      <Features />
      <Bestsellers />
      <Categories />
      <CombosSides />
      <Testimonials />
      <OrderCTA />
    </>
  );
}
