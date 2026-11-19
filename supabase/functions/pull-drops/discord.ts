// Discord message handling for pull-drops, kept free of the network so it can
// be tested. Messages come from the bot's own server: channels that follow
// casinos' official announcement channels copy each post in.

import { discordImageUrl, MAX_IMAGES, MAX_TEXT_CHARS } from "../read-drop/extract.ts";

export type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  fields?: { name?: string; value?: string }[];
  footer?: { text?: string };
  image?: { url?: string; proxy_url?: string };
  thumbnail?: { url?: string; proxy_url?: string };
};

export type DiscordAttachment = { url?: string; proxy_url?: string; content_type?: string; filename?: string };

export type DiscordMessage = {
  id: string;
  channel_id?: string;
  content?: string;
  timestamp?: string;
  attachments?: DiscordAttachment[];
  embeds?: DiscordEmbed[];
  author?: { username?: string; bot?: boolean };
};

const IMAGE_FILE = /\.(png|jpe?g|gif|webp)$/i;

// Discord ids grow over time; compare them as big integers, never as strings.
export function newerId(a: string, b: string): string {
  return BigInt(a) > BigInt(b) ? a : b;
}

export function byIdAscending(messages: DiscordMessage[]): DiscordMessage[] {
  return [...messages].sort((x, y) => (BigInt(x.id) < BigInt(y.id) ? -1 : BigInt(x.id) > BigInt(y.id) ? 1 : 0));
}

// The words of a post: its text and every embed's title, description and
// fields. The author's name is left out (it can be a person).
export function messageText(message: DiscordMessage): string {
  const parts: string[] = [];
  if (message.content) parts.push(message.content);
  for (const embed of message.embeds ?? []) {
    if (embed.title) parts.push(embed.title);
    if (embed.description) parts.push(embed.description);
    if (embed.url) parts.push(embed.url);
    for (const field of embed.fields ?? []) {
      parts.push([field.name, field.value].filter(Boolean).join(": "));
    }
    if (embed.footer?.text) parts.push(embed.footer.text);
  }
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_TEXT_CHARS);
}

// The post's pictures, on Discord's own image hosts only (attachments, then
// embed images via Discord's media proxy), at most MAX_IMAGES.
export function messageImages(message: DiscordMessage): string[] {
  const found: string[] = [];
  const add = (raw?: string) => {
    if (raw && discordImageUrl(raw) && !found.includes(raw)) found.push(raw);
  };
  for (const a of message.attachments ?? []) {
    let path = "";
    try {
      path = new URL(a.url ?? a.proxy_url ?? "").pathname;
    } catch { /* no usable link */ }
    // Discord can omit the type and name; the link's own extension then decides.
    const isImage = (a.content_type ?? "").startsWith("image/") || IMAGE_FILE.test(a.filename ?? "") || IMAGE_FILE.test(path);
    if (isImage) add(a.url ?? a.proxy_url);
  }
  for (const embed of message.embeds ?? []) {
    add(embed.image?.proxy_url ?? embed.image?.url);
    add(embed.thumbnail?.proxy_url ?? embed.thumbnail?.url);
  }
  return found.slice(0, MAX_IMAGES);
}

// The review ping: platform and reason only, never a claim link or code, so
// tapping the notification can't claim anything.
export function reviewPing(platform: string, reasons: string[], held: number): string {
  const why = reasons.slice(0, 3).join("; ").replace(/https?:\/\/\S+/g, "[link]").slice(0, 300);
  const more = held > 1 ? ` (+${held - 1} more in this post)` : "";
  return `Drop held for review: **${platform.slice(0, 80)}**${more}\nWhy: ${why}\nOpen dailyrollover.com > Moderation > Drop inbox to publish or reject.`;
}
