import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FAL_API_KEY = Deno.env.get("FAL_API_KEY")!;

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
      model_type,
      first_frame_url,
      last_frame_url,
      reference_images,
      reference_videos,
      reference_audios,
    } = body;

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isReference = model_type === "reference-to-video";
    const modelPath = isReference
      ? "fal-ai/bytedance/seedance-2.0/reference-to-video"
      : "fal-ai/bytedance/seedance-2.0/text-to-video";

    const falInput: Record<string, unknown> = {
      prompt: prompt.trim(),
      duration: duration || 5,
      resolution: resolution || "720p",
      aspect_ratio: aspect_ratio || "16:9",
      generate_audio: generate_audio !== false,
      seed: Math.floor(Math.random() * 1000000),
    };

    if (isReference) {
      if (first_frame_url) falInput.first_frame_url = first_frame_url;
      if (last_frame_url && first_frame_url) falInput.last_frame_url = last_frame_url;
      if (reference_images?.length > 0) falInput.reference_images = reference_images.slice(0, 9);
      if (reference_videos?.length > 0) falInput.reference_videos = reference_videos.slice(0, 3);
      if (reference_audios?.length > 0) falInput.reference_audios = reference_audios.slice(0, 3);
    }

    const response = await fetch(`https://queue.fal.run/${modelPath}`, {
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
      throw new Error(`Fal.ai API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      request_id: result.request_id,
      model_type: isReference ? "reference-to-video" : "text-to-video",
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
