import { useState, useEffect } from "react";
import { useListDisplayActivities } from "@workspace/api-client-react";
import { useAppSettings } from "@/hooks/use-app-settings";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Play, ArrowRight, Heart } from "lucide-react";

const C = {
  bg:     "#0A0812",
  purple: "#7C3AED",
  bright: "#A855F7",
  pink:   "#EC4899",
};

export default function DisplayPage() {
  const { data: activities, isLoading: loadAct } = useListDisplayActivities();
  const { settings, isLoading: loadSet }         = useAppSettings();
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
      settings.slide_interval * 1000,
    );
    return () => clearInterval(id);
  }, [settings.auto_slide, settings.slide_interval, activities, idx]);

  if (loadAct || loadSet) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: C.bg }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: C.bright }} />
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
  const nextAct = activities[(idx + 1) % count];
  const img     = act.heroImageUrl     || act.cardImageUrl     || `https://picsum.photos/seed/${act.id}/800/1100`;
  const nextImg = nextAct.heroImageUrl || nextAct.cardImageUrl || `https://picsum.photos/seed/${nextAct.id}/300/300`;

  /* ── column split: left 50% / right 50%
     row split:    top  64% / bottom 36%            */
  const COL  = "50%";
  const RTOP = "64%";
  const RBOT = "36%";

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none text-white"
      style={{ fontFamily: "system-ui, sans-serif" }}
    >

      {/* ══════════════════════════════════════
          ANIMATED BACKGROUND SPLIT
      ══════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={act.id + "-bg"}
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Left half — purple */}
          <div
            className="absolute"
            style={{
              top: 0, bottom: 0, left: 0, right: COL,
              background: `linear-gradient(160deg,#6d28d9 0%,${C.purple} 100%)`,
            }}
          />
          {/* Right half — pink */}
          <div
            className="absolute"
            style={{
              top: 0, bottom: 0, left: COL, right: 0,
              background: `linear-gradient(160deg,${C.pink} 0%,#9d174d 100%)`,
            }}
          />
          {/* Diagonal divider blend */}
          <div
            className="absolute"
            style={{
              top: 0, bottom: 0,
              left: "calc(50% - 72px)",
              width: 144,
              background: `linear-gradient(to right,#6d28d9,${C.pink})`,
              clipPath: "polygon(0 0,100% 0,60% 100%,0 100%)",
            }}
          />
          {/* Scanlines */}
          <div
            className="absolute inset-0"
            style={{
              background: `repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 4px)`,
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* ══════════════════════════════════════
          LAYOUT GRID
          Columns: [left 50%] [right 50%]
          Rows:    [top 64%]  [bottom 36%]
      ══════════════════════════════════════ */}
      <div
        className="absolute inset-0 z-20"
        style={{
          display: "grid",
          gridTemplateColumns: `${COL} ${COL}`,
          gridTemplateRows: `${RTOP} ${RBOT}`,
        }}
      >

        {/* ─── [0,0] Top-left  — empty; hero image sits above ─── */}
        <div />

        {/* ─── [0,1] Top-right — text info ─── */}
        <div
          className="relative flex flex-col overflow-hidden"
          style={{
            padding: "clamp(14px,4.5%,52px) clamp(20px,4%,52px) 0 clamp(16px,3%,36px)",
          }}
        >
          {/* Watermark */}
          <AnimatePresence mode="wait">
            <motion.span
              key={act.id + "-wm"}
              className="absolute font-black uppercase pointer-events-none leading-none"
              style={{
                fontSize: "clamp(38px,9vw,118px)",
                letterSpacing: "0.04em",
                color: "rgba(255,255,255,0.11)",
                right: 0,
                top: "20%",
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

          {/* Name */}
          <AnimatePresence mode="wait">
            <motion.h1
              key={act.id + "-name"}
              className="font-black text-white leading-none relative z-10"
              style={{ fontSize: "clamp(22px,4.8vw,62px)", marginBottom: "clamp(8px,2%,18px)" }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              {act.name}
            </motion.h1>
          </AnimatePresence>

          {/* Description */}
          <AnimatePresence mode="wait">
            <motion.p
              key={act.id + "-desc"}
              className="text-white/75 relative z-10"
              style={{
                fontSize: "clamp(10px,1.4vw,17px)",
                lineHeight: 1.55,
                maxWidth: "30ch",
                marginBottom: "clamp(8px,2%,20px)",
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

          {/* Age limit */}
          <p className="relative z-10 font-bold text-white" style={{ fontSize: "clamp(13px,2vw,26px)", marginBottom: "auto" }}>
            {act.ageLimit || 18}+ Age Limit
          </p>

          {/* "Explore more" — pinned bottom-right corner of this cell */}
          <div
            className="absolute bottom-0 right-0 z-10 flex flex-col items-start justify-end cursor-pointer"
            style={{
              background: "rgba(16,10,34,0.88)",
              width: "clamp(88px,15vw,170px)",
              height: "clamp(62px,11vw,136px)",
              padding: "clamp(8px,1.4vw,18px)",
            }}
            onClick={() => go(idx + 1)}
          >
            <span
              className="font-semibold text-white"
              style={{ fontSize: "clamp(10px,1.4vw,17px)", lineHeight: 1.3 }}
            >
              Explore<br />more
            </span>
            <ArrowRight
              style={{ width: "clamp(14px,2vw,24px)", height: "clamp(14px,2vw,24px)", marginTop: 8, color: "white" }}
            />
          </div>
        </div>

        {/* ─── [1,0] Bottom-left — dark stats bar ─── */}
        <div
          className="flex items-stretch"
          style={{
            background: "rgba(12,8,24,0.95)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <StatCell value={`${act.ageLimit || 18}+`}            label="Min Age" />
          <StatCell value={String(idx + 1).padStart(2, "0")}    label={`of ${String(count).padStart(2, "0")}`} />
          <StatCell value={act.heroVideoUrl ? "LIVE" : "OPEN"}  label="Status"  accent={!!act.heroVideoUrl} />
        </div>

        {/* ─── [1,1] Bottom-right — media panels ─── */}
        <div
          style={{
            display: "grid",
            /*   video   | next-item  */
            gridTemplateColumns: "1fr clamp(72px,13vw,150px)",
            gap: "2px",
            background: "#000",
          }}
        >
          {/* Video / fallback image + play button */}
          <div className="relative overflow-hidden" style={{ background: "#111" }}>
            {act.heroVideoUrl ? (
              <video
                key={act.id}
                src={act.heroVideoUrl}
                className="w-full h-full object-cover"
                style={{ filter: "brightness(0.55) saturate(1.5)" }}
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
                style={{ filter: "brightness(0.45) saturate(1.5)" }}
              />
            )}
            {/* Pink tint overlay */}
            <div
              className="absolute inset-0"
              style={{ background: `${C.pink}40`, pointerEvents: "none" }}
            />
            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: "clamp(30px,5vw,60px)",
                  height: "clamp(30px,5vw,60px)",
                  background: "rgba(255,255,255,0.90)",
                }}
              >
                <Play
                  fill={C.pink}
                  color={C.pink}
                  style={{ width: "40%", height: "40%", marginLeft: "8%" }}
                />
              </div>
            </div>
            {/* LIVE badge */}
            {act.heroVideoUrl && (
              <div
                className="absolute top-2 left-2 flex items-center gap-1"
                style={{
                  background: C.pink,
                  borderRadius: 3,
                  padding: "2px 8px",
                  fontSize: "clamp(7px,0.9vw,11px)",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                }}
              >
                <span style={{
                  display: "inline-block", width: 5, height: 5,
                  borderRadius: "50%", background: "#fff",
                  animation: "livepulse 1.2s infinite",
                }} />
                LIVE
              </div>
            )}
            {/* Heart icon at bottom-center */}
            <div
              className="absolute bottom-0 inset-x-0 flex justify-center"
              style={{ paddingBottom: "clamp(4px,1vw,10px)" }}
            >
              <div
                className="flex items-center justify-center rounded"
                style={{
                  background: C.pink,
                  width: "clamp(22px,3.5vw,40px)",
                  height: "clamp(22px,3.5vw,40px)",
                }}
              >
                <Heart fill="white" color="white" style={{ width: "55%", height: "55%" }} />
              </div>
            </div>
          </div>

          {/* Next activity */}
          <div
            className="relative overflow-hidden flex flex-col items-center justify-end cursor-pointer"
            style={{ background: "#111" }}
            onClick={() => go(idx + 1)}
          >
            <img
              src={nextImg}
              alt={nextAct.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "brightness(0.45) saturate(1.3)" }}
            />
            <div
              className="absolute inset-0"
              style={{ background: `${C.purple}55` }}
            />
            <div className="relative z-10 text-center" style={{ padding: "clamp(4px,1vw,12px)" }}>
              <p className="text-white/55 font-semibold uppercase" style={{ fontSize: "clamp(7px,0.9vw,11px)", letterSpacing: "0.1em" }}>
                Next Item
              </p>
              <p className="text-white font-bold leading-snug" style={{ fontSize: "clamp(8px,1vw,13px)" }}>
                {nextAct.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          HERO IMAGE — overflows above the screen
      ══════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={act.id + "-hero"}
          className="absolute pointer-events-none"
          style={{
            left: "2%",
            top: "-7%",
            width: "50%",
            height: "80%",
            zIndex: 30,
          }}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.45 }}
        >
          <img
            src={img}
            alt={act.name}
            className="w-full h-full object-cover object-top"
            style={{
              filter: "drop-shadow(0 22px 55px rgba(0,0,0,0.75))",
              maskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* ══════════════════════════════════════
          PROGRESS DOTS + HEART
      ══════════════════════════════════════ */}
      <div
        className="absolute z-40 flex items-center gap-3"
        style={{ bottom: "clamp(7px,1.5vh,18px)", left: "clamp(14px,2vw,30px)" }}
      >
        <div className="flex items-center gap-1">
          {activities.map((_, i) => {
            const active = i === idx;
            return (
              <motion.button
                key={i}
                onClick={() => go(i)}
                animate={{
                  width: active ? "clamp(16px,3vw,28px)" : "clamp(4px,0.8vw,7px)",
                  opacity: active ? 1 : 0.35,
                }}
                transition={{ duration: 0.25 }}
                style={{
                  height: "clamp(4px,0.8vw,7px)",
                  borderRadius: 999,
                  background: active ? "#fff" : "rgba(255,255,255,0.5)",
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

      <style>{`@keyframes livepulse { 0%,100%{opacity:1} 50%{opacity:0.28} }`}</style>
    </div>
  );
}

/* ─── Stat cell ──────────────────────────────────────────────── */
function StatCell({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className="flex-1 flex flex-col items-start justify-center"
      style={{
        padding: "clamp(8px,1.8vw,22px) clamp(10px,2.2vw,28px)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <span
        className="font-black leading-none"
        style={{
          fontSize: "clamp(16px,3.8vw,50px)",
          color: accent ? C.pink : "white",
        }}
      >
        {value}
      </span>
      <span
        className="font-semibold uppercase tracking-widest"
        style={{
          fontSize: "clamp(6px,0.9vw,12px)",
          color: "rgba(255,255,255,0.4)",
          marginTop: "4px",
          letterSpacing: "0.12em",
        }}
      >
        {label}
      </span>
    </div>
  );
}
