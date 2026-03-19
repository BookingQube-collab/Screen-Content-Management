import { useState, useEffect, useRef } from "react";
import { useListDisplayActivities } from "@workspace/api-client-react";
import { useAppSettings }            from "@/hooks/use-app-settings";
import { motion, AnimatePresence }   from "framer-motion";
import { Loader2 }                    from "lucide-react";

const PURPLE = "#7C3AED";
const PINK   = "#EC4899";
const DARK   = "#0c0820";

export default function DisplayPage() {
  const { data: activities, isLoading: loadAct } = useListDisplayActivities();
  const { settings,         isLoading: loadSet } = useAppSettings();
  const [idx, setIdx] = useState(0);

  const go = (next: number) => {
    if (!activities) return;
    setIdx(((next % activities.length) + activities.length) % activities.length);
  };

  const touchStartX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) go(idx + (delta < 0 ? 1 : -1));
    touchStartX.current = null;
  };

  useEffect(() => {
    if (!settings.auto_slide || !activities || activities.length <= 1) return;
    if (activities[idx]?.heroVideoUrl) return;
    const id = setInterval(
      () => setIdx(p => (p + 1) % activities.length),
      settings.slide_interval * 1000,
    );
    return () => clearInterval(id);
  }, [settings.auto_slide, settings.slide_interval, activities, idx]);

  if (loadAct || loadSet) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: DARK }}>
      <Loader2 className="w-12 h-12 animate-spin" style={{ color: PINK }} />
    </div>
  );
  if (!activities?.length) return (
    <div className="fixed inset-0 flex items-center justify-center text-white text-3xl font-black" style={{ background: DARK }}>
      NO SIGNAL
    </div>
  );

  const count   = activities.length;
  const act     = activities[idx];
  const nextAct = activities[(idx + 1) % count];
  const img     = act.heroImageUrl     || act.cardImageUrl     || `https://picsum.photos/seed/${act.id}/1200/900`;
  const nextImg = nextAct.heroImageUrl || nextAct.cardImageUrl || `https://picsum.photos/seed/${nextAct.id}/400/300`;

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none text-white"
      style={{ fontFamily: "system-ui, sans-serif", display: "grid", gridTemplateRows: "80% 20%" }}
    >

      {/* ══════════════════════════════════════════════
          TOP 80% — full-bleed video (if set) or image + text overlay
          Touch-swipe left/right to navigate between activities
      ══════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >

        {/* Hero video — plays full-bleed when a video URL is set for this activity */}
        {act.heroVideoUrl ? (
          <video
            key={act.id + "-vid"}
            src={act.heroVideoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "brightness(0.85) saturate(1.3)" }}
            autoPlay muted playsInline preload="auto"
            onEnded={() => go(idx + 1)}
          />
        ) : (
          /* Hero image — crossfades on activity change */
          <AnimatePresence mode="wait">
            <motion.img
              key={act.id + "-img"}
              src={img}
              alt={act.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "brightness(1.0) saturate(1.4) contrast(1.05)" }}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
            />
          </AnimatePresence>
        )}

        {/* LIVE badge — shown in top-left when video is playing */}
        {act.heroVideoUrl && (
          <div
            className="absolute top-3 left-4 flex items-center gap-1.5 font-black z-10"
            style={{ background: PINK, borderRadius: 4, padding: "3px 10px", fontSize: "clamp(8px,1vw,13px)", color: "#fff", letterSpacing: "0.12em" }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "inline-block", animation: "lp 1.2s infinite" }} />
            LIVE
          </div>
        )}

        {/* ── Text overlay, watermark & gradients — hidden when video is playing ── */}
        {!act.heroVideoUrl && (
          <>
            {/* Right-side text backdrop */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `
                  linear-gradient(to left, rgba(12,8,32,0.68) 0%, rgba(12,8,32,0.35) 40%, transparent 62%),
                  linear-gradient(to top,  rgba(12,8,32,0.40) 0%, transparent 35%)
                `,
              }}
            />
            {/* Purple accent glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse 50% 50% at 80% 15%, ${PURPLE}28 0%, transparent 70%)` }}
            />

            {/* Ghost watermark */}
            <AnimatePresence mode="wait">
              <motion.span
                key={act.id + "-wm"}
                className="absolute font-black uppercase pointer-events-none leading-none"
                style={{
                  fontSize:      "clamp(60px,13vw,160px)",
                  letterSpacing: "0.04em",
                  color:         "rgba(255,255,255,0.07)",
                  right:         "-2%",
                  bottom:        "18%",
                  whiteSpace:    "nowrap",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {act.name}
              </motion.span>
            </AnimatePresence>

            {/* Text overlay — right side, vertically centred */}
            <AnimatePresence mode="wait">
              <motion.div
                key={act.id + "-text"}
                className="absolute flex flex-col justify-center"
                style={{ top: "10%", bottom: "10%", left: "50%", right: "clamp(20px,4vw,60px)" }}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.4 }}
              >
                <h1
                  className="font-black text-white leading-none"
                  style={{ fontSize: "clamp(28px,6vw,78px)", marginBottom: "clamp(10px,2%,22px)", textShadow: "0 4px 24px rgba(0,0,0,0.7)" }}
                >
                  {act.name}
                </h1>
                <p
                  style={{ fontSize: "clamp(11px,1.5vw,19px)", lineHeight: 1.6, color: "rgba(255,255,255,0.80)", maxWidth: "32ch", marginBottom: "clamp(10px,2.5%,28px)", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}
                >
                  {act.description || "An exciting activity that pushes your limits and delivers an unforgettable experience."}
                </p>
                <p
                  className="font-bold text-white"
                  style={{ fontSize: "clamp(14px,2.2vw,28px)", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}
                >
                  {act.ageLimit || 18}+ Age Limit
                </p>
              </motion.div>
            </AnimatePresence>
          </>
        )}

        {/* ── Progress dots (bottom-centre of hero) ── */}
        <div
          className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-[5px] z-10"
        >
          {activities.map((_, i) => {
            const active = i === idx;
            return (
              <motion.button
                key={i}
                onClick={() => go(i)}
                animate={{
                  width:   active ? "clamp(18px,3.5vw,32px)" : "clamp(4px,0.8vw,7px)",
                  opacity: active ? 1 : 0.35,
                }}
                transition={{ duration: 0.24 }}
                style={{
                  height:       "clamp(4px,0.8vw,7px)",
                  borderRadius: 999,
                  background:   active
                    ? `linear-gradient(90deg,${PURPLE},${PINK})`
                    : "rgba(255,255,255,0.5)",
                  border:    "none",
                  padding:   0,
                  flexShrink: 0,
                  cursor:    "pointer",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          BOTTOM 20% — stats bar + next item
      ══════════════════════════════════════════════ */}
      <div
        className="flex"
        style={{ background: DARK, borderTop: "1px solid rgba(168,85,247,0.25)" }}
      >

        {/* ── Stats — flex: 1, fills all space except Next Item ── */}
        <div className="flex items-stretch" style={{ flex: 1 }}>
          <StatCell num={`${act.ageLimit || 18}`} unit="+"       label="Min Age" />
          <StatCell num={String(idx + 1).padStart(2, "0")} unit={`/${count}`} label="Activity" />
          <StatCell num={act.heroVideoUrl ? "LIVE" : "OPEN"} unit="" label="Status" accent={!!act.heroVideoUrl} />
        </div>

        {/* ── Next Item panel ── */}
        <div
          className="relative overflow-hidden cursor-pointer flex-none"
          style={{ width: "clamp(90px,14vw,170px)", background: PURPLE }}
          onClick={() => go(idx + 1)}
        >
          <img
            src={nextImg}
            alt={nextAct.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "brightness(0.48) saturate(1.4)" }}
          />
          <div className="absolute inset-0" style={{ background: `${PURPLE}66` }} />
          <div
            className="absolute inset-0 flex flex-col items-center justify-end text-center"
            style={{ padding: "clamp(4px,0.8vw,12px)" }}
          >
            <p
              className="font-semibold uppercase"
              style={{ fontSize: "clamp(6px,0.8vw,10px)", color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: 2 }}
            >
              Next Item
            </p>
            <p
              className="font-bold text-white leading-snug"
              style={{ fontSize: "clamp(7px,1vw,13px)" }}
            >
              {nextAct.name}
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes lp{0%,100%{opacity:1}50%{opacity:0.25}}`}</style>
    </div>
  );
}

/* ─── Stat cell ──────────────────────────────────────────────── */
function StatCell({
  num, unit, label, accent = false,
}: { num: string; unit: string; label: string; accent?: boolean }) {
  return (
    <div
      className="flex-1 flex flex-col items-start justify-center text-white"
      style={{ padding: "clamp(6px,1.5vw,20px) clamp(10px,2vw,26px)", borderRight: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="font-black leading-none" style={{ fontSize: "clamp(14px,3.2vw,44px)" }}>
        <span style={{ color: accent ? PINK : "white" }}>{num}</span>
        <span style={{ fontSize: "0.5em", color: accent ? PINK : "white" }}>{unit}</span>
      </div>
      <span
        className="font-semibold uppercase"
        style={{ fontSize: "clamp(6px,0.8vw,11px)", color: "rgba(255,255,255,0.38)", marginTop: 3, letterSpacing: "0.12em" }}
      >
        {label}
      </span>
    </div>
  );
}
