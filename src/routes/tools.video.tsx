import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { ToolNavbar } from "@/components/tools/ToolNavbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Video, Loader as Loader2, Download, Heart, Trash2, Sparkles, X, Plus, Upload, Play, Clock, Image as ImageIcon, Music, ChevronDown, ChevronUp, CircleAlert as AlertCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/tools/video")({
  component: VideoToolPage,
  head: () => ({
    meta: [
      { title: "Video Generation — Auto Seedance AI" },
      { name: "description", content: "Generate AI videos with text prompts. 30 credits per video." },
    ],
  }),
});

const RESOLUTIONS = [
  { value: "720p", label: "720p (HD)" },
  { value: "1080p", label: "1080p (Full HD)" },
];

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait/Shorts)" },
  { value: "1:1", label: "1:1 (Square)" },
];

type Generation = Tables<"generations">;

function VideoToolPage() {
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState("text");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState("720p");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const pollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Reference inputs for Tab 2
  const [firstFrameImage, setFirstFrameImage] = useState<string | null>(null);
  const [lastFrameImage, setLastFrameImage] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [referenceVideos, setReferenceVideos] = useState<string[]>([]);
  const [referenceAudios, setReferenceAudios] = useState<string[]>([]);

  const CREDITS_PER_VIDEO = 30;
  const MAX_PROMPT_LENGTH = 4000;

  async function fetchGenerations() {
    if (!user) return;
    const { data } = await supabase
      .from("generations")
      .select("*")
      .eq("user_id", user.id)
      .eq("tool_type", "video")
      .order("created_at", { ascending: false })
      .limit(30);
    setGenerations((data as Generation[]) ?? []);
  }

  useEffect(() => {
    fetchGenerations();

    if (user) {
      const channel = supabase
        .channel("video-generations")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "generations",
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchGenerations()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        pollingRef.current.forEach((timer) => clearInterval(timer));
      };
    }
  }, [user]);

  const handleFileUpload = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    maxCount: number,
    fileType: "image" | "video" | "audio"
  ) => {
    const files = e.target.files;
    if (!files) return;

    const currentLength = fileType === "image" ? referenceImages.length :
                          fileType === "video" ? referenceVideos.length :
                          referenceAudios.length;

    Array.from(files).forEach((file) => {
      if (currentLength >= maxCount) {
        toast.error(`Maximum ${maxCount} ${fileType}s allowed`);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File too large (max 50MB)");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setter((prev) => [...prev, base64]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [referenceImages.length, referenceVideos.length, referenceAudios.length]);

  const handleSingleFileUpload = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large (max 50MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) setter(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeRefImage = useCallback((index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeRefVideo = useCallback((index: number) => {
    setReferenceVideos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeRefAudio = useCallback((index: number) => {
    setReferenceAudios((prev) => prev.filter((_, i) => i !== index));
  }, []);

  async function pollForResult(predictionId: string, generationId: string) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    let attempts = 0;
    const maxAttempts = 200; // ~16 minutes max

    const poll = async () => {
      attempts++;
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/poll-generation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generation_id: generationId, fal_request_id: predictionId }),
        });
        const data = await res.json();

        if (data.status === "done") {
          pollingRef.current.delete(predictionId);
          fetchGenerations();
          toast.success("Your video is ready!");
          return true;
        }

        if (data.status === "failed") {
          pollingRef.current.delete(predictionId);
          fetchGenerations();
          toast.error("Video generation failed", { description: data.error || "Unknown error" });
          return true;
        }

        // Update progress estimate
        const progress = Math.min(95, (attempts / maxAttempts) * 100);
        await supabase
          .from("generations")
          .update({ settings: { duration, resolution, aspect_ratio: aspectRatio, generate_audio: generateAudio, progress } })
          .eq("id", generationId);
        fetchGenerations();

        return false;
      } catch (e) {
        console.error("Poll error:", e);
        return false;
      }
    };

    const interval = setInterval(async () => {
      const done = await poll();
      if (done || attempts >= maxAttempts) {
        clearInterval(interval);
        pollingRef.current.delete(predictionId);
        if (attempts >= maxAttempts) {
          await supabase.from("generations").update({ status: "failed", error: "Generation timed out" }).eq("id", generationId);
          fetchGenerations();
          toast.error("Video generation timed out");
        }
      }
    }, 5000);

    pollingRef.current.set(predictionId, interval as unknown as NodeJS.Timeout);
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

    // Check credit balance
    const { data: wallet } = await supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (wallet && wallet.balance < CREDITS_PER_VIDEO) {
      toast.error("Insufficient credits — Upgrade your plan", {
        action: { label: "Upgrade", onClick: () => window.location.href = "/pricing" }
      });
      return;
    }

    setGenerating(true);

    try {
      // Consume credits
      const { data: creditResult, error: creditError } = await supabase.rpc("consume_credits", {
        _tool: "video",
        _amount: CREDITS_PER_VIDEO,
      });

      if (creditError || !creditResult?.success) {
        throw new Error(creditResult?.error || creditError?.message || "Failed to deduct credits");
      }

      // Create generation record
      const { data: genData, error: genError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          tool_type: "video",
          prompt: prompt.trim(),
          settings: {
            duration,
            resolution,
            aspect_ratio: aspectRatio,
            generate_audio: generateAudio,
            has_reference: activeTab === "reference",
            progress: 0,
          },
          status: "processing",
          credits_used: CREDITS_PER_VIDEO,
        })
        .select("id")
        .single();

      if (genError || !genData) {
        throw new Error("Failed to create generation record");
      }

      const generationId = genData.id;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Build request body
      const requestBody: Record<string, unknown> = {
        prompt: prompt.trim(),
        duration,
        resolution,
        aspect_ratio: aspectRatio,
        generate_audio: generateAudio,
        user_id: user.id,
        generation_id: generationId,
      };

      if (activeTab === "reference") {
        if (firstFrameImage) requestBody.first_frame_url = firstFrameImage;
        if (lastFrameImage && firstFrameImage) requestBody.last_frame_url = lastFrameImage;
        if (referenceImages.length > 0) requestBody.reference_images = referenceImages;
        if (referenceVideos.length > 0) requestBody.reference_videos = referenceVideos;
        if (referenceAudios.length > 0) requestBody.reference_audios = referenceAudios;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || "Generation failed");
      }

      if (result.prediction_id) {
        await supabase.from("generations").update({ external_id: result.prediction_id }).eq("id", generationId);
        pollForResult(result.prediction_id, generationId);
        fetchGenerations();
        toast.success("Video generation started!", { description: "~2-3 minutes" });
      }

      setPrompt("");
      setFirstFrameImage(null);
      setLastFrameImage(null);
      setReferenceImages([]);
      setReferenceVideos([]);
      setReferenceAudios([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  async function toggleFavorite(id: string, current: boolean) {
    await supabase.from("generations").update({ is_favorite: !current }).eq("id", id);
    fetchGenerations();
  }

  async function deleteGeneration(id: string) {
    await supabase.from("generations").delete().eq("id", id);
    fetchGenerations();
  }

  const getStatusMessage = (status: string, progress: number) => {
    if (status === "processing") {
      if (progress < 10) return "Queued...";
      if (progress < 40) return "Processing frames...";
      if (progress < 70) return "Adding audio...";
      if (progress < 95) return "Finalizing...";
      return "Almost done...";
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-background pt-14">
      <ToolNavbar title="Video Generation" />
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-xl btn-gradient grid place-items-center">
            <Video className="size-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Video Generation</h1>
            <p className="text-muted-foreground text-sm">Create cinematic AI videos from text prompts</p>
          </div>
          <Badge variant="outline" className="ml-auto">{CREDITS_PER_VIDEO} credits</Badge>
        </div>

        <Card className="glass border-0 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="text">Text to Video</TabsTrigger>
              <TabsTrigger value="reference">Reference to Video</TabsTrigger>
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
                  placeholder="Describe your video scene... e.g., 'A cinematic drone shot of a futuristic city at night, neon lights reflecting on wet streets, slow motion'"
                  rows={4}
                  className="mt-1 bg-muted/50 border-border resize-none"
                  disabled={generating}
                  maxLength={MAX_PROMPT_LENGTH}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Duration: {duration}s</Label>
                </div>
                <Slider
                  value={[duration]}
                  onValueChange={([v]) => setDuration(v)}
                  min={1}
                  max={10}
                  step={1}
                  disabled={generating}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1s</span>
                  <span>10s</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Resolution</Label>
                  <Select value={resolution} onValueChange={setResolution} disabled={generating}>
                    <SelectTrigger className="mt-1 bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOLUTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Aspect Ratio</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={generating}>
                    <SelectTrigger className="mt-1 bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <Label className="text-sm font-medium">Generate Audio</Label>
                  <p className="text-xs text-muted-foreground mt-1">AI generates matching background audio</p>
                </div>
                <Switch checked={generateAudio} onCheckedChange={setGenerateAudio} disabled={generating} />
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
                  placeholder="Describe your video. Use [image1], [video1], [audio1] in prompt to reference uploads."
                  rows={4}
                  className="mt-1 bg-muted/50 border-border resize-none"
                  disabled={generating}
                  maxLength={MAX_PROMPT_LENGTH}
                />
              </div>

              {/* First Frame Image */}
              <div>
                <Label>First Frame Image</Label>
                <p className="text-xs text-muted-foreground mb-2">Video starts from this image</p>
                <div className="p-4 border-2 border-dashed border-border rounded-lg bg-muted/30">
                  {firstFrameImage ? (
                    <div className="relative inline-block">
                      <img src={firstFrameImage} alt="First frame" className="w-32 h-20 object-cover rounded" />
                      <button
                        onClick={() => setFirstFrameImage(null)}
                        className="absolute -top-2 -right-2 size-5 bg-destructive text-white rounded-full flex items-center justify-center"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center h-20 cursor-pointer hover:bg-muted/50 transition rounded">
                      <div className="text-center">
                        <Upload className="size-6 mx-auto text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1 block">Upload image</span>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleSingleFileUpload(e, setFirstFrameImage)}
                        disabled={generating}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Last Frame Image */}
              <div>
                <Label>Last Frame Image (requires first frame)</Label>
                <p className="text-xs text-muted-foreground mb-2">Video ends at this image</p>
                <div className="p-4 border-2 border-dashed border-border rounded-lg bg-muted/30">
                  {lastFrameImage ? (
                    <div className="relative inline-block">
                      <img src={lastFrameImage} alt="Last frame" className="w-32 h-20 object-cover rounded" />
                      <button
                        onClick={() => setLastFrameImage(null)}
                        className="absolute -top-2 -right-2 size-5 bg-destructive text-white rounded-full flex items-center justify-center"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex items-center justify-center h-20 cursor-pointer hover:bg-muted/50 transition rounded ${!firstFrameImage ? "opacity-50 cursor-not-allowed" : ""}`}>
                      <div className="text-center">
                        <Upload className="size-6 mx-auto text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1 block">Upload image</span>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleSingleFileUpload(e, setLastFrameImage)}
                        disabled={generating || !firstFrameImage}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Reference Images */}
              <div>
                <Label>Reference Images (up to 9)</Label>
                <p className="text-xs text-muted-foreground mb-2">Use [image1], [image2] in prompt</p>
                <div className="p-4 border border-border rounded-lg bg-muted/30">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {referenceImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt={`Ref ${idx + 1}`} className="w-16 h-16 object-cover rounded" />
                        <button
                          onClick={() => removeRefImage(idx)}
                          className="absolute -top-1 -right-1 size-4 bg-destructive text-white rounded-full flex items-center justify-center"
                        >
                          <X className="size-2" />
                        </button>
                        <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-black/70 text-white px-1 rounded">[i{idx + 1}]</span>
                      </div>
                    ))}
                  </div>
                  {referenceImages.length < 9 && (
                    <label className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded cursor-pointer transition">
                      <ImageIcon className="size-4" />
                      <span className="text-sm">Add Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, setReferenceImages, 9, "image")}
                        disabled={generating}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Reference Videos */}
              <div>
                <Label>Reference Videos (up to 3, max 15s each)</Label>
                <p className="text-xs text-muted-foreground mb-2">Use [video1] in prompt for motion style</p>
                <div className="p-4 border border-border rounded-lg bg-muted/30">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {referenceVideos.map((vid, idx) => (
                      <div key={idx} className="relative group">
                        <video src={vid} className="w-20 h-14 object-cover rounded bg-black" />
                        <button
                          onClick={() => removeRefVideo(idx)}
                          className="absolute -top-1 -right-1 size-4 bg-destructive text-white rounded-full flex items-center justify-center"
                        >
                          <X className="size-2" />
                        </button>
                        <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-black/70 text-white px-1 rounded">[v{idx + 1}]</span>
                      </div>
                    ))}
                  </div>
                  {referenceVideos.length < 3 && (
                    <label className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded cursor-pointer transition">
                      <Video className="size-4" />
                      <span className="text-sm">Add Video</span>
                      <input
                        type="file"
                        accept="video/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, setReferenceVideos, 3, "video")}
                        disabled={generating}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Reference Audios */}
              <div>
                <Label>Reference Audios (up to 3)</Label>
                <p className="text-xs text-muted-foreground mb-2">Use [audio1] in prompt for audio-driven generation</p>
                <div className="p-4 border border-border rounded-lg bg-muted/30">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {referenceAudios.map((aud, idx) => (
                      <div key={idx} className="relative flex items-center gap-2 px-2 py-1 bg-muted rounded">
                        <Music className="size-4" />
                        <span className="text-xs">audio{idx + 1}</span>
                        <button
                          onClick={() => removeRefAudio(idx)}
                          className="size-4 bg-destructive text-white rounded-full flex items-center justify-center"
                        >
                          <X className="size-2" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {referenceAudios.length < 3 && (
                    <label className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded cursor-pointer transition">
                      <Music className="size-4" />
                      <span className="text-sm">Add Audio</span>
                      <input
                        type="file"
                        accept="audio/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, setReferenceAudios, 3, "audio")}
                        disabled={generating}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Duration, Resolution, Aspect Ratio */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Duration: {duration}s</Label>
                </div>
                <Slider
                  value={[duration]}
                  onValueChange={([v]) => setDuration(v)}
                  min={1}
                  max={10}
                  step={1}
                  disabled={generating}
                  className="w-full"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Resolution</Label>
                  <Select value={resolution} onValueChange={setResolution} disabled={generating}>
                    <SelectTrigger className="mt-1 bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOLUTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Aspect Ratio</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={generating}>
                    <SelectTrigger className="mt-1 bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <Label className="text-sm font-medium">Generate Audio</Label>
                  <p className="text-xs text-muted-foreground mt-1">AI generates matching background audio</p>
                </div>
                <Switch checked={generateAudio} onCheckedChange={setGenerateAudio} disabled={generating} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-muted-foreground mt-4">
            <Clock className="size-4 text-amber-500" />
            <span>Video generation takes ~2-3 minutes. You can browse history while waiting.</span>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="mt-6 btn-gradient text-white border-0"
          >
            {generating ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Starting...
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2" /> Generate Video ({CREDITS_PER_VIDEO} credits)
              </>
            )}
          </Button>
        </Card>

        {/* History */}
        <div className="mt-10">
          <h2 className="font-display text-xl font-semibold">Your Videos</h2>

          {generations.length === 0 ? (
            <Card className="glass border-0 p-12 text-center mt-4">
              <Video className="size-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-4 text-muted-foreground">No videos yet. Create your first one above!</p>
            </Card>
          ) : (
            <div className="space-y-4 mt-4">
              {generations.map((gen) => (
                <Card key={gen.id} className="glass border-0 overflow-hidden">
                  <div className="flex flex-col md:flex-row gap-4 p-4">
                    <div className="w-full md:w-48 shrink-0 aspect-video bg-black rounded-lg overflow-hidden grid place-items-center relative">
                      {gen.result_url ? (
                        <video
                          src={gen.result_url}
                          controls
                          className="size-full object-contain"
                        />
                      ) : gen.status === "processing" ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="size-8 animate-spin text-primary" />
                          <span className="text-xs text-white">{getStatusMessage(gen.status, gen.settings?.progress || 0)}</span>
                          <Progress value={gen.settings?.progress || 0} className="w-20" />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-destructive">
                          <AlertCircle className="size-6" />
                          <span className="text-xs">{gen.error || "Failed"}</span>
                        </div>
                      )}
                      {gen.is_favorite && gen.result_url && (
                        <div className="absolute top-2 right-2">
                          <Heart className="size-4 fill-red-500 text-red-500" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{gen.prompt}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{gen.settings?.duration || 5}s</Badge>
                        <Badge variant="outline">{gen.settings?.resolution || "720p"}</Badge>
                        <Badge variant="outline">{gen.settings?.aspect_ratio || "16:9"}</Badge>
                        <span>{gen.credits_used} credits</span>
                        <span className="ml-auto">{new Date(gen.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex md:flex-col gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(gen.id, gen.is_favorite)}
                      >
                        <Heart className={`size-4 ${gen.is_favorite ? "fill-red-500 text-red-500" : ""}`} />
                      </Button>
                      {gen.result_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={gen.result_url} download target="_blank" rel="noopener noreferrer">
                            <Download className="size-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => deleteGeneration(gen.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Please Login</DialogTitle>
            <DialogDescription>
              You need to be logged in to generate videos. Sign up for free and get 50 credits!
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
