import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader as Loader2, Users, CreditCard, Zap, Film, Settings, Mail, Search, ChevronDown, ChevronUp, Pencil, Trash2, Send, Image as ImageIcon, Video, DollarSign, RefreshCw, Database, Shield, Globe } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/dashboard/admin")({ component: Admin });

type Profile = Tables<"profiles">;
type Subscription = Tables<"subscriptions">;
type Plan = Tables<"plans">;
type Generation = Tables<"generations">;

interface UserWithSubscription extends Profile {
  subscriptions: Subscription | null;
}

function Admin() {
  const { user, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    users: 0,
    paid: 0,
    images: 0,
    videos: 0,
    credits: 0,
    revenue: 0,
  });

  // Users state
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "free" | "starter" | "pro" | "business">("all");

  // Plans state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  // Campaign state
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignBody, setCampaignBody] = useState("");
  const [campaignTarget, setCampaignTarget] = useState<"all" | "free" | "paid">("all");
  const [sending, setSending] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    defaultCredits: 50,
    imageCost: 5,
    videoCost: 30,
    maintenanceMode: false,
    allowSignup: true,
  });

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!data) {
        setAllowed(false);
        return;
      }
      setAllowed(true);
      fetchStats();
      fetchUsers();
      fetchPlans();
    })();
  }, [user, sessionLoading, navigate]);

  async function fetchStats() {
    const [usersRes, paidRes, imagesRes, videosRes, creditsRes, paymentsRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).neq("plan", "free"),
      supabase.from("generations").select("id", { count: "exact", head: true }).eq("tool_type", "image").eq("status", "done"),
      supabase.from("generations").select("id", { count: "exact", head: true }).eq("tool_type", "video").eq("status", "done"),
      supabase.from("credit_wallets").select("balance"),
      supabase.from("payments").select("amount").eq("status", "completed"),
    ]);

    const totalCredits = creditsRes.data?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0;
    const totalRevenue = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

    setStats({
      users: usersRes.count ?? 0,
      paid: paidRes.count ?? 0,
      images: imagesRes.count ?? 0,
      videos: videosRes.count ?? 0,
      credits: totalCredits,
      revenue: totalRevenue,
    });
  }

  async function fetchUsers() {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
    if (!profiles) return;

    const userIds = profiles.map((p) => p.id);
    const { data: subs } = await supabase.from("subscriptions").select("*").in("user_id", userIds);
    const subMap = new Map(subs?.map((s) => [s.user_id, s]));

    const usersWithSubs = profiles.map((p) => ({
      ...p,
      subscriptions: subMap.get(p.id) || null,
    }));

    setUsers(usersWithSubs as UserWithSubscription[]);
  }

  async function fetchPlans() {
    const { data } = await supabase.from("plans").select("*").order("price_monthly", { ascending: true });
    setPlans((data as Plan[]) ?? []);
  }

  async function updatePlan(plan: Plan) {
    const { error } = await supabase
      .from("plans")
      .update({
        display_name: plan.display_name,
        monthly_credits: plan.monthly_credits,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        features: plan.features,
        is_active: plan.is_active,
      })
      .eq("id", plan.id);

    if (error) {
      toast.error("Failed to update plan");
      return;
    }
    toast.success("Plan updated");
    setPlanDialogOpen(false);
    setEditingPlan(null);
    fetchPlans();
  }

  async function sendCampaign() {
    if (!campaignSubject.trim() || !campaignBody.trim()) {
      toast.error("Subject and body are required");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-campaign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          subject: campaignSubject,
          body: campaignBody,
          target: campaignTarget,
        }),
      });

      if (!res.ok) throw new Error("Failed to send campaign");
      toast.success("Campaign sent successfully");
      setCampaignSubject("");
      setCampaignBody("");
    } catch {
      toast.error("Failed to send campaign");
    } finally {
      setSending(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !userSearch ||
      u.display_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase());
    const matchesFilter = userFilter === "all" || u.subscriptions?.plan === userFilter;
    return matchesSearch && matchesFilter;
  });

  if (allowed === null) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Card className="glass border-0 p-8 text-center">
          <Shield className="size-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Admin Access Required</h2>
          <p className="text-muted-foreground mt-2">You don't have permission to view this page.</p>
          <Button onClick={() => navigate({ to: "/dashboard" })} className="mt-4">
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-blue-400" },
    { label: "Paid Subscribers", value: stats.paid, icon: CreditCard, color: "text-green-400" },
    { label: "Images Generated", value: stats.images, icon: ImageIcon, color: "text-purple-400" },
    { label: "Videos Generated", value: stats.videos, icon: Video, color: "text-pink-400" },
    { label: "Credits Outstanding", value: stats.credits.toLocaleString(), icon: Database, color: "text-amber-400" },
    { label: "Total Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400" },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground mt-1">Manage users, plans, and platform settings</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchUsers(); fetchPlans(); }}>
            <RefreshCw className="size-4 mr-2" /> Refresh
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background">
              <Zap className="size-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-background">
              <Users className="size-4 mr-2" /> Users
            </TabsTrigger>
            <TabsTrigger value="plans" className="data-[state=active]:bg-background">
              <CreditCard className="size-4 mr-2" /> Plans
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-background">
              <Mail className="size-4 mr-2" /> Campaigns
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-background">
              <Settings className="size-4 mr-2" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {statCards.map((stat) => (
                <Card key={stat.label} className="glass border-0 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <stat.icon className={`size-5 ${stat.color}`} />
                  </div>
                  <div className="mt-2 text-3xl font-display font-bold">{stat.value}</div>
                </Card>
              ))}
            </div>

            <Card className="glass border-0 p-6 mt-6">
              <h3 className="font-display font-semibold mb-4">Quick Actions</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button variant="outline" className="justify-start" onClick={() => setActiveTab("users")}>
                  <Users className="size-4 mr-2" /> Manage Users
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => setActiveTab("plans")}>
                  <CreditCard className="size-4 mr-2" /> Edit Plans
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => setActiveTab("campaigns")}>
                  <Mail className="size-4 mr-2" /> Send Campaign
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => setActiveTab("settings")}>
                  <Settings className="size-4 mr-2" /> Settings
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="glass border-0 p-6">
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-10"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  {(["all", "free", "starter", "pro", "business"] as const).map((f) => (
                    <Button
                      key={f}
                      variant={userFilter === f ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUserFilter(f)}
                      className={userFilter === f ? "btn-gradient text-white border-0" : ""}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 font-medium text-muted-foreground">Plan</th>
                      <th className="text-left py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 font-medium text-muted-foreground">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.slice(0, 20).map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-gradient-to-br from-primary to-primary/50 grid place-items-center text-white text-sm font-medium">
                              {(u.display_name?.[0] || u.id[0] || "U").toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{u.display_name || "Unnamed"}</div>
                              <div className="text-xs text-muted-foreground">{u.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge
                            variant="outline"
                            className={
                              u.subscriptions?.plan === "pro"
                                ? "border-primary text-primary"
                                : u.subscriptions?.plan === "business"
                                  ? "border-amber-500 text-amber-500"
                                  : ""
                            }
                          >
                            {u.subscriptions?.plan || "free"}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge variant="outline" className="border-green-500 text-green-500">
                            {u.subscriptions?.status || "active"}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length > 20 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Showing 20 of {filteredUsers.length} users
                </p>
              )}
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <div className="grid md:grid-cols-2 gap-4">
              {plans.map((plan) => (
                <Card key={plan.id} className="glass border-0 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-display text-xl font-semibold">{plan.display_name}</h3>
                      <p className="text-sm text-muted-foreground">{plan.name}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingPlan(plan); setPlanDialogOpen(true); }}>
                      <Pencil className="size-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Monthly Price</div>
                      <div className="text-2xl font-display font-bold">${Number(plan.price_monthly).toFixed(0)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Yearly Price</div>
                      <div className="text-2xl font-display font-bold">${Number(plan.price_yearly).toFixed(0)}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-muted-foreground">Monthly Credits</div>
                    <div className="text-lg font-semibold">{plan.monthly_credits.toLocaleString()}</div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Features</div>
                    <div className="flex flex-wrap gap-2">
                      {((plan.features as string[]) || []).map((f, i) => (
                        <Badge key={i} variant="secondary" className="bg-muted/50">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <Badge className={plan.is_active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                      {plan.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>

            <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Plan</DialogTitle>
                </DialogHeader>
                {editingPlan && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Display Name</Label>
                      <Input
                        value={editingPlan.display_name}
                        onChange={(e) => setEditingPlan({ ...editingPlan, display_name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Monthly Price ($)</Label>
                        <Input
                          type="number"
                          value={editingPlan.price_monthly}
                          onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Yearly Price ($)</Label>
                        <Input
                          type="number"
                          value={editingPlan.price_yearly}
                          onChange={(e) => setEditingPlan({ ...editingPlan, price_yearly: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Monthly Credits</Label>
                      <Input
                        type="number"
                        value={editingPlan.monthly_credits}
                        onChange={(e) => setEditingPlan({ ...editingPlan, monthly_credits: Number(e.target.value) })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={editingPlan.is_active}
                        onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
                    </div>
                  </div>
                )}
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
                  <Button className="btn-gradient text-white border-0" onClick={() => editingPlan && updatePlan(editingPlan)}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            <Card className="glass border-0 p-6">
              <h3 className="font-display font-semibold mb-4">Send Email Campaign</h3>

              <div className="space-y-4">
                <div>
                  <Label>Target Audience</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {(["all", "free", "paid"] as const).map((t) => (
                      <Button
                        key={t}
                        variant={campaignTarget === t ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCampaignTarget(t)}
                        className={campaignTarget === t ? "btn-gradient text-white border-0" : ""}
                      >
                        {t === "all" ? "All Users" : t === "free" ? "Free Tier" : "Paid Users"}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Subject Line</Label>
                  <Input
                    placeholder="Enter email subject..."
                    value={campaignSubject}
                    onChange={(e) => setCampaignSubject(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Email Body</Label>
                  <Textarea
                    placeholder="Write your email content here..."
                    className="min-h-[200px]"
                    value={campaignBody}
                    onChange={(e) => setCampaignBody(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    This will send to{" "}
                    <span className="font-medium text-foreground">
                      {campaignTarget === "all" ? stats.users : campaignTarget === "paid" ? stats.paid : stats.users - stats.paid}
                    </span>{" "}
                    users
                  </p>
                  <Button
                    className="btn-gradient text-white border-0"
                    disabled={sending || !campaignSubject.trim() || !campaignBody.trim()}
                    onClick={sendCampaign}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="size-4 mr-2" /> Send Campaign
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="glass border-0 p-6">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="size-5" /> Credit Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Default Monthly Credits (New Users)</Label>
                    <Input
                      type="number"
                      value={settings.defaultCredits}
                      onChange={(e) => setSettings({ ...settings, defaultCredits: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Image Generation Cost</Label>
                    <Input
                      type="number"
                      value={settings.imageCost}
                      onChange={(e) => setSettings({ ...settings, imageCost: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Video Generation Cost</Label>
                    <Input
                      type="number"
                      value={settings.videoCost}
                      onChange={(e) => setSettings({ ...settings, videoCost: Number(e.target.value) })}
                    />
                  </div>
                  <Button variant="outline" className="w-full">
                    Save Credit Settings
                  </Button>
                </div>
              </Card>

              <Card className="glass border-0 p-6">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <Globe className="size-5" /> Platform Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow New Signups</Label>
                      <p className="text-xs text-muted-foreground">Disable to put platform in invite-only mode</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.allowSignup}
                      onChange={(e) => setSettings({ ...settings, allowSignup: e.target.checked })}
                      className="rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Maintenance Mode</Label>
                      <p className="text-xs text-muted-foreground">Show maintenance page to non-admins</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.maintenanceMode}
                      onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                      className="rounded"
                    />
                  </div>
                  <Button variant="outline" className="w-full">
                    Save Platform Settings
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
