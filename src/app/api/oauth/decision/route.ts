import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Handles the approve/deny form on /oauth/consent. Supabase records the
// decision and returns the redirect_url that carries the authorization code
// (or error) back to the OAuth client.
export async function POST(request: Request) {
  const formData = await request.formData();
  const decision = formData.get("decision");
  const authorizationId = formData.get("authorization_id");
  if (typeof authorizationId !== "string" || !authorizationId) {
    return new Response("missing authorization_id", { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user || userData.user.is_anonymous) {
    return new Response("unauthenticated", { status: 401 });
  }

  const { data, error } =
    decision === "approve"
      ? await supabase.auth.oauth.approveAuthorization(authorizationId)
      : await supabase.auth.oauth.denyAuthorization(authorizationId);
  if (error) return new Response(error.message, { status: 400 });

  // 303 so the POST becomes a GET to the client's callback URL.
  return NextResponse.redirect(data.redirect_url, 303);
}
