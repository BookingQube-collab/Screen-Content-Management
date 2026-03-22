import { useState, useEffect } from "react";
import { MapPin, Tv, ChevronRight, ArrowLeft } from "lucide-react";
import { useScreenConfig } from "@/hooks/use-screen-config";

interface ApiLocation { id: number; name: string; code: string; }
interface ApiScreen   { id: number; name: string; code: string; locationId: number | null; }

interface Props {
  onDone: () => void;
  onBack?: () => void;
  titlePart1?: string;
  titlePart2?: string;
}

export function FirstRunSetup({ onDone, onBack, titlePart1 = "URBAN", titlePart2 = "ARENA" }: Props) {
  const { saveConfig } = useScreenConfig();
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [screens,   setScreens]   = useState<ApiScreen[]>([]);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [screenId,   setScreenId]   = useState<number | null>(null);
  const [step, setStep] = useState<"location" | "screen">("location");

  useEffect(() => {
    fetch("/api/admin/locations")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setLocations(d); })
      .catch(() => {});
    fetch("/api/admin/screens")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setScreens(d); })
      .catch(() => {});
  }, []);

  const filteredScreens = locationId
    ? screens.filter(s => s.locationId === locationId)
    : screens;

  const handleStart = () => {
    const loc = locations.find(l => l.id === locationId);
    const sc  = screens.find(s => s.id === screenId);
    saveConfig({
      locationId,
      locationName: loc?.name ?? "",
      screenId,
      screenName:   sc?.name ?? "",
    });
    onDone();
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: "#0c0820", zIndex: 100, fontFamily: "system-ui, sans-serif" }}
    >
      {/* Gradient orbs */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "60vw", height: "60vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "50vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 70%)" }} />
      </div>

      {/* Optional back button (for config page context) */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: "absolute", top: 24, left: 24, zIndex: 2,
            display: "flex", alignItems: "center", gap: 8,
            color: "rgba(255,255,255,0.45)", background: "transparent", border: "none",
            cursor: "pointer", fontSize: "0.9rem", fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} /> Back to Display
        </button>
      )}

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 480, padding: "0 2rem" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "clamp(2rem,5vh,4rem)" }}>
          <div style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "#fff", marginBottom: 8 }}>
            {titlePart1}<span style={{ color: "#7C3AED" }}>{titlePart2}</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "clamp(0.85rem,1.5vw,1.1rem)" }}>
            {step === "location" ? "Select your venue to get started" : "Which screen is this device?"}
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: "2rem" }}>
          {(["location", "screen"] as const).map(s => (
            <div key={s} style={{ width: 32, height: 4, borderRadius: 2, background: step === s || s === "location" ? "#7C3AED" : "rgba(255,255,255,0.15)", opacity: step === "screen" && s === "location" ? 0.5 : 1 }} />
          ))}
        </div>

        {step === "location" ? (
          <>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "0.5rem" }}>
              {locations.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                  No locations configured yet.<br />
                  <span style={{ fontSize: "0.8rem" }}>Add locations in the admin panel.</span>
                </div>
              ) : locations.map(l => (
                <button
                  key={l.id}
                  onClick={() => setLocationId(l.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    width: "100%", padding: "1.1rem 1.25rem", borderRadius: 12,
                    background: locationId === l.id ? "rgba(124,58,237,0.25)" : "transparent",
                    border: locationId === l.id ? "1px solid rgba(124,58,237,0.6)" : "1px solid transparent",
                    color: "#fff", cursor: "pointer", textAlign: "left", marginBottom: 4,
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(236,72,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <MapPin size={20} color="#EC4899" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "clamp(1rem,1.8vw,1.15rem)" }}>{l.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", marginTop: 2 }}>{l.code}</div>
                  </div>
                  {locationId === l.id && <ChevronRight size={18} color="#7C3AED" style={{ marginLeft: "auto" }} />}
                </button>
              ))}
            </div>

            <button
              onClick={() => { if (locationId) setStep("screen"); }}
              disabled={!locationId}
              style={{
                marginTop: "1.5rem", width: "100%", padding: "1rem",
                background: locationId ? "#7C3AED" : "rgba(124,58,237,0.2)",
                color: locationId ? "#fff" : "rgba(255,255,255,0.3)",
                borderRadius: 14, fontWeight: 700, fontSize: "1.05rem",
                border: "none", cursor: locationId ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
            >
              Next: Select Screen →
            </button>
          </>
        ) : (
          <>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "0.5rem" }}>
              {filteredScreens.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                  No screens configured for this location.<br />
                  <span style={{ fontSize: "0.8rem" }}>Add screens in the admin panel.</span>
                </div>
              ) : filteredScreens.map(s => (
                <button
                  key={s.id}
                  onClick={() => setScreenId(s.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    width: "100%", padding: "1.1rem 1.25rem", borderRadius: 12,
                    background: screenId === s.id ? "rgba(124,58,237,0.25)" : "transparent",
                    border: screenId === s.id ? "1px solid rgba(124,58,237,0.6)" : "1px solid transparent",
                    color: "#fff", cursor: "pointer", textAlign: "left", marginBottom: 4,
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Tv size={20} color="#7C3AED" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "clamp(1rem,1.8vw,1.15rem)" }}>{s.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", marginTop: 2 }}>{s.code}</div>
                  </div>
                  {screenId === s.id && <ChevronRight size={18} color="#7C3AED" style={{ marginLeft: "auto" }} />}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: "1.5rem" }}>
              <button
                onClick={() => setStep("location")}
                style={{
                  padding: "1rem 1.5rem", borderRadius: 14, fontWeight: 600, fontSize: "1rem",
                  background: "transparent", color: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleStart}
                disabled={!screenId}
                style={{
                  flex: 1, padding: "1rem", borderRadius: 14, fontWeight: 700, fontSize: "1.05rem",
                  background: screenId ? "#7C3AED" : "rgba(124,58,237,0.2)",
                  color: screenId ? "#fff" : "rgba(255,255,255,0.3)",
                  border: "none", cursor: screenId ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                }}
              >
                Start Display →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
