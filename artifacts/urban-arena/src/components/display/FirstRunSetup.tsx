import { useState, useEffect } from "react";
import { MapPin, Tv, CheckCircle2, ArrowLeft } from "lucide-react";
import { useScreenConfig } from "@/hooks/use-screen-config";

interface ApiLocation { id: number; name: string; code: string; }
interface ApiScreen   { id: number; name: string; code: string; locationId: number | null; }

interface Props {
  onDone: () => void;
  onBack?: () => void;
  titlePart1?: string;
  titlePart2?: string;
  showAddress?: boolean;
}

export function FirstRunSetup({ onDone, onBack, titlePart1 = "URBAN", titlePart2 = "ARENA", showAddress = false }: Props) {
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

  const PURPLE = "#7C3AED";
  const PINK   = "#EC4899";

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: "#0c0820", zIndex: 100, fontFamily: "system-ui, sans-serif", overflowY: "auto" }}
    >
      {/* Gradient orbs */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "60vw", height: "60vw", borderRadius: "50%", background: `radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)` }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "50vw", height: "50vw", borderRadius: "50%", background: `radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 70%)` }} />
      </div>

      {/* Back button */}
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

      {/* Main panel — wide enough for 4-column grid */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 960, padding: "2rem clamp(1rem, 4vw, 2.5rem)" }}>

        {/* Logo + subtitle */}
        <div style={{ textAlign: "center", marginBottom: "clamp(1.25rem,3vh,2.5rem)" }}>
          <div style={{ fontSize: "clamp(1.8rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "#fff", marginBottom: 6 }}>
            {titlePart1}<span style={{ color: PURPLE }}>{titlePart2}</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "clamp(0.85rem,1.4vw,1rem)" }}>
            {step === "location" ? "Select your venue to get started" : "Which screen is this device?"}
          </p>
        </div>

        {/* Step pills */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: "clamp(1rem,2.5vh,2rem)" }}>
          {(["location", "screen"] as const).map((s, i) => (
            <div key={s} style={{
              width: 36, height: 4, borderRadius: 2,
              background: (step === "screen" && s === "location") || step === s ? PURPLE : "rgba(255,255,255,0.15)",
              opacity: step === "screen" && s === "location" ? 0.5 : 1,
            }} />
          ))}
        </div>

        {/* ── STEP 1: Location ── */}
        {step === "location" && (
          <>
            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "0.75rem",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 8,
            }}>
              {locations.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                  No locations configured yet.<br />
                  <span style={{ fontSize: "0.8rem" }}>Add locations in the admin panel.</span>
                </div>
              ) : locations.map(l => {
                const selected = locationId === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => setLocationId(l.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "1rem 1.1rem", borderRadius: 12, textAlign: "left",
                      background: selected ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.03)",
                      border: selected ? `1px solid rgba(124,58,237,0.6)` : "1px solid rgba(255,255,255,0.07)",
                      color: "#fff", cursor: "pointer", transition: "all 0.15s", width: "100%",
                    }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `rgba(236,72,153,0.15)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <MapPin size={18} color={PINK} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "clamp(0.9rem,1.5vw,1.05rem)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.name}</div>
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.78rem", marginTop: 2 }}>{l.code}</div>
                    </div>
                    {selected && <CheckCircle2 size={16} color={PURPLE} style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => { if (locationId) setStep("screen"); }}
              disabled={!locationId}
              style={{
                marginTop: "1.25rem", width: "100%", padding: "0.95rem",
                background: locationId ? PURPLE : "rgba(124,58,237,0.2)",
                color: locationId ? "#fff" : "rgba(255,255,255,0.3)",
                borderRadius: 14, fontWeight: 700, fontSize: "1rem",
                border: "none", cursor: locationId ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
            >
              Next: Select Screen →
            </button>
          </>
        )}

        {/* ── STEP 2: Screen ── */}
        {step === "screen" && (
          <>
            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "0.75rem",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 8,
              maxHeight: "calc(100vh - 340px)",
              overflowY: "auto",
            }}>
              {filteredScreens.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                  No screens configured for this location.<br />
                  <span style={{ fontSize: "0.8rem" }}>Add screens in the admin panel.</span>
                </div>
              ) : filteredScreens.map(s => {
                const selected = screenId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setScreenId(s.id)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: 10, padding: "1.1rem 0.75rem", borderRadius: 12, textAlign: "center",
                      background: selected ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.03)",
                      border: selected ? `1px solid rgba(124,58,237,0.6)` : "1px solid rgba(255,255,255,0.07)",
                      color: "#fff", cursor: "pointer", transition: "all 0.15s", width: "100%",
                      position: "relative",
                    }}
                  >
                    {selected && (
                      <CheckCircle2 size={15} color={PURPLE} style={{ position: "absolute", top: 8, right: 8 }} />
                    )}
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: selected ? `rgba(124,58,237,0.3)` : `rgba(124,58,237,0.12)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Tv size={22} color={selected ? "#fff" : PURPLE} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "clamp(0.82rem,1.3vw,0.95rem)", lineHeight: 1.3 }}>{s.name}</div>
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.73rem", marginTop: 3, fontFamily: "monospace" }}>{s.code}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: "1.25rem" }}>
              <button
                onClick={() => setStep("location")}
                style={{
                  padding: "0.95rem 1.5rem", borderRadius: 14, fontWeight: 600, fontSize: "1rem",
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
                  flex: 1, padding: "0.95rem", borderRadius: 14, fontWeight: 700, fontSize: "1rem",
                  background: screenId ? PURPLE : "rgba(124,58,237,0.2)",
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

      {/* Device address */}
      {showAddress && (
        <div style={{ position: "fixed", bottom: 20, left: 0, right: 0, textAlign: "center", zIndex: 2 }}>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.72rem", letterSpacing: "0.05em", fontFamily: "monospace" }}>
            {typeof window !== "undefined" ? window.location.origin + "/display/config" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
