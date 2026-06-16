import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FAL_API_KEY = Deno.env.get("FAL_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface FalStatusResponse {
  status: string;
  result?: {
    images?: Array<{ url: string }>;
    video?: { url: string };
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
    const { generation_id, fal_request_id } = body;

    if (!fal_request_id) {
      return new Response(JSON.stringify({ error: "fal_request_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check Fal.ai status
    const response = await fetch(`https://queue.fal.run/fal-ai/requests/${fal_request_id}`, {
      headers: {
        "Authorization": `Key ${FAL_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fal.ai status error:", errorText);
      throw new Error(`Failed to check status: ${response.status}`);
    }

    const result: FalStatusResponse = await response.json();

    if (result.status === "completed" && result.result) {
      let resultUrl: string | null = null;

      // Handle image result
      if (result.result.images && result.result.images.length > 0) {
        resultUrl = result.result.images[0].url;
      }
      // Handle video result
      if (result.result.video?.url) {
        resultUrl = result.result.video.url;
      }

      if (resultUrl && generation_id) {
        // Update generation in database
        const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/generations?id=eq.${generation_id}`, {
          method: "PATCH",
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            result_url: resultUrl,
            thumbnail_url: resultUrl,
            status: "done",
            updated_at: new Date().toISOString(),
          }),
        });

        if (!updateResponse.ok) {
          console.error("Failed to update generation:", await updateResponse.text());
        }
      }

      return new Response(JSON.stringify({
        status: "done",
        result_url: resultUrl,
        images: result.result.images?.map((i) => i.url),
        video: result.result.video?.url,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (result.status === "failed" || result.error) {
      // Update generation to failed
      if (generation_id) {
        await fetch(`${SUPABASE_URL}/rest/v1/generations?id=eq.${generation_id}`, {
          method: "PATCH",
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            status: "failed",
            error: result.error || "Generation failed",
            updated_at: new Date().toISOString(),
          }),
        });
      }

      return new Response(JSON.stringify({
        status: "failed",
        error: result.error || "Generation failed",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Still processing
    return new Response(JSON.stringify({
      status: result.status,
    }), {
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
