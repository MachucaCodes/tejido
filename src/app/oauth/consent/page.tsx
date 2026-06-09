import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// OAuth 2.1 consent screen. Supabase Auth (acting as the authorization
// server) redirects users here with an authorization_id; approving issues an
// authorization code back to the OAuth client (e.g. a claude.ai connector).
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: authorizationId } = await searchParams;

  if (!authorizationId) {
    return <Message title="Invalid request" body="Missing authorization_id." />;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // Anonymous participant sessions can't grant API access — require the
  // phone-verified admin login first, then come back here.
  if (!user || user.is_anonymous) {
    redirect(
      `/admin/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`,
    );
  }

  const admin = createAdmin();
  const { data: row } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (row?.role !== "admin") {
    return (
      <Message
        title="Not authorized"
        body="This connector manages sessions and requires an admin account. You're signed in with a non-admin account."
      />
    );
  }

  const { data: details, error } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !details) {
    return (
      <Message
        title="Invalid authorization request"
        body={error?.message ?? "This request may have expired. Retry from the connecting app."}
      />
    );
  }

  // Already consented previously — Supabase returns only a redirect_url.
  if (!("authorization_id" in details)) {
    redirect((details as { redirect_url: string }).redirect_url);
  }

  const scopes = (details.scope ?? "").trim();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6">
      <div className="w-full space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">
            Authorize {details.client?.name ?? "application"}
          </h1>
          <p className="text-sm text-muted-foreground">
            This application is asking to access Tejido with your admin
            account. It will be able to create, list, and update sessions.
          </p>
        </div>

        <div className="space-y-2 rounded-md border p-4 text-sm">
          <p>
            <span className="font-medium">Application:</span>{" "}
            {details.client?.name ?? "unknown"}
          </p>
          <p className="break-all">
            <span className="font-medium">Redirects to:</span> {details.redirect_uri}
          </p>
          {scopes && (
            <p>
              <span className="font-medium">Requested scopes:</span> {scopes}
            </p>
          )}
        </div>

        <form action="/api/oauth/decision" method="POST" className="flex gap-3">
          <input type="hidden" name="authorization_id" value={authorizationId} />
          <Button type="submit" name="decision" value="approve" className="flex-1">
            Approve
          </Button>
          <Button
            type="submit"
            name="decision"
            value="deny"
            variant="outline"
            className="flex-1"
          >
            Deny
          </Button>
        </form>
      </div>
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6">
      <div className="w-full space-y-2 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
