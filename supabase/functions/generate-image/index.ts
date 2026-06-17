import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
    if (!FAL_API_KEY) throw new Error("FAL_API_KEY missing");
    const { prompt, image_size, style, num_images, reference_images } = await req.json();
    if (!prompt) throw new Error("Prompt required");
    const STYLES: Record<string, string> = {
      realistic: "photorealistic, high quality",
      illustration: "digital illustration, vibrant",
      vector: "vector art, flat design",
      "3d": "3D render, cinematic",
      anime: "anime style, manga art",
      oil: "oil painting",
      watercolor: "watercolor painting",
    };
    const finalPrompt = style && STYLES[style] ? `${prompt}, ${STYLES[style]}` : prompt;
    const hasRef = reference_images && reference_images.length > 0;
    let modelId: string;
    let body: Record<string, unknown>;
    if (hasRef) {
      modelId = "fal-ai/bytedance/seedream/v4.5/edit";
      body = {
        prompt: finalPrompt,
        image_size: image_size || "auto_4K",
        num_images: num_images || 1,
        max_images: 1,
        enable_safety_checker: true,
        image_urls: reference_images,
      };
    } else {
      modelId = "fal-ai/bytedance/seedream/v4.5/text-to-image";
      body = {
        prompt: finalPrompt,
        image_size: image_size || "auto_2K",
        num_images: num_images || 1,
        max_images: 1,
        enable_safety_checker: true,
        seed: Math.floor(Math.random() * 999999),
      };
    }
    const submitRes = await fetch(`https://queue.fal.run/${modelId}`, {
      method: "POST",
      headers: { "Authorization": `Key ${FAL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!submitRes.ok) throw new Error(`Submit failed: ${await submitRes.text()}`);
    const { request_id } = await submitRes.json();
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await fetch(`https://queue.fal.run/${modelId}/requests/${request_id}/status`, {
        headers: { "Authorization": `Key ${FAL_API_KEY}` },
      });
      const { status } = await statusRes.json();
      if (status === "COMPLETED") {
        const resultRes = await fetch(`https://queue.fal.run/${modelId}/requests/${request_id}`, {
          headers: { "Authorization": `Key ${FAL_API_KEY}` },
        });
        const result = await resultRes.json();
        const image_urls = result.images?.map((img: { url: string }) => img.url) || [];
        return new Response(JSON.stringify({ success: true, image_urls }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (status === "FAILED") throw new Error("Generation failed on Fal.ai");
    }
    throw new Error("Timeout after 60 seconds");
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
