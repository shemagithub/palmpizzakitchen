import type { SiteSettings } from "@/lib/siteSettings";
import { SEO } from "@/lib/seo";

export type FaqItem = {
  question: string;
  answer: string;
};

export function shopFaqItems(settings: SiteSettings): FaqItem[] {
  const name = settings.company_name || SEO.name;
  const hours = settings.open_hours || "11:00 AM – 11:00 PM";
  const phone = settings.phone || "";
  const address = settings.address || "Kigali, Rwanda";
  const minOrder = settings.min_order || "0";
  const deliveryFee = settings.delivery_fee || "0";
  const whatsapp = settings.social_whatsapp || "";

  return [
    {
      question: `Do you deliver pizza in Kigali?`,
      answer: `Yes. ${name} delivers hot, stone-baked pizza across Kigali. Enter your address at checkout to confirm we cover your area.`,
    },
    {
      question: "What neighborhoods do you cover?",
      answer:
        "We regularly deliver around central Kigali, including areas such as Remera, Kimironko, and Kacyiru. If you are nearby, place an order and we will confirm delivery on the checkout page.",
    },
    {
      question: "How long does delivery take?",
      answer:
        "Most orders arrive in about 30–40 minutes, depending on kitchen volume and your location. You will see timing on the order screen after you pay.",
    },
    {
      question: "What are your opening hours?",
      answer: `We are open ${hours}. Last orders should be placed a little before closing so the kitchen can finish baking.`,
    },
    {
      question: "Is there a minimum order or delivery fee?",
      answer: `Delivery is ${deliveryFee} RWF. The minimum order is ${minOrder} RWF. Exact totals are shown in your cart before you pay.`,
    },
    {
      question: "How do I pay?",
      answer:
        "You can pay securely online at checkout (including mobile money where available). Card and wallet options appear on the payment page.",
    },
    {
      question: "Can I customize a pizza?",
      answer:
        "Open any pizza page, choose size and extras where offered, then add it to your cart. Notes for the kitchen can be added at checkout.",
    },
    {
      question: "How do I get in touch?",
      answer: [
        phone ? `Call or message us on ${phone}.` : null,
        whatsapp ? "WhatsApp is also linked in the site footer." : null,
        `Visit us at ${address}, or use the contact form.`,
      ]
        .filter(Boolean)
        .join(" "),
    },
  ];
}
