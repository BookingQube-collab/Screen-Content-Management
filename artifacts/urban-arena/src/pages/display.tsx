import { useState, useEffect } from "react";
import { useListDisplayActivities } from "@workspace/api-client-react";
import { useAppSettings }            from "@/hooks/use-app-settings";
import { motion, AnimatePresence }   from "framer-motion";
import { Loader2, Play, ArrowRight, Heart } from "lucide-react";

/* ── brand palette ─────────────────────────────────────────── */
const PURPLE  = "#7C3AED";   // left panel  (= "pink" in reference)
const PINK    = "#EC4899";   // right panel (= "green" in reference)
const DARK    = "#0c0820";   // stats bar & explore-more bg
const DARK2   = "#160e30";   // explore-more hover

export default function DisplayPage() {
  const { data: activities, isLoading: loadAct } = useListDisplayActivities();
  const { settings,         isLoading: loadSet } = useAppSettings();
  const [idx, setIdx] = useState(0);

  const go = (next: number) => {
    if (!activities) return;
    setIdx(((next % activities.length) + activities.length) % activities.length);
  };

  /* auto-slide — skipped when current activity has a video */
  useEffect(() => {
    if (!settings.auto_slide || !activities || activities.length <= 1) return;
    if (activities[idx]?.heroVideoUrl) return;
    const id = setInterval(
      () => setIdx(p => (p + 1) % activities.length),
      settings.slide_interval * 1000,
    );
    return () => clearInterval(id);
  }, [settings.auto_slide, settings.slide_interval, activities, idx]);

  /* ── loading / empty states ─── */
  if (loadAct || loadSet) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#0c0820" }}>
      <Loader2 className="w-12 h-12 animate-spin" style={{ color: PINK }} />
    </div>
  );
  if (!activities?.length) return (
    <div className="fixed inset-0 flex items-center justify-center text-white text-3xl font-black" style={{ background: "#0c0820" }}>
      NO SIGNAL
    </div>
  );

  const count   = activities.length;
  const act     = activities[idx];
  const nextAct = activities[(idx + 1) % count];
  const img     = act.heroImageUrl     || act.cardImageUrl     || `https://picsum.photos/seed/${act.id}/900/1200`;
  const nextImg = nextAct.heroImageUrl || nextAct.cardImageUrl || `https://picsum.photos/seed/${nextAct.id}/400/300`;

  /* ── column / row proportions ── */
  const LW  = 46;   // left col %
  const RW  = 54;   // right col %
  const TH  = 64;   // top row %
  const BH  = 36;   // bottom row %

  /* ── diagonal angle: left panel wider at top, narrower at bottom ── */
  //  left bg  polygon: 0 0 → LW+3% 0 → LW-5% 100% → 0 100%
  const dL = `polygon(0 0, ${LW + 3}% 0, ${LW - 5}% 100%, 0 100%)`;
  const dR = `polygon(${LW + 3}% 0, 100% 0, 100% 100%, ${LW - 5}% 100%)`;

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{ fontFamily: "system-ui, sans-serif" }}
    >

      {/* ════════════════════════════════════════════════
          ANIMATED SPLIT BACKGROUND
      ════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={act.id + "-bg"}
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* Left — vivid purple */}
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(170deg,#8b5cf6 0%,${PURPLE} 50%,#5b21b6 100%)`, clipPath: dL }}
          />
          {/* Right — vivid pink/magenta (matches reference green energy) */}
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(170deg,#f472b6 0%,${PINK} 45%,#db2777 100%)`, clipPath: dR }}
          />
          {/* scanlines */}
          <div
            className="absolute inset-0"
            style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)", pointerEvents: "none" }}
          />
        </motion.div>
      </AnimatePresence>

      {/* ════════════════════════════════════════════════
          MAIN GRID
          Columns: LW% | RW%
          Rows:    TH% | BH%
      ════════════════════════════════════════════════ */}
      <div
        className="absolute inset-0 z-20"
        style={{
          display: "grid",
          gridTemplateColumns: `${LW}% ${RW}%`,
          gridTemplateRows: `${TH}% ${BH}%`,
        }}
      >

        {/* ── [top-left] blank — hero image sits here absolutely ── */}
        <div />

        {/* ── [top-right] text info ── */}
        <div
          className="relative flex flex-col text-white"
          style={{ padding: "clamp(18px,5%,56px) clamp(20px,5%,56px) 0 clamp(12px,2.5%,28px)" }}
        >
          {/* ghost watermark */}
          <AnimatePresence mode="wait">
            <motion.span
              key={act.id + "-wm"}
              className="absolute font-black uppercase pointer-events-none leading-none"
              style={{
                fontSize: "clamp(42px,9vw,120px)",
                letterSpacing: "0.04em",
                color: "rgba(255,255,255,0.10)",
                right: 0,
                top: "22%",
                whiteSpace: "nowrap",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {act.name}
            </motion.span>
          </AnimatePresence>

          {/* ── activity name ── */}
          <AnimatePresence mode="wait">
            <motion.h1
              key={act.id + "-title"}
              className="font-black leading-none relative z-10"
              style={{ fontSize: "clamp(24px,5vw,66px)", marginBottom: "clamp(10px,2.2%,22px)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              {act.name}
            </motion.h1>
          </AnimatePresence>

          {/* ── description ── */}
          <AnimatePresence mode="wait">
            <motion.p
              key={act.id + "-desc"}
              className="relative z-10"
              style={{
                fontSize: "clamp(10px,1.4vw,18px)",
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.82)",
                maxWidth: "30ch",
                marginBottom: "clamp(10px,2.5%,26px)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, delay: 0.07 }}
            >
              {act.description ||
                "An exciting activity that pushes your limits and delivers an unforgettable experience."}
            </motion.p>
          </AnimatePresence>

          {/* ── age/cta line ── */}
          <p
            className="font-bold relative z-10"
            style={{ fontSize: "clamp(13px,2vw,26px)", color: "white" }}
          >
            {act.ageLimit || 18}+ Age Limit
          </p>

          {/* ── "Explore more" — pinned to BOTTOM-RIGHT corner of this cell ── */}
          <button
            className="absolute bottom-0 right-0 z-10 flex flex-col items-start justify-end font-semibold text-white"
            style={{
              background: DARK,
              width:  "clamp(90px,14vw,170px)",
              height: "clamp(68px,11.5vw,142px)",
              padding: "clamp(10px,1.6vw,20px)",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => go(idx + 1)}
          >
            <span style={{ fontSize: "clamp(10px,1.4vw,18px)", lineHeight: 1.3 }}>
              Explore<br />more
            </span>
            <ArrowRight
              style={{ width: "clamp(14px,2vw,24px)", height: "clamp(14px,2vw,24px)", marginTop: 8 }}
            />
          </button>
        </div>

        {/* ── [bottom-left] dark stats bar ── */}
        <div
          className="flex items-stretch"
          style={{ background: DARK, borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <StatCell num={`${act.ageLimit || 18}`} unit="+"  label="Min Age" />
          <StatCell num={String(idx + 1).padStart(2, "0")} unit={`/${count}`} label="Activity" />
          <StatCell num={act.heroVideoUrl ? "LIVE" : "OPEN"} unit="" label="Status" accent={!!act.heroVideoUrl} />
        </div>

        {/* ── [bottom-right] media panels ── */}
        {/*
          Two INNER flex columns side by side:
            Left  (60%): Video (flex:3) + Heart (flex:1)
            Right (40%): Explore more (flex:3) + Next Item (flex:2)
        */}
        <div
          className="flex"
          style={{ gap: "2px", background: "#000" }}
        >
          {/* Left media column */}
          <div className="flex flex-col" style={{ flex: "3", gap: "2px" }}>
            {/* Video / image */}
            <div className="relative overflow-hidden" style={{ flex: 3, background: "#111" }}>
              {act.heroVideoUrl ? (
                <video
                  key={act.id}
                  src={act.heroVideoUrl}
                  className="w-full h-full object-cover"
                  style={{ filter: "brightness(0.6) saturate(1.6)" }}
                  autoPlay muted playsInline preload="auto"
                  onEnded={() => go(idx + 1)}
                />
              ) : (
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: "brightness(0.52) saturate(1.7)" }}
                />
              )}
              {/* pink/purple tint overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `${PINK}55`, mixBlendMode: "multiply" }}
              />
              {/* play button */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="rounded-full flex items-center justify-center"
                  style={{
                    width: "clamp(28px,5vw,58px)",
                    height: "clamp(28px,5vw,58px)",
                    background: "rgba(255,255,255,0.92)",
                  }}
                >
                  <Play
                    fill={PINK}
                    color={PINK}
                    style={{ width: "40%", height: "40%", marginLeft: "8%" }}
                  />
                </div>
              </div>
              {/* LIVE badge */}
              {act.heroVideoUrl && (
                <div
                  className="absolute top-2 left-2 flex items-center gap-1 font-black"
                  style={{
                    background: PINK,
                    borderRadius: 3,
                    padding: "2px 8px",
                    fontSize: "clamp(7px,0.9vw,11px)",
                    color: "#fff",
                    letterSpacing: "0.1em",
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", display: "inline-block", animation: "lp 1.2s infinite" }} />
                  LIVE
                </div>
              )}
            </div>

            {/* Heart cell */}
            <div
              className="flex items-center justify-center"
              style={{ flex: 1, background: PINK }}
            >
              <Heart fill="white" color="white" style={{ width: "clamp(14px,2.5vw,30px)", height: "clamp(14px,2.5vw,30px)" }} />
            </div>
          </div>

          {/* Right media column — Next Item (full height) */}
          <div
            className="relative overflow-hidden cursor-pointer flex-none"
            style={{ width: "clamp(72px,13vw,155px)", background: PURPLE }}
            onClick={() => go(idx + 1)}
          >
            <img
              src={nextImg}
              alt={nextAct.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "brightness(0.50) saturate(1.4)" }}
            />
            <div className="absolute inset-0" style={{ background: `${PURPLE}66` }} />
            <div
              className="absolute inset-0 flex flex-col items-center justify-end text-white text-center"
              style={{ padding: "clamp(4px,1vw,14px)" }}
            >
              <p
                className="font-semibold uppercase tracking-wider"
                style={{ fontSize: "clamp(6px,0.85vw,10px)", color: "rgba(255,255,255,0.55)", marginBottom: 2, letterSpacing: "0.12em" }}
              >
                Next Item
              </p>
              <p
                className="font-bold leading-snug"
                style={{ fontSize: "clamp(8px,1.1vw,14px)", color: "white" }}
              >
                {nextAct.name}
              </p>
            </div>
          </div>
        </div>

      </div>
      {/* end main grid */}

      {/* ════════════════════════════════════════════════
          HERO IMAGE — overflows above the visible area
      ════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={act.id + "-hero"}
          className="absolute pointer-events-none"
          style={{
            left:   "0%",
            top:    "-18%",
            width:  `${LW + 2}%`,
            height: "95%",
            zIndex: 30,
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.45 }}
        >
          <img
            src={img}
            alt={act.name}
            className="w-full h-full"
            style={{
              objectFit: "cover",
              objectPosition: "center top",
              filter: "drop-shadow(0 28px 60px rgba(0,0,0,0.7)) drop-shadow(0 4px 16px rgba(124,58,237,0.45))",
              maskImage: "linear-gradient(to bottom, black 0%, black 68%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 68%, transparent 100%)",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* ════════════════════════════════════════════════
          PROGRESS DOTS (bottom-left, over stats)
      ════════════════════════════════════════════════ */}
      <div
        className="absolute z-40 flex items-center gap-[5px]"
        style={{ bottom: "clamp(8px,1.5vh,18px)", left: "clamp(14px,2vw,30px)" }}
      >
        {activities.map((_, i) => {
          const active = i === idx;
          return (
            <motion.button
              key={i}
              onClick={() => go(i)}
              animate={{
                width: active ? "clamp(16px,3vw,28px)" : "clamp(4px,0.8vw,6px)",
                opacity: active ? 1 : 0.35,
              }}
              transition={{ duration: 0.24 }}
              style={{
                height: "clamp(4px,0.8vw,6px)",
                borderRadius: 999,
                background: active ? "#fff" : "rgba(255,255,255,0.55)",
                border: "none",
                padding: 0,
                flexShrink: 0,
                cursor: "pointer",
              }}
            />
          );
        })}
      </div>

      <style>{`@keyframes lp{0%,100%{opacity:1}50%{opacity:0.25}}`}</style>
    </div>
  );
}

/* ─── stat cell ──────────────────────────────────────────────── */
function StatCell({
  num,
  unit,
  label,
  accent = false,
}: {
  num: string;
  unit: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className="flex-1 flex flex-col items-start justify-center text-white"
      style={{
        padding: "clamp(8px,2vw,24px) clamp(12px,2.5vw,30px)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="font-black leading-none" style={{ fontSize: "clamp(16px,3.8vw,50px)" }}>
        <span style={{ color: accent ? PINK : "white" }}>{num}</span>
        <span style={{ fontSize: "0.5em", color: accent ? PINK : "white" }}>{unit}</span>
      </div>
      <span
        className="font-semibold uppercase tracking-widest"
        style={{ fontSize: "clamp(6px,0.9vw,12px)", color: "rgba(255,255,255,0.38)", marginTop: 4, letterSpacing: "0.12em" }}
      >
        {label}
      </span>
    </div>
  );
}
