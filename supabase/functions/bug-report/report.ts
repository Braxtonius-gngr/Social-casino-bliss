// Shape and checks for an in-app bug report, kept apart from the request
// handling so they can be tested without Deno.serve.

export const CATEGORIES = ["Timer bug", "Catalogue/rule correction", "Feature idea", "Other"] as const;
export type Category = typeof CATEGORIES[number];

export const MAX_TEXT = 4000;
export const MAX_FIELD = 1024;
export const MAX_ERRORS = 10;

// The same colours the form used when it posted to Discord itself.
const CATEGORY_COLORS: Record<Category, number> = {
  "Timer bug": 0xff3b30,
  "Catalogue/rule correction": 0xffcc00,
  "Feature idea": 0x00e5ff,
  "Other": 0x8e8e93,
};

export interface ReportMeta {
  userAgent: string | null;
  appBuild: string | null;
  catalogVersion: string | null;
  theme: string | null;
  trackedCount: number | null;
  recentErrors: string[];
}

export interface Report {
  category: Category;
  text: string;
  meta: ReportMeta;
}

function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function cleanErrors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
    .slice(-MAX_ERRORS)
    .map((e) => e.slice(0, 400));
}

// The client's address as the platform saw it - the same rule as the `go`
// function's clientAddress(). Cloudflare sets cf-connecting-ip itself and
// overwrites anything the client sent; failing that, the LAST
// x-forwarded-for entry is the one the nearest proxy appended, while the
// first is whatever the client claimed.
export function clientAddress(req: Request): string {
  const cf = (req.headers.get("cf-connecting-ip") ?? "").trim();
  if (cf) return cf;
  const forwarded = (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return forwarded[forwarded.length - 1] || "unknown";
}

// What the limiter stores: a salted hash, never the address.
export async function addressKey(address: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${address}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// A JSON body that parsed is not yet a report: `null`, an array or a string
// are all valid JSON and would fault the field reads below.
export function validate(body: unknown): { report: Report } | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Expected a JSON object." };
  const fields = body as Record<string, unknown>;
  const category = fields.category;
  if (typeof category !== "string" || !(CATEGORIES as readonly string[]).includes(category)) {
    return { error: "Pick a category." };
  }
  const text = typeof fields.text === "string" ? fields.text.trim() : "";
  if (!text) return { error: "Add a quick description first." };
  if (text.length > MAX_TEXT) return { error: `Keep it under ${MAX_TEXT} characters.` };

  const rawMeta = fields.meta && typeof fields.meta === "object" && !Array.isArray(fields.meta)
    ? fields.meta as Record<string, unknown>
    : {};
  const count = Number(rawMeta.trackedCount);
  const meta: ReportMeta = {
    userAgent: str(rawMeta.userAgent, MAX_FIELD),
    appBuild: str(rawMeta.appBuild, 64),
    catalogVersion: str(rawMeta.catalogVersion, 128),
    theme: str(rawMeta.theme, 32),
    trackedCount: Number.isFinite(count) && count >= 0 ? Math.floor(count) : null,
    recentErrors: cleanErrors(rawMeta.recentErrors),
  };
  return { report: { category: category as Category, text, meta } };
}

// The embed the form used to post itself, plus the row id in the footer so
// a channel message can be matched to its bug_reports row.
export function buildEmbed(report: Report, id: number) {
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: "User Agent", value: (report.meta.userAgent ?? "unknown").slice(0, MAX_FIELD) },
    { name: "Catalogue", value: (report.meta.catalogVersion ?? "unknown").slice(0, MAX_FIELD), inline: true },
    { name: "Tracked platforms", value: String(report.meta.trackedCount ?? "?"), inline: true },
  ];
  if (report.meta.appBuild || report.meta.theme) {
    fields.push({
      name: "Build / skin",
      value: `${report.meta.appBuild ?? "?"} / ${report.meta.theme ?? "?"}`,
      inline: true,
    });
  }
  if (report.meta.recentErrors.length) {
    fields.push({ name: "Recent app errors", value: report.meta.recentErrors.join("\n").slice(0, MAX_FIELD) });
  }
  return {
    username: "Daily Roll Over Feedback",
    embeds: [{
      title: `[${report.category}]`,
      description: report.text.slice(0, MAX_TEXT),
      color: CATEGORY_COLORS[report.category],
      fields,
      footer: { text: `bug_reports #${id}` },
      timestamp: new Date().toISOString(),
    }],
  };
}
