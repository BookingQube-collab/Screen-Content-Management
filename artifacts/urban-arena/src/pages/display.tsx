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

  // Auto-slide logic
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
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-display text-2xl">
        NO SIGNAL
      </div>
    );
  }

  const currentActivity = activities[currentIndex];
  
  // Calculate adjacent indices for the 3D effect
  const prevIndex = (currentIndex - 1 + activities.length) % activities.length;
  const nextIndex = (currentIndex + 1) % activities.length;

  // Determine media to show based on settings
  const showVideo = settings.display_mode === "video_first" 
    ? !!currentActivity.heroVideoUrl 
    : (settings.display_mode === "image_first" ? false : !!currentActivity.heroVideoUrl);
  
  const bgMediaUrl = showVideo ? currentActivity.heroVideoUrl : (currentActivity.heroImageUrl || `${import.meta.env.BASE_URL}images/bg-abstract-red.png`);

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden relative select-none cursor-none font-sans flex flex-col justify-between">
      
      {/* 1. HERO BACKGROUND (Crossfading) */}
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
          {/* Gradients to ensure UI readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/90" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* 2. OVERLAY HEADING */}
      <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none overflow-hidden">
        <h1 className="text-[25vw] font-display font-black text-white/5 tracking-tighter mix-blend-overlay -rotate-90 whitespace-nowrap">
          {settings.overlay_heading}
        </h1>
      </div>

      {/* 3. HEADER (Logo) */}
      <header className="relative z-20 w-full pt-16 pb-8 flex justify-center items-center">
        <img src={`${import.meta.env.BASE_URL}images/logo-urban-arena.png`} alt="Urban Arena" className="h-16 object-contain" />
      </header>

      {/* 4. 3D CAROUSEL (Center of screen) */}
      <div className="relative z-20 flex-1 flex items-center justify-center w-full perspective-[1500px]">
        {activities.length === 1 ? (
          // Single item fallback
          <DisplayCard activity={currentActivity} position="center" />
        ) : (
          // 3-Card Layout
          <>
            <DisplayCard activity={activities[prevIndex]} position="left" />
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentActivity.id}
                initial={{ y: 50, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -50, opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
                className="absolute z-30 shadow-2xl shadow-black"
              >
                <DisplayCard activity={currentActivity} position="center" />
              </motion.div>
            </AnimatePresence>
            <DisplayCard activity={activities[nextIndex]} position="right" />
          </>
        )}
      </div>

      {/* 5. FOOTER */}
      <footer className="relative z-20 w-full pb-16 px-12 flex flex-col items-center gap-8">
        {/* Progress indicators */}
        <div className="flex gap-3">
          {activities.map((_, i) => (
            <motion.div
              key={i}
              className={`h-1.5 rounded-full bg-white transition-all duration-500 ${i === currentIndex ? 'w-12 opacity-100' : 'w-3 opacity-30'}`}
              layout
            />
          ))}
        </div>
        
        {/* Badges & Terms */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="px-4 py-1.5 rounded-full border border-white/20 bg-black/40 backdrop-blur-md text-sm font-bold tracking-widest text-primary">
            AGE REQUIREMENT: {currentActivity.ageLimit}+
          </div>
          <p className="text-white/40 text-xs font-medium max-w-sm">
            {currentActivity.termsAndConditions || settings.footer_text}
          </p>
        </div>
      </footer>
    </div>
  );
}

// Sub-component for the individual cards in the carousel
function DisplayCard({ activity, position }: { activity: Activity, position: "left" | "center" | "right" }) {
  
  // Styling logic based on position to create 3D illusion
  let transformClasses = "";
  let opacityClass = "opacity-100";
  
  if (position === "left") {
    transformClasses = "-translate-x-[70%] scale-[0.75] rotate-y-[20deg]";
    opacityClass = "opacity-40";
  } else if (position === "right") {
    transformClasses = "translate-x-[70%] scale-[0.75] rotate-y-[-20deg]";
    opacityClass = "opacity-40";
  }

  const defaultImage = `${import.meta.env.BASE_URL}images/placeholder-vr.png`;

  return (
    <div 
      className={`absolute w-[450px] aspect-[4/5] rounded-[32px] overflow-hidden bg-black border-[3px] transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${transformClasses} ${opacityClass} ${position === "center" ? "border-primary shadow-[0_0_80px_-15px_rgba(229,9,20,0.5)] z-20" : "border-white/10 z-10"}`}
    >
      <img 
        src={activity.cardImageUrl || defaultImage} 
        alt={activity.name}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      
      <div className="absolute inset-0 p-8 flex flex-col justify-end">
        {activity.isFeatured && (
          <div className="self-start mb-auto px-3 py-1 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-lg shadow-primary/50">
            Featured
          </div>
        )}
        <h2 className="text-4xl font-display font-bold leading-tight mb-2 text-shadow-md">
          {activity.name}
        </h2>
        <p className="text-white/80 text-lg leading-snug mb-8 line-clamp-3">
          {activity.shortDescription}
        </p>
        
        <div className="w-full py-4 bg-primary text-white text-center font-display font-bold text-xl rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-wide">
          {activity.ctaText || "Explore"}
        </div>
      </div>
    </div>
  );
}
