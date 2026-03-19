import { useState, useEffect } from "react";
import { useListDisplayActivities } from "@workspace/api-client-react";
import { useAppSettings } from "@/hooks/use-app-settings";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "@workspace/api-client-react";
import { Loader2, BarChart2 } from "lucide-react";

export default function DisplayPage() {
  const { data: activities, isLoading: isLoadingAct } = useListDisplayActivities();
  const { settings, isLoading: isLoadingSet } = useAppSettings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = (idx: number) => {
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  useEffect(() => {
    if (!settings.auto_slide || !activities || activities.length <= 1) return;
    const id = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, settings.slide_interval * 1000);
    return () => clearInterval(id);
  }, [settings.auto_slide, settings.slide_interval, activities]);

  if (isLoadingAct || isLoadingSet) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
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

  const count = activities.length;
  const current = activities[currentIndex];
  const prevIdx = (currentIndex - 1 + count) % count;
  const nextIdx = (currentIndex + 1) % count;
  const prev = activities[prevIdx];
  const next = activities[nextIdx];

  const heroUrl =
    current.heroImageUrl ||
    current.cardImageUrl ||
    `${import.meta.env.BASE_URL}images/bg-abstract-red.png`;

  return (
    <div className="fixed inset-0 overflow-hidden select-none cursor-none text-white">

      {/* ═══════════════════════════════════════════════
          BACKGROUND — full-bleed hero with gradient
      ═══════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id + "-bg"}
          className="absolute inset-0 z-0"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          <img
            src={heroUrl}
            alt=""
            className="w-full h-full object-cover"
          />
          {/* darken bottom for card readability, keep top visible */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/85" />
        </motion.div>
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════
          EXPLORE WATERMARK — prominent, behind header
          Uses absolute left:50% + translateX(-50%) so the
          text is always centred; overflow clips both sides.
      ═══════════════════════════════════════════════ */}
      {/*
       * EXPLORE watermark — centered, bold, slightly transparent.
       * font-size is tuned so "EXPLORE" (7 chars) fills ~90-95% of
       * the viewport width, so text-align:center naturally centres it.
       */}
      <div className="absolute top-[4%] inset-x-0 z-10 pointer-events-none text-center">
        <span
          className="font-black uppercase leading-none select-none"
          style={{
            fontSize: "clamp(46px, 19.5vw, 185px)",
            color: "rgba(165,10,10,0.52)",
            letterSpacing: "0.08em",
          }}
        >
          {settings.overlay_heading || "EXPLORE"}
        </span>
      </div>

      {/* ═══════════════════════════════════════════════
          HEADER — logo + brand name
      ═══════════════════════════════════════════════ */}
      <header className="absolute top-0 inset-x-0 z-30 flex justify-center items-center pt-4 pb-2">
        <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-2xl">
          <div className="flex items-end gap-[2px]">
            <span className="w-[6px] h-[14px] rounded-sm bg-gradient-to-b from-orange-400 to-red-600" />
            <span className="w-[6px] h-[20px] rounded-sm bg-gradient-to-b from-orange-400 to-red-600" />
            <span className="w-[6px] h-[10px] rounded-sm bg-gradient-to-b from-orange-400 to-red-600" />
          </div>
          <span className="text-[clamp(14px,4.5vw,22px)] font-bold text-white tracking-wide">
            Urban Arena
          </span>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════
          FAN CAROUSEL — cards at bottom of screen
      ═══════════════════════════════════════════════ */}
      {/*
       * The carousel sits in the lower portion of the screen.
       * Cards share a common bottom anchor; side cards rotate outward
       * (rotateZ) like a hand of playing cards.
       * Tapping a side card advances the carousel to that activity.
       */}
      <div
        className="absolute inset-x-0 z-20"
        style={{
          bottom: "calc(15% + 12px)",
          height: "clamp(240px, 42svh, 580px)",
        }}
      >
        {count === 1 ? (
          /* single activity — center card only */
          <FanCard activity={current} position="center" onClick={() => {}} />
        ) : (
          <>
            {/* LEFT card */}
            <AnimatePresence>
              <motion.div
                key={"left-" + prevIdx}
                className="absolute bottom-0 cursor-pointer"
                style={{
                  left: "8%",
                  transformOrigin: "bottom center",
                }}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                onClick={() => go(prevIdx)}
              >
                <FanCard activity={prev} position="left" onClick={() => go(prevIdx)} />
              </motion.div>
            </AnimatePresence>

            {/* CENTER card */}
            <AnimatePresence mode="popLayout">
              <motion.div
                key={"center-" + currentIndex}
                className="absolute bottom-0"
                style={{ left: "50%", x: "-50%", zIndex: 30 }}
                initial={{ opacity: 0, y: direction > 0 ? 40 : -40, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: direction > 0 ? -40 : 40, scale: 0.9 }}
                transition={{ duration: 0.5, type: "spring", bounce: 0.25 }}
              >
                <FanCard activity={current} position="center" onClick={() => {}} />
              </motion.div>
            </AnimatePresence>

            {/* RIGHT card */}
            <AnimatePresence>
              <motion.div
                key={"right-" + nextIdx}
                className="absolute bottom-0 cursor-pointer"
                style={{
                  right: "8%",
                  transformOrigin: "bottom center",
                }}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.4 }}
                onClick={() => go(nextIdx)}
              >
                <FanCard activity={next} position="right" onClick={() => go(nextIdx)} />
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          FOOTER — progress + age + terms
      ═══════════════════════════════════════════════ */}
      <footer
        className="absolute bottom-0 inset-x-0 z-30 flex flex-col items-center gap-2 pb-4"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}
      >
        {/* Progress indicator */}
        <div className="flex items-center gap-1.5 w-[60%] max-w-xs">
          {activities.map((_, i) => (
            <motion.div
              key={i}
              layout
              onClick={() => go(i)}
              className="cursor-pointer rounded-full bg-white"
              style={{
                height: 4,
                flex: i === currentIndex ? 3 : 1,
                opacity: i === currentIndex ? 1 : 0.35,
                backgroundColor: i === currentIndex ? "#e53535" : "white",
              }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* Age badge — solid red, square-ish */}
        <div
          className="px-5 py-1.5 rounded-xl font-black text-white"
          style={{
            fontSize: "clamp(14px, 5vw, 22px)",
            background: "#e53535",
          }}
        >
          {current.ageLimit}+
        </div>

        {/* Terms */}
        <p className="text-white/50 text-[10px] sm:text-xs text-center px-6 leading-tight">
          {current.termsAndConditions || settings.footer_text}
        </p>
      </footer>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   FAN CARD
   Position drives the visual style:
   - "center"  → upright, full content, red border glow
   - "left"    → rotated CW by 15°, shifted up 8%, dimmed
   - "right"   → rotated CCW by 15°, shifted up 8%, dimmed
──────────────────────────────────────────────────────────── */
function FanCard({
  activity,
  position,
  onClick,
}: {
  activity: Activity;
  position: "left" | "center" | "right";
  onClick: () => void;
}) {
  const fallback = `${import.meta.env.BASE_URL}images/placeholder-vr.png`;

  const isCenter = position === "center";

  const cardStyle: React.CSSProperties = {
    /* Height drives sizing → width from aspect-ratio */
    height: isCenter ? "clamp(220px, 40svh, 520px)" : "clamp(170px, 31svh, 400px)",
    aspectRatio: "3 / 4",
    borderRadius: isCenter ? 20 : 16,
    overflow: "hidden",
    position: "relative",
    transform: isCenter
      ? "none"
      : position === "left"
      ? "rotate(-14deg) translateY(8%)"
      : "rotate(14deg) translateY(8%)",
    transformOrigin: "bottom center",
    boxShadow: isCenter
      ? "0 8px 60px -10px rgba(229,53,53,0.6), 0 2px 20px rgba(0,0,0,0.6)"
      : "0 4px 20px rgba(0,0,0,0.5)",
    border: isCenter ? "2px solid rgba(229,53,53,0.7)" : "1.5px solid rgba(255,255,255,0.12)",
    opacity: isCenter ? 1 : 0.82,
    cursor: isCenter ? "default" : "pointer",
  };

  return (
    <div style={cardStyle} onClick={onClick}>
      {/* Hero image */}
      <img
        src={activity.cardImageUrl || fallback}
        alt={activity.name}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradient overlay — stronger at bottom for text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Card content */}
      <div className="absolute inset-0 p-[6%] flex flex-col justify-end">
        {isCenter && activity.isFeatured && (
          <div
            className="self-start mb-1 px-2 py-0.5 text-white font-bold uppercase tracking-wider rounded"
            style={{ fontSize: "clamp(8px,2vw,11px)", background: "#e53535" }}
          >
            Featured
          </div>
        )}

        <h2
          className="font-bold leading-tight text-white"
          style={{ fontSize: isCenter ? "clamp(15px,4vw,28px)" : "clamp(12px,3vw,18px)" }}
        >
          {activity.name}
        </h2>

        {isCenter && (
          <>
            <p
              className="text-white/70 mt-0.5 mb-3 line-clamp-2"
              style={{ fontSize: "clamp(10px,2.5vw,14px)" }}
            >
              {activity.shortDescription}
            </p>
            <div
              className="w-full text-center font-bold text-white rounded-xl uppercase tracking-wide"
              style={{
                fontSize: "clamp(11px,3vw,16px)",
                padding: "clamp(8px,2svh,14px) 0",
                background: "rgba(255,255,255,0.15)",
                border: "1.5px solid rgba(255,255,255,0.35)",
                backdropFilter: "blur(4px)",
              }}
            >
              {activity.ctaText || "Explore Now"} ›
            </div>
          </>
        )}
      </div>
    </div>
  );
}
