import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon, Video } from "lucide-react";
import { useUploadImage, useUploadVideo } from "@workspace/api-client-react";
import { useAuthToken } from "@/hooks/use-auth";

interface MediaUploadProps {
  label: string;
  type: "image" | "video";
  value: string | null;
  onChange: (url: string | null) => void;
  description?: string;
}

export function MediaUpload({ label, type, value, onChange, description }: MediaUploadProps) {
  const { authHeaders } = useAuthToken();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const { mutateAsync: uploadImg, isPending: isUploadingImg } = useUploadImage({
    request: { headers: authHeaders }
  });
  
  const { mutateAsync: uploadVid, isPending: isUploadingVid } = useUploadVideo({
    request: { headers: authHeaders }
  });

  const isUploading = isUploadingImg || isUploadingVid;

  const handleFile = async (file: File) => {
    try {
      if (type === "image") {
        const res = await uploadImg({ data: { file } });
        onChange(res.url);
      } else {
        const res = await uploadVid({ data: { file } });
        onChange(res.url);
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload file. Please check size limits.");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-black/50 group aspect-video max-w-sm">
          {type === "image" ? (
            <img src={value} alt={label} className="w-full h-full object-cover" />
          ) : (
            <video src={value} className="w-full h-full object-cover" muted loop autoPlay />
          )}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              type="button"
              onClick={() => onChange(null)}
              className="bg-destructive text-destructive-foreground p-3 rounded-full hover:scale-110 transition-transform shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`
            border-2 border-dashed rounded-xl p-8 transition-all text-center
            ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/50'}
            ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            type="file"
            ref={inputRef}
            className="hidden"
            accept={type === "image" ? "image/*" : "video/*"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div className="mx-auto w-12 h-12 rounded-full bg-background flex items-center justify-center mb-4 shadow-sm">
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : type === "image" ? (
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            ) : (
              <Video className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <p className="font-medium text-sm">
            {isUploading ? "Uploading..." : `Click or drag to upload ${type}`}
          </p>
          {!isUploading && (
            <p className="text-xs text-muted-foreground mt-1">
              {type === "image" ? "PNG, JPG up to 10MB" : "MP4, WebM up to 50MB"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
