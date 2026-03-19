import { useState, useEffect, useRef } from "react";
import { useListDisplayActivities } from "@workspace/api-client-react";
import { useAppSettings } from "@/hooks/use-app-settings";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "@workspace/api-client-react";
import { Loader2, Users, AlertTriangle } from "lucide-react";

/* ─── Brand colours (Urban Arena purple/neon) ─────────────────── */
const C = {
  bg:          "#0A0812",
  purpleDark:  "#3B0764",
  purple:      "#7C3AED",
  purpleBright:"#A855F7",
  pink:        "#EC4899",
  neonBlue:    "#38BDF8",
  white:       "#FFFFFF",
};

export default function DisplayPage() {
  const { data: activities, isLoading: isLoadingAct } = useListDisplayActivities();
  const { settings, isLoading: isLoadingSet } = useAppSettings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const stripRef = useRef<HTMLDivElement>(null);

  const go = (idx: number) => {
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  /* Auto-slide */
  useEffect(() => {
    if (!settings.auto_slide || !activities || activities.length <= 1) return;
    const id = setInterval(() => {
      setDirection(1);
      setCurrentIndex(prev => (prev + 1) % activities.length);
    }, settings.slide_interval * 1000);
    return () => clearInterval(id);
  }, [settings.auto_slide, settings.slide_interval, activities]);

  /* Keep active thumbnail in view */
  useEffect(() => {
    if (!stripRef.current || !activities) return;
    const thumb = stripRef.current.children[currentIndex] as HTMLElement;
    if (thumb) thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentIndex, activities]);

  if (isLoadingAct || isLoadingSet) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: C.bg }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: C.purpleBright }} />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-white text-2xl font-bold" style={{ background: C.bg }}>
        NO SIGNAL
      </div>
    );
  }

  const count      = activities.length;
  const current    = activities[currentIndex];
  const prevIdx    = (currentIndex - 1 + count) % count;
  const nextIdx    = (currentIndex + 1) % count;
  const fallback   = `${import.meta.env.BASE_URL}images/placeholder-vr.png`;
  const heroUrl    = current.heroImageUrl || current.cardImageUrl || fallback;

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none cursor-none text-white flex flex-col"
      style={{ background: C.bg }}
    >
      {/* ══════════════════════════════════════════════
          BACKGROUND — blurred hero for current activity
      ══════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id + "-bg"}
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        >
          <img src={heroUrl} alt="" className="w-full h-full object-cover" style={{ filter: "blur(8px) brightness(0.25) saturate(1.8)" }} />
        </motion.div>
      </AnimatePresence>

      {/* Purple scanline overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{
        background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139,46,217,0.04) 2px, rgba(139,46,217,0.04) 4px)`,
      }} />

      {/* ══════════════════════════════════════════════
          EXPLORE WATERMARK
      ══════════════════════════════════════════════ */}
      <div className="absolute top-[3%] inset-x-0 z-10 pointer-events-none text-center overflow-hidden">
        <span className="font-black uppercase leading-none select-none" style={{
          fontSize: "clamp(46px, 19.5vw, 185px)",
          background: `linear-gradient(135deg, rgba(168,85,247,0.35) 0%, rgba(236,72,153,0.25) 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "0.08em",
          display: "block",
        }}>
          {settings.overlay_heading || "EXPLORE"}
        </span>
      </div>

      {/* ══════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════ */}
      <header className="relative z-30 flex-none flex justify-center items-center py-3">
        <div className="flex items-center gap-2 px-5 py-2 rounded-2xl" style={{
          background: "rgba(124,58,237,0.18)",
          border: "1px solid rgba(168,85,247,0.35)",
          backdropFilter: "blur(8px)",
        }}>
          {/* Neon bar-chart icon */}
          <div className="flex items-end gap-[2px]">
            <span className="w-[5px] h-[13px] rounded-sm" style={{ background: `linear-gradient(to bottom, #EC4899, ${C.purple})` }} />
            <span className="w-[5px] h-[19px] rounded-sm" style={{ background: `linear-gradient(to bottom, #EC4899, ${C.purple})` }} />
            <span className="w-[5px] h-[9px] rounded-sm"  style={{ background: `linear-gradient(to bottom, #EC4899, ${C.purple})` }} />
          </div>
          <span className="font-bold text-white" style={{ fontSize: "clamp(14px,4vw,20px)" }}>Urban Arena</span>
        </div>
      </header>

      {/* ══════════════════════════════════════════════
          MAIN CARD — current activity (card stays fixed, content fades)
      ══════════════════════════════════════════════ */}
      <div className="relative z-20 flex-1 flex items-stretch justify-center px-4 py-2 overflow-hidden">
        <div className="flex" style={{ width: "100%", maxWidth: "clamp(300px, 88vw, 700px)" }}>
          <MainCard
            activity={current}
            prevActivity={activities[prevIdx]}
            nextActivity={activities[nextIdx]}
            onPrev={() => go(prevIdx)}
            onNext={() => go(nextIdx)}
            fallback={fallback}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          THUMBNAIL STRIP — all 18 activities
      ══════════════════════════════════════════════ */}
      <div className="relative z-30 flex-none pb-1">
        <div
          ref={stripRef}
          className="flex gap-2 px-3 overflow-x-auto"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {activities.map((act, i) => (
            <motion.button
              key={act.id}
              onClick={() => go(i)}
              className="flex-none flex flex-col items-center gap-1"
              style={{ minWidth: "clamp(48px, 13vw, 72px)" }}
              whileTap={{ scale: 0.93 }}
            >
              <div
                className="w-full rounded-lg overflow-hidden"
                style={{
                  height: "clamp(48px, 11vw, 72px)",
                  border: i === currentIndex
                    ? `2px solid ${C.purpleBright}`
                    : "2px solid rgba(255,255,255,0.1)",
                  boxShadow: i === currentIndex
                    ? `0 0 12px ${C.purple}`
                    : "none",
                  transition: "border 0.3s, box-shadow 0.3s",
                  opacity: i === currentIndex ? 1 : 0.55,
                }}
              >
                <img
                  src={act.cardImageUrl || fallback}
                  alt={act.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className="text-center font-medium leading-tight text-white/70 line-clamp-2"
                style={{
                  fontSize: "clamp(7px, 1.8vw, 10px)",
                  color: i === currentIndex ? C.purpleBright : "rgba(255,255,255,0.5)",
                  transition: "color 0.3s",
                  maxWidth: "100%",
                }}
              >
                {act.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          FOOTER — age badge + terms
      ══════════════════════════════════════════════ */}
      <footer className="relative z-30 flex-none flex flex-col items-center gap-1.5 pb-3 px-4">
        <div className="flex items-center gap-3">
          {/* Age badge */}
          <div
            className="font-black text-white px-4 py-1 rounded-xl"
            style={{
              fontSize: "clamp(13px,4.5vw,20px)",
              background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`,
              boxShadow: `0 0 16px ${C.purple}80`,
            }}
          >
            {current.ageLimit}+
          </div>
          {/* Terms short */}
          <p className="text-white/50 text-center" style={{ fontSize: "clamp(9px,2.2vw,12px)", maxWidth: "clamp(200px,65vw,380px)" }}>
            {current.termsAndConditions || settings.footer_text}
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   MAIN CARD — tall portrait card, fills available height
   Image dominates upper section, rules/CTA at bottom
────────────────────────────────────────────────────────────── */
function MainCard({
  activity,
  prevActivity,
  nextActivity,
  onPrev,
  onNext,
  fallback,
}: {
  activity: Activity;
  prevActivity: Activity;
  nextActivity: Activity;
  onPrev: () => void;
  onNext: () => void;
  fallback: string;
}) {
  const img = activity.heroImageUrl || activity.cardImageUrl || fallback;

  return (
    <div
      className="relative w-full flex-1 rounded-2xl overflow-hidden flex flex-col"
      style={{
        border: `1.5px solid rgba(168,85,247,0.5)`,
        boxShadow: `0 0 80px -10px rgba(124,58,237,0.7), 0 4px 40px rgba(0,0,0,0.8)`,
        background: "#0a0812",
        minHeight: 0,
      }}
    >
      {/* ── Hero Image fills flex-1 ── */}
      <div className="relative flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <AnimatePresence mode="sync">
          <motion.img
            key={activity.id + "-img"}
            src={img}
            alt={activity.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center top" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        </AnimatePresence>

        {/* Dark gradient at bottom for legibility */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(10,8,18,0.0) 35%, rgba(10,8,18,0.98) 100%)"
        }} />

        {/* Prev / Next invisible tap zones */}
        <button
          onClick={onPrev}
          className="absolute left-0 top-0 bottom-0"
          style={{ width: "25%", zIndex: 5, background: "transparent" }}
          aria-label={`Previous: ${prevActivity.name}`}
        />
        <button
          onClick={onNext}
          className="absolute right-0 top-0 bottom-0"
          style={{ width: "25%", zIndex: 5, background: "transparent" }}
          aria-label={`Next: ${nextActivity.name}`}
        />

        {/* Activity name overlaid on image */}
        <div className="absolute bottom-0 inset-x-0 z-4 px-4 pb-2">
          <h2
            className="font-black text-white leading-tight drop-shadow-xl text-center"
            style={{
              fontSize: "clamp(22px,6vw,48px)",
              textShadow: `0 0 30px ${C.purple}`,
            }}
          >
            {activity.name}
          </h2>
        </div>
      </div>

      {/* ── Info Panel ── */}
      <AnimatePresence mode="wait">
      <motion.div
        key={activity.id + "-info"}
        className="flex-none px-4 pt-3 pb-3 flex flex-col gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.35 }}
      >
        {/* Description */}
        <p className="text-white/55 leading-snug text-center line-clamp-2" style={{ fontSize: "clamp(11px,2.8vw,15px)" }}>
          {activity.shortDescription}
        </p>

        {/* Rules box */}
        <div
          className="rounded-xl px-3 py-2 flex flex-col gap-1.5"
          style={{
            background: "rgba(124,58,237,0.14)",
            border: "1px solid rgba(168,85,247,0.3)",
          }}
        >
          {/* Age */}
          <div className="flex items-center gap-2">
            <AlertTriangle className="flex-none text-yellow-400" style={{ width: "clamp(12px,3vw,16px)", height: "clamp(12px,3vw,16px)" }} />
            <span className="font-bold text-yellow-300" style={{ fontSize: "clamp(11px,2.8vw,14px)" }}>
              Minimum Age: {activity.ageLimit}+
            </span>
          </div>
          {/* Companion policy */}
          {activity.termsAndConditions && (
            <div className="flex items-start gap-2">
              <Users className="flex-none mt-0.5 text-purple-300" style={{ width: "clamp(12px,3vw,16px)", height: "clamp(12px,3vw,16px)" }} />
              <span className="text-purple-200/75 leading-snug" style={{ fontSize: "clamp(10px,2.3vw,13px)" }}>
                <span className="font-semibold text-purple-300">Companion: </span>
                {activity.termsAndConditions}
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          className="w-full font-black text-white rounded-2xl uppercase tracking-widest"
          style={{
            fontSize: "clamp(13px,3.5vw,20px)",
            padding: "clamp(10px,2.5vw,16px) 0",
            background: `linear-gradient(135deg, ${C.purple} 0%, ${C.pink} 100%)`,
            boxShadow: `0 4px 28px ${C.purple}90`,
            border: "none",
            letterSpacing: "0.12em",
          }}
        >
          {activity.ctaText || "Explore Now"} ›
        </button>
      </motion.div>
      </AnimatePresence>
    </div>
  );
}
