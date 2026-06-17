import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FAL_API_KEY = Deno.env.get("FAL_API_KEY")!;

const STYLE_MODIFIERS: Record<string, string> = {
  realistic: "photorealistic, high quality photograph, detailed",
  illustration: "digital illustration, detailed artwork, vibrant colors",
  vector: "vector art, clean lines, flat design, minimal",
  "3d": "3D render, octane render, detailed, cinematic lighting",
  anime: "anime style, manga art, detailed, vibrant",
  oil: "oil painting, classical art style, rich textures",
  watercolor: "watercolor painting, soft colors, artistic, dreamy",
};

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
    const { prompt, image_size, style, num_images, reference_images } = body;

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const styleModifier = STYLE_MODIFIERS[style] || STYLE_MODIFIERS.realistic;
    const enhancedPrompt = `${prompt.trim()}, ${styleModifier}`;

    const hasReference = reference_images && reference_images.length > 0;
    const modelPath = hasReference
      ? "fal-ai/bytedance/seedream-v4.5/edit"
      : "fal-ai/bytedance/seedream-v4.5/text-to-image";

    const falInput: Record<string, unknown> = {
      prompt: enhancedPrompt,
      image_size: image_size || "square_hd",
      num_images: num_images || 1,
      seed: Math.floor(Math.random() * 1000000),
    };

    if (hasReference) {
      falInput.image_url = reference_images[0];
    }

    const response = await fetch(`https://fal.run/${modelPath}`, {
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
    const imageUrls: string[] = result.images?.map((img: { url: string }) => img.url) ?? [];

    if (imageUrls.length === 0) {
      throw new Error("No images returned from Fal.ai");
    }

    return new Response(JSON.stringify({ success: true, image_urls: imageUrls }), {
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
