import { useState, useEffect } from "react";
import { useListDisplayActivities } from "@workspace/api-client-react";
import { useAppSettings } from "@/hooks/use-app-settings";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

export default function DisplayPage() {
  const { data: activities, isLoading: isLoadingAct } = useListDisplayActivities();
  const { settings, isLoading: isLoadingSet } = useAppSettings();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!settings.auto_slide || !activities || activities.length <= 1) return;
    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, settings.slide_interval * 1000);
    return () => clearInterval(intervalId);
  }, [settings.auto_slide, settings.slide_interval, activities]);

  if (isLoadingAct || isLoadingSet) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white text-2xl font-bold">
        NO SIGNAL
      </div>
    );
  }

  const currentActivity = activities[currentIndex];
  const prevIndex = (currentIndex - 1 + activities.length) % activities.length;
  const nextIndex = (currentIndex + 1) % activities.length;

  const showVideo =
    settings.display_mode === "video_first"
      ? !!currentActivity.heroVideoUrl
      : settings.display_mode === "image_first"
      ? false
      : !!currentActivity.heroVideoUrl;

  const bgMediaUrl = showVideo
    ? currentActivity.heroVideoUrl
    : currentActivity.heroImageUrl || `${import.meta.env.BASE_URL}images/bg-abstract-red.png`;

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden select-none cursor-none flex flex-col">

      {/* ── HERO BACKGROUND ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentActivity.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 z-0"
        >
          {showVideo && bgMediaUrl ? (
            <video src={bgMediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={bgMediaUrl as string} className="w-full h-full object-cover" alt="Background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/90" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* ── EXPLORE WATERMARK ────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none overflow-hidden">
        <h1 className="text-[30vw] font-black text-white/5 tracking-tighter mix-blend-overlay whitespace-nowrap leading-none">
          {settings.overlay_heading}
        </h1>
      </div>

      {/* ── HEADER ───────────────────────────────────────────── */}
      <header className="relative z-20 flex-none flex justify-center items-center py-3 sm:py-5">
        <img
          src={`${import.meta.env.BASE_URL}images/logo-urban-arena.png`}
          alt="Urban Arena"
          className="h-10 sm:h-14 object-contain"
        />
      </header>

      {/* ── CAROUSEL ─────────────────────────────────────────── */}
      {/*
       * The carousel is a positioned container. All cards sit inside it
       * and are centered by `top:50% left:50% translate(-50%,-50%)` so
       * the card's CENTRE aligns with the container's CENTRE.
       * overflow-hidden prevents cards from bleeding into the footer.
       */}
      <div className="relative z-20 flex-1 overflow-hidden" style={{ perspective: "1500px" }}>
        {activities.length === 1 ? (
          <DisplayCard activity={currentActivity} position="center" />
        ) : (
          <>
            <DisplayCard activity={activities[prevIndex]} position="left" />
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentActivity.id}
                initial={{ y: 30, opacity: 0, scale: 0.93 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -30, opacity: 0, scale: 0.93 }}
                transition={{ duration: 0.55, type: "spring", bounce: 0.3 }}
                className="absolute inset-0 z-30"
              >
                {/* inner wrapper fills the motion.div so DisplayCard can center itself */}
                <DisplayCard activity={currentActivity} position="center" />
              </motion.div>
            </AnimatePresence>
            <DisplayCard activity={activities[nextIndex]} position="right" />
          </>
        )}
      </div>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="relative z-20 flex-none flex flex-col items-center gap-2 pb-4 sm:pb-6 px-4">
        <div className="flex gap-2 py-1">
          {activities.map((_, i) => (
            <motion.div
              key={i}
              className={`h-1 rounded-full bg-white transition-all duration-500 ${
                i === currentIndex ? "w-8 opacity-100" : "w-2 opacity-30"
              }`}
              layout
            />
          ))}
        </div>
        <div className="px-4 py-1 rounded-full border border-white/20 bg-black/40 backdrop-blur-md text-xs font-bold tracking-widest text-primary">
          AGE REQUIREMENT: {currentActivity.ageLimit}+
        </div>
        <p className="text-white/40 text-[10px] font-medium text-center max-w-xs leading-tight">
          {currentActivity.termsAndConditions || settings.footer_text}
        </p>
      </footer>
    </div>
  );
}

function DisplayCard({
  activity,
  position,
}: {
  activity: Activity;
  position: "left" | "center" | "right";
}) {
  const defaultImage = `${import.meta.env.BASE_URL}images/placeholder-vr.png`;

  /*
   * Every card is centered using top:50% left:50% translate(-50%,-50%).
   * Position offsets (left/right) are then applied ON TOP of that centering
   * via additional translateX so the card's own centre shifts left or right.
   *
   * Card is sized by height (45svh) so it always fits within the available
   * carousel area regardless of how much browser chrome eats into the screen.
   */
  const transforms: Record<string, string> = {
    left:   "translate(-50%, -50%) translateX(-80%) scale(0.74) rotateY(18deg)",
    center: "translate(-50%, -50%)",
    right:  "translate(-50%, -50%) translateX(80%) scale(0.74) rotateY(-18deg)",
  };

  const cardStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: transforms[position],
    transition: "transform 0.7s cubic-bezier(0.2,0.8,0.2,1), opacity 0.7s",
    /* Height drives sizing; width follows aspect-ratio */
    height: "clamp(240px, 45svh, 760px)",
    aspectRatio: "4 / 5",
    borderRadius: "20px",
    overflow: "hidden",
    opacity: position === "center" ? 1 : 0.38,
    zIndex: position === "center" ? 20 : 10,
    border: position === "center"
      ? "2px solid var(--color-primary, #e63535)"
      : "2px solid rgba(255,255,255,0.1)",
    boxShadow: position === "center"
      ? "0 0 80px -15px rgba(229,9,20,0.5)"
      : "none",
  };

  return (
    <div style={cardStyle}>
      <img
        src={activity.cardImageUrl || defaultImage}
        alt={activity.name}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <div className="absolute inset-0 p-[6%] flex flex-col justify-end">
        {activity.isFeatured && (
          <div className="self-start mb-auto px-2.5 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-lg shadow-primary/50">
            Featured
          </div>
        )}
        <h2 className="text-[clamp(15px,3.2svh,32px)] font-bold leading-tight mb-1">
          {activity.name}
        </h2>
        <p className="text-white/80 text-[clamp(10px,1.8svh,15px)] leading-snug mb-3 line-clamp-2">
          {activity.shortDescription}
        </p>
        <div className="w-full py-[2.5%] bg-primary text-white text-center font-bold text-[clamp(11px,2svh,17px)] rounded-xl shadow-xl shadow-primary/30 uppercase tracking-wide">
          {activity.ctaText || "Explore"}
        </div>
      </div>
    </div>
  );
}
