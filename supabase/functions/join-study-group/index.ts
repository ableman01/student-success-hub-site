import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const corsHeaders = (request: Request) => {
  const origin = request.headers.get("Origin") || "";
  const allowed = origin === "https://student-success-hub-site.pages.dev"
    || /^https:\/\/[a-z0-9.-]+\.student-success-hub-site\.pages\.dev$/i.test(origin)
    || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

const jsonResponse = (request: Request, body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), {
  ...init,
  headers: { "Content-Type": "application/json", ...corsHeaders(request), ...init.headers },
});

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed." }, { status: 405 });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return jsonResponse(request, { error: "Sign in before joining a study group." }, { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(request, { error: "Study group invitations are temporarily unavailable." }, { status: 500 });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse(request, { error: "Your session has expired. Sign in again to join." }, { status: 401 });
  }

  let inviteCode: string;
  try {
    const body = await request.json();
    inviteCode = typeof body.invite_code === "string" ? body.invite_code.trim() : "";
  } catch {
    return jsonResponse(request, { error: "A valid invitation code is required." }, { status: 400 });
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(inviteCode)) {
    return jsonResponse(request, { error: "That invite link is invalid or has expired." }, { status: 404 });
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
    return jsonResponse(request, { error: "That invite link is invalid or has expired." }, { status: 404 });
  }

  const { error: memberError } = await adminClient
    .from("study_group_members")
    .upsert({ group_id: group.id, user_id: user.id }, { onConflict: "group_id,user_id", ignoreDuplicates: true });

  if (memberError) {
    return jsonResponse(request, { error: "Could not add you to this group. Please try again." }, { status: 500 });
  }

  return jsonResponse(request, group, { status: 200 });
});

