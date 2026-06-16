import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FAL_API_KEY = Deno.env.get("FAL_API_KEY")!;
const FAL_API_URL = "https://queue.fal.run/fal-ai/bytedance/seedream-3";

const STYLE_MODIFIERS: Record<string, string> = {
  realistic: "photorealistic, high quality photograph, detailed",
  illustration: "digital illustration, detailed artwork, vibrant colors",
  vector: "vector art, clean lines, flat design, minimal",
  "3d": "3D render, octane render, detailed, cinematic lighting",
  anime: "anime style, manga art, detailed, vibrant",
  oil: "oil painting, classical art style, rich textures",
  watercolor: "watercolor painting, soft colors, artistic, dreamy",
};

interface FalResponse {
  request_id: string;
  status: string;
  result?: {
    images: Array<{ url: string }>;
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
      negative_prompt,
      image_size,
      style,
      num_images,
      reference_images,
      user_id,
      generation_id,
    } = body;

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse image size
    const sizeParts = (image_size || "1024x1024").split("x");
    const width = parseInt(sizeParts[0]) || 1024;
    const height = parseInt(sizeParts[1]) || 1024;

    // Get style modifier
    const styleModifier = STYLE_MODIFIERS[style] || STYLE_MODIFIERS.realistic;
    const enhancedPrompt = `${prompt.trim()}, ${styleModifier}`;

    // Build request body for Fal.ai
    const falInput: Record<string, unknown> = {
      prompt: enhancedPrompt,
      negative_prompt: negative_prompt || "blurry, low quality, distorted, ugly",
      image_size: image_size || "1024x1024",
      num_images: num_images || 1,
      seed: Math.floor(Math.random() * 1000000),
    };

    // Add reference images if provided
    if (reference_images && reference_images.length > 0) {
      falInput.image_input = reference_images.slice(0, 14);
    }

    // Submit to Fal.ai queue
    const response = await fetch(FAL_API_URL, {
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

    if (result.status === "completed" && result.result?.images) {
      // Upload images to Supabase storage
      const imageUrls: string[] = [];

      for (const img of result.result.images) {
        try {
          // Download and re-upload to our storage
          const imgResponse = await fetch(img.url);
          const imgBlob = await imgResponse.blob();
          const fileName = `${user_id}/${generation_id}/${Date.now()}.png`;

          // If we have storage configured, upload here
          // For now, just use the Fal.ai URLs directly
          imageUrls.push(img.url);
        } catch (e) {
          console.error("Failed to process image:", e);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        image_urls: imageUrls,
        request_id: result.request_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return request_id for polling
    return new Response(JSON.stringify({
      success: true,
      prediction_id: result.request_id,
      status: result.status || "queued",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-image:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Internal server error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
