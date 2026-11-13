import { serveBrandImage } from "@/lib/server/brand-image";

/** The uploaded home-page Ganesh image (404 → the built-in artwork is used). */
export async function GET() {
  return serveBrandImage("hero");
}
