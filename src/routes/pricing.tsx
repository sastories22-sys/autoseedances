import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Plan = {
  id: string;
  name: string;
  monthly_credits: number;
  price_monthly_cents: number;
  price_yearly_cents: number;
  features: string[];
  sort_order: number;
};

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — Auto Seedance AI" },
      { name: "description", content: "Simple credit-based pricing for AI text, image, video, and animation generation. Start free, upgrade anytime." },
      { property: "og:title", content: "Pricing — Auto Seedance AI" },
      { property: "og:description", content: "Credit-based plans for AI generation. Free tier included." },
      { property: "og:url", content: "https://autoseedance.site/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://autoseedance.site/pricing" }],
  }),
});

function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (supabase.from as any)("plans").select("*").eq("is_active", true).order("sort_order").then(({ data }: { data: unknown }) => {
      setPlans(((data as Plan[]) ?? []));
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-40 pb-24 grid-bg">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <Badge variant="outline" className="border-border bg-muted/50">Pricing</Badge>
            <h1 className="mt-4 font-display text-5xl font-bold">Credits that scale with you</h1>
            <p className="mt-3 text-muted-foreground">Use credits across all AI tools — text, image, video, and animation.</p>

            <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 p-1">
              <button onClick={() => setYearly(false)} className={`px-4 py-1.5 rounded-full text-sm ${!yearly ? "btn-gradient text-white" : "text-muted-foreground"}`}>Monthly</button>
              <button onClick={() => setYearly(true)} className={`px-4 py-1.5 rounded-full text-sm ${yearly ? "btn-gradient text-white" : "text-muted-foreground"}`}>Yearly <span className="text-xs opacity-80">(save ~17%)</span></button>
            </div>
          </div>

          {loading ? (
            <div className="mt-16 grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {plans.map((p) => {
                const cents = yearly ? p.price_yearly_cents : p.price_monthly_cents;
                const suffix = yearly ? "/yr" : "/mo";
                const highlight = p.id === "pro";
                return (
                  <Card key={p.id} className={`glass border-0 p-6 flex flex-col ${highlight ? "glow-purple ring-1 ring-primary/40" : ""}`}>
                    {highlight && <Badge className="btn-gradient text-white border-0 self-start mb-2">Most popular</Badge>}
                    <h3 className="font-display font-semibold text-xl">{p.name}</h3>
                    <div className="mt-3 text-4xl font-display font-bold">
                      ${(cents / 100).toFixed(0)}<span className="text-sm font-normal text-muted-foreground">{cents === 0 ? "" : suffix}</span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{p.monthly_credits.toLocaleString()} credits / month</div>
                    <ul className="mt-5 space-y-2 text-sm flex-1">
                      {p.features.map((f) => (
                        <li key={f} className="flex gap-2"><Check className="size-4 text-primary shrink-0 mt-0.5" />{f}</li>
                      ))}
                    </ul>
                    <Link to="/auth" className="block mt-6">
                      <Button className={`w-full h-11 ${highlight ? "btn-gradient text-white border-0" : ""}`} variant={highlight ? "default" : "outline"}>
                        {p.id === "free" ? "Start free" : "Get started"} <ArrowRight className="ml-1 size-4" />
                      </Button>
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="mt-12 text-center text-sm text-muted-foreground">
            Credit cost per generation: Text <b className="text-foreground">1</b> · Image <b className="text-foreground">5</b> · Animation <b className="text-foreground">20</b> · Video <b className="text-foreground">30</b>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
