import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/use-auth";
import { useListActivities } from "@workspace/api-client-react";
import { Activity, PlayCircle, Eye, Monitor } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { authHeaders } = useRequireAuth();
  
  const { data: activities, isLoading } = useListActivities({
    request: { headers: authHeaders }
  });

  const total = activities?.length || 0;
  const activeCount = activities?.filter(a => a.isActive).length || 0;
  const featuredCount = activities?.filter(a => a.isFeatured).length || 0;

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">System Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's what's currently running on the kiosks.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/display">
            <a target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
              <Eye className="w-4 h-4" />
              Preview Display
            </a>
          </Link>
          <Link href="/admin/activities/new">
            <a className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              <PlayCircle className="w-4 h-4" />
              New Activity
            </a>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatsCard 
          title="Total Activities" 
          value={isLoading ? "-" : total} 
          icon={Activity} 
          description="Total items in library" 
        />
        <StatsCard 
          title="Active Displays" 
          value={isLoading ? "-" : activeCount} 
          icon={Monitor} 
          description="Currently visible on kiosks"
          highlight 
        />
        <StatsCard 
          title="Featured Items" 
          value={isLoading ? "-" : featuredCount} 
          icon={PlayCircle} 
          description="Items marked as featured" 
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-display font-bold mb-4">Quick Guide</h2>
        <div className="prose prose-invert max-w-none text-muted-foreground">
          <p>The Urban Arena kiosk system is controlled from this panel.</p>
          <ul>
            <li><strong>Activities:</strong> Create and manage the cards shown on the display. Only items marked as <em>Active</em> will appear.</li>
            <li><strong>Media:</strong> Upload high-quality portrait (9:16) videos or images for the Hero background, and landscape (16:9) images for the Cards.</li>
            <li><strong>Settings:</strong> Control auto-slide timing, global brand colors, and the background overlay text.</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatsCard({ title, value, icon: Icon, description, highlight = false }: any) {
  return (
    <div className={`
      p-6 rounded-2xl border transition-all duration-300
      ${highlight 
        ? 'bg-gradient-to-br from-primary/10 to-transparent border-primary/20 shadow-lg shadow-primary/5' 
        : 'bg-card border-border shadow-sm'}
    `}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-4xl font-display font-bold mt-2 text-foreground">{value}</h3>
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        </div>
        <div className={`p-3 rounded-xl ${highlight ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
