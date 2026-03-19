import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/use-auth";
import { useListActivities, useUpdateActivity, useDeleteActivity, useReorderActivity, getListActivitiesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit2, Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Video } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminActivities() {
  const { authHeaders } = useRequireAuth();
  const queryClient = useQueryClient();
  
  const { data: activities, isLoading } = useListActivities({
    request: { headers: authHeaders }
  });

  const { mutate: updateActivity } = useUpdateActivity({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() })
    }
  });

  const { mutate: deleteActivity } = useDeleteActivity({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() })
    }
  });

  const { mutate: reorderActivity } = useReorderActivity({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() })
    }
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this activity?")) {
      deleteActivity({ id });
    }
  };

  const handleToggleActive = (id: number, current: boolean) => {
    updateActivity({ id, data: { isActive: !current } });
  };

  // Simple reorder: just swap sortOrder with adjacent item
  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!activities) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activities.length) return;

    const currentItem = activities[index];
    const targetItem = activities[targetIndex];

    // Assuming backend sortOrder is currently sequential. We'll swap them.
    // Call two endpoints quickly (not perfect transactional but fine for this scope)
    reorderActivity({ id: currentItem.id, data: { sortOrder: targetItem.sortOrder } });
    reorderActivity({ id: targetItem.id, data: { sortOrder: currentItem.sortOrder } });
  };

  // Sort local data by sortOrder just in case
  const sortedActivities = activities ? [...activities].sort((a, b) => a.sortOrder - b.sortOrder) : [];

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Manage Activities</h1>
          <p className="text-muted-foreground mt-1">Control what appears on the kiosk displays.</p>
        </div>
        <Link href="/admin/activities/new">
          <a className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all">
            <Plus className="w-5 h-5" />
            Add Activity
          </a>
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading activities...</div>
        ) : sortedActivities.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium mb-2">No activities yet</h3>
            <p className="text-muted-foreground mb-6">Create your first activity to show on the display.</p>
            <Link href="/admin/activities/new">
              <a className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium">Create Activity</a>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/50 border-b border-border text-muted-foreground text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium w-16 text-center">Order</th>
                  <th className="p-4 font-medium">Activity Name</th>
                  <th className="p-4 font-medium w-32">Media</th>
                  <th className="p-4 font-medium w-24 text-center">Status</th>
                  <th className="p-4 font-medium w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedActivities.map((activity, idx) => (
                  <tr key={activity.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleMove(idx, 'up')} 
                          disabled={idx === 0}
                          className="hover:text-primary disabled:opacity-30 p-1"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-mono">{activity.sortOrder}</span>
                        <button 
                          onClick={() => handleMove(idx, 'down')} 
                          disabled={idx === sortedActivities.length - 1}
                          className="hover:text-primary disabled:opacity-30 p-1"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-foreground">{activity.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{activity.shortDescription || "No description"}</div>
                      <div className="mt-2 flex gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-xs font-medium border border-border/50">
                          Age: {activity.ageLimit}+
                        </span>
                        {activity.isFeatured && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20 text-xs font-medium">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {activity.heroImageUrl ? <ImageIcon className="w-5 h-5 text-green-500" /> : <ImageIcon className="w-5 h-5 text-muted-foreground/30" />}
                        {activity.heroVideoUrl ? <Video className="w-5 h-5 text-blue-500" /> : <Video className="w-5 h-5 text-muted-foreground/30" />}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Switch 
                        checked={activity.isActive} 
                        onCheckedChange={() => handleToggleActive(activity.id, activity.isActive)} 
                      />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/activities/${activity.id}/edit`}>
                          <a className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </a>
                        </Link>
                        <button 
                          onClick={() => handleDelete(activity.id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
