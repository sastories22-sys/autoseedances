import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ToolNavbar } from "@/components/tools/ToolNavbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/seo/Breadcrumb";
import { Image as ImageIcon, Loader as Loader2, Download, Heart, Trash2, Sparkles, X, Plus, Upload, ZoomIn, Copy, ArrowLeft, Circle as HelpCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/tools/image")({
  component: ImageToolPage,
  head: () => ({
    meta: [
      { title: "Free AI Image Generator — Create AI Art Online | Auto Seedance" },
      { name: "description", content: "Generate stunning AI images for free with Auto Seedance. Text to image AI generator with realistic, anime, 3D, vector, and artistic styles. Up to 4K resolution. 5 credits per image. Start with 50 free credits." },
      { name: "keywords", content: "AI Image Generator, Free AI Image Generator, AI Art Generator, AI Photo Generator, text to image, Seedream AI, ByteDance Seedream, AI Image Editor, AI Image Upscaler, realistic AI images" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-video-preview:-1" },
      { property: "og:title", content: "Free AI Image Generator — Create AI Art Online" },
      { property: "og:description", content: "Generate stunning AI images for free. Multiple styles, up to 4K resolution. 5 credits per image." },
      { property: "og:url", content: "https://autoseedance.site/tools/image" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://autoseedance.site/og-image.png" },
      { property: "og:image:alt", content: "AI Image Generator - Create stunning visuals from text prompts" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Free AI Image Generator — Auto Seedance" },
      { name: "twitter:description", content: "Generate stunning AI images for free. Multiple styles, up to 4K resolution." },
      { name: "twitter:image", content: "https://autoseedance.site/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://autoseedance.site/tools/image" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "AI Image Generation",
          description: "Generate high-quality AI images from text prompts. Choose from realistic, anime, 3D, vector, and artistic styles with resolutions up to 4K.",
          url: "https://autoseedance.site/tools/image",
          provider: { "@type": "Organization", name: "Auto Seedance" },
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", ratingCount: "850" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Auto Seedance Image Generator",
          applicationCategory: "DesignApplication",
          description: "AI-powered image generation tool for creating professional visuals from text descriptions.",
          operatingSystem: "Web Browser",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://autoseedance.site/" },
            { "@type": "ListItem", position: 2, name: "Tools", item: "https://autoseedance.site/tools" },
            { "@type": "ListItem", position: 3, name: "Image Generator", item: "https://autoseedance.site/tools/image" },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "How does the AI image generator work?", acceptedAnswer: { "@type": "Answer", text: "Enter a text prompt describing your desired image, choose a style (realistic, anime, 3D, vector, oil painting, watercolor), select resolution (up to 4K), and click Generate. The AI creates your image in seconds using Seedream AI." } },
            { "@type": "Question", name: "Is the AI image generator free?", acceptedAnswer: { "@type": "Answer", text: "Yes, you start with 50 free credits. Each image costs 5 credits, giving you 10 free images to start. No credit card required." } },
            { "@type": "Question", name: "What image styles are available?", acceptedAnswer: { "@type": "Answer", text: "We offer Realistic Photo, Digital Illustration, Vector Art, 3D Render, Anime/Manga, Oil Painting, and Watercolor styles." } },
            { "@type": "Question", name: "Can I use reference images?", acceptedAnswer: { "@type": "Answer", text: "Yes, upload up to 10 reference images to guide the AI's style and composition. This helps create images that match your creative vision." } },
            { "@type": "Question", name: "What resolutions are supported?", acceptedAnswer: { "@type": "Answer", text: "Auto 2K, Auto 4K, Square HD, Landscape 4:3, and Portrait 4:3. Perfect for social media, print, and digital content." } },
          ],
        }),
      },
    ],
  }),
});

const IMAGE_SIZES = [
  { value: "auto_2K", label: "Auto 2K" },
  { value: "auto_4K", label: "Auto 4K" },
  { value: "square_hd", label: "Square HD" },
  { value: "landscape_4_3", label: "Landscape (4:3)" },
  { value: "portrait_4_3", label: "Portrait (4:3)" },
];

const STYLES = [
  { value: "realistic", label: "Realistic Photo" },
  { value: "illustration", label: "Digital Illustration" },
  { value: "vector", label: "Vector Art" },
  { value: "3d", label: "3D Render" },
  { value: "anime", label: "Anime/Manga" },
  { value: "oil", label: "Oil Painting" },
  { value: "watercolor", label: "Watercolor" },
];

const CREDITS_PER_IMAGE = 5;
const MAX_PROMPT_LENGTH = 4000;
type Generation = Tables<"generations">;

function GeneratingStatus({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startTime]);
  if (elapsed < 30) return <span>Generating your image… ({elapsed}s)</span>;
  if (elapsed < 60) return <span>Almost ready… ({elapsed}s)</span>;
  return <span>Taking longer than usual, please wait… ({elapsed}s)</span>;
}

function ImageToolPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("text");
  const [prompt, setPrompt] = useState("");
  const [selectedSize, setSelectedSize] = useState("auto_2K");
  const [selectedStyle, setSelectedStyle] = useState("realistic");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generateStartRef = useRef<number>(0);

  useEffect(() => {
    // Clear stale generation state on mount - never auto-resume
    setIsGenerating(false);
    setGeneratedImages([]);
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate({ to: "/login", search: { redirect: "/tools/image" } as any, replace: true }); return; }
      setUserId(user.id);
      // Check admin
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
    });
  }, [navigate]);

  async function fetchGenerations(uid: string) {
    const { data } = await supabase.from("generations").select("*").eq("user_id", uid).eq("tool_type", "image").order("created_at", { ascending: false }).limit(30);
    setGenerations((data as Generation[]) ?? []);
  }

  useEffect(() => {
    if (!userId) return;
    fetchGenerations(userId);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [userId]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (referenceImages.length >= 10) { toast.error("Maximum 10 reference images"); return; }
      if (file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)"); return; }
      const reader = new FileReader();
      reader.onload = (ev) => { const b = ev.target?.result as string; if (b) setReferenceImages((prev) => [...prev, b]); };
      reader.readAsDataURL(file);
    });
  }, [referenceImages.length]);

  const addUrl = useCallback(() => {
    if (!urlInput.trim()) return;
    if (referenceImages.length >= 10) { toast.error("Maximum 10 reference images"); return; }
    setReferenceImages((prev) => [...prev, urlInput.trim()]);
    setUrlInput("");
  }, [urlInput, referenceImages.length]);

  const removeImage = useCallback((index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleGenerate = async () => {
    if (isGenerating) return;
    if (!prompt.trim()) { toast.error("Please enter a prompt"); return; }
    if (!userId) { navigate({ to: "/login", replace: true }); return; }

    // Admin check: skip credit checks
    if (!isAdmin) {
      const { data: wallet } = await supabase.from("credit_wallets").select("balance").eq("user_id", userId).maybeSingle();
      if (wallet && wallet.balance < CREDITS_PER_IMAGE) {
        toast.error("Insufficient credits", { action: { label: "Upgrade", onClick: () => window.location.href = "/pricing" } });
        return;
      }
    }

    setIsGenerating(true);
    generateStartRef.current = Date.now();
    setGeneratedImages([]);
    try {
      let creditResult: any = null;
      if (!isAdmin) {
        const { data, error: creditError } = await supabase.rpc("consume_credits", { _tool: "image", _amount: CREDITS_PER_IMAGE });
        if (creditError || !data?.success) throw new Error(data?.error || creditError?.message || "Failed to deduct credits");
        creditResult = data;
      } else {
        creditResult = { success: true, is_admin: true };
      }

      const hasRef = activeTab === "reference" && referenceImages.length > 0;
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt: prompt.trim(),
          image_size: selectedSize || "auto_2K",
          style: selectedStyle || "realistic",
          num_images: 1,
          reference_images: hasRef ? referenceImages : [],
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      // Use the status_url and response_url returned by fal.ai
      const { status_url, response_url } = data;
      console.log("[image] Got status_url:", status_url, "response_url:", response_url);
      let pollCount = 0;

      pollingRef.current = setInterval(async () => {
        pollCount++;
        if (pollCount > 60) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          setIsGenerating(false);
          toast.error("Generation timed out — please try again");
          return;
        }
        try {
          const { data: pollData, error: pollError } = await supabase.functions.invoke("poll-generation", {
            body: { status_url, response_url },
          });
          if (pollError) { console.error("[image] Poll error:", pollError); return; }
          console.log("[image] Poll:", pollCount, pollData?.status);
          if (pollData?.status === "completed") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            if (pollData.image_urls?.length > 0) {
              setGeneratedImages(pollData.image_urls);
              const primaryUrl = pollData.image_urls[0];
              await supabase.from("generations").insert({
                user_id: userId, tool_type: "image", prompt: prompt.trim(),
                settings: { image_size: selectedSize, style: selectedStyle, has_reference_images: hasRef },
                status: "done", result_url: primaryUrl, thumbnail_url: primaryUrl, credits_used: CREDITS_PER_IMAGE,
              });
              fetchGenerations(userId);
            }
            setIsGenerating(false);
          }
          if (pollData?.status === "failed") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setIsGenerating(false);
            toast.error(pollData?.error || "Generation failed — please try again");
          }
        } catch (e) {
          console.error("[image] Poll error:", e);
        }
      }, 4000);
    } catch (e: unknown) {
      setIsGenerating(false);
      toast.error(e instanceof Error ? e.message : "Generation failed");
    }
  };

  async function toggleFavorite(id: string, current: boolean) {
    await supabase.from("generations").update({ is_favorite: !current }).eq("id", id);
    if (userId) fetchGenerations(userId);
  }

  async function deleteGeneration(id: string) {
    await supabase.from("generations").delete().eq("id", id);
    if (userId) fetchGenerations(userId);
  }

  if (!userId) return null;

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Tools", url: "/tools" },
    { name: "Image Generator", url: "/tools/image" },
  ];

  return (
    <div className="min-h-screen bg-background pt-14">
      <ToolNavbar title="Image Generation" />
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <Breadcrumb items={breadcrumbs} className="mb-4" />
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition"><ArrowLeft className="size-5" /></Link>
          <div className="size-10 rounded-xl btn-gradient grid place-items-center"><ImageIcon className="size-5 text-white" /></div>
          <div>
            <h1 className="font-display text-3xl font-bold">Free AI Image Generator</h1>
            <p className="text-muted-foreground text-sm">Create stunning AI images from text prompts</p>
          </div>
          <Badge variant="outline" className="ml-auto">{CREDITS_PER_IMAGE} credits</Badge>
        </div>

        <Card className="glass border-0 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="text">Text to Image</TabsTrigger>
              <TabsTrigger value="reference">Reference to Image</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <Label>Prompt</Label>
                  <span className="text-xs text-muted-foreground">{prompt.length}/{MAX_PROMPT_LENGTH}</span>
                </div>
                <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your image... e.g., 'A serene mountain lake at sunset, golden hour lighting'" rows={4} className="mt-1 bg-muted/50 border-border resize-none" disabled={isGenerating} maxLength={MAX_PROMPT_LENGTH} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Image Size</Label>
                  <Select value={selectedSize} onValueChange={setSelectedSize} disabled={isGenerating}>
                    <SelectTrigger className="mt-1 bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>{IMAGE_SIZES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Style</Label>
                  <Select value={selectedStyle} onValueChange={setSelectedStyle} disabled={isGenerating}>
                    <SelectTrigger className="mt-1 bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>{STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reference" className="space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <Label>Prompt</Label>
                  <span className="text-xs text-muted-foreground">{prompt.length}/{MAX_PROMPT_LENGTH}</span>
                </div>
                <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your image. The reference will guide AI style and composition." rows={4} className="mt-1 bg-muted/50 border-border resize-none" disabled={isGenerating} maxLength={MAX_PROMPT_LENGTH} />
              </div>
              <div>
                <Label>Reference Images (up to 10)</Label>
                <p className="text-xs text-muted-foreground mb-2">These images guide the AI style and composition</p>
                <div className="p-4 border-2 border-dashed border-border rounded-lg bg-muted/30">
                  <div className="flex flex-wrap gap-3 mb-4">
                    {referenceImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt="Reference" className="w-20 h-20 object-cover rounded-lg border border-border" />
                        <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 size-5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center"><X className="size-3" /></button>
                      </div>
                    ))}
                  </div>
                  {referenceImages.length < 10 && (
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition">
                        <Upload className="size-4" /><span className="text-sm">Upload File</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} className="hidden" disabled={isGenerating} />
                      </label>
                      <div className="flex items-center gap-2">
                        <Input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Paste image URL..." className="bg-muted/50 border-border w-48" disabled={isGenerating} />
                        <Button type="button" variant="outline" size="sm" onClick={addUrl} disabled={isGenerating || !urlInput.trim()}><Plus className="size-4" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Image Size</Label>
                  <Select value={selectedSize} onValueChange={setSelectedSize} disabled={isGenerating}>
                    <SelectTrigger className="mt-1 bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>{IMAGE_SIZES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Style</Label>
                  <Select value={selectedStyle} onValueChange={setSelectedStyle} disabled={isGenerating}>
                    <SelectTrigger className="mt-1 bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>{STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {isGenerating && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <GeneratingStatus startTime={generateStartRef.current} />
              </div>
              <Progress value={undefined} className="h-2" />
            </div>
          )}

          <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="mt-6 btn-gradient text-white border-0">
            {isGenerating ? <><Loader2 className="size-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="size-4 mr-2" /> Generate ({CREDITS_PER_IMAGE} credits)</>}
          </Button>
        </Card>

        {generatedImages.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-xl font-semibold">Generated Images</h2>
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 mt-4">
              {generatedImages.map((url, idx) => (
                <Card key={idx} className="glass border-0 overflow-hidden break-inside-avoid group">
                  <div className="relative bg-muted">
                    <img src={url} alt="Generated" className="w-full cursor-zoom-in" loading="lazy" onClick={() => setLightboxImage(url)} />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setLightboxImage(url)}><ZoomIn className="size-4" /></Button>
                      <Button size="sm" variant="secondary" asChild>
                        <a href={url} download target="_blank" rel="noopener noreferrer"><Download className="size-4" /></a>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <Card className="glass border-0 p-6">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="size-5 text-primary" />
              <h2 className="font-display text-xl font-semibold">Frequently Asked Questions</h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="q1">
                <AccordionTrigger>How does the AI image generator work?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Enter a text prompt describing your desired image, choose a style (realistic, anime, 3D, vector, oil painting, watercolor), select resolution (up to 4K), and click Generate. The AI creates your image in seconds using advanced Seedream AI models.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger>Is the AI image generator free?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes, you start with 50 free credits. Each image costs 5 credits, giving you 10 free images to start. No credit card required. You can purchase more credits or subscribe to a plan for additional generations.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3">
                <AccordionTrigger>What image styles are available?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  We offer 7 styles: Realistic Photo for photorealistic images, Digital Illustration for artwork, Vector Art for clean graphics, 3D Render for three-dimensional scenes, Anime/Manga for Japanese-style art, Oil Painting for classical artistic effects, and Watercolor for soft painted looks.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q4">
                <AccordionTrigger>Can I use reference images?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes, upload up to 10 reference images to guide the AI's style and composition. The AI will use these as inspiration while creating your image, helping you achieve specific looks or match existing artwork styles.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q5">
                <AccordionTrigger>What resolutions are supported?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  We support Auto 2K, Auto 4K, Square HD, Landscape 4:3, and Portrait 4:3 resolutions. These cover all common use cases from social media posts to high-quality print images.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>

        <div className="mt-10">
          <h2 className="font-display text-xl font-semibold">Your Generations</h2>
          {generations.length === 0 ? (
            <Card className="glass border-0 p-12 text-center mt-4">
              <ImageIcon className="size-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-4 text-muted-foreground">No images yet. Create your first one above!</p>
            </Card>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 mt-4">
              {generations.map((gen) => (
                <Card key={gen.id} className="glass border-0 overflow-hidden break-inside-avoid group">
                  <div className="relative bg-muted">
                    {gen.result_url ? (
                      <img src={gen.result_url} alt={gen.prompt} className="w-full cursor-zoom-in" loading="lazy" onClick={() => setLightboxImage(gen.result_url)} />
                    ) : gen.status === "processing" ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <Loader2 className="size-8 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Generating...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16"><ImageIcon className="size-12 text-muted-foreground opacity-50" /></div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { setPrompt(gen.prompt); if (gen.settings?.style) setSelectedStyle(gen.settings.style as string); if (gen.settings?.image_size) setSelectedSize(gen.settings.image_size as string); toast.success("Prompt copied"); }}><Copy className="size-4" /></Button>
                      {gen.result_url && <Button size="sm" variant="secondary" onClick={() => setLightboxImage(gen.result_url)}><ZoomIn className="size-4" /></Button>}
                      {gen.result_url && (
                        <Button size="sm" variant="secondary" asChild>
                          <a href={gen.result_url} download target="_blank" rel="noopener noreferrer"><Download className="size-4" /></a>
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => toggleFavorite(gen.id, gen.is_favorite)}>
                        <Heart className={`size-4 ${gen.is_favorite ? "fill-red-500 text-red-500" : ""}`} />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteGeneration(gen.id)}><Trash2 className="size-4" /></Button>
                    </div>
                    {gen.is_favorite && <div className="absolute top-2 right-2"><Heart className="size-5 fill-red-500 text-red-500 drop-shadow" /></div>}
                  </div>
                  <div className="p-3">
                    <p className="text-sm line-clamp-2">{gen.prompt}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{gen.settings?.style || "realistic"}</Badge>
                      <span>{gen.credits_used} cr</span>
                      <span className="ml-auto">{new Date(gen.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {lightboxImage && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
            <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightboxImage(null)}><X className="size-8" /></button>
            <img src={lightboxImage} alt="Full size" className="max-w-full max-h-full object-contain" />
            <a href={lightboxImage} download target="_blank" rel="noopener noreferrer" className="absolute bottom-4 right-4" onClick={(e) => e.stopPropagation()}>
              <Button className="btn-gradient text-white border-0"><Download className="size-4 mr-2" /> Download</Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
