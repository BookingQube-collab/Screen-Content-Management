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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white text-2xl font-bold">
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
    <div className="h-[100dvh] w-screen bg-black text-white overflow-hidden relative select-none cursor-none flex flex-col justify-between">

      {/* HERO BACKGROUND */}
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

      {/* OVERLAY HEADING */}
      <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none overflow-hidden">
        <h1 className="text-[22vw] sm:text-[18vw] md:text-[15vw] font-black text-white/5 tracking-tighter mix-blend-overlay whitespace-nowrap leading-none">
          {settings.overlay_heading}
        </h1>
      </div>

      {/* HEADER */}
      <header className="relative z-20 w-full pt-[5vh] pb-[3vh] flex justify-center items-center">
        <img
          src={`${import.meta.env.BASE_URL}images/logo-urban-arena.png`}
          alt="Urban Arena"
          className="h-[6vh] min-h-[40px] max-h-[70px] object-contain"
        />
      </header>

      {/* CAROUSEL */}
      <div
        className="relative z-20 flex-1 flex items-center justify-center w-full"
        style={{ perspective: "1500px" }}
      >
        {activities.length === 1 ? (
          <DisplayCard activity={currentActivity} position="center" />
        ) : (
          <>
            <DisplayCard activity={activities[prevIndex]} position="left" />
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentActivity.id}
                initial={{ y: 40, opacity: 0, scale: 0.92 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -40, opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.55, type: "spring", bounce: 0.35 }}
                className="absolute z-30 shadow-2xl shadow-black"
              >
                <DisplayCard activity={currentActivity} position="center" />
              </motion.div>
            </AnimatePresence>
            <DisplayCard activity={activities[nextIndex]} position="right" />
          </>
        )}
      </div>

      {/* FOOTER */}
      <footer className="relative z-20 w-full pb-[5vh] px-4 sm:px-8 flex flex-col items-center gap-[2vh]">
        {/* Progress dots */}
        <div className="flex gap-2">
          {activities.map((_, i) => (
            <motion.div
              key={i}
              className={`h-1.5 rounded-full bg-white transition-all duration-500 ${
                i === currentIndex ? "w-10 opacity-100" : "w-2.5 opacity-30"
              }`}
              layout
            />
          ))}
        </div>

        {/* Age badge + terms */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="px-4 py-1.5 rounded-full border border-white/20 bg-black/40 backdrop-blur-md text-xs sm:text-sm font-bold tracking-widest text-primary">
            AGE REQUIREMENT: {currentActivity.ageLimit}+
          </div>
          <p className="text-white/40 text-[10px] sm:text-xs font-medium max-w-xs sm:max-w-sm">
            {currentActivity.termsAndConditions || settings.footer_text}
          </p>
        </div>
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

  const positionStyles: Record<string, React.CSSProperties> = {
    left: {
      transform: "translateX(-68%) scale(0.76) rotateY(20deg)",
      opacity: 0.4,
      zIndex: 10,
    },
    center: {
      transform: "translateX(0) scale(1) rotateY(0deg)",
      opacity: 1,
      zIndex: 20,
    },
    right: {
      transform: "translateX(68%) scale(0.76) rotateY(-20deg)",
      opacity: 0.4,
      zIndex: 10,
    },
  };

  const isCenter = position === "center";

  return (
    <div
      className={`absolute rounded-[24px] sm:rounded-[32px] overflow-hidden bg-black border-[2px] sm:border-[3px] transition-all duration-700`}
      style={{
        width: "clamp(220px, 60vw, 420px)",
        aspectRatio: "4/5",
        borderColor: isCenter ? "var(--color-primary, #e63535)" : "rgba(255,255,255,0.1)",
        boxShadow: isCenter ? "0 0 80px -15px rgba(229,9,20,0.5)" : "none",
        ...positionStyles[position],
      }}
    >
      <img
        src={activity.cardImageUrl || defaultImage}
        alt={activity.name}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <div className="absolute inset-0 p-[5%] flex flex-col justify-end">
        {activity.isFeatured && (
          <div className="self-start mb-auto px-2 py-1 bg-primary text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md shadow-lg shadow-primary/50">
            Featured
          </div>
        )}
        <h2 className="text-[clamp(18px,4vw,32px)] font-bold leading-tight mb-1 sm:mb-2">
          {activity.name}
        </h2>
        <p className="text-white/80 text-[clamp(11px,2.5vw,16px)] leading-snug mb-4 sm:mb-6 line-clamp-2">
          {activity.shortDescription}
        </p>
        <div className="w-full py-3 sm:py-4 bg-primary text-white text-center font-bold text-[clamp(12px,3vw,18px)] rounded-xl sm:rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-wide">
          {activity.ctaText || "Explore"}
        </div>
      </div>
    </div>
  );
}
