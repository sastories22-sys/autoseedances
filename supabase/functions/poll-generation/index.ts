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
    const { request_id, model_type } = body;

    if (!request_id) {
      return new Response(JSON.stringify({ error: "request_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isReference = model_type === "reference-to-video";
    const modelPath = isReference
      ? "fal-ai/bytedance/seedance-2.0/reference-to-video"
      : "fal-ai/bytedance/seedance-2.0/text-to-video";

    const response = await fetch(`https://queue.fal.run/${modelPath}/requests/${request_id}`, {
      headers: { "Authorization": `Key ${FAL_API_KEY}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fal.ai status error:", errorText);
      throw new Error(`Failed to check status: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === "COMPLETED") {
      const videoUrl = result.output?.video?.url ?? result.output?.video_url ?? null;
      return new Response(JSON.stringify({ status: "completed", video_url: videoUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (result.status === "FAILED" || result.error) {
      return new Response(JSON.stringify({ status: "failed", error: result.error || "Generation failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: result.status || "processing" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in poll-generation:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Internal server error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
