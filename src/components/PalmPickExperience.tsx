"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import KitchenPulse from "@/components/KitchenPulse";
import ResolvedMenuImage from "@/components/ResolvedMenuImage";
import { useMenu } from "@/components/MenuProvider";
import {
  comboNeedsChoices,
  formatPrice,
  getEnabledSizes,
  goToProduct,
  itemListPrice,
  productPath,
} from "@/data/menu";
import { addToCart } from "@/lib/cart";
import {
  PALM_PICK_STEPS,
  pickAlternatives,
  pickFromMenu,
  type PalmPickAnswers,
  type PalmPickResult,
  type PickHunger,
  type PickOccasion,
  type PickVibe,
} from "@/lib/palmPick";

type Step = "intro" | "occasion" | "vibe" | "hunger" | "result";

const STEP_ORDER: Step[] = ["intro", "occasion", "vibe", "hunger", "result"];

function OptionCard({
  active,
  title,
  hint,
  onClick,
}: {
  active?: boolean;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-3.5 text-left transition ${
        active
          ? "border-pam-red bg-pam-red/5 text-pam-ink ring-1 ring-pam-red/30"
          : "border-pam-border bg-white text-pam-ink hover:border-pam-red/35"
      }`}
    >
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-0.5 text-xs text-pam-muted">{hint}</p>
    </button>
  );
}

export default function PalmPickExperience({
  onClose,
  compactIntro = false,
}: {
  onClose?: () => void;
  compactIntro?: boolean;
}) {
  const { items, loading } = useMenu();
  const [step, setStep] = useState<Step>(compactIntro ? "occasion" : "intro");
  const [answers, setAnswers] = useState<Partial<PalmPickAnswers>>({});
  const [result, setResult] = useState<PalmPickResult | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const stepIndex = STEP_ORDER.indexOf(step);
  const progress = ((stepIndex + 1) / STEP_ORDER.length) * 100;

  const alternatives = useMemo(() => {
    if (!result) return [];
    return pickAlternatives(items, answers as PalmPickAnswers, result.item.id);
  }, [items, answers, result]);

  const finalize = (next: PalmPickAnswers) => {
    const picked = pickFromMenu(items, next);
    setResult(picked);
    setStep("result");
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
    setAdded(false);
    setStep(compactIntro ? "occasion" : "intro");
  };

  const handleAdd = async () => {
    if (!result) return;
    const item = result.item;
    const sizes = getEnabledSizes(item);
    if (sizes || comboNeedsChoices(item)) {
      goToProduct(item.id);
      return;
    }
    setAdding(true);
    try {
      await addToCart(item, 1);
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="rounded-xl border border-pam-border bg-white">
      <div className="border-b border-pam-border px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-oswald)] text-xl text-pam-ink sm:text-2xl">
              Help me choose
            </h2>
            <p className="mt-1 text-sm text-pam-muted">
              Three questions, one suggestion from today&apos;s menu.
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-pam-border px-3 py-1.5 text-xs font-bold text-pam-muted"
            >
              Close
            </button>
          ) : null}
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-pam-sand">
          <div
            className="h-full rounded-full bg-pam-red transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3">
          <KitchenPulse />
        </div>
      </div>

      <div className="px-5 py-6 sm:px-6">
        {loading && step !== "result" ? (
          <p className="text-sm text-pam-muted">Loading the menu…</p>
        ) : null}

        {step === "intro" && (
          <div className="space-y-5">
            <p className="max-w-lg text-sm leading-relaxed text-pam-muted">
              Not sure what to get? Tell us who you&apos;re feeding and what
              you&apos;re in the mood for — we&apos;ll point you at something
              from the same menu you see everywhere else on the site.
            </p>
            <button
              type="button"
              onClick={() => setStep("occasion")}
              className="w-full rounded-lg bg-pam-red py-3 text-sm font-bold text-white"
            >
              Start
            </button>
          </div>
        )}

        {step === "occasion" && (
          <div className="space-y-4">
            <p className="text-sm text-pam-ink">Who is this for?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.entries(PALM_PICK_STEPS.occasions) as [
                PickOccasion,
                (typeof PALM_PICK_STEPS.occasions)[PickOccasion],
              ][]).map(([key, value]) => (
                <OptionCard
                  key={key}
                  title={value.label}
                  hint={value.hint}
                  active={answers.occasion === key}
                  onClick={() => {
                    setAnswers((prev) => ({ ...prev, occasion: key }));
                    setStep("vibe");
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {step === "vibe" && (
          <div className="space-y-4">
            <p className="text-sm text-pam-ink">What kind of pizza?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.entries(PALM_PICK_STEPS.vibes) as [
                PickVibe,
                (typeof PALM_PICK_STEPS.vibes)[PickVibe],
              ][]).map(([key, value]) => (
                <OptionCard
                  key={key}
                  title={value.label}
                  hint={value.hint}
                  active={answers.vibe === key}
                  onClick={() => {
                    setAnswers((prev) => ({ ...prev, vibe: key }));
                    setStep("hunger");
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep("occasion")}
              className="text-xs font-bold text-pam-muted underline"
            >
              Back
            </button>
          </div>
        )}

        {step === "hunger" && (
          <div className="space-y-4">
            <p className="text-sm text-pam-ink">How hungry?</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.entries(PALM_PICK_STEPS.hungers) as [
                PickHunger,
                (typeof PALM_PICK_STEPS.hungers)[PickHunger],
              ][]).map(([key, value]) => (
                <OptionCard
                  key={key}
                  title={value.label}
                  hint={value.hint}
                  active={answers.hunger === key}
                  onClick={() => {
                    const next = {
                      ...(answers as PalmPickAnswers),
                      hunger: key,
                    };
                    setAnswers(next);
                    finalize(next);
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep("vibe")}
              className="text-xs font-bold text-pam-muted underline"
            >
              Back
            </button>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-5">
            <p className="text-sm font-bold text-pam-ink">{result.title}</p>

            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <div className="relative mx-auto aspect-square w-full max-w-[120px] overflow-hidden rounded-lg border border-pam-border bg-pam-sand">
                <ResolvedMenuImage
                  src={result.item.image}
                  alt={result.item.name}
                  fill
                  className="object-cover"
                  sizes="120px"
                />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink">
                  {result.item.name}
                </h3>
                <p className="mt-2 text-sm text-pam-muted">{result.reason}</p>
                <p className="mt-3 font-[family-name:var(--font-oswald)] text-xl text-pam-ink">
                  {formatPrice(itemListPrice(result.item))}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={adding}
                onClick={() => void handleAdd()}
                className="rounded-lg bg-pam-red px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {added
                  ? "Added"
                  : adding
                    ? "Adding…"
                    : getEnabledSizes(result.item) || comboNeedsChoices(result.item)
                      ? "Choose size & add"
                      : "Add to cart"}
              </button>
              <Link
                href={productPath(result.item.id)}
                className="rounded-lg border border-pam-border px-5 py-2.5 text-sm font-bold text-pam-ink"
              >
                View details
              </Link>
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2.5 text-sm font-bold text-pam-muted underline"
              >
                Try again
              </button>
            </div>

            {alternatives.length ? (
              <div>
                <p className="text-xs text-pam-muted">Also worth a look</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {alternatives.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goToProduct(item.id)}
                      className="rounded-full border border-pam-border bg-pam-sand px-3 py-1.5 text-xs font-bold text-pam-ink"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
