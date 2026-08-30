import {
  categoryLabel,
  itemListPrice,
  type MenuItem,
} from "@/data/menu";

export type PickOccasion = "solo" | "date" | "family" | "party";
export type PickVibe = "classic" | "cheesy" | "veggie" | "meat" | "surprise";
export type PickHunger = "light" | "normal" | "feast";

export type PalmPickAnswers = {
  occasion: PickOccasion;
  vibe: PickVibe;
  hunger: PickHunger;
};

export type PalmPickResult = {
  item: MenuItem;
  score: number;
  matchPercent: number;
  title: string;
  subtitle: string;
  reason: string;
};

const OCCASION_COPY: Record<
  PickOccasion,
  { label: string; hint: string }
> = {
  solo: { label: "Just me", hint: "One person, one plate" },
  date: { label: "Two of us", hint: "Share something nice" },
  family: { label: "Family", hint: "A few mouths to feed" },
  party: { label: "Group", hint: "Friends or office" },
};

const VIBE_COPY: Record<PickVibe, { label: string; hint: string }> = {
  classic: { label: "Classic", hint: "Tomato, cheese, the usual" },
  cheesy: { label: "Cheesy", hint: "Extra melt" },
  veggie: { label: "Veggie", hint: "Greens & freshness" },
  meat: { label: "Meat", hint: "Pepperoni, beef, the works" },
  surprise: { label: "Surprise me", hint: "You pick" },
};

const HUNGER_COPY: Record<PickHunger, { label: string; hint: string }> = {
  light: { label: "Small hunger", hint: "Snack or light meal" },
  normal: { label: "Normal", hint: "Standard dinner" },
  feast: { label: "Very hungry", hint: "Big appetite" },
};

export const PALM_PICK_STEPS = {
  occasions: OCCASION_COPY,
  vibes: VIBE_COPY,
  hungers: HUNGER_COPY,
};

function categoryBoost(category: MenuItem["category"], vibe: PickVibe) {
  if (vibe === "surprise") return 8 + Math.random() * 12;
  const map: Partial<Record<MenuItem["category"], PickVibe>> = {
    classic: "classic",
    cheese: "cheesy",
    veggie: "veggie",
    meat: "meat",
  };
  return map[category] === vibe ? 42 : 0;
}

function suggestionCopy(item: MenuItem, answers: PalmPickAnswers) {
  const name = item.name;
  if (answers.occasion === "date") {
    return {
      title: "Good for two",
      subtitle: name,
      reason: "Easy to share, not too heavy, and always a safe order.",
    };
  }
  if (answers.occasion === "party" || answers.occasion === "family") {
    return {
      title: "Feeds a few",
      subtitle: name,
      reason: "Works when more than one person is reaching for the box.",
    };
  }
  if (item.category === "combo") {
    return {
      title: "Meal deal",
      subtitle: name,
      reason: "Pizza plus sides or a drink in one order.",
    };
  }
  return {
    title: "Tonight's suggestion",
    subtitle: name,
    reason: `Based on what you told us — a solid ${categoryLabel(item.category).toLowerCase()} from today's menu.`,
  };
}

export function scoreMenuItem(item: MenuItem, answers: PalmPickAnswers): number {
  let score = categoryBoost(item.category, answers.vibe);
  score += Number(item.rating || 0) * 6;
  score += Math.min(Number(item.reviews || 0) / 80, 18);
  if (item.badge) score += 12;

  const price = itemListPrice(item);
  if (answers.hunger === "light" && price <= 12000) score += 14;
  if (answers.hunger === "normal" && price > 9000 && price <= 18000) score += 10;
  if (answers.hunger === "feast" && price >= 11000) score += 14;

  if (
    (answers.occasion === "party" || answers.occasion === "family") &&
    item.category === "combo"
  ) {
    score += 28;
  }
  if (answers.occasion === "solo" && item.category !== "combo") score += 8;
  if (
    answers.occasion === "date" &&
    (item.category === "cheese" || item.category === "classic")
  ) {
    score += 16;
  }

  const blob = `${item.name} ${item.description}`.toLowerCase();
  if (answers.vibe === "meat" && /pepperoni|beef|chicken|meat|bbq|spicy/.test(blob)) {
    score += 10;
  }
  if (answers.vibe === "veggie" && /veggie|vegetable|garden|spinach|mushroom/.test(blob)) {
    score += 10;
  }

  return score;
}

export function pickFromMenu(
  items: MenuItem[],
  answers: PalmPickAnswers,
): PalmPickResult | null {
  const pool = items.filter((item) => item.category !== "drink");
  if (!pool.length) return null;

  const ranked = pool
    .map((item) => ({ item, score: scoreMenuItem(item, answers) }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top) return null;

  const copy = suggestionCopy(top.item, answers);

  return {
    item: top.item,
    score: top.score,
    matchPercent: 0,
    ...copy,
  };
}

export function pickAlternatives(
  items: MenuItem[],
  answers: PalmPickAnswers,
  excludeId: string,
  limit = 2,
) {
  return items
    .filter((item) => item.id !== excludeId && item.category !== "drink")
    .map((item) => ({ item, score: scoreMenuItem(item, answers) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.item);
}
