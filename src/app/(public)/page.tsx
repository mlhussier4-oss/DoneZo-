import Link from "next/link";
import { BadgeCheck, Camera, Check, ClipboardList, Home, MessageSquareLock, ThumbsUp, Wrench } from "lucide-react";
import { CategoryIcon } from "@/components/brand/category-icon";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { getActiveCategories } from "@/lib/data/categories";

export default async function HomePage() {
  const categories = await getActiveCategories();

  return (
    <>
      {/* Hero */}
      <section className="bg-primary text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white ring-1 ring-white/20"><span className="size-2 rounded-full bg-cta" aria-hidden />Now serving the Austin, TX area</p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">{brand.tagline}</h1>
            <p className="max-w-xl text-lg text-white/80">
              Snap a photo, describe the job, and local pros send you their best price. No calling around, and no card
              needed to get quotes.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/post-job" className={buttonVariants({ variant: "accent", size: "lg" })}>
                Post a job
              </Link>
              <Link href="/for-providers" className={buttonVariants({ variant: "onDark", size: "lg" })}>
                I&apos;m a service provider
              </Link>
            </div>
          </div>
          <ol className="grid gap-3">
            {[
              { icon: Camera, title: "Post a job", text: "Pick a service, add photos and a short description. About a minute." },
              { icon: ClipboardList, title: "Receive bids", text: "Local providers send private quotes. Compare price, reviews and availability." },
              { icon: ThumbsUp, title: "Choose your provider", text: "Accept the bid you like. Pay after the work is done." },
            ].map((step, i) => (
              <li key={step.title} className="flex gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cta text-cta-foreground">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold">
                    {i + 1}. {step.title}
                  </p>
                  <p className="text-sm text-white/70">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why DoneZo: quick summary for both sides (owner request 2026-11-12) */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6" aria-labelledby="why-donezo">
        <h2 id="why-donezo" className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Home services, minus the hassle</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
          DoneZo connects homeowners with local pros: fast for the people who need work done, fair for the people who do it.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {[
            {
              icon: Home,
              title: "For homeowners",
              lead: "Get real prices from local pros in minutes, without the phone tag.",
              points: [
                "Post a job in about a minute: snap a few photos and answer a few quick questions",
                "Watch bids arrive live on your dashboard and compare price, reviews and availability",
                "No flood of calls, texts and sales pitches: pros can't message you until you pick one",
                "Pick the one you like; your pro confirms the job and arrival time within minutes",
                "No card to get quotes, and your address stays private until a pro commits",
                "Pay after the work is done, and set up repeat visits with the same pro",
              ],
              cta: { href: "/post-job", label: "Post a job, it's free", variant: "accent" as const },
            },
            {
              icon: Wrench,
              title: "For service pros",
              lead: "Find new customers near you and run your whole business from one place.",
              points: [
                "Local jobs with photos and details, sent to your job board as they're posted",
                "No paying per lead: bid only on the jobs you want, at your price",
                "Sealed bids, so you compete on your own terms",
                "Schedule, invoice and take card payments; cash, Venmo, Cash App and check carry no DoneZo fee",
                "Simple monthly plans from $9.99, cancel any time",
              ],
              cta: { href: "/for-providers", label: "See plans for pros", variant: "primary" as const },
            },
          ].map((side) => (
            <div key={side.title} className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-cta"><side.icon className="size-6" aria-hidden /></span>
                <h3 className="text-xl font-semibold">{side.title}</h3>
              </div>
              <p className="mt-3 font-medium">{side.lead}</p>
              <ul className="mt-4 flex-1 space-y-2.5">
                {side.points.map((p) => (
                  <li key={p} className="flex gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Link href={side.cta.href} className={buttonVariants({ variant: side.cta.variant, size: "lg", className: "mt-6 w-full" })}>{side.cta.label}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* No back-and-forth (owner request 2026-11-12), in DoneZo's own voice */}
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="rounded-xl bg-primary px-6 py-8 text-center text-white sm:px-10">
          <p className="text-xl font-semibold text-balance sm:text-2xl">No phone tag. No inbox full of sales pitches. No back-and-forth.</p>
          <p className="mx-auto mt-2 max-w-2xl text-white/80">Post your job once, compare the bids in one place, and pick the pro you want. That&apos;s it, done.</p>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">What do you need done?</h2>
        <p className="mt-1 text-muted-foreground">Choose a service to get started.</p>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/post-job?category=${c.slug}`}
                className="flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary hover:bg-primary-soft"
              >
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-cta">
                  <CategoryIcon name={c.icon} className="size-6" />
                </span>
                <span className="font-semibold">{c.name}</span>
                {c.description ? <span className="text-sm text-muted-foreground">{c.description}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Trust */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:grid-cols-3 sm:px-6">
          {[
            { icon: MessageSquareLock, title: "Your details stay private", text: "Providers see your ZIP code, not your address, until you accept a bid." },
            { icon: BadgeCheck, title: "Real reviews only", text: "Reviews come from completed jobs. Ratings can't be bought." },
            { icon: ThumbsUp, title: "No card to get quotes", text: "You only pay when the job is done, at the price you agreed." },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <item.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Provider CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-4 rounded-lg border border-border border-l-4 border-l-primary bg-card p-8 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Run a home-service business?</h2>
            <p className="mt-1 text-muted-foreground">
              Manage customers, schedules and invoices in one place. Bidding on new jobs is optional.
            </p>
          </div>
          <Link
            href="/for-providers"
            className={buttonVariants({ size: "lg" })}
          >
            See provider options
          </Link>
        </div>
      </section>
    </>
  );
}
