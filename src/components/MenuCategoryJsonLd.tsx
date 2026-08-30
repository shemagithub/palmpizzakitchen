import JsonLd from "@/components/JsonLd";
import { fetchMenuItems, fetchSiteSettings, itemListJsonLd } from "@/lib/seo";
import type { MenuItem } from "@/data/menu";

type Props = {
  title: string;
  path: string;
  category?: MenuItem["category"];
  categories?: MenuItem["category"][];
};

export default async function MenuCategoryJsonLd({
  title,
  path,
  category,
  categories,
}: Props) {
  const [all, settings] = await Promise.all([
    fetchMenuItems(),
    fetchSiteSettings(),
  ]);
  const items = categories?.length
    ? all.filter((item) => categories.includes(item.category))
    : category
      ? all.filter((item) => item.category === category)
      : all;

  if (!items.length) return null;

  return <JsonLd data={itemListJsonLd(title, path, items, settings)} />;
}
