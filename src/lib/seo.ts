import type { Metadata } from "next";
import type { MenuItem } from "@/data/menu";
import {
  minDeliveryFee,
  parseDeliveryAreaFees,
} from "@/lib/deliveryAreas";
import {
  mergeSiteSettings,
  type SiteSettings,
} from "@/lib/siteSettings";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://palmpizzakitchen.com"
).replace(/\/$/, "");

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://backend.palmpizzakitchen.com/api"
).replace(/\/$/, "");

export const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

/** Google Search Console HTML-tag / DNS token */
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
  "NUnQLVDm-a5DRPJyRwYdFcpfk7wj6TBagzuGS5FHrw8";

const TRAILING_SLASH = process.env.CPANEL_STATIC === "1";

export const SEO = {
  name: "Palm Pizza Kitchen",
  tagline: "Hot. Fresh. Delicious.",
  description:
    "Palm Pizza Kitchen — order hot stone-baked pizza, burgers, and combos for delivery in Kigali, Rwanda. Fast delivery across Remera, Kimironko, Kacyiru, and all Kigali.",
  keywords: [
    "Palm Pizza Kitchen",
    "palmpizzakitchen",
    "palmpizzakitchen.com",
    "Palm Pizza Kigali",
    "pizza Kigali",
    "pizza delivery Rwanda",
    "order pizza Kigali",
    "pizza near me Kigali",
    "Palm Pizza",
    "Kigali pizza restaurant",
    "pizza combos Rwanda",
    "fast pizza delivery Kigali",
    "Palm Pizza Kitchen Rwanda",
    "order food Kigali",
  ],
};

export function sitePath(path = "/") {
  if (!path || path === "/") return SITE_URL;
  const clean = path.startsWith("/") ? path : `/${path}`;
  const withSlash =
    TRAILING_SLASH && !clean.endsWith("/") ? `${clean}/` : clean;
  return `${SITE_URL}${withSlash}`;
}

export function absoluteAssetUrl(src?: string | null) {
  const raw = String(src || "").trim();
  if (!raw) return `${SITE_URL}/logo.png`;
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }
  if (raw.startsWith("/uploads/")) return `${API_ORIGIN}${raw}`;
  return `${SITE_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

export async function fetchPublicJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const data = await fetchPublicJson<Record<string, string>>("/settings");
  return mergeSiteSettings(data);
}

export async function fetchMenuItems(): Promise<MenuItem[]> {
  const data = await fetchPublicJson<{ items?: MenuItem[] }>("/menu");
  return data?.items || [];
}

export async function fetchMenuItem(id: string): Promise<MenuItem | null> {
  const data = await fetchPublicJson<{ item?: MenuItem }>(
    `/menu/${encodeURIComponent(id)}`,
  );
  return data?.item || null;
}

export function socialImageUrl(
  src?: string | null,
  size: { width?: number; height?: number } = {},
) {
  const width = size.width || 1200;
  const height = size.height || 630;
  const abs = absoluteAssetUrl(src);
  try {
    const url = new URL(abs);
    if (url.hostname.includes("images.unsplash.com")) {
      url.searchParams.set("auto", "format");
      url.searchParams.set("fit", "crop");
      url.searchParams.set("w", String(width));
      url.searchParams.set("h", String(height));
      url.searchParams.set("q", "70");
      return url.toString();
    }
  } catch {
    /* keep absolute url */
  }
  return abs;
}

export function publicPageMeta(
  title: string,
  description: string,
  path: string,
  options?: { image?: string | null; imageAlt?: string },
): Metadata {
  const url = sitePath(path);
  const fullTitle = `${title} | ${SEO.name}`;
  const image = socialImageUrl(options?.image || "/promo-1.jpg");
  const imageAlt = options?.imageAlt || title;
  return {
    title,
    description,
    keywords: SEO.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: fullTitle,
      description,
      siteName: SEO.name,
      locale: "en_US",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
  };
}

export function privatePageMeta(
  title: string,
  description: string,
): Metadata {
  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  };
}

function openingHours(raw: string) {
  const text = String(raw || "11:00 AM – 11:00 PM");
  const match = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(AM|PM).*?(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i,
  );
  const to24 = (h: string, m: string | undefined, ap: string) => {
    let hour = Number(h);
    const min = m || "00";
    if (/pm/i.test(ap) && hour < 12) hour += 12;
    if (/am/i.test(ap) && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${min}`;
  };
  if (!match) {
    return {
      opens: "11:00",
      closes: "23:00",
    };
  }
  return {
    opens: to24(match[1], match[2], match[3]),
    closes: to24(match[4], match[5], match[6]),
  };
}

/** Schema.org extras Google recommends on Product offers. */
export function merchantReturnPolicyJsonLd() {
  return {
    "@type": "MerchantReturnPolicy",
    url: sitePath("/refund"),
    applicableCountry: "RW",
    returnPolicyCategory:
      "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 1,
    returnFees: "https://schema.org/FreeReturn",
    returnMethod: "https://schema.org/ReturnByMail",
  };
}

export function offerShippingDetailsJsonLd(settings?: SiteSettings) {
  const fallbackFee = Math.max(
    0,
    Math.round(Number(settings?.delivery_fee) || 1500),
  );
  const areaFees = parseDeliveryAreaFees(
    settings?.delivery_area_fees,
    fallbackFee,
  );
  const shippingFee = minDeliveryFee(areaFees, fallbackFee);

  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: String(shippingFee),
      currency: "RWF",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "RW",
      addressRegion: "Kigali",
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 0,
        unitCode: "HUR",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 30,
        maxValue: 60,
        unitCode: "MIN",
      },
    },
  };
}

function offerSchemaExtras(settings?: SiteSettings) {
  return {
    hasMerchantReturnPolicy: merchantReturnPolicyJsonLd(),
    shippingDetails: offerShippingDetailsJsonLd(settings),
  };
}

function menuItemOfferJsonLd(item: MenuItem, settings?: SiteSettings) {
  return {
    "@type": "Offer",
    priceCurrency: "RWF",
    price: String(item.price ?? 0),
    availability: "https://schema.org/InStock",
    ...offerSchemaExtras(settings),
  };
}

export function restaurantJsonLd(
  settings: SiteSettings,
  menuItems: MenuItem[] = [],
) {
  const hours = openingHours(settings.open_hours);
  const logo = absoluteAssetUrl(settings.logo_url || "/logo.png");
  const logoObject = {
    "@type": "ImageObject",
    url: logo,
    width: 512,
    height: 512,
  };
  const menu = menuItems.slice(0, 24).map((item) => ({
    "@type": "MenuItem",
    name: item.name,
    description: item.description,
    image: absoluteAssetUrl(item.image),
    url: sitePath(`/product/${item.id}`),
    offers: menuItemOfferJsonLd(item, settings),
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: settings.company_name || SEO.name,
        url: SITE_URL,
        logo: logoObject,
        image: logo,
        description: settings.about_text || SEO.description,
        email: settings.email,
        telephone: settings.phone,
        address: {
          "@type": "PostalAddress",
          streetAddress: settings.address || "KN 12 Ave",
          addressLocality: "Kigali",
          addressRegion: "Kigali City",
          addressCountry: "RW",
        },
        sameAs: [
          settings.social_instagram,
          settings.social_facebook,
          settings.social_tiktok,
          settings.social_twitter,
          settings.social_whatsapp,
        ].filter((url) => url && /^https?:\/\//i.test(url)),
      },
      {
        "@type": ["Restaurant", "PizzaRestaurant", "LocalBusiness"],
        "@id": `${SITE_URL}/#restaurant`,
        name: settings.company_name || SEO.name,
        image: logo,
        logo: logoObject,
        url: SITE_URL,
        telephone: settings.phone,
        email: settings.email,
        description: settings.about_text || SEO.description,
        servesCuisine: ["Pizza", "Italian", "Burgers", "Fast food"],
        priceRange: "$$",
        parentOrganization: { "@id": `${SITE_URL}/#organization` },
        address: {
          "@type": "PostalAddress",
          streetAddress: settings.address || "KN 12 Ave",
          addressLocality: "Kigali",
          addressCountry: "RW",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: -1.9441,
          longitude: 30.0619,
        },
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
          opens: hours.opens,
          closes: hours.closes,
        },
        hasMenu: {
          "@type": "Menu",
          name: "Palm Pizza Kitchen menu",
          hasMenuSection: {
            "@type": "MenuSection",
            name: "Pizzas, burgers, combos, sides & drinks",
            hasMenuItem: menu,
          },
        },
        acceptsReservations: "False",
        areaServed: {
          "@type": "City",
          name: "Kigali",
          containedInPlace: { "@type": "Country", name: "Rwanda" },
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: settings.company_name || SEO.name,
        description: SEO.description,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${sitePath("/pizzas")}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function productJsonLd(item: MenuItem, settings?: SiteSettings) {
  const photos = [item.image, ...(item.images || [])]
    .map((src) => absoluteAssetUrl(src))
    .filter((src, index, all) => src && all.indexOf(src) === index);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    description: item.description,
    image: photos.length ? photos : absoluteAssetUrl(item.image),
    sku: item.id,
    brand: { "@type": "Brand", name: SEO.name },
    offers: {
      "@type": "Offer",
      url: sitePath(`/product/${item.id}`),
      priceCurrency: "RWF",
      price: String(item.price ?? 0),
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: SEO.name },
      ...offerSchemaExtras(settings),
    },
    aggregateRating:
      item.reviews && item.rating
        ? {
            "@type": "AggregateRating",
            ratingValue: String(item.rating),
            reviewCount: String(item.reviews),
          }
        : undefined,
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(
  crumbs: { name: string; path: string }[],
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: sitePath(crumb.path),
    })),
  };
}

export function aboutPageJsonLd(settings: SiteSettings) {
  const name = settings.company_name || SEO.name;
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${name}`,
    description: settings.about_text || SEO.description,
    url: sitePath("/about"),
    inLanguage: "en",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    mainEntity: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name,
      description: settings.about_text || SEO.description,
      url: SITE_URL,
      logo: absoluteAssetUrl(settings.logo_url),
      foundingLocation: {
        "@type": "Place",
        name: "Kigali, Rwanda",
      },
    },
  };
}

export function contactPageJsonLd(settings: SiteSettings) {
  const name = settings.company_name || SEO.name;
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${name}`,
    description: `Contact ${name} for pizza orders, catering, and questions in Kigali, Rwanda.`,
    url: sitePath("/contact"),
    inLanguage: "en",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    mainEntity: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name,
      url: SITE_URL,
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer service",
          telephone: settings.phone,
          email: settings.email,
          areaServed: "RW",
          availableLanguage: ["English", "French", "Kinyarwanda"],
        },
      ],
      address: {
        "@type": "PostalAddress",
        streetAddress: settings.address || "KN 12 Ave",
        addressLocality: "Kigali",
        addressCountry: "RW",
      },
    },
  };
}

export function itemListJsonLd(
  listName: string,
  path: string,
  items: MenuItem[],
  settings?: SiteSettings,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    url: sitePath(path),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: sitePath(`/product/${item.id}`),
      item: {
        "@type": "Product",
        name: item.name,
        description: item.description,
        image: absoluteAssetUrl(item.image),
        sku: item.id,
        offers: menuItemOfferJsonLd(item, settings),
      },
    })),
  };
}

export function productPageJsonLd(
  item: MenuItem,
  parent: { label: string; path: string },
  settings?: SiteSettings,
) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      productJsonLd(item, settings),
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: parent.label, path: parent.path },
        { name: item.name, path: `/product/${item.id}` },
      ]),
    ],
  };
}

function categoryParent(category: MenuItem["category"]) {
  switch (category) {
    case "side":
      return { label: "Sides", path: "/sides" };
    case "combo":
      return { label: "Combos", path: "/combos" };
    case "drink":
      return { label: "Drinks", path: "/drinks" };
    case "burger":
      return { label: "Burgers", path: "/burgers" };
    default:
      return { label: "Pizzas", path: "/pizzas" };
  }
}

export async function productPageJsonLdForItem(item: MenuItem) {
  const settings = await fetchSiteSettings();
  return productPageJsonLd(item, categoryParent(item.category), settings);
}
