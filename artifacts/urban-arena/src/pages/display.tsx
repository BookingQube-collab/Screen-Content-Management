import { useState, useEffect, useRef } from "react";
import { useListDisplayActivities } from "@workspace/api-client-react";
import { useAppSettings } from "@/hooks/use-app-settings";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

/* ─── Brand colours ─────────────────────────────────────────── */
const C = {
  bg:           "#0A0812",
  purple:       "#7C3AED",
  purpleBright: "#A855F7",
  pink:         "#EC4899",
};

const VIDEO_DELAY_MS = 6000; // play video after 6s of viewing an activity

export default function DisplayPage() {
  const { data: activities, isLoading: isLoadingAct } = useListDisplayActivities();
  const { settings, isLoading: isLoadingSet }         = useAppSettings();
  const [idx, setIdx]             = useState(0);
  const [videoActive, setVideoActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const go = (next: number) => {
    if (!activities) return;
    setVideoActive(false);
    setIdx(((next % activities.length) + activities.length) % activities.length);
  };

  /* Auto-slide */
  useEffect(() => {
    if (!settings.auto_slide || !activities || activities.length <= 1) return;
    const id = setInterval(() => {
      setVideoActive(false);
      setIdx(p => (p + 1) % activities.length);
    }, settings.slide_interval * 1000);
    return () => clearInterval(id);
  }, [settings.auto_slide, settings.slide_interval, activities]);

  /* Auto-play video after idle delay */
  useEffect(() => {
    if (!activities) return;
    const act = activities[idx];
    if (!act?.heroVideoUrl) { setVideoActive(false); return; }
    setVideoActive(false);
    const t = setTimeout(() => setVideoActive(true), VIDEO_DELAY_MS);
    return () => clearTimeout(t);
  }, [idx, activities]);

  /* Play/pause video element */
  useEffect(() => {
    if (!videoRef.current) return;
    if (videoActive) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [videoActive]);

  if (isLoadingAct || isLoadingSet) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: C.bg }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: C.purpleBright }} />
      </div>
    );
  }
  if (!activities || activities.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-white text-3xl font-black" style={{ background: C.bg }}>
        NO SIGNAL
      </div>
    );
  }

  const count   = activities.length;
  const act     = activities[idx];
  const prevAct = activities[(idx - 1 + count) % count];
  const nextAct = activities[(idx + 1) % count];
  const bgImg   = act.heroImageUrl || act.cardImageUrl || "";

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none text-white flex flex-col"
      style={{ background: C.bg, fontFamily: "system-ui, sans-serif" }}
    >

      {/* ══ FULL-BLEED BACKGROUND — image layer ══ */}
      <AnimatePresence mode="sync">
        <motion.div
          key={act.id + "-bg"}
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          {bgImg && (
            <img
              src={bgImg}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: "brightness(0.5) saturate(1.7)" }}
            />
          )}
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,58,237,0.6) 0%, transparent 60%),
              linear-gradient(to bottom, rgba(10,8,18,0.3) 0%, rgba(10,8,18,0.1) 40%, rgba(10,8,18,0.9) 100%)
            `
          }} />
        </motion.div>
      </AnimatePresence>

      {/* ══ VIDEO LAYER — fades in after idle delay ══ */}
      {act.heroVideoUrl && (
        <motion.div
          className="absolute inset-0 z-1 pointer-events-none"
          animate={{ opacity: videoActive ? 1 : 0 }}
          transition={{ duration: 1.2 }}
        >
          <video
            ref={videoRef}
            src={act.heroVideoUrl}
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.45) saturate(1.6)" }}
            muted
            loop
            playsInline
            preload="auto"
          />
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,58,237,0.55) 0%, transparent 60%),
              linear-gradient(to bottom, rgba(10,8,18,0.25) 0%, rgba(10,8,18,0.1) 40%, rgba(10,8,18,0.88) 100%)
            `
          }} />
        </motion.div>
      )}

      {/* Scanlines */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{
        background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(100,0,200,0.03) 2px, rgba(100,0,200,0.03) 4px)`,
      }} />

      {/* ══ ACTIVITY NAME WATERMARK ══ */}
      <div className="absolute inset-x-0 top-[2%] z-10 pointer-events-none text-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={act.id + "-wm"}
            className="font-black uppercase leading-none"
            style={{
              fontSize: "clamp(44px, 19vw, 180px)",
              letterSpacing: "0.05em",
              background: "linear-gradient(135deg, rgba(168,85,247,0.55) 0%, rgba(236,72,153,0.35) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              display: "block",
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.5 }}
          >
            {act.name}
          </motion.span>
        </AnimatePresence>
      </div>


      {/* ══ FAN CAROUSEL ══ */}
      {/*
        Strategy: a relative container, overflow visible.
        All three cards are absolute, anchored to the horizontal center.
        Center card: left=50%, translateX(-50%) → perfectly centered.
        Left card:   left=50%, translateX(-50% - gap - ?) → pushed left.
        Right card:  left=50%, translateX(-50% + cardWidth + gap) → pushed right.
        We implement the fan offset through CSS custom classes since
        Framer Motion handles transitions, CSS handles final positions.
      */}
      <div className="relative z-20 flex-1 flex items-end justify-center" style={{ paddingBottom: "clamp(8px,2svh,24px)" }}>
        <div
          className="relative"
          style={{
            width: "100%",
            height: "clamp(240px, 50svh, 640px)",
          }}
        >

          {/* LEFT CARD */}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={prevAct.id + "-L"}
              className="absolute"
              style={{ left: "50%", bottom: 0, transformOrigin: "bottom center", zIndex: 1 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => go(idx - 1)}
            >
              <div
                style={{
                  transform: "translateX(calc(-50% - clamp(90px, 26vw, 210px))) translateY(clamp(10px,3svh,40px)) rotate(-15deg)",
                  transformOrigin: "bottom center",
                  cursor: "pointer",
                }}
              >
                <SideCard activity={prevAct} />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* RIGHT CARD */}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={nextAct.id + "-R"}
              className="absolute"
              style={{ left: "50%", bottom: 0, transformOrigin: "bottom center", zIndex: 2 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => go(idx + 1)}
            >
              <div
                style={{
                  transform: "translateX(calc(-50% + clamp(90px, 26vw, 210px))) translateY(clamp(10px,3svh,40px)) rotate(15deg)",
                  transformOrigin: "bottom center",
                  cursor: "pointer",
                }}
              >
                <SideCard activity={nextAct} />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* CENTER CARD */}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={act.id + "-C"}
              className="absolute"
              style={{ left: "50%", bottom: 0, zIndex: 3 }}
              initial={{ opacity: 0, scale: 0.88, y: 30, x: "-50%" }}
              animate={{ opacity: 1, scale: 1,  y: 0,  x: "-50%" }}
              exit={{ opacity: 0, scale: 0.88,  y: 30, x: "-50%" }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
            >
              <CenterCard activity={act} onNext={() => go(idx + 1)} />
            </motion.div>
          </AnimatePresence>

        </div>
      </div>

      {/* ══ PROGRESS DOTS ══ */}
      <div className="relative z-30 flex-none flex items-center justify-center gap-[5px] py-2">
        {activities.map((_, i) => {
          const active = i === idx;
          return (
            <motion.button
              key={i}
              onClick={() => go(i)}
              animate={{ width: active ? "clamp(22px,6vw,40px)" : "clamp(5px,1.5vw,8px)", opacity: active ? 1 : 0.3 }}
              transition={{ duration: 0.28 }}
              style={{
                height: "clamp(5px,1.2vw,8px)",
                borderRadius: 999,
                background: active ? `linear-gradient(90deg,${C.purple},${C.pink})` : "rgba(255,255,255,0.55)",
                border: "none",
                padding: 0,
                flexShrink: 0,
                cursor: "pointer",
              }}
            />
          );
        })}
      </div>

      {/* ══ FOOTER ══ */}
      <footer className="relative z-30 flex-none flex flex-col items-center gap-1 pb-4">
        {/* Age badge */}
        <div
          className="font-black text-white rounded-xl"
          style={{
            fontSize: "clamp(17px,5.5vw,28px)",
            padding: "clamp(3px,1vw,6px) clamp(14px,4vw,22px)",
            background: `linear-gradient(135deg,${C.purple},${C.pink})`,
            boxShadow: `0 0 22px ${C.purple}90`,
          }}
        >
          {act.ageLimit || 18}+
        </div>
        {/* Terms / companion rule */}
        <p
          className="text-center text-white/50"
          style={{ fontSize: "clamp(10px,2.4vw,13px)", maxWidth: "clamp(200px,68vw,380px)", lineHeight: 1.4 }}
        >
          {act.termsAndConditions || settings.footer_text || "By continuing you agree to the Terms and Conditions."}
        </p>
      </footer>
    </div>
  );
}

/* ─── CENTER CARD ──────────────────────────────────────────── */
function CenterCard({
  activity,
  onNext,
}: {
  activity: { id: number; name: string; cardImageUrl?: string|null; heroImageUrl?: string|null; ctaText?: string|null };
  onNext: () => void;
}) {
  const img = activity.cardImageUrl || activity.heroImageUrl || `https://picsum.photos/seed/${activity.id}/400/560`;
  return (
    <div
      style={{
        width: "clamp(185px, 54vw, 360px)",
        height: "clamp(250px, 50svh, 580px)",
        borderRadius: "clamp(14px,3.5vw,24px)",
        overflow: "hidden",
        position: "relative",
        border: "2px solid rgba(168,85,247,0.75)",
        boxShadow: `0 16px 70px rgba(124,58,237,0.55), 0 4px 24px rgba(0,0,0,0.7)`,
      }}
    >
      <img src={img} alt={activity.name} className="w-full h-full object-cover" />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, transparent 35%, rgba(8,5,20,0.97) 100%)" }}
      />
      <div className="absolute bottom-0 inset-x-0 flex flex-col items-center gap-2" style={{ padding: "clamp(10px,3vw,20px)" }}>
        <h3
          className="font-black text-white text-center leading-tight"
          style={{ fontSize: "clamp(17px,5.5vw,30px)", textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}
        >
          {activity.name}
        </h3>
        <button
          onClick={onNext}
          className="font-semibold text-white"
          style={{
            fontSize: "clamp(11px,3vw,15px)",
            padding: "clamp(5px,1.4vw,9px) clamp(16px,5vw,28px)",
            borderRadius: "clamp(8px,2vw,14px)",
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.38)",
            backdropFilter: "blur(6px)",
            cursor: "pointer",
          }}
        >
          {activity.ctaText || "Explore Now"} ▾
        </button>
      </div>
    </div>
  );
}

/* ─── SIDE CARD ────────────────────────────────────────────── */
function SideCard({
  activity,
}: {
  activity: { id: number; name: string; cardImageUrl?: string|null; heroImageUrl?: string|null };
}) {
  const img = activity.cardImageUrl || activity.heroImageUrl || `https://picsum.photos/seed/${activity.id}/300/420`;
  return (
    <div
      style={{
        width: "clamp(130px, 37vw, 250px)",
        height: "clamp(180px, 38svh, 420px)",
        borderRadius: "clamp(12px,3vw,20px)",
        overflow: "hidden",
        position: "relative",
        border: "1px solid rgba(168,85,247,0.35)",
        boxShadow: "0 6px 28px rgba(0,0,0,0.65)",
      }}
    >
      <img src={img} alt={activity.name} className="w-full h-full object-cover" />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, transparent 42%, rgba(8,5,20,0.93) 100%)" }}
      />
      <div className="absolute bottom-0 inset-x-0 px-2 pb-2 text-center">
        <p
          className="font-bold text-white leading-tight"
          style={{ fontSize: "clamp(11px,3.2vw,17px)", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}
        >
          {activity.name}
        </p>
      </div>
    </div>
  );
}
