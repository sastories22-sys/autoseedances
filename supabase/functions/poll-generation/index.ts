import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
    const { request_id, model_id } = await req.json();
    if (!request_id || !model_id) throw new Error("request_id and model_id required");
    const statusRes = await fetch(
      `https://queue.fal.run/${model_id}/requests/${request_id}/status`,
      { headers: { "Authorization": `Key ${FAL_API_KEY}` } }
    );
    const { status } = await statusRes.json();
    if (status === "COMPLETED") {
      const resultRes = await fetch(
        `https://queue.fal.run/${model_id}/requests/${request_id}`,
        { headers: { "Authorization": `Key ${FAL_API_KEY}` } }
      );
      const result = await resultRes.json();
      return new Response(JSON.stringify({ status: "completed", video_url: result.video?.url }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (status === "FAILED") {
      return new Response(JSON.stringify({ status: "failed" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ status: "processing" }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
