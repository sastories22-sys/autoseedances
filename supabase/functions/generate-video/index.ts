import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FAL_API_KEY = Deno.env.get("FAL_API_KEY")!;
const FAL_VIDEO_URL = "https://queue.fal.run/fal-ai/minimax/video-01";

interface FalResponse {
  request_id: string;
  status: string;
  result?: {
    video?: {
      url: string;
    };
  };
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      prompt,
      duration,
      resolution,
      aspect_ratio,
      generate_audio,
      first_frame_url,
      last_frame_url,
      reference_images,
      reference_videos,
      reference_audios,
      user_id,
      generation_id,
    } = body;

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build request body for Fal.ai
    const falInput: Record<string, unknown> = {
      prompt: prompt.trim(),
      duration: duration || 5,
      resolution: resolution || "720p",
      aspect_ratio: aspect_ratio || "16:9",
      generate_audio: generate_audio !== false,
      seed: Math.floor(Math.random() * 1000000),
    };

    // Add optional reference inputs
    if (first_frame_url) {
      falInput.image = first_frame_url;
    }
    if (last_frame_url && first_frame_url) {
      falInput.last_frame_image = last_frame_url;
    }
    if (reference_images && reference_images.length > 0) {
      falInput.reference_images = reference_images.slice(0, 9);
    }
    if (reference_videos && reference_videos.length > 0) {
      falInput.reference_videos = reference_videos.slice(0, 3);
    }
    if (reference_audios && reference_audios.length > 0) {
      falInput.reference_audios = reference_audios.slice(0, 3);
    }

    // Submit to Fal.ai queue
    const response = await fetch(FAL_VIDEO_URL, {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(falInput),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fal.ai API error:", errorText);
      throw new Error(`Fal.ai API error: ${response.status}`);
    }

    const result: FalResponse = await response.json();

    // Return request_id for polling (video generation takes 2-3 minutes)
    return new Response(JSON.stringify({
      success: true,
      prediction_id: result.request_id,
      status: result.status || "queued",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-video:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Internal server error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
