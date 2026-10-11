"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, useIsPresent } from "framer-motion";
import { Calendar, MapPin, X } from "lucide-react";
import { EventGallery } from "@/components/events/EventGallery";
import { galleryFor } from "@/content/event-gallery";

/** What the dialog shows: a full PublicEvent fits, and so does a plain entry from the home page. */
export interface EventDetail {
  id: string;
  title: string;
  type: string;
  description: string;
  location: string;
  /** Photos to show. Entries from the home page leave this out and use the bundled set. */
  images?: string[];
}

/** Full view of an event with its photo carousel. `when` is the already formatted date line. */
export function EventDetailDialog({ event, when, onClose }: { event: EventDetail; when: string; onClose: () => void }) {
  const images = event.images ?? galleryFor(event.id);
  const isPresent = useIsPresent();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // While open, the rest of the page is not painted (see `.gallery-open` in globals.css): its blurred cards and
  // animated backdrops made the carousel stutter. Released as soon as the close animation starts.
  useEffect(() => {
    if (!isPresent) return;
    document.body.classList.add("gallery-open");
    return () => document.body.classList.remove("gallery-open");
  }, [isPresent]);

  // Rendered straight into <body> so no transformed ancestor on the page can offset the fixed overlay.
  return createPortal(
    <motion.div
      data-gallery-keep
      // `visible` keeps this layer painted while the rest of the page is hidden. The scrim is near-opaque
      // instead of blurred, because blurring the live page behind every frame made the carousel stutter.
      className="visible fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
        className="glass-card relative max-h-[92vh] w-full max-w-2xl space-y-5 overflow-y-auto p-5 sm:p-7 [-webkit-backdrop-filter:none] [backdrop-filter:none]"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-20 rounded-full border border-white/15 bg-black/50 p-2 text-white/70 hover:text-white">
          <X className="h-4 w-4" />
        </button>

        <EventGallery images={images} title={event.title} />

        <div className="space-y-3">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-400 uppercase">{event.type}</span>
          <h2 className="text-2xl font-bold text-white">{event.title}</h2>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{event.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono pt-1">
            <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-emerald-400" /><span>{when}</span></div>
            <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-cyan-400" /><span>{event.location}</span></div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
