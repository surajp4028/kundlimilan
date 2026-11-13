import { serveBrandImage } from "@/lib/server/brand-image";

/** The uploaded brand logo (public; header, emails, PDFs). 404 → the built-in emblem is used. */
export async function GET() {
  return serveBrandImage("logo");
}
