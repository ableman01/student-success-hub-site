import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://student-success-hub-site.pages.dev",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const jsonResponse = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), {
  ...init,
  headers: { "Content-Type": "application/json", ...corsHeaders, ...init.headers },
});

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return jsonResponse({ error: "Sign in before joining a study group." }, { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Study group invitations are temporarily unavailable." }, { status: 500 });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: "Your session has expired. Sign in again to join." }, { status: 401 });
  }

  let inviteCode: string;
  try {
    const body = await request.json();
    inviteCode = typeof body.invite_code === "string" ? body.invite_code.trim() : "";
  } catch {
    return jsonResponse({ error: "A valid invitation code is required." }, { status: 400 });
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(inviteCode)) {
    return jsonResponse({ error: "That invite link is invalid or has expired." }, { status: 404 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: group, error: groupError } = await adminClient
    .from("study_groups")
    .select("id, name, course, description")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (groupError || !group) {
    return jsonResponse({ error: "That invite link is invalid or has expired." }, { status: 404 });
  }

  const { error: memberError } = await adminClient
    .from("study_group_members")
    .upsert({ group_id: group.id, user_id: user.id }, { onConflict: "group_id,user_id", ignoreDuplicates: true });

  if (memberError) {
    return jsonResponse({ error: "Could not add you to this group. Please try again." }, { status: 500 });
  }

  return jsonResponse(group, { status: 200 });
});

