import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useScreenConfig } from "@/hooks/use-screen-config";
import { Monitor, MapPin, Tv, Settings, Check, Trash2, ArrowLeft } from "lucide-react";

interface ApiLocation { id: number; name: string; code: string; }
interface ApiScreen   { id: number; name: string; code: string; locationId: number | null; moduleType: string; }

export default function DisplayConfigPage() {
  const { config, saveConfig, clearConfig, loaded } = useScreenConfig();
  const [, setLoc] = useLocation();
  const [saved, setSaved] = useState(false);

  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [screens, setScreens]     = useState<ApiScreen[]>([]);

  const [form, setForm] = useState({
    deviceName:   "",
    locationId:   null as number | null,
    locationName: "",
    screenId:     null as number | null,
    screenName:   "",
    moduleType:   "",
    orientation:  "landscape" as "landscape" | "portrait",
    autoplay:     true,
    slideInterval: 8,
  });

  // Sync form from saved config once it's loaded from localStorage
  useEffect(() => {
    if (!loaded) return;
    setForm({
      deviceName:   config.deviceName   || "",
      locationId:   config.locationId   ?? null,
      locationName: config.locationName || "",
      screenId:     config.screenId     ?? null,
      screenName:   config.screenName   || "",
      moduleType:   config.moduleType   || "",
      orientation:  (config.orientation as "landscape" | "portrait") || "landscape",
      autoplay:     config.autoplay     ?? true,
      slideInterval: config.slideInterval ?? 8,
    });
  }, [loaded]);

  // Fetch locations + screens — these endpoints are now public
  useEffect(() => {
    fetch("/api/admin/locations").then(r => r.json()).then(setLocations).catch(() => {});
    fetch("/api/admin/screens").then(r => r.json()).then(setScreens).catch(() => {});
  }, []);

  const filteredScreens = form.locationId
    ? screens.filter(s => s.locationId === form.locationId)
    : screens;

  const handleSave = () => {
    saveConfig(form);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setLoc("/display");
    }, 1200);
  };

  const handleClear = () => {
    clearConfig();
    setForm({
      deviceName: "", locationId: null, locationName: "", screenId: null,
      screenName: "", moduleType: "", orientation: "landscape", autoplay: true, slideInterval: 8,
    });
  };

  const sel = "bg-[#1a0f3a] text-white";

  return (
    <div className="min-h-screen bg-[#0c0820] text-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <button
          onClick={() => setLoc("/display")}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Display
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Screen Configuration</h1>
            <p className="text-white/40 text-sm">Configure this device's display identity</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Device name */}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Device Name (optional)</label>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <Monitor className="w-4 h-4 text-violet-400 flex-none" />
              <input
                className="bg-transparent flex-1 outline-none text-white placeholder:text-white/30"
                placeholder="e.g. Entrance TV 1"
                value={form.deviceName}
                onChange={e => setForm(f => ({ ...f, deviceName: e.target.value }))}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Location</label>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <MapPin className="w-4 h-4 text-pink-400 flex-none" />
              <select
                className="bg-transparent flex-1 outline-none text-white"
                value={form.locationId ?? ""}
                onChange={e => {
                  const id = e.target.value ? parseInt(e.target.value) : null;
                  const loc = locations.find(l => l.id === id);
                  setForm(f => ({ ...f, locationId: id, locationName: loc?.name ?? "", screenId: null, screenName: "" }));
                }}
              >
                <option value="" className={sel}>— Not set —</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id} className={sel}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Screen */}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Screen / TV</label>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <Tv className="w-4 h-4 text-violet-400 flex-none" />
              <select
                className="bg-transparent flex-1 outline-none text-white"
                value={form.screenId ?? ""}
                onChange={e => {
                  const id = e.target.value ? parseInt(e.target.value) : null;
                  const sc = screens.find(s => s.id === id);
                  setForm(f => ({ ...f, screenId: id, screenName: sc?.name ?? "" }));
                }}
              >
                <option value="" className={sel}>— Not set —</option>
                {filteredScreens.map(s => (
                  <option key={s.id} value={s.id} className={sel}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Slide interval */}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">
              Auto-slide Interval: {form.slideInterval}s
            </label>
            <input
              type="range" min={3} max={30} step={1}
              value={form.slideInterval}
              onChange={e => setForm(f => ({ ...f, slideInterval: parseInt(e.target.value) }))}
              className="w-full accent-violet-500"
            />
          </div>

          {/* Current config summary */}
          {(config.screenId || config.locationId) && (
            <div className="bg-violet-600/10 border border-violet-600/30 rounded-xl p-4 text-sm space-y-1">
              <p className="text-white/40 uppercase text-xs tracking-widest mb-2">Currently Active</p>
              {config.locationName && <p>📍 {config.locationName}</p>}
              {config.screenName   && <p>🖥 {config.screenName}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {saved ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
              {saved ? "Saved!" : "Save & Return"}
            </button>
            <button
              onClick={handleClear}
              className="px-4 flex items-center gap-2 bg-white/5 hover:bg-red-600/20 border border-white/10 hover:border-red-500/40 text-white/60 hover:text-red-400 font-semibold py-3 rounded-xl transition-colors"
              title="Clear configuration"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
