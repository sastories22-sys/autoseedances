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
    const bodyText = await req.text();
    if (!bodyText || bodyText.trim() === "") throw new Error("Empty request body");
    const { request_id, model_id } = JSON.parse(bodyText);
    if (!request_id) throw new Error("request_id required");
    if (!model_id) throw new Error("model_id required");
    console.log("Polling:", model_id, request_id);
    const statusRes = await fetch(
      `https://queue.fal.run/${model_id}/requests/${request_id}/status`,
      { headers: { "Authorization": `Key ${FAL_API_KEY}` } }
    );
    const statusText = await statusRes.text();
    console.log("Status response:", statusText);
    if (!statusText || statusText.trim() === "") {
      return new Response(JSON.stringify({ status: "processing" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const statusData = JSON.parse(statusText);
    const status = statusData.status;
    console.log("Status:", status);
    if (status === "COMPLETED") {
      const resultRes = await fetch(
        `https://queue.fal.run/${model_id}/requests/${request_id}`,
        { headers: { "Authorization": `Key ${FAL_API_KEY}` } }
      );
      const resultText = await resultRes.text();
      console.log("Result:", resultText);
      const result = JSON.parse(resultText);
      const image_urls = result.images?.map((img: { url: string }) => img.url) || [];
      const video_url = result.video?.url || null;
      return new Response(JSON.stringify({
        status: "completed",
        image_urls,
        video_url,
      }), {
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
    console.error("poll-generation error:", String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
