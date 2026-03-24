import { useState, useRef } from "react";
import { X, Loader2, Plus, Images } from "lucide-react";
import { useUploadImage } from "@workspace/api-client-react";
import { useAuthToken } from "@/hooks/use-auth";

interface GalleryUploadProps {
  label: string;
  description?: string;
  value: string[];
  onChange: (urls: string[]) => void;
}

export function GalleryUpload({ label, description, value, onChange }: GalleryUploadProps) {
  const { authHeaders } = useAuthToken();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { mutateAsync: uploadImg } = useUploadImage({
    request: { headers: authHeaders },
  });

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const res = await uploadImg({ data: { file } });
        newUrls.push(res.url);
      }
      onChange([...value, ...newUrls]);
    } catch {
      alert("Failed to upload image(s). Please try again.");
    }
    setUploading(false);
  };

  const removeAt = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <div className="border border-border rounded-xl p-3 bg-black/20">
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((url, i) => (
            <div
              key={url + i}
              className="relative group w-[72px] h-[72px] rounded-lg overflow-hidden border border-border bg-black/50 flex-shrink-0"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-primary/90 text-white leading-tight py-0.5">
                  1st
                </span>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-[72px] h-[72px] rounded-lg border-2 border-dashed border-border hover:border-primary/60 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary flex-shrink-0 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span className="text-[10px]">Add</span>
              </>
            )}
          </button>

          {value.length === 0 && !uploading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm ml-1 self-center">
              <Images className="w-4 h-4" />
              <span>No images yet — click Add to upload</span>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {value.length > 0
            ? `${value.length} image${value.length > 1 ? "s" : ""} — will cycle as a background slideshow on the kiosk.`
            : "Upload one or more images. Multiple images will auto-cycle on the display."}
        </p>
      </div>

      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
