/**
 * BRACKT_ADP_16BIT - Cloudflare Proxy Node
 * 
 * This worker acts as a secure intermediary between the 16-bit frontend 
 * and external betting APIs to bypass CORS and protect secrets.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS Headers for retro-compatibility
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-apisports-key, Authorization",
    };

    // Handle Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      /**
       * Proxy to The Odds API
       * Route: /odds-api/*
       */
      if (path.startsWith("/odds-api/")) {
        const targetPath = path.replace("/odds-api/", "");
        const targetUrl = `https://api.the-odds-api.com/v4/${targetPath}${url.search}`;
        
        // Use secret from env if available, otherwise pass through (unsafe mode)
        const response = await fetch(targetUrl);
        const data = await response.text();
        
        return new Response(data, {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status
        });
      }

      /**
       * Proxy to API-Sports
       * Route: /api-sports/*
       */
      if (path.startsWith("/api-sports/")) {
        const targetPath = path.replace("/api-sports/", "");
        const targetUrl = `https://v3.football.api-sports.io/${targetPath}${url.search}`;
        
        const response = await fetch(targetUrl, {
          headers: {
            "x-apisports-key": request.headers.get("x-apisports-key") || env.API_SPORTS_KEY || ""
          }
        });
        const data = await response.text();
        
        return new Response(data, {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status
        });
      }

      /**
       * Proxy to Odds-API.io
       * Route: /odds-io/*
       */
      if (path.startsWith("/odds-io/")) {
        const targetPath = path.replace("/odds-io/", "");
        const targetUrl = `https://api.odds-api.io/v1/${targetPath}${url.search}`;
        
        const response = await fetch(targetUrl);
        const data = await response.text();
        
        return new Response(data, {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status
        });
      }

      // Default 404 for unknown sectors
      return new Response(JSON.stringify({ error: "UNAUTHORIZED_SECTOR", path }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: "KERNEL_PANIC", message: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  },
};
