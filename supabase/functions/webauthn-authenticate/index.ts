import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "https://esm.sh/@simplewebauthn/server@11.0.0";

// WebAuthn authentication: a two-step ceremony.
//   POST { step: 'options' }  -> returns the PublicKeyCredentialRequestOptions
//   POST { step: 'verify', response: <AuthenticatorAssertionResponse> }
//                             -> verifies the assertion and returns a session token
//
// The caller must be signed in (Supabase auth JWT in the Authorization header).
// This is the second factor: Supabase auth is the first, biometric is the second.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RP_ID = Deno.env.get("WEBAUTHN_RP_ID") || "dailyrollover.com";
const RP_ORIGIN = Deno.env.get("WEBAUTHN_RP_ORIGIN") || `https://${RP_ID}`;
// The owner's Supabase user id (johndopamine210@gmail.com). Override with the
// WEBAUTHN_OWNER_ID secret if the owner account ever changes.
const OWNER_ID = Deno.env.get("WEBAUTHN_OWNER_ID") || "0c1c98cf-9d2a-49d5-8895-ccd434494f91";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: CORS });

    // Service-role client, same as the other functions: SUPABASE_ANON_KEY is
    // now an sb_publishable_ key this supabase-js version can't send, which
    // made every caller (owner included) come back "Unauthorized". Every
    // query below is scoped to the verified caller's user_id.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Pass the JWT explicitly so Supabase checks who the caller is.
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) return new Response("Unauthorized", { status: 401, headers: CORS });

    // Owner lock: every Cloud Sync visitor has an anonymous session, so being
    // signed in proves nothing. Only the owner account may use the dev overlay.
    if (user.id !== OWNER_ID) {
      return new Response("Not the owner account", { status: 403, headers: CORS });
    }

    const body = await req.json();

    if (body.step === "options") {
      // fetch the user's registered credentials
      const { data: credentials } = await supabase
        .from("webauthn_credentials")
        .select("credential_id, transports")
        .eq("user_id", user.id);

      if (!credentials?.length) {
        return new Response(JSON.stringify({ error: "No credentials registered" }), {
          status: 400, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      const allowCredentials = credentials.map((c: { credential_id: string; transports: string[] }) => ({
        id: c.credential_id,
        type: "public-key" as const,
        transports: c.transports || [],
      }));

      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials,
        userVerification: "required",
      });

      // store the challenge
      await supabase.from("webauthn_challenges").insert({
        user_id: user.id,
        challenge: options.challenge,
        type: "authentication",
      });

      return new Response(JSON.stringify(options), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (body.step === "verify") {
      // fetch the latest authentication challenge
      const { data: challenges } = await supabase
        .from("webauthn_challenges")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "authentication")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!challenges?.length) {
        return new Response(JSON.stringify({ error: "No pending challenge" }), {
          status: 400, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      // find the credential being used
      const credentialId = body.response.id;
      const { data: creds } = await supabase
        .from("webauthn_credentials")
        .select("*")
        .eq("user_id", user.id)
        .eq("credential_id", credentialId)
        .limit(1);

      if (!creds?.length) {
        return new Response(JSON.stringify({ error: "Credential not found" }), {
          status: 400, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      const cred = creds[0];
      const publicKeyBytes = Uint8Array.from(atob(cred.public_key), c => c.charCodeAt(0));

      const verification = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge: challenges[0].challenge,
        expectedOrigin: RP_ORIGIN,
        expectedRPID: RP_ID,
        credential: {
          id: cred.credential_id,
          publicKey: publicKeyBytes,
          counter: cred.counter,
          transports: cred.transports || [],
        },
      });

      if (!verification.verified) {
        return new Response(JSON.stringify({ error: "Verification failed" }), {
          status: 400, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      // update the counter to prevent replay attacks
      await supabase
        .from("webauthn_credentials")
        .update({ counter: verification.authenticationInfo.newCounter })
        .eq("id", cred.id);

      // clean up the used challenge
      await supabase.from("webauthn_challenges")
        .delete()
        .eq("user_id", user.id)
        .eq("type", "authentication");

      // return a short-lived session marker
      // the client stores this in sessionStorage and the overlay checks it
      const sessionToken = crypto.randomUUID();

      return new Response(JSON.stringify({
        verified: true,
        sessionToken,
        expiresIn: 3600, // 1 hour
      }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid step" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
