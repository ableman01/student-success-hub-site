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
    return jsonResponse(request, { error: "Sign in before creating a study group." }, { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(request, { error: "Study groups are temporarily unavailable." }, { status: 500 });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse(request, { error: "Your session has expired. Sign in again to create a group." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Enter a group name and course." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const course = typeof body.course === "string" ? body.course.trim().replace(/\s+/g, " ").toUpperCase() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (name.length < 2 || name.length > 80 || course.length < 1 || course.length > 80 || description.length > 300) {
    return jsonResponse(request, { error: "Use a group name (2–80 characters), course (1–80 characters), and goal up to 300 characters." }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: institutionProfile, error: profileError } = await adminClient
    .from("student_profiles")
    .select("institution_key")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError || !institutionProfile) {
    return jsonResponse(request, { error: "Your institution profile is not ready. Please sign in again or contact support." }, { status: 403 });
  }

  const { data: group, error: groupError } = await adminClient
    .from("study_groups")
    .insert({ name, course, description, owner_id: user.id, institution_key: institutionProfile.institution_key })
    .select("id, name, course, description, invite_code, owner_id, institution_key")
    .single();

  if (groupError || !group) {
    return jsonResponse(request, { error: "Could not create the group. Please try again." }, { status: 500 });
  }

  const { error: memberError } = await adminClient
    .from("study_group_members")
    .insert({ group_id: group.id, user_id: user.id });

  if (memberError) {
    await adminClient.from("study_groups").delete().eq("id", group.id);
    return jsonResponse(request, { error: "The group was created, but you could not be added as its first member. Please try again." }, { status: 500 });
  }

  return jsonResponse(request, group, { status: 201 });
});

