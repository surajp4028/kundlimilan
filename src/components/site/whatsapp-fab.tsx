"use client";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useSite } from "@/lib/client/providers";

/** WhatsApp glyph (simple path, brand green set by the button). */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="currentColor">
      <path d="M16.04 3C9 3 3.28 8.7 3.28 15.73c0 2.25.59 4.44 1.71 6.37L3 29l7.08-1.86a12.7 12.7 0 0 0 5.96 1.51h.01c7.03 0 12.75-5.7 12.75-12.73C28.8 8.7 23.07 3 16.04 3Zm0 23.5h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4.2 1.1 1.12-4.09-.25-.42a10.53 10.53 0 0 1-1.62-5.65c0-5.85 4.77-10.6 10.65-10.6 5.86 0 10.63 4.75 10.63 10.6 0 5.85-4.77 10.77-10.53 10.77Zm5.83-7.94c-.32-.16-1.89-.93-2.18-1.04-.29-.1-.5-.16-.72.16-.21.32-.82 1.04-1 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.89-1.78-2.21-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.72-1.72-.98-2.36-.26-.62-.52-.53-.72-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65 0 1.56 1.14 3.07 1.3 3.28.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.89-.77 2.15-1.51.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

/** Floating "chat on WhatsApp" button — bottom-right; on phones it sits just above the dock. Number: Admin → Settings → Branding. */
export function WhatsAppFab() {
  const site = useSite();
  const path = usePathname();
  const num = String(site.whatsapp || "").replace(/\D/g, "");
  if (!num || path.startsWith("/admin")) return null;
  const text = encodeURIComponent(`Namaste ${site.site_name || ""}! I have a question about my report.`.replace(/\s+!/, "!"));
  return (
    <motion.a
      href={`https://wa.me/${num}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.6 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      className="group fixed right-4 bottom-[calc(5.6rem+env(safe-area-inset-bottom))] z-40 grid h-[3.25rem] w-[3.25rem] place-items-center rounded-full bg-[#25d366] text-white shadow-[0_10px_25px_-6px_rgba(18,140,70,.6)] ring-4 ring-white/70 lg:right-6 lg:bottom-6 lg:h-14 lg:w-14"
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-[#25d366]/40 [animation-duration:2.4s]" />
      <WhatsAppIcon className="relative h-7 w-7 lg:h-8 lg:w-8" />
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#128c4a] opacity-0 shadow-lg transition group-hover:opacity-100 lg:block">
        Chat on WhatsApp
      </span>
    </motion.a>
  );
}
