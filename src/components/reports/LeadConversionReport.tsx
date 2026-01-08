import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, FunnelChart, Funnel, LabelList } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, TrendingUp, Users, UserPlus } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  new: 'hsl(var(--primary))',
  contacted: 'hsl(200, 70%, 50%)',
  hot: 'hsl(0, 70%, 50%)',
  warm: 'hsl(30, 70%, 50%)',
  cold: 'hsl(210, 30%, 50%)',
  converted: 'hsl(120, 60%, 45%)',
  lost: 'hsl(0, 0%, 50%)',
};

const chartConfig = {
  leads: {
    label: 'Leads',
    color: 'hsl(var(--primary))',
  },
};

export function LeadConversionReport() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['lead-conversion-report'],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, status, source, created_at, assigned_staff_id');
      
      if (error) throw error;

      const { data: staff } = await supabase
        .from('staff')
        .select('id, name');

      const staffMap = staff?.reduce((acc, s) => {
        acc[s.id] = s.name;
        return acc;
      }, {} as Record<string, string>) || {};

      const totalLeads = leads?.length || 0;
      const convertedLeads = leads?.filter(l => l.status === 'converted').length || 0;
      const lostLeads = leads?.filter(l => l.status === 'lost').length || 0;
      const activeLeads = totalLeads - convertedLeads - lostLeads;

      const statusStats = leads?.reduce((acc, l) => {
        const status = l.status || 'new';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const sourceStats = leads?.reduce((acc, l) => {
        const source = l.source || 'other';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const staffStats = leads?.reduce((acc, l) => {
        if (l.assigned_staff_id) {
          const name = staffMap[l.assigned_staff_id] || 'Unknown';
          if (!acc[name]) {
            acc[name] = { total: 0, converted: 0 };
          }
          acc[name].total++;
          if (l.status === 'converted') {
            acc[name].converted++;
          }
        }
        return acc;
      }, {} as Record<string, { total: number; converted: number }>) || {};

      const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0';

      return {
        totalLeads,
        convertedLeads,
        lostLeads,
        activeLeads,
        conversionRate,
        statusStats: Object.entries(statusStats).map(([name, value]) => ({ 
          name: name.charAt(0).toUpperCase() + name.slice(1), 
          value,
          fill: STATUS_COLORS[name] || 'hsl(var(--muted))'
        })),
        sourceStats: Object.entries(sourceStats).map(([name, value]) => ({ 
          name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), 
          value 
        })),
        staffPerformance: Object.entries(staffStats).map(([name, data]) => ({
          name,
          total: data.total,
          converted: data.converted,
          rate: data.total > 0 ? Math.round((data.converted / data.total) * 100) : 0,
        })).sort((a, b) => b.rate - a.rate),
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Lead Conversion</CardTitle></CardHeader>
          <CardContent><Skeleton className="h-[200px] w-full" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Lead Sources</CardTitle></CardHeader>
          <CardContent><Skeleton className="h-[200px] w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-primary/10 p-2 sm:p-3">
                <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats?.totalLeads || 0}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-green-500/10 p-2 sm:p-3">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats?.convertedLeads || 0}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Converted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-yellow-500/10 p-2 sm:p-3">
                <Target className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats?.activeLeads || 0}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-accent/10 p-2 sm:p-3">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats?.conversionRate || 0}%</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Lead Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <ChartContainer config={chartConfig} className="h-[180px] sm:h-[250px] w-full">
              <PieChart>
                <Pie
                  data={stats?.statusStats || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                >
                  {stats?.statusStats?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            {/* Legend for mobile */}
            {stats?.statusStats && stats.statusStats.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-2 sm:hidden">
                {stats.statusStats.map((item) => (
                  <div key={item.name} className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span>{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <ChartContainer config={chartConfig} className="h-[180px] sm:h-[250px] w-full">
              <BarChart data={stats?.sourceStats || []} layout="vertical" margin={{ left: 60, right: 10, top: 5, bottom: 5 }}>
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={55} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {stats?.staffPerformance && stats.staffPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Staff Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.staffPerformance.map((staff) => (
                <div key={staff.name} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{staff.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {staff.converted}/{staff.total} leads ({staff.rate}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${staff.rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function getLeadExportData() {
  return async () => {
    const { data: leads } = await supabase
      .from('leads')
      .select('name, email, phone, status, source, interest, created_at, next_follow_up');
    
    return leads?.map(l => ({
      Name: l.name,
      Email: l.email || 'N/A',
      Phone: l.phone,
      Status: l.status || 'new',
      Source: l.source || 'other',
      Interest: l.interest || 'normal',
      'Created Date': l.created_at,
      'Next Follow Up': l.next_follow_up || 'N/A',
    })) || [];
  };
}
