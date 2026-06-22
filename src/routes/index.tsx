import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, ArrowRight, Check, Image as ImageIcon, Video, Coins, Clock, Zap, ShieldCheck, Image as LucideImage } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Free AI Image & Video Generator | Auto Seedance" },
      { name: "description", content: "Generate stunning AI images and videos with Auto Seedance. Free AI image generator, AI video maker powered by Seedream 4.5 and Seedance 2.0. Create 4K AI art, cinematic videos with audio. Try free - no credit card needed." },
      { name: "keywords", content: "AI image generator, AI video generator, free AI art, Seedance AI, AI image maker, text to image AI, text to video AI, AI art generator, Kling AI alternative, Sora AI alternative, free AI video maker, AI generated images, 4K AI images" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "google-site-verification", content: "MktAdEwJLh_fCrckaz6WQtpgSdQ1NIw2ZzBrPDD6cKo" },
      { property: "og:title", content: "Auto Seedance - Free AI Image & Video Generator" },
      { property: "og:description", content: "Create stunning AI images and videos for free. Powered by Seedream 4.5 and Seedance 2.0. Generate 4K images, cinematic videos with audio." },
      { property: "og:url", content: "https://autoseedance.site/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://autoseedance.site/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Auto Seedance - AI Image & Video Generator" },
      { name: "twitter:description", content: "Free AI image and video generation. Create 4K art and cinematic videos instantly." },
      { name: "twitter:image", content: "https://autoseedance.site/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://autoseedance.site/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Auto Seedance",
          applicationCategory: "MultimediaApplication",
          description: "Professional AI image and video generation platform powered by advanced models. Create 4K images and cinematic videos from text prompts.",
          url: "https://autoseedance.site/",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "What is Auto Seedance?", acceptedAnswer: { "@type": "Answer", text: "Auto Seedance is a free AI image and video generation platform powered by Seedream 4.5 and Seedance 2.0 models. Generate stunning 4K images and cinematic videos from text prompts." } },
            { "@type": "Question", name: "How does AI image generation work?", acceptedAnswer: { "@type": "Answer", text: "Enter a text prompt describing your desired image, choose a style and size, and the AI generates high-quality 2K or 4K images in seconds. You can also use reference images to guide the output." } },
            { "@type": "Question", name: "How does AI video generation work?", acceptedAnswer: { "@type": "Answer", text: "Describe your video scene with a text prompt, set duration, resolution, and aspect ratio. The AI creates cinematic videos with optional audio in 2-3 minutes." } },
            { "@type": "Question", name: "Is Auto Seedance free to use?", acceptedAnswer: { "@type": "Answer", text: "Yes! Auto Seedance offers 50 free credits every month. Image generation costs 5 credits and video generation costs 30 credits. No credit card required to start." } },
            { "@type": "Question", name: "What AI models does Auto Seedance use?", acceptedAnswer: { "@type": "Answer", text: "Auto Seedance uses Seedream v4.5 for image generation and Seedance 2.0 for video generation, providing professional-quality output." } },
          ],
        }),
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <Features />
      <StatsSection />
      <AIToolsSection />
      <PricingTeaser />
      <ComparisonSection />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative pt-40 pb-28 grid-bg overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Badge variant="outline" className="border-border bg-muted/50 backdrop-blur text-xs">
            <Sparkles className="size-3 mr-1 text-primary" /> AI Image & Video Generation
          </Badge>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-6 font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]"
        >
          Free AI Image & Video
          <br />
          <span className="gradient-text">Generator - Auto Seedance</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          Generate stunning AI images and videos with Auto Seedance. Free AI image generator, AI video maker powered by Seedream 4.5 and Seedance 2.0. Create 4K AI art, cinematic videos with audio.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-9 flex flex-wrap justify-center gap-3"
        >
          <Link to="/signup">
            <Button size="lg" className="btn-gradient text-white border-0 h-12 px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition">
              Start Free
            </Button>
          </Link>
          <Link to="/pricing">
            <Button size="lg" variant="outline" className="h-12 px-6 border-border bg-muted/50 backdrop-blur hover:bg-muted transition">
              View Pricing <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-16 mx-auto max-w-5xl"
        >
          <div className="glass rounded-2xl p-2 glow-purple overflow-hidden">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full rounded-xl aspect-[16/9] object-cover"
              src="https://vcercajwtbjbvjhzivjb.supabase.co/storage/v1/object/sign/uploads/Untitled%20design.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZTVlNzIxOC0yZGFlLTRhNTEtODRkNS0yN2JjNGI0MzQ5MTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1cGxvYWRzL1VudGl0bGVkIGRlc2lnbi5tcDQiLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzgxOTM1Mzg1LCJleHAiOjIwOTcyOTUzODV9.wKr8TxfhrTfRlUzrE2FAI6K9bmmz-5I-ut6i5qVXWtg"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-24 border-t border-border">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="outline" className="border-border bg-muted/50">Features</Badge>
          <h2 className="mt-4 font-display text-4xl font-bold">Powerful AI generation at your fingertips</h2>
          <p className="mt-3 text-muted-foreground">Create professional images and videos with cutting-edge AI models.</p>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.4 }}
          >
            <Card className="glass border-0 p-6 h-full hover:translate-y-[-2px] hover:shadow-lg hover:shadow-primary/10 transition">
              <div className="size-10 rounded-xl btn-gradient grid place-items-center">
                <LucideImage className="size-5 text-white" />
              </div>
              <h3 className="mt-4 font-display font-semibold text-lg">AI Image Generation</h3>
              <p className="mt-1 text-sm text-muted-foreground">Generate stunning 2K/4K images from text prompts using Seedream AI. Multiple styles available.</p>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.05 }}
          >
            <Card className="glass border-0 p-6 h-full hover:translate-y-[-2px] hover:shadow-lg hover:shadow-primary/10 transition">
              <div className="size-10 rounded-xl btn-gradient grid place-items-center">
                <Video className="size-5 text-white" />
              </div>
              <h3 className="mt-4 font-display font-semibold text-lg">AI Video Generation</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create cinematic videos up to 15 seconds with audio using Seedance AI. Text to video or reference to video.</p>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="glass border-0 p-6 h-full hover:translate-y-[-2px] hover:shadow-lg hover:shadow-primary/10 transition relative">
              <Badge className="absolute top-4 right-4 bg-amber-500/20 text-amber-400 border-amber-500/30 border text-xs">Coming Soon</Badge>
              <div className="size-10 rounded-xl btn-gradient grid place-items-center">
                <Zap className="size-5 text-white" />
              </div>
              <h3 className="mt-4 font-display font-semibold text-lg">Bulk Chrome Extension</h3>
              <p className="mt-1 text-sm text-muted-foreground">Automate bulk generation directly in your browser.</p>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: "2K-4K", label: "Resolution" },
    { value: "15s", label: "Max Video" },
    { value: "50+", label: "AI Models" },
    { value: "99.9%", label: "Uptime" },
  ];

  return (
    <section className="py-16 border-t border-border bg-muted/10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-display font-bold gradient-text">{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AIToolsSection() {
  const tools = [
    {
      icon: LucideImage,
      title: "Image Generation",
      desc: "Create stunning AI images from text prompts. Choose from realistic, digital illustration, vector, or icon styles.",
      credits: 5,
      href: "/tools/image",
      features: ["1024x1024 to 4K resolution", "4 style presets", "Realistic or stylized output"],
    },
    {
      icon: Video,
      title: "Video Generation",
      desc: "Generate cinematic AI videos with text prompts. 720p and 1080p resolution with optional audio.",
      credits: 30,
      href: "/tools/video",
      features: ["7-second clips", "Multiple aspect ratios", "AI-generated audio"],
    },
  ];

  return (
    <section id="ai-tools" className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="outline" className="border-border bg-muted/50">AI Tools</Badge>
          <h2 className="mt-4 font-display text-4xl font-bold">Generate with credits, not subscriptions</h2>
          <p className="mt-3 text-muted-foreground">
            Use credits across all AI tools. Start with 50 free credits, no credit card required.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-2 gap-6">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Link to={tool.href}>
                <Card className="glass border-0 p-6 h-full hover:translate-y-[-2px] hover:shadow-lg hover:shadow-primary/10 transition group cursor-pointer glow-purple">
                  <div className="flex items-start justify-between">
                    <div className="size-12 rounded-xl btn-gradient grid place-items-center">
                      <tool.icon className="size-6 text-white" />
                    </div>
                    <Badge className="btn-gradient text-white border-0 flex items-center gap-1">
                      <Coins className="size-3" /> {tool.credits} credits
                    </Badge>
                  </div>

                  <h3 className="mt-4 font-display font-semibold text-xl">{tool.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{tool.desc}</p>

                  <ul className="mt-4 space-y-2">
                    {tool.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="size-4 text-primary shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex items-center text-primary text-sm font-medium group-hover:gap-3 transition-all">
                    <span>Try it now</span>
                    <ArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Credit costs: <span className="font-medium text-foreground">Image 5</span> · <span className="font-medium text-foreground">Video 30</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  const features = [
    "50 free credits to start",
    "AI image & video generation",
    "Multiple styles and resolutions",
    "No credit card required",
  ];
  return (
    <section id="pricing" className="py-24 border-t border-border">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <Badge variant="outline" className="border-border bg-muted/50">Pricing</Badge>
        <h2 className="mt-4 font-display text-4xl font-bold">Start with 50 free credits</h2>
        <p className="mt-3 text-muted-foreground">No credit card required. Upgrade when you need more.</p>
        <Card className="glass border-0 p-8 mt-10 glow-purple text-left">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-display font-semibold text-xl">Free Plan</h3>
              <p className="text-sm text-muted-foreground mt-1">Everything you need to start creating with AI.</p>
            </div>
            <Badge className="btn-gradient text-white border-0">Free</Badge>
          </div>
          <ul className="mt-6 grid sm:grid-cols-2 gap-2 text-sm">
            {features.map((f) => (
              <li key={f} className="flex gap-2"><Check className="size-4 text-primary shrink-0 mt-0.5" />{f}</li>
            ))}
          </ul>
          <Link to="/signup" className="block mt-7">
            <Button size="lg" className="w-full btn-gradient text-white border-0">
              Start Free <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        </Card>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section id="comparison" className="py-24 border-t border-border">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center mb-10">
          <Badge variant="outline" className="border-border bg-muted/50">Comparison</Badge>
          <h2 className="mt-4 font-display text-4xl font-bold">Auto Seedance vs Other AI Tools</h2>
          <p className="mt-3 text-muted-foreground">See how we compare to the leading AI generation platforms.</p>
        </div>
        <Card className="glass border-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Feature</TableHead>
                  <TableHead className="text-center text-primary font-semibold">Auto Seedance</TableHead>
                  <TableHead className="text-center">Kling AI</TableHead>
                  <TableHead className="text-center">Sora</TableHead>
                  <TableHead className="text-center">Runway ML</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Free Tier</TableCell>
                  <TableCell className="text-center text-primary font-semibold">✅ 50 credits/mo</TableCell>
                  <TableCell className="text-center text-muted-foreground">❌</TableCell>
                  <TableCell className="text-center text-muted-foreground">❌</TableCell>
                  <TableCell className="text-center text-muted-foreground">Limited</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Image Generation</TableCell>
                  <TableCell className="text-center text-primary font-semibold">✅ 4K</TableCell>
                  <TableCell className="text-center text-muted-foreground">❌</TableCell>
                  <TableCell className="text-center text-muted-foreground">❌</TableCell>
                  <TableCell className="text-center text-muted-foreground">✅</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Video Generation</TableCell>
                  <TableCell className="text-center text-primary font-semibold">✅ 15s + Audio</TableCell>
                  <TableCell className="text-center text-muted-foreground">✅</TableCell>
                  <TableCell className="text-center text-muted-foreground">✅</TableCell>
                  <TableCell className="text-center text-muted-foreground">✅</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Starting Price</TableCell>
                  <TableCell className="text-center text-primary font-semibold">$14.90/mo</TableCell>
                  <TableCell className="text-center text-muted-foreground">$10+/mo</TableCell>
                  <TableCell className="text-center text-muted-foreground">Waitlist</TableCell>
                  <TableCell className="text-center text-muted-foreground">$12/mo</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">No Watermark</TableCell>
                  <TableCell className="text-center text-primary font-semibold">✅</TableCell>
                  <TableCell className="text-center text-muted-foreground">Paid only</TableCell>
                  <TableCell className="text-center text-muted-foreground">N/A</TableCell>
                  <TableCell className="text-center text-muted-foreground">Paid only</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Reference to Video</TableCell>
                  <TableCell className="text-center text-primary font-semibold">✅</TableCell>
                  <TableCell className="text-center text-muted-foreground">✅</TableCell>
                  <TableCell className="text-center text-muted-foreground">✅</TableCell>
                  <TableCell className="text-center text-muted-foreground">✅</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Audio Generation</TableCell>
                  <TableCell className="text-center text-primary font-semibold">✅</TableCell>
                  <TableCell className="text-center text-muted-foreground">✅</TableCell>
                  <TableCell className="text-center text-muted-foreground">N/A</TableCell>
                  <TableCell className="text-center text-muted-foreground">❌</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </section>
  );
}

export const plans: Array<{
  name: string; price: string; suffix: string; badge: string | null; featured: boolean; features: string[]; cta: string;
}> = [];

function FAQ() {
  const faqs = [
    { q: "What is Auto Seedance?", a: "Auto Seedance is a free AI image and video generation platform powered by Seedream 4.5 and Seedance 2.0 models. Generate stunning 4K images and cinematic videos from text prompts." },
    { q: "How does AI image generation work?", a: "Enter a text prompt describing your desired image, choose a style and size, and the AI generates high-quality 2K or 4K images in seconds. You can also use reference images to guide the output." },
    { q: "How does AI video generation work?", a: "Describe your video scene with a text prompt, set duration, resolution, and aspect ratio. The AI creates cinematic videos with optional audio in 2-3 minutes." },
    { q: "Is Auto Seedance free to use?", a: "Yes! Auto Seedance offers 50 free credits every month. Image generation costs 5 credits and video generation costs 30 credits. No credit card required to start." },
    { q: "What AI models does Auto Seedance use?", a: "Auto Seedance uses Seedream v4.5 for image generation and Seedance 2.0 for video generation, providing professional-quality output." },
  ];
  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <Badge variant="outline" className="border-border bg-muted/50">FAQ</Badge>
          <h2 className="mt-4 font-display text-4xl font-bold">Questions, answered.</h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="border-border">
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-4">
        <div className="glass rounded-3xl p-12 text-center grid-bg">
          <ShieldCheck className="size-10 mx-auto text-primary" />
          <h2 className="mt-4 font-display text-4xl font-bold">Start creating with AI today.</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            50 free credits, no credit card required. Generate images and videos in seconds.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/signup"><Button size="lg" className="btn-gradient text-white border-0 h-12 px-6"><Sparkles className="size-4 mr-2" /> Start Free</Button></Link>
            <Link to="/pricing"><Button size="lg" variant="outline" className="h-12 px-6 border-border bg-muted/50">View Pricing</Button></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
