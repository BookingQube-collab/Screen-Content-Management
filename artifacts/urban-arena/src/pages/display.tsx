import { useState, useEffect, useRef, useCallback } from "react";
import { useListDisplayActivities } from "@workspace/api-client-react";
import { useAppSettings }           from "@/hooks/use-app-settings";
import { useScreenConfig }          from "@/hooks/use-screen-config";
import { OfflineContentService }    from "@/services/offline-content";
import { motion, AnimatePresence }  from "framer-motion";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";
import { useLocation } from "wouter";
import { FirstRunSetup } from "@/components/display/FirstRunSetup";

const PURPLE = "#7C3AED";
const PINK   = "#EC4899";
const DARK   = "#0c0820";


interface ApiLocation { id: number; name: string; code: string; logoUrl?: string | null; }

export default function DisplayPage() {
  const { data: rawActivities, isLoading: loadAct, isError: actError } = useListDisplayActivities({
    query: { refetchInterval: 30_000, staleTime: 0, refetchOnWindowFocus: false },
  });
  const { settings, isLoading: loadSet } = useAppSettings();
  const { config, isConfigured, loaded: configLoaded } = useScreenConfig();
  const [, setLocation] = useLocation();
  const [showSetup, setShowSetup] = useState(false);
  const [locations, setLocations] = useState<ApiLocation[]>([]);

  // Fetch locations for logo lookup — polls every 60 s so logo updates apply without reload
  useEffect(() => {
    const load = () =>
      fetch("/api/admin/locations")
        .then(r => r.json())
        .then(setLocations)
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  // Show first-run setup when config is not yet set
  useEffect(() => {
    if (configLoaded && !isConfigured) setShowSetup(true);
  }, [configLoaded, isConfigured]);

  // Hidden tap zone — 5 taps in top-left corner → navigate to /display/config
  const tapTimestamps = useRef<number[]>([]);
  const handleHiddenTap = useCallback(() => {
    const now = Date.now();
    tapTimestamps.current = [...tapTimestamps.current.filter(t => now - t < 3000), now];
    if (tapTimestamps.current.length >= 5) {
      tapTimestamps.current = [];
      setLocation("/display/config");
    }
  }, [setLocation]);

  // Track whether we are using cached (offline) data
  const [isOffline, setIsOffline] = useState(false);

  // When the API fails, fall back to the localStorage activity cache
  const effectiveRaw = (() => {
    if (rawActivities?.length) return rawActivities;
    if ((actError || (!loadAct && !rawActivities?.length)) && OfflineContentService.hasCache()) {
      return OfflineContentService.getOfflineActivities() as typeof rawActivities;
    }
    return rawActivities;
  })();

  // Track offline state for the indicator
  useEffect(() => {
    if (actError && OfflineContentService.hasCache()) setIsOffline(true);
    else if (rawActivities?.length) setIsOffline(false);
  }, [actError, rawActivities]);

  // Apply client-side screen/location filtering
  const activities = (() => {
    if (!effectiveRaw) return effectiveRaw;
    if (!config.screenId && !config.locationId) return effectiveRaw;
    return effectiveRaw.filter(a => {
      const hasAssignment = (a.locationId != null) || (a.screenId != null);
      if (!hasAssignment) return true;
      if (config.screenId   && a.screenId   === config.screenId)   return true;
      if (config.locationId && a.locationId === config.locationId) return true;
      return false;
    });
  })();

  // Cache activities for offline use whenever fresh data arrives
  useEffect(() => {
    if (rawActivities?.length) {
      OfflineContentService.cacheActivities(rawActivities as any[], true);
    }
  }, [rawActivities]);

  const [idx, setIdx] = useState(0);
  const [galleryIdx, setGalleryIdx] = useState(0);

  // Clamp idx when the activity list changes (e.g. an activity is removed mid-display)
  useEffect(() => {
    if (activities && activities.length > 0 && idx >= activities.length) {
      setIdx(0);
    }
  }, [activities]);

  const go = (next: number) => {
    if (!activities) return;
    setIdx(((next % activities.length) + activities.length) % activities.length);
  };

  // Reset gallery slide index when the activity changes
  useEffect(() => {
    setGalleryIdx(0);
  }, [idx]);

  // Cycle through gallery images every 4 s (only when gallery has multiple images and no video)
  useEffect(() => {
    if (!activities?.length) return;
    const act = activities[idx];
    if (act?.heroVideoUrl) return;
    let gallery: string[] = [];
    try { gallery = JSON.parse((act as any).heroGalleryUrls || "[]"); } catch {}
    if (gallery.length <= 1) return;
    const id = setInterval(() => setGalleryIdx(p => p + 1), 4000);
    return () => clearInterval(id);
  }, [idx, activities]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const touchStartX  = useRef<number | null>(null);
  const wheelCooldown = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      e.preventDefault();
      go(idx + (delta < 0 ? 1 : -1));
    }
    touchStartX.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (wheelCooldown.current) return;
    const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(horizontal) < 20) return;
    go(idx + (horizontal > 0 ? 1 : -1));
    wheelCooldown.current = true;
    setTimeout(() => { wheelCooldown.current = false; }, 600);
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

  // First-run setup overlay (before loading checks so it always shows)
  if (showSetup) return <FirstRunSetup onDone={() => setShowSetup(false)} titlePart1={settings.display_title_part1 || "URBAN"} titlePart2={settings.display_title_part2 || "ARENA"} />;

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

  // Parse background gallery for current activity
  const gallery = (() => { try { return JSON.parse((act as any).heroGalleryUrls || "[]") as string[]; } catch { return []; } })();
  const currentGalleryImg = gallery.length > 0 ? gallery[galleryIdx % gallery.length] : null;
  const img     = currentGalleryImg    || act.heroImageUrl     || act.cardImageUrl     || `https://picsum.photos/seed/${act.id}/1200/900`;
  const nextImg = nextAct.heroImageUrl || nextAct.cardImageUrl || `https://picsum.photos/seed/${nextAct.id}/400/300`;

  const galleryMode = settings.gallery_mode;

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none text-white"
      style={{
        fontFamily:          "system-ui, sans-serif",
        display:             "grid",
        gridTemplateRows:    galleryMode ? "100%" : "80% 20%",
        width:               "100dvw",
        height:              "100dvh",
        overscrollBehavior:  "none",
        touchAction:         "pan-x",
        WebkitUserSelect:    "none",
      }}
    >
      {/* ── Silent background preloader for all activity videos ── */}
      {activities.filter(a => a.heroVideoUrl).map(a => (
        <video
          key={"preload-" + a.id}
          src={a.heroVideoUrl!}
          preload="auto"
          muted
          playsInline
          style={{ display: "none", position: "absolute", pointerEvents: "none" }}
          aria-hidden="true"
        />
      ))}

      {/* ══════════════════════════════════════════════
          TOP 80% — full-bleed video (if set) or image + text overlay
          Touch-swipe left/right to navigate between activities
      ══════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
      >

        {/* Hero video — plays full-bleed when a video URL is set for this activity */}
        {act.heroVideoUrl ? (
          <video
            key={act.id + "-vid"}
            src={act.heroVideoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "brightness(0.85) saturate(1.3)" }}
            autoPlay muted playsInline preload="auto" fetchPriority="high"
            onEnded={() => go(idx + 1)}
          />
        ) : (
          /* Hero image — crossfades on activity change */
          <AnimatePresence mode="wait">
            <motion.img
              key={act.id + "-img-" + galleryIdx}
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

        {/* Transparent swipe-capture overlay — ensures touch events reach our handlers
            even when a <video> element would otherwise consume them.
            z-[9] keeps it below the progress dots (z-10) and LIVE badge (z-10). */}
        <div
          className="absolute inset-0"
          style={{ zIndex: 9, background: "transparent" }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onWheel={onWheel}
        />

        {/* Location logo — top-left corner, shown when the activity's location has a logo */}
        {(() => {
          const locLogo = act.locationId
            ? (locations.find(l => l.id === act.locationId)?.logoUrl ?? null)
            : null;
          return locLogo ? (
            <div className="absolute z-10" style={{ top: "clamp(10px,1.5vw,22px)", left: "clamp(10px,1.5vw,22px)" }}>
              <img
                src={locLogo}
                alt="Location logo"
                style={{
                  maxHeight: "clamp(30px,4.5vw,64px)",
                  maxWidth:  "clamp(70px,10vw,140px)",
                  objectFit: "contain",
                  filter:    "drop-shadow(0 2px 8px rgba(0,0,0,0.7))",
                }}
              />
            </div>
          ) : null;
        })()}

        {/* Hidden tap zone — top-left corner, invisible, 5 taps = settings */}
        <div
          onClick={handleHiddenTap}
          style={{
            position: "absolute", top: 0, left: 0,
            width: "clamp(50px,6vw,80px)", height: "clamp(50px,6vw,80px)",
            zIndex: 30, cursor: "default",
          }}
        />

        {/* Fullscreen toggle — top-right corner only */}
        <button
          onClick={toggleFullscreen}
          className="absolute flex items-center justify-center"
          style={{
            top: "clamp(8px,1.2vw,18px)", right: "clamp(8px,1.2vw,18px)", zIndex: 20,
            width: "clamp(28px,3vw,44px)", height: "clamp(28px,3vw,44px)",
            borderRadius: 8, background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.80)",
            cursor: "pointer", backdropFilter: "blur(6px)",
          }}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen
            ? <Minimize2 style={{ width: "clamp(12px,1.4vw,20px)", height: "clamp(12px,1.4vw,20px)" }} />
            : <Maximize2 style={{ width: "clamp(12px,1.4vw,20px)", height: "clamp(12px,1.4vw,20px)" }} />
          }
        </button>

        {/* ── Text overlay, watermark & gradients — hidden when video is playing or in gallery mode ── */}
        {!act.heroVideoUrl && !galleryMode && (
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
                  {act.shortDescription || act.fullDescription || ""}
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

      </div>

      {/* ══════════════════════════════════════════════
          BOTTOM 20% — stats bar + next item (hidden in gallery mode)
      ══════════════════════════════════════════════ */}
      {!galleryMode && (
      <div
        className="flex"
        style={{ background: "#000000", borderTop: "1px solid rgba(168,85,247,0.25)" }}
      >

        {/* ── Stats — flex: 1, fills all space except Next Item ── */}
        <div className="flex items-stretch" style={{ flex: 1 }}>

          {/* Min Age + T&C — 70%, row layout */}
          <div
            className="flex flex-row items-center text-white"
            style={{
              padding: "clamp(8px,1.4vw,22px) clamp(12px,2vw,36px)",
              flex: "0 0 70%",
              borderRight: "1px solid rgba(168,85,247,0.18)",
              gap: "clamp(16px,2.5vw,48px)",
            }}
          >
            {/* Age number block */}
            <div className="flex flex-col flex-none">
              <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                <span
                  className="font-black leading-none"
                  style={{ fontSize: "clamp(48px,7vw,110px)" }}
                >
                  {act.ageLimit || 18}
                </span>
                <span
                  className="font-black"
                  style={{ fontSize: "clamp(24px,3.5vw,54px)", marginLeft: 2 }}
                >
                  +
                </span>
              </div>
              <span
                className="uppercase font-medium"
                style={{ fontSize: "clamp(7px,0.85vw,12px)", letterSpacing: "0.12em", color: "rgba(255,255,255,0.38)", marginTop: 3 }}
              >
                Min Age
              </span>
            </div>

            {/* T&C text — fills remaining horizontal space, wraps to 2 lines max */}
            {act.termsAndConditions && (
              <p
                style={{
                  fontSize: "clamp(9px,1.1vw,16px)",
                  lineHeight: 1.5,
                  color: "rgba(255,255,255,0.55)",
                  flex: 1,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {act.termsAndConditions}
              </p>
            )}

            {/* Logo row — settings + activity logos, right-aligned, each shown only if uploaded */}
            {(() => {
              const brandLogo    = settings.logo_url ? { src: settings.logo_url, alt: "Brand" } : null;
              const activityLogo = act.logoUrl        ? { src: act.logoUrl,        alt: act.name }  : null;
              if (!brandLogo && !activityLogo) return null;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "clamp(10px,1.5vw,22px)", flexShrink: 0, marginLeft: "auto" }}>
                  {brandLogo && (
                    <img
                      src={brandLogo.src}
                      alt={brandLogo.alt}
                      style={{
                        maxHeight: "clamp(48px,7.5vw,108px)",
                        maxWidth:  "clamp(90px,13vw,190px)",
                        objectFit: "contain",
                      }}
                    />
                  )}
                  {activityLogo && (
                    <img
                      src={activityLogo.src}
                      alt={activityLogo.alt}
                      style={{
                        height:    "clamp(110px,14vw,180px)",
                        maxWidth:  "clamp(110px,14vw,180px)",
                        objectFit: "contain",
                      }}
                    />
                  )}
                </div>
              );
            })()}
          </div>

          <StatCell num={act.name} unit="" label="Current Activity" accent />
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
      )}

      {/* Offline mode indicator */}
      {isOffline && (
        <div
          className="fixed top-3 right-4 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-widest uppercase z-50"
          style={{ background: "rgba(236,72,153,0.18)", color: "#EC4899", border: "1px solid rgba(236,72,153,0.35)", backdropFilter: "blur(8px)" }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EC4899", display: "inline-block", animation: "lp 2s infinite" }} />
          Offline Mode
        </div>
      )}

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
