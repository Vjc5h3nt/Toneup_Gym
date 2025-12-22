import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, UserX, Activity } from 'lucide-react';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--muted))',
];

const chartConfig = {
  members: {
    label: 'Members',
    color: 'hsl(var(--primary))',
  },
};

export function MemberStatistics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['member-statistics'],
    queryFn: async () => {
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id, is_active, gender, created_at');
      
      if (membersError) throw membersError;

      const { data: memberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('type, status');
      
      if (membershipsError) throw membershipsError;

      const totalMembers = members?.length || 0;
      const activeMembers = members?.filter(m => m.is_active).length || 0;
      const inactiveMembers = totalMembers - activeMembers;

      const genderStats = members?.reduce((acc, m) => {
        const gender = m.gender || 'Not specified';
        acc[gender] = (acc[gender] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const membershipTypes = memberships?.reduce((acc, m) => {
        const type = m.type || 'normal';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const membershipStatus = memberships?.reduce((acc, m) => {
        const status = m.status || 'active';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalMembers,
        activeMembers,
        inactiveMembers,
        genderStats: Object.entries(genderStats).map(([name, value]) => ({ name, value })),
        membershipTypes: Object.entries(membershipTypes).map(([name, value]) => ({ 
          name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), 
          value 
        })),
        membershipStatus: Object.entries(membershipStatus).map(([name, value]) => ({ 
          name: name.charAt(0).toUpperCase() + name.slice(1), 
          value 
        })),
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Member Statistics</CardTitle></CardHeader>
          <CardContent><Skeleton className="h-[200px] w-full" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Membership Types</CardTitle></CardHeader>
          <CardContent><Skeleton className="h-[200px] w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalMembers || 0}</p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500/10 p-3">
                <UserCheck className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.activeMembers || 0}</p>
                <p className="text-sm text-muted-foreground">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-red-500/10 p-3">
                <UserX className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.inactiveMembers || 0}</p>
                <p className="text-sm text-muted-foreground">Inactive Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-accent/10 p-3">
                <Activity className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats?.totalMembers ? Math.round((stats.activeMembers / stats.totalMembers) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Active Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Membership Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <PieChart>
                <Pie
                  data={stats?.membershipTypes || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {stats?.membershipTypes?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membership Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={stats?.membershipStatus || []} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function getMemberExportData() {
  return async () => {
    const { data: members } = await supabase
      .from('members')
      .select('name, email, phone, gender, is_active, created_at');
    
    const { data: memberships } = await supabase
      .from('memberships')
      .select('member_id, type, status, start_date, end_date, price');

    const membershipMap = memberships?.reduce((acc, m) => {
      if (!acc[m.member_id]) acc[m.member_id] = [];
      acc[m.member_id].push(m);
      return acc;
    }, {} as Record<string, typeof memberships>) || {};

    return members?.map(m => ({
      Name: m.name,
      Email: m.email || 'N/A',
      Phone: m.phone,
      Gender: m.gender || 'Not specified',
      Status: m.is_active ? 'Active' : 'Inactive',
      'Join Date': m.created_at,
    })) || [];
  };
}
