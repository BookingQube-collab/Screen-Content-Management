import { useState, useEffect } from "react";
import { useListDisplayActivities } from "@workspace/api-client-react";
import { useAppSettings } from "@/hooks/use-app-settings";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Play, ArrowRight } from "lucide-react";

const C = {
  bg:           "#0A0812",
  purple:       "#7C3AED",
  purpleBright: "#A855F7",
  pink:         "#EC4899",
};

export default function DisplayPage() {
  const { data: activities, isLoading: isLoadingAct } = useListDisplayActivities();
  const { settings, isLoading: isLoadingSet }         = useAppSettings();
  const [idx, setIdx] = useState(0);

  const go = (next: number) => {
    if (!activities) return;
    setIdx(((next % activities.length) + activities.length) % activities.length);
  };

  useEffect(() => {
    if (!settings.auto_slide || !activities || activities.length <= 1) return;
    const act = activities[idx];
    if (act?.heroVideoUrl) return;
    const id = setInterval(
      () => setIdx(p => (p + 1) % activities.length),
      settings.slide_interval * 1000
    );
    return () => clearInterval(id);
  }, [settings.auto_slide, settings.slide_interval, activities, idx]);

  if (isLoadingAct || isLoadingSet) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: C.bg }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: C.purpleBright }} />
      </div>
    );
  }
  if (!activities || activities.length === 0) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center text-white text-3xl font-black"
        style={{ background: C.bg }}
      >
        NO SIGNAL
      </div>
    );
  }

  const count   = activities.length;
  const act     = activities[idx];
  const nextAct = activities[(idx + 1) % count];
  const img     = act.heroImageUrl || act.cardImageUrl
    || `https://picsum.photos/seed/${act.id}/800/1200`;
  const nextImg = nextAct.heroImageUrl || nextAct.cardImageUrl
    || `https://picsum.photos/seed/${nextAct.id}/400/300`;

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none text-white"
      style={{
        background: C.bg,
        fontFamily: "system-ui, sans-serif",
        display: "grid",
        gridTemplateRows: "1fr auto",
      }}
    >
      {/* ══ MAIN CONTENT AREA ══ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={act.id}
          className="overflow-hidden"
          style={{ display: "grid", gridTemplateColumns: "55% 45%" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55 }}
        >
          {/* ── LEFT: Full-bleed hero image ── */}
          <div
            className="relative overflow-hidden"
            style={{
              background: `linear-gradient(140deg, ${C.purple}99 0%, ${C.bg} 100%)`,
            }}
          >
            {img && (
              <img
                src={img}
                alt={act.name}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "brightness(0.78) saturate(1.5)" }}
              />
            )}
            {/* Vignette + purple tint */}
            <div
              className="absolute inset-0"
              style={{
                background: `
                  linear-gradient(to right, rgba(124,58,237,0.22) 0%, transparent 70%),
                  linear-gradient(to top, rgba(10,8,18,0.65) 0%, transparent 55%)
                `,
              }}
            />
            {/* Scanlines */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(100,0,200,0.04) 2px,
                  rgba(100,0,200,0.04) 4px
                )`,
              }}
            />
          </div>

          {/* ── RIGHT: Info panel ── */}
          <div
            className="relative flex flex-col overflow-hidden"
            style={{
              background: `linear-gradient(160deg, rgba(124,58,237,0.32) 0%, rgba(10,8,18,0.97) 55%)`,
              borderLeft: `1px solid rgba(168,85,247,0.22)`,
            }}
          >
            {/* Watermark — activity name fills the right panel */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={act.id + "-wm"}
                  className="font-black uppercase leading-none whitespace-nowrap"
                  style={{
                    fontSize: "clamp(48px,10vw,120px)",
                    letterSpacing: "0.04em",
                    background:
                      "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(236,72,153,0.09) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    marginLeft: "-4%",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {act.name}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Text content */}
            <div
              className="relative flex flex-col flex-1"
              style={{ padding: "clamp(18px,3.5vh,44px) clamp(18px,2.8vw,40px) 0" }}
            >
              {/* Age badge */}
              <div style={{ marginBottom: "clamp(10px,1.5vh,18px)" }}>
                <span
                  className="font-black text-white rounded-lg inline-block"
                  style={{
                    fontSize: "clamp(11px,1.4vw,18px)",
                    padding: "3px 14px",
                    background: `linear-gradient(135deg,${C.purple},${C.pink})`,
                    boxShadow: `0 0 18px ${C.purple}70`,
                  }}
                >
                  {act.ageLimit || 18}+
                </span>
              </div>

              {/* Activity name */}
              <AnimatePresence mode="wait">
                <motion.h1
                  key={act.id + "-title"}
                  className="font-black text-white leading-tight"
                  style={{
                    fontSize: "clamp(22px,4.5vw,56px)",
                    marginBottom: "clamp(8px,1.2vh,16px)",
                  }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.38 }}
                >
                  {act.name}
                </motion.h1>
              </AnimatePresence>

              {/* Description */}
              {act.description && (
                <AnimatePresence mode="wait">
                  <motion.p
                    key={act.id + "-desc"}
                    className="text-white/65 leading-relaxed"
                    style={{
                      fontSize: "clamp(11px,1.4vw,17px)",
                      maxWidth: "34ch",
                      marginBottom: "clamp(10px,1.8vh,22px)",
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.38, delay: 0.06 }}
                  >
                    {act.description}
                  </motion.p>
                </AnimatePresence>
              )}

              {/* CTA button */}
              <div style={{ marginBottom: "auto" }}>
                <button
                  className="font-bold text-white flex items-center gap-2"
                  style={{
                    fontSize: "clamp(11px,1.3vw,16px)",
                    padding: "clamp(6px,1.2vh,12px) clamp(14px,2vw,24px)",
                    borderRadius: "clamp(8px,1.5vw,14px)",
                    background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`,
                    boxShadow: `0 6px 28px ${C.purple}60`,
                    border: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => go(idx + 1)}
                >
                  {act.ctaText || "Book Now"}
                  <ArrowRight style={{ width: "1em", height: "1em" }} />
                </button>
              </div>

              {/* ── Bottom two panels ── */}
              <div
                className="flex gap-[2px] mt-auto"
                style={{ height: "clamp(90px,20vh,190px)" }}
              >
                {/* Video / media panel */}
                <div
                  className="flex-1 relative overflow-hidden"
                  style={{ background: "rgba(0,0,0,0.75)" }}
                >
                  {act.heroVideoUrl ? (
                    <video
                      key={act.id}
                      src={act.heroVideoUrl}
                      className="w-full h-full object-cover"
                      style={{ filter: "brightness(0.58)" }}
                      autoPlay
                      muted
                      playsInline
                      preload="auto"
                      onEnded={() => go(idx + 1)}
                    />
                  ) : (
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ filter: "brightness(0.52) saturate(1.5)" }}
                    />
                  )}
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="rounded-full flex items-center justify-center"
                      style={{
                        width: "clamp(28px,4.5vw,52px)",
                        height: "clamp(28px,4.5vw,52px)",
                        background: "rgba(255,255,255,0.88)",
                      }}
                    >
                      <Play
                        fill={C.purple}
                        color={C.purple}
                        style={{ width: "42%", height: "42%", marginLeft: "8%" }}
                      />
                    </div>
                  </div>
                  {/* "Live" label */}
                  {act.heroVideoUrl && (
                    <div
                      className="absolute top-2 left-2 flex items-center gap-1"
                      style={{
                        background: "rgba(236,72,153,0.88)",
                        borderRadius: "4px",
                        padding: "2px 8px",
                        fontSize: "clamp(8px,1vw,11px)",
                        fontWeight: 700,
                        color: "#fff",
                        letterSpacing: "0.08em",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#fff",
                          animation: "pulse 1.2s infinite",
                        }}
                      />
                      LIVE
                    </div>
                  )}
                </div>

                {/* Next activity panel */}
                <div
                  className="relative overflow-hidden flex flex-col justify-end cursor-pointer"
                  style={{
                    width: "clamp(70px,13vw,150px)",
                    background: "rgba(0,0,0,0.88)",
                    padding: "clamp(8px,1.5vw,14px)",
                  }}
                  onClick={() => go(idx + 1)}
                >
                  {nextImg && (
                    <img
                      src={nextImg}
                      alt={nextAct.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ filter: "brightness(0.42) saturate(1.3)" }}
                    />
                  )}
                  <div className="relative z-10">
                    <p
                      className="text-white/50 font-semibold uppercase"
                      style={{
                        fontSize: "clamp(7px,0.9vw,10px)",
                        letterSpacing: "0.1em",
                        marginBottom: 3,
                      }}
                    >
                      Next
                    </p>
                    <p
                      className="text-white font-bold leading-snug"
                      style={{ fontSize: "clamp(9px,1.1vw,13px)" }}
                    >
                      {nextAct.name}
                    </p>
                    <ArrowRight
                      className="mt-1"
                      style={{
                        width: "clamp(12px,1.8vw,18px)",
                        height: "clamp(12px,1.8vw,18px)",
                        color: C.purpleBright,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ══ BOTTOM BAR ══ */}
      <div
        className="flex items-center"
        style={{
          background: "rgba(10,8,18,0.96)",
          borderTop: `1px solid rgba(168,85,247,0.22)`,
          minHeight: "clamp(44px,8vh,68px)",
          padding: "0 clamp(14px,2vw,32px)",
          gap: "clamp(12px,3vw,40px)",
        }}
      >
        {/* Terms / companion policy */}
        <p
          className="text-white/45 flex-1"
          style={{ fontSize: "clamp(9px,1.1vw,13px)", lineHeight: 1.4 }}
        >
          {act.termsAndConditions ||
            settings.footer_text ||
            "Companion policy applies. Refer to kiosk staff for details."}
        </p>

        {/* Progress dots */}
        <div className="flex items-center gap-[4px] flex-shrink-0">
          {activities.map((_, i) => {
            const active = i === idx;
            return (
              <motion.button
                key={i}
                onClick={() => go(i)}
                animate={{
                  width: active ? "clamp(16px,3.5vw,30px)" : "clamp(4px,0.9vw,7px)",
                  opacity: active ? 1 : 0.3,
                }}
                transition={{ duration: 0.26 }}
                style={{
                  height: "clamp(4px,0.9vw,7px)",
                  borderRadius: 999,
                  background: active
                    ? `linear-gradient(90deg,${C.purple},${C.pink})`
                    : "rgba(255,255,255,0.5)",
                  border: "none",
                  padding: 0,
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Pulse keyframe */}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </div>
  );
}
