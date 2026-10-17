import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return Response.json({ error: "Sign in before creating a study group." }, { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return Response.json({ error: "Study groups are temporarily unavailable." }, { status: 500 });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "Your session has expired. Sign in again to create a group." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter a group name and course." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const course = typeof body.course === "string" ? body.course.trim().replace(/\s+/g, " ").toUpperCase() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (name.length < 2 || name.length > 80 || course.length < 1 || course.length > 80 || description.length > 300) {
    return Response.json({ error: "Use a group name (2–80 characters), course (1–80 characters), and goal up to 300 characters." }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: group, error: groupError } = await adminClient
    .from("study_groups")
    .insert({ name, course, description, owner_id: user.id })
    .select("id, name, course, description, invite_code, owner_id")
    .single();

  if (groupError || !group) {
    return Response.json({ error: "Could not create the group. Please try again." }, { status: 500 });
  }

  const { error: memberError } = await adminClient
    .from("study_group_members")
    .insert({ group_id: group.id, user_id: user.id });

  if (memberError) {
    await adminClient.from("study_groups").delete().eq("id", group.id);
    return Response.json({ error: "The group was created, but you could not be added as its first member. Please try again." }, { status: 500 });
  }

  return Response.json(group, { status: 201 });
});
