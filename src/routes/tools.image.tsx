import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { ToolNavbar } from "@/components/tools/ToolNavbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Image as ImageIcon, Loader as Loader2, Download, Heart, Trash2, Sparkles,
  X, Plus, Upload, ZoomIn, RefreshCw as RefreshIcon, ChevronDown, ChevronUp, Copy
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/tools/image")({
  component: ImageToolPage,
  head: () => ({
    meta: [
      { title: "Image Generation — Auto Seedance AI" },
      { name: "description", content: "Generate AI images with text prompts. 5 credits per image." },
    ],
  }),
});

const IMAGE_SIZES = [
  { value: "1024x1024", label: "Square HD (1024×1024)", width: 1024, height: 1024 },
  { value: "768x1024", label: "Portrait HD (768×1024)", width: 768, height: 1024 },
  { value: "1024x768", label: "Landscape HD (1024×768)", width: 1024, height: 768 },
  { value: "2048x2048", label: "Square 4K (2048×2048)", width: 2048, height: 2048 },
  { value: "1536x2048", label: "Portrait 4K (1536×2048)", width: 1536, height: 2048 },
  { value: "2048x1536", label: "Landscape 4K (2048×1536)", width: 2048, height: 1536 },
];

const STYLES = [
  { value: "realistic", label: "Realistic Photo", modifier: "photorealistic, high quality photograph, detailed" },
  { value: "illustration", label: "Digital Illustration", modifier: "digital illustration, detailed artwork, vibrant colors" },
  { value: "vector", label: "Vector Art", modifier: "vector art, clean lines, flat design, minimal" },
  { value: "3d", label: "3D Render", modifier: "3D render, octane render, detailed, cinematic lighting" },
  { value: "anime", label: "Anime/Manga", modifier: "anime style, manga art, detailed, vibrant" },
  { value: "oil", label: "Oil Painting", modifier: "oil painting, classical art style, rich textures" },
  { value: "watercolor", label: "Watercolor", modifier: "watercolor painting, soft colors, artistic, dreamy" },
];

type Generation = Tables<"generations">;

function ImageToolPage() {
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState("text");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showNegativePrompt, setShowNegativePrompt] = useState(false);
  const [imageSize, setImageSize] = useState("1024x1024");
  const [style, setStyle] = useState("realistic");
  const [numImages, setNumImages] = useState(1);
  const [sequentialGeneration, setSequentialGeneration] = useState(false);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const CREDITS_PER_IMAGE = 5;
  const MAX_PROMPT_LENGTH = 4000;
  const PAGE_SIZE = 12;

  async function fetchGenerations(reset = false) {
    if (!user) return;
    const currentPage = reset ? 0 : page;
    const { data, count } = await supabase
      .from("generations")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .eq("tool_type", "image")
      .order("created_at", { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (reset) {
      setGenerations((data as Generation[]) ?? []);
      setPage(0);
    } else {
      setGenerations((prev) => [...prev, ...((data as Generation[]) ?? [])]);
    }
    setHasMore(((count ?? 0) > (currentPage + 1) * PAGE_SIZE));
  }

  useEffect(() => {
    if (user) fetchGenerations(true);
  }, [user]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (referenceImages.length >= 14) {
        toast.error("Maximum 14 images allowed");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large (max 10MB)");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setReferenceImages((prev) => [...prev, base64]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [referenceImages.length]);

  const addUrl = useCallback(() => {
    if (!urlInput.trim()) return;
    if (referenceImages.length >= 14) {
      toast.error("Maximum 14 images allowed");
      return;
    }
    setReferenceImages((prev) => [...prev, urlInput.trim()]);
    setUrlInput("");
  }, [urlInput, referenceImages.length]);

  const removeImage = useCallback((index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  async function pollForResult(predictionId: string, generationId: string) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const maxAttempts = 120;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/poll-generation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generation_id: generationId, fal_request_id: predictionId }),
        });
        const data = await res.json();

        if (data.status === "done") {
          fetchGenerations(true);
          return data.result_url;
        }

        if (data.status === "failed") {
          throw new Error(data.error || "Generation failed");
        }
      } catch (e) {
        console.error("Poll error:", e);
      }

      await new Promise((r) => setTimeout(r, 3000));
    }

    throw new Error("Generation timed out");
  }

  async function handleGenerate() {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      toast.error(`Prompt too long (max ${MAX_PROMPT_LENGTH} characters)`);
      return;
    }

    if (activeTab === "reference" && referenceImages.length === 0) {
      toast.error("Please upload at least one reference image");
      return;
    }

    // Check credit balance
    const { data: wallet } = await supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (wallet && wallet.balance < CREDITS_PER_IMAGE * numImages) {
      toast.error("Insufficient credits — Upgrade your plan", {
        action: { label: "Upgrade", onClick: () => window.location.href = "/pricing" }
      });
      return;
    }

    setGenerating(true);

    try {
      // Consume credits
      const { data: creditResult, error: creditError } = await supabase.rpc("consume_credits", {
        _tool: "image",
        _amount: CREDITS_PER_IMAGE * numImages,
      });

      if (creditError || !creditResult?.success) {
        throw new Error(creditResult?.error || creditError?.message || "Failed to deduct credits");
      }

      // Create generation record
      const selectedSize = IMAGE_SIZES.find((s) => s.value === imageSize) || IMAGE_SIZES[0];
      const selectedStyle = STYLES.find((s) => s.value === style) || STYLES[0];

      const { data: genData, error: genError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          tool_type: "image",
          prompt: prompt.trim(),
          settings: {
            image_size: imageSize,
            width: selectedSize.width,
            height: selectedSize.height,
            style: style,
            num_images: numImages,
            negative_prompt: negativePrompt,
            sequential_generation: sequentialGeneration,
            has_reference_images: activeTab === "reference",
          },
          status: "processing",
          credits_used: CREDITS_PER_IMAGE * numImages,
        })
        .select("id")
        .single();

      if (genError || !genData) {
        throw new Error("Failed to create generation record");
      }

      const generationId = genData.id;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Call edge function
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negative_prompt: negativePrompt,
          image_size: imageSize,
          style: style,
          num_images: numImages,
          reference_images: activeTab === "reference" ? referenceImages : [],
          user_id: user.id,
          generation_id: generationId,
        }),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || "Generation failed");
      }

      if (result.image_urls && result.image_urls.length > 0) {
        toast.success("Image generated!", {
          action: { label: "View", onClick: () => setLightboxImage(result.image_urls[0]) }
        });
        fetchGenerations(true);
        setPrompt("");
        setReferenceImages([]);
      } else if (result.prediction_id) {
        toast.info("Generating your image...", { description: "This may take 30-60 seconds" });
        pollForResult(result.prediction_id, generationId)
          .then(() => {
            toast.success("Your image is ready!");
          })
          .catch((e) => {
            toast.error("Generation failed", { description: e.message });
          });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  async function toggleFavorite(id: string, current: boolean) {
    await supabase.from("generations").update({ is_favorite: !current }).eq("id", id);
    fetchGenerations(true);
  }

  async function deleteGeneration(id: string) {
    await supabase.from("generations").delete().eq("id", id);
    fetchGenerations(true);
  }

  function copyPrompt(gen: Generation) {
    setPrompt(gen.prompt);
    if (gen.settings?.style) setStyle(gen.settings.style as string);
    if (gen.settings?.image_size) setImageSize(gen.settings.image_size as string);
    toast.success("Prompt copied to form");
  }

  return (
    <div className="min-h-screen bg-background pt-14">
      <ToolNavbar title="Image Generation" />
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-xl btn-gradient grid place-items-center">
            <ImageIcon className="size-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Image Generation</h1>
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
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your image... e.g., 'A serene mountain lake at sunset, golden hour lighting, photorealistic'"
                  rows={4}
                  className="mt-1 bg-muted/50 border-border resize-none"
                  disabled={generating}
                  maxLength={MAX_PROMPT_LENGTH}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowNegativePrompt(!showNegativePrompt)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
              >
                {showNegativePrompt ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                Negative Prompt (optional)
              </button>

              {showNegativePrompt && (
                <div>
                  <Label>Negative Prompt</Label>
                  <Textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="What to avoid... e.g., 'blurry, low quality, distorted faces'"
                    rows={2}
                    className="mt-1 bg-muted/50 border-border resize-none"
                    disabled={generating}
                  />
                </div>
              )}

              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label>Image Size</Label>
                  <Select value={imageSize} onValueChange={setImageSize} disabled={generating}>
                    <SelectTrigger className="mt-1 bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Style</Label>
                  <Select value={style} onValueChange={setStyle} disabled={generating}>
                    <SelectTrigger className="mt-1 bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Number of Images</Label>
                  <Select value={numImages.toString()} onValueChange={(v) => setNumImages(parseInt(v))} disabled={generating}>
                    <SelectTrigger className="mt-1 bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-3 pb-1">
                  <Switch
                    id="sequential"
                    checked={sequentialGeneration}
                    onCheckedChange={setSequentialGeneration}
                    disabled={generating}
                  />
                  <Label htmlFor="sequential" className="cursor-pointer">Sequential</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reference" className="space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <Label>Prompt</Label>
                  <span className="text-xs text-muted-foreground">{prompt.length}/{MAX_PROMPT_LENGTH}</span>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your image. These images will guide the AI style and composition."
                  rows={4}
                  className="mt-1 bg-muted/50 border-border resize-none"
                  disabled={generating}
                  maxLength={MAX_PROMPT_LENGTH}
                />
              </div>

              <div>
                <Label>Reference Images (up to 14)</Label>
                <p className="text-xs text-muted-foreground mb-2">These images guide the AI style and composition</p>
                <div className="p-4 border-2 border-dashed border-border rounded-lg bg-muted/30">
                  <div className="flex flex-wrap gap-3 mb-4">
                    {referenceImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Reference ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-border"
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 size-5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                        >
                          <X className="size-3" />
                        </button>
                        <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white px-1 rounded">[{idx + 1}]</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition">
                      <Upload className="size-4" />
                      <span className="text-sm">Upload Files</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={generating || referenceImages.length >= 14}
                      />
                    </label>

                    <div className="flex items-center gap-2">
                      <Input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="Paste image URL..."
                        className="bg-muted/50 border-border w-48"
                        disabled={generating || referenceImages.length >= 14}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addUrl}
                        disabled={generating || !urlInput.trim() || referenceImages.length >= 14}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    {referenceImages.length}/14 images · JPG, PNG, WebP (max 10MB each)
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label>Image Size</Label>
                  <Select value={imageSize} onValueChange={setImageSize} disabled={generating}>
                    <SelectTrigger className="mt-1 bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Style</Label>
                  <Select value={style} onValueChange={setStyle} disabled={generating}>
                    <SelectTrigger className="mt-1 bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Number of Images</Label>
                  <Select value={numImages.toString()} onValueChange={(v) => setNumImages(parseInt(v))} disabled={generating}>
                    <SelectTrigger className="mt-1 bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-3 pb-1">
                  <Switch
                    id="sequential-ref"
                    checked={sequentialGeneration}
                    onCheckedChange={setSequentialGeneration}
                    disabled={generating}
                  />
                  <Label htmlFor="sequential-ref" className="cursor-pointer">Sequential</Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="mt-6 btn-gradient text-white border-0"
          >
            {generating ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2" /> Generate ({CREDITS_PER_IMAGE * numImages} credits)
              </>
            )}
          </Button>
        </Card>

        {/* History */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Your Generations</h2>
          </div>

          {generations.length === 0 ? (
            <Card className="glass border-0 p-12 text-center">
              <ImageIcon className="size-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-4 text-muted-foreground">No images yet. Create your first one above!</p>
            </Card>
          ) : (
            <>
              <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                {generations.map((gen) => (
                  <Card key={gen.id} className="glass border-0 overflow-hidden break-inside-avoid group">
                    <div className="relative bg-muted">
                      {gen.result_url ? (
                        <img
                          src={gen.result_url}
                          alt={gen.prompt}
                          className="w-full cursor-zoom-in"
                          loading="lazy"
                          onClick={() => setLightboxImage(gen.result_url)}
                        />
                      ) : gen.status === "processing" ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2">
                          <Loader2 className="size-8 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">Generating...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16">
                          <ImageIcon className="size-12 text-muted-foreground opacity-50" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => copyPrompt(gen)}>
                          <RefreshIcon className="size-4" />
                        </Button>
                        {gen.result_url && (
                          <Button size="sm" variant="secondary" onClick={() => setLightboxImage(gen.result_url)}>
                            <ZoomIn className="size-4" />
                          </Button>
                        )}
                        {gen.result_url && (
                          <Button size="sm" variant="secondary" asChild>
                            <a href={gen.result_url} download target="_blank" rel="noopener noreferrer">
                              <Download className="size-4" />
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => toggleFavorite(gen.id, gen.is_favorite)}>
                          <Heart className={`size-4 ${gen.is_favorite ? "fill-red-500 text-red-500" : ""}`} />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteGeneration(gen.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      {gen.is_favorite && (
                        <div className="absolute top-2 right-2">
                          <Heart className="size-5 fill-red-500 text-red-500 drop-shadow" />
                        </div>
                      )}
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

              {hasMore && (
                <div className="mt-6 text-center">
                  <Button variant="outline" onClick={() => { setPage(p => p + 1); fetchGenerations(); }}>
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Lightbox */}
        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <button
              className="absolute top-4 right-4 text-white/80 hover:text-white"
              onClick={() => setLightboxImage(null)}
            >
              <X className="size-8" />
            </button>
            <img
              src={lightboxImage}
              alt="Full size"
              className="max-w-full max-h-full object-contain"
            />
            <a
              href={lightboxImage}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Button className="btn-gradient text-white border-0">
                <Download className="size-4 mr-2" /> Download
              </Button>
            </a>
          </div>
        )}
      </div>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Please Login</DialogTitle>
            <DialogDescription>
              You need to be logged in to generate images. Sign up for free and get 50 credits!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowLoginModal(false)}>Cancel</Button>
            <Link to="/login" onClick={() => setShowLoginModal(false)}>
              <Button className="btn-gradient text-white border-0">Sign In</Button>
            </Link>
            <Link to="/signup" onClick={() => setShowLoginModal(false)}>
              <Button variant="outline">Sign Up Free</Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
