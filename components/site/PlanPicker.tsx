"use client";

import Image from "next/image";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { TrackedLink } from "./TrackedLink";
import { formatINR, type VehicleType } from "@/lib/site";
import { useConfig } from "./ConfigProvider";
import { track } from "@/lib/track";

export function PlanPicker() {
  const { plans } = useConfig();
  const [selected, setSelected] = useState<VehicleType>(plans[0]?.vehicle ?? "hatchback");
  const [showAll, setShowAll] = useState(false);

  const choose = (v: VehicleType) => {
    setSelected(v);
    const plan = plans.find((p) => p.vehicle === v)!;
    track("vehicle_selected", { vehicle: v, location: "picker" });
    track("plan_viewed", { vehicle: v, price: plan.price });
  };

  return (
    <div>
      {/* Vehicle chips — phone only */}
      <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 md:hidden" role="tablist" aria-label="Choose your vehicle">
        {plans.map((p) => (
          <button
            key={p.vehicle}
            role="tab"
            aria-selected={selected === p.vehicle}
            data-active={selected === p.vehicle}
            onClick={() => choose(p.vehicle)}
            className="chip shrink-0 snap-start whitespace-nowrap"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:mt-0 md:grid-cols-3 lg:grid-cols-5">
        {plans.map((p, i) => {
          const visible = showAll || p.vehicle === selected;
          return (
            <article
              key={p.vehicle}
              className={
                "card relative flex-col overflow-hidden md:flex " +
                (visible ? "flex animate-rise " : "hidden ") +
                (p.vehicle === selected && !showAll ? "ring-2 ring-forest-700 md:ring-0" : "")
              }
              style={{ animationDelay: showAll ? `${i * 40}ms` : undefined }}
            >
              {p.popular && (
                <span className="absolute right-3 top-3 z-10 rounded-full bg-sun-400 px-3 py-1 text-xs font-bold text-forest-900">Most popular</span>
              )}
              <div className="relative aspect-[16/10] bg-cream-100">
                <Image src={p.image} alt={`${p.label} — e.g. ${p.examples}`} fill sizes="(min-width:1024px) 230px, (min-width:768px) 33vw, 100vw" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col p-5 lg:p-4 xl:p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-forest-900 lg:text-lg xl:text-xl">{p.label}</h3>
                </div>
                <p className="mt-0.5 text-xs text-ink-600 md:min-h-[2lh]">e.g. {p.examples}</p>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="font-display tabular text-4xl font-extrabold text-forest-900 lg:text-[32px]">{formatINR(p.price)}</span>
                  <span className="text-sm font-medium text-ink-600">/month</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2.5 text-sm text-ink-900">
                  {p.inclusions.map((inc) => (
                    <li key={inc} className="flex gap-2.5">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-leaf-100 text-forest-700">
                        <Icon name="check" className="size-3.5" strokeWidth={2.5} />
                      </span>
                      {inc}
                    </li>
                  ))}
                </ul>
                <TrackedLink
                  href={`/book?vehicle=${p.vehicle}`}
                  event="book_clicked"
                  props={{ location: "plan_card", vehicle: p.vehicle }}
                  className="btn-primary mt-5 w-full whitespace-nowrap !px-4"
                >
                  <span className="md:hidden">Book {p.label} plan</span><span className="hidden md:inline">Book now</span> <Icon name="arrowRight" className="size-[18px]" />
                </TrackedLink>
              </div>
            </article>
          );
        })}
      </div>

      <button
        onClick={() => {
          setShowAll((s) => !s);
          if (!showAll) track("all_plans_expanded");
        }}
        className="btn-outline mt-4 w-full md:hidden"
      >
        {showAll ? "Show selected plan only" : `Compare all ${plans.length} plans`}
        <Icon name="chevronDown" className={"size-5 transition " + (showAll ? "rotate-180" : "")} />
      </button>
      <p className="mt-4 text-center text-sm text-ink-600">
        <Icon name="shield" className="mr-1 inline size-4 align-[-3px] text-forest-700" />
        No hidden charges · Secure payment by Razorpay
      </p>
    </div>
  );
}
