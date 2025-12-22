import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--primary))',
  },
};

export function RevenueChart() {
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['revenue-report'],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);
        
        const { data, error } = await supabase
          .from('payments')
          .select('amount')
          .gte('payment_date', format(start, 'yyyy-MM-dd'))
          .lte('payment_date', format(end, 'yyyy-MM-dd'));
        
        if (error) throw error;
        
        const total = data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        months.push({
          month: format(date, 'MMM'),
          revenue: total,
        });
      }
      return months;
    },
  });

  const currentMonth = revenueData?.[revenueData.length - 1]?.revenue || 0;
  const previousMonth = revenueData?.[revenueData.length - 2]?.revenue || 0;
  const percentChange = previousMonth > 0 
    ? ((currentMonth - previousMonth) / previousMonth * 100).toFixed(1)
    : 0;
  const isPositive = Number(percentChange) >= 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Revenue Overview</CardTitle>
          <p className="text-sm text-muted-foreground">Last 6 months</p>
        </div>
        <div className="flex items-center gap-2">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{percentChange}%
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
            <ChartTooltip 
              content={<ChartTooltipContent formatter={(value) => [`₹${value}`, 'Revenue']} />} 
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function getRevenueExportData() {
  return async () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const { data } = await supabase
        .from('payments')
        .select('amount, payment_date, payment_method')
        .gte('payment_date', format(start, 'yyyy-MM-dd'))
        .lte('payment_date', format(end, 'yyyy-MM-dd'));
      
      const total = data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      months.push({
        Month: format(date, 'MMMM yyyy'),
        'Total Revenue': total,
        'Number of Payments': data?.length || 0,
      });
    }
    return months;
  };
}
