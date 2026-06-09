import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";

import { supabaseUrl } from "@/lib/supabase/env";

// RFC 9728 protected-resource metadata. The optional catch-all also serves the
// path-inserted form clients probe for the /api/mcp resource
// (/.well-known/oauth-protected-resource/api/mcp). Supabase Auth is the
// OAuth 2.1 authorization server; its issuer is <project-url>/auth/v1.
const handler = protectedResourceHandler({
  authServerUrls: [`${supabaseUrl()}/auth/v1`],
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
