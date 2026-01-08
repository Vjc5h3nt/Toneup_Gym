import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, differenceInDays } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CreditCard, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const PAYMENT_METHOD_COLORS = {
  cash: 'hsl(var(--chart-1))',
  upi: 'hsl(var(--chart-2))',
  card: 'hsl(var(--chart-3))',
  bank_transfer: 'hsl(var(--chart-4))',
  other: 'hsl(var(--chart-5))',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
};

export default function PaymentDashboard() {
  // Fetch monthly revenue comparison
  const { data: monthlyRevenue, isLoading: isLoadingRevenue } = useQuery({
    queryKey: ['monthly-revenue-comparison'],
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
          fullMonth: format(date, 'MMMM yyyy'),
          revenue: total,
        });
      }
      return months;
    },
  });

  // Fetch payment method breakdown for current month
  const { data: paymentMethods, isLoading: isLoadingMethods } = useQuery({
    queryKey: ['payment-method-breakdown'],
    queryFn: async () => {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      
      const { data, error } = await supabase
        .from('payments')
        .select('payment_method, amount')
        .gte('payment_date', format(start, 'yyyy-MM-dd'))
        .lte('payment_date', format(end, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      const methodTotals: Record<string, number> = {};
      data?.forEach(p => {
        const method = p.payment_method || 'other';
        methodTotals[method] = (methodTotals[method] || 0) + Number(p.amount);
      });
      
      return Object.entries(methodTotals).map(([method, amount]) => ({
        name: PAYMENT_METHOD_LABELS[method] || method,
        value: amount,
        method,
      }));
    },
  });

  // Fetch outstanding dues - memberships where total paid < price
  const { data: outstandingDues, isLoading: isLoadingDues } = useQuery({
    queryKey: ['outstanding-dues'],
    queryFn: async () => {
      // Get all active memberships (not cancelled/expired)
      const { data: memberships, error: memError } = await supabase
        .from('memberships')
        .select(`
          id,
          member_id,
          price,
          start_date,
          end_date,
          type,
          status,
          member:members(id, name, phone)
        `)
        .in('status', ['active', 'frozen', 'hold']);
      
      if (memError) throw memError;
      if (!memberships?.length) return [];
      
      // Get all payments for these memberships
      const { data: payments, error: payError } = await supabase
        .from('payments')
        .select('membership_id, amount, payment_date')
        .in('membership_id', memberships.map(m => m.id));
      
      if (payError) throw payError;
      
      // Calculate dues per membership
      const paymentTotals: Record<string, number> = {};
      payments?.forEach(p => {
        if (p.membership_id) {
          paymentTotals[p.membership_id] = (paymentTotals[p.membership_id] || 0) + Number(p.amount);
        }
      });
      
      // Find memberships with outstanding balance
      const today = new Date();
      const withDues = memberships
        .filter(m => {
          const paid = paymentTotals[m.id] || 0;
          return paid < Number(m.price);
        })
        .map(m => {
          const paid = paymentTotals[m.id] || 0;
          const dueAmount = Number(m.price) - paid;
          const endDate = parseISO(m.end_date);
          const daysUntilDue = differenceInDays(endDate, today);
          
          return {
            ...m,
            paid,
            due: dueAmount,
            dueDate: m.end_date,
            daysUntilDue,
            isOverdue: daysUntilDue < 0,
          };
        })
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue); // Sort by urgency
      
      return withDues;
    },
  });

  const currentMonth = monthlyRevenue?.[monthlyRevenue.length - 1]?.revenue || 0;
  const previousMonth = monthlyRevenue?.[monthlyRevenue.length - 2]?.revenue || 0;
  const percentChange = previousMonth > 0 
    ? ((currentMonth - previousMonth) / previousMonth * 100)
    : 0;
  const isPositive = percentChange >= 0;

  const totalOutstanding = outstandingDues?.reduce((sum, d) => sum + d.due, 0) || 0;

  const chartConfig = {
    revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
  };

  if (isLoadingRevenue) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">₹{currentMonth.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
                    {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Month</p>
                <p className="text-2xl font-bold">₹{previousMonth.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {monthlyRevenue?.[monthlyRevenue.length - 2]?.fullMonth}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Wallet className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={totalOutstanding > 0 ? 'border-warning' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Dues</p>
                <p className="text-2xl font-bold text-warning">₹{totalOutstanding.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {outstandingDues?.length || 0} member{outstandingDues?.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Revenue
            </CardTitle>
            <CardDescription>Last 6 months comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`} />
                <ChartTooltip 
                  content={<ChartTooltipContent formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']} />} 
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>Current month breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMethods ? (
              <Skeleton className="h-[280px] w-full" />
            ) : paymentMethods && paymentMethods.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {paymentMethods.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={PAYMENT_METHOD_COLORS[entry.method as keyof typeof PAYMENT_METHOD_COLORS] || 'hsl(var(--muted))'} 
                        />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No payments this month
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Dues List */}
      {outstandingDues && outstandingDues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Outstanding Dues
            </CardTitle>
            <CardDescription>Members with pending payments sorted by urgency</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {outstandingDues.map((due) => (
                  <div
                    key={due.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      due.isOverdue ? 'border-destructive bg-destructive/5' : 'bg-card'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{(due.member as any)?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(due.member as any)?.phone}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {due.isOverdue ? (
                          <Badge variant="destructive" className="text-xs">
                            Overdue by {Math.abs(due.daysUntilDue)} days
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Due: {format(parseISO(due.dueDate), 'dd MMM yyyy')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        Paid: ₹{due.paid.toLocaleString()}
                      </Badge>
                      <p className={`text-lg font-semibold ${due.isOverdue ? 'text-destructive' : 'text-warning'}`}>
                        Due: ₹{due.due.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
