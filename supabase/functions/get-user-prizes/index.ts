import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create client for user auth (anon) and service role for data access
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get current user from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userRes, error: userErr } = await supabaseAnon.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userRes?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Invalid user token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userRes.user.id;

    // 1) Closed prizes the user won with winner info
    const { data: closedWon, error: closedErr } = await supabaseService
      .from("prizes")
      .select(`
        *,
        prize_achievements!inner (
          achieved_at,
          progress,
          user_id,
          profiles(name)
        )
      `)
      .eq("is_active", false)
      .eq("prize_achievements.user_id", userId)
      .order("created_at", { ascending: false });

    if (closedErr) {
      console.error("get-user-prizes closedErr:", closedErr);
    }

    // 2) Active prizes (we will filter by target on server-side for simplicity)
    const { data: activeAll, error: activeErr } = await supabaseService
      .from("prizes")
      .select(`*, prize_achievements ( achieved_at, progress, user_id )`)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (activeErr) {
      console.error("get-user-prizes activeErr:", activeErr);
    }

    // Filter active prizes by visibility to this user
    const activeVisible = (activeAll || []).filter((p: any) => {
      if (p.is_for_all) return true;
      const targets: string[] = Array.isArray(p.target_users) ? p.target_users.map(String) : [];
      return targets.includes(String(userId));
    });

    // Merge ensuring uniqueness by id
    const byId = new Map<string, any>();
    for (const p of [...(closedWon || []), ...activeVisible]) {
      byId.set(p.id, p);
    }

    const result = Array.from(byId.values());

    return new Response(
      JSON.stringify({ prizes: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-user-prizes error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
