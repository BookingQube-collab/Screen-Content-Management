import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/use-auth";
import { useGetActivity, useCreateActivity, useUpdateActivity, getListActivitiesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MediaUpload } from "@/components/admin/MediaUpload";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

export default function AdminActivityForm() {
  const { authHeaders } = useRequireAuth();
  const [, params] = useRoute("/admin/activities/:id/edit");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const isEdit = !!params?.id;
  const id = params?.id ? parseInt(params.id) : 0;

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    shortDescription: "",
    fullDescription: "",
    ageLimit: 18,
    ctaText: "Explore Now",
    termsAndConditions: "",
    isActive: true,
    isFeatured: false,
    heroImageUrl: null as string | null,
    heroVideoUrl: null as string | null,
    cardImageUrl: null as string | null,
    sortOrder: 0
  });

  const { data: existingData, isLoading: isLoadingExisting } = useGetActivity(id, {
    query: { enabled: isEdit },
    request: { headers: authHeaders }
  });

  useEffect(() => {
    if (existingData && isEdit) {
      setFormData({
        name: existingData.name,
        slug: existingData.slug,
        shortDescription: existingData.shortDescription || "",
        fullDescription: existingData.fullDescription || "",
        ageLimit: existingData.ageLimit,
        ctaText: existingData.ctaText,
        termsAndConditions: existingData.termsAndConditions || "",
        isActive: existingData.isActive,
        isFeatured: existingData.isFeatured,
        heroImageUrl: existingData.heroImageUrl || null,
        heroVideoUrl: existingData.heroVideoUrl || null,
        cardImageUrl: existingData.cardImageUrl || null,
        sortOrder: existingData.sortOrder
      });
    }
  }, [existingData, isEdit]);

  const { mutateAsync: createAct, isPending: isCreating } = useCreateActivity({
    request: { headers: authHeaders }
  });
  
  const { mutateAsync: updateAct, isPending: isUpdating } = useUpdateActivity({
    request: { headers: authHeaders }
  });

  const isSaving = isCreating || isUpdating;

  // Auto-generate slug from name if slug is empty
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      name: val,
      slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await updateAct({ id, data: formData });
      } else {
        await createAct({ data: formData });
      }
      queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
      setLocation("/admin/activities");
    } catch (err) {
      console.error(err);
      alert("Failed to save activity");
    }
  };

  if (isEdit && isLoadingExisting) {
    return <AdminLayout><div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/activities">
            <a className="p-2 rounded-lg hover:bg-secondary transition-colors"><ArrowLeft className="w-5 h-5" /></a>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold">{isEdit ? "Edit Activity" : "New Activity"}</h1>
            <p className="text-muted-foreground mt-1">Configure details and media for the kiosk display.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Form Details */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
            <h2 className="text-xl font-semibold border-b border-border pb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input required value={formData.name} onChange={handleNameChange} placeholder="e.g. VR Racing" />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL friendly)</Label>
                <Input required value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Short Description (Card Subtitle)</Label>
              <Input required value={formData.shortDescription} onChange={e => setFormData({...formData, shortDescription: e.target.value})} maxLength={60} />
            </div>

            <div className="space-y-2">
              <Label>Full Description</Label>
              <Textarea value={formData.fullDescription} onChange={e => setFormData({...formData, fullDescription: e.target.value})} rows={4} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Age Limit</Label>
                <Input type="number" required min={0} value={formData.ageLimit} onChange={e => setFormData({...formData, ageLimit: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>CTA Button Text</Label>
                <Input required value={formData.ctaText} onChange={e => setFormData({...formData, ctaText: e.target.value})} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Specific Terms & Conditions (Optional)</Label>
              <Textarea value={formData.termsAndConditions} onChange={e => setFormData({...formData, termsAndConditions: e.target.value})} rows={2} placeholder="Overrides global terms if provided" />
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
             <h2 className="text-xl font-semibold border-b border-border pb-4">Display Media</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <MediaUpload 
                 label="Hero Video (Background)" 
                 type="video"
                 description="1080x1920 (9:16 portrait) MP4. Plays in full screen background."
                 value={formData.heroVideoUrl}
                 onChange={(url) => setFormData({...formData, heroVideoUrl: url})}
               />
               <MediaUpload 
                 label="Hero Image (Background)" 
                 type="image"
                 description="1080x1920 (9:16). Used as fallback if no video."
                 value={formData.heroImageUrl}
                 onChange={(url) => setFormData({...formData, heroImageUrl: url})}
               />
             </div>
             <div className="pt-6 border-t border-border">
               <MediaUpload 
                 label="Card Thumbnail Image" 
                 type="image"
                 description="16:9 Landscape image for the slider cards."
                 value={formData.cardImageUrl}
                 onChange={(url) => setFormData({...formData, cardImageUrl: url})}
               />
             </div>
          </div>
        </div>

        {/* Right Column: Settings & Submit */}
        <div className="space-y-6">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6 sticky top-8">
            <h2 className="text-xl font-semibold border-b border-border pb-4">Publishing</h2>
            
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border border-border">
              <div>
                <Label className="text-base">Active</Label>
                <p className="text-xs text-muted-foreground mt-1">Show on the public kiosk</p>
              </div>
              <Switch checked={formData.isActive} onCheckedChange={c => setFormData({...formData, isActive: c})} />
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border border-border">
              <div>
                <Label className="text-base">Featured</Label>
                <p className="text-xs text-muted-foreground mt-1">Add visual highlight</p>
              </div>
              <Switch checked={formData.isFeatured} onCheckedChange={c => setFormData({...formData, isFeatured: c})} />
            </div>

            <div className="pt-4 space-y-3">
              <Button type="submit" className="w-full" size="lg" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isEdit ? "Save Changes" : "Create Activity"}
              </Button>
              <Link href="/admin/activities">
                <Button type="button" variant="outline" className="w-full">Cancel</Button>
              </Link>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
