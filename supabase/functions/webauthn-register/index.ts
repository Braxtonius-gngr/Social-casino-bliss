import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "https://esm.sh/@simplewebauthn/server@11.0.0";

// WebAuthn registration: a two-step ceremony.
//   POST { step: 'options' }  -> returns the PublicKeyCredentialCreationOptions
//   POST { step: 'verify', response: <AuthenticatorAttestationResponse> }
//                             -> verifies and stores the credential
//
// The caller must be signed in (Supabase auth JWT in the Authorization header).
// Only the account owner registers a credential on their biometric-locked phone.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// The relying party: the app's origin.  In production this is the real domain;
// for preview deploys it is the Cloudflare Pages branch URL.
const RP_NAME = "Casino Almanac Dev";
const RP_ID = Deno.env.get("WEBAUTHN_RP_ID") || "dailyrollover.com";
const RP_ORIGIN = Deno.env.get("WEBAUTHN_RP_ORIGIN") || `https://${RP_ID}`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: CORS });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return new Response("Unauthorized", { status: 401, headers: CORS });

    const body = await req.json();

    if (body.step === "options") {
      // fetch any existing credentials so the browser skips them
      const { data: existing } = await supabase
        .from("webauthn_credentials")
        .select("credential_id, transports")
        .eq("user_id", user.id);

      const excludeCredentials = (existing || []).map((c: { credential_id: string; transports: string[] }) => ({
        id: c.credential_id,
        type: "public-key" as const,
        transports: c.transports || [],
      }));

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userName: user.email || user.id,
        userID: new TextEncoder().encode(user.id),
        attestationType: "none",
        excludeCredentials,
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
      });

      // store the challenge for verification
      await supabase.from("webauthn_challenges").insert({
        user_id: user.id,
        challenge: options.challenge,
        type: "registration",
      });

      return new Response(JSON.stringify(options), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (body.step === "verify") {
      // fetch the latest registration challenge for this user
      const { data: challenges } = await supabase
        .from("webauthn_challenges")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "registration")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!challenges?.length) {
        return new Response(JSON.stringify({ error: "No pending challenge" }), {
          status: 400, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      const verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: challenges[0].challenge,
        expectedOrigin: RP_ORIGIN,
        expectedRPID: RP_ID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return new Response(JSON.stringify({ error: "Verification failed" }), {
          status: 400, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      const { credential } = verification.registrationInfo;

      // store the credential
      const { error: insertErr } = await supabase.from("webauthn_credentials").insert({
        user_id: user.id,
        credential_id: credential.id,
        public_key: btoa(String.fromCharCode(...credential.publicKey)),
        counter: credential.counter,
        transports: body.response.response?.transports || [],
      });

      if (insertErr) {
        return new Response(JSON.stringify({ error: "Failed to store credential" }), {
          status: 500, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      // clean up the used challenge
      await supabase.from("webauthn_challenges")
        .delete()
        .eq("user_id", user.id)
        .eq("type", "registration");

      return new Response(JSON.stringify({ verified: true }), {
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
