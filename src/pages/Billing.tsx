import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Bell, FileText } from 'lucide-react';
import PaymentDashboard from '@/components/billing/PaymentDashboard';
import PaymentReminders from '@/components/billing/PaymentReminders';
import RecentPayments from '@/components/billing/RecentPayments';

export default function Billing() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Billing & Payments</h1>
        <p className="text-muted-foreground">
          Manage payments, send reminders, and generate invoices
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Reminders</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Recent Payments</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <PaymentDashboard />
        </TabsContent>

        <TabsContent value="reminders">
          <PaymentReminders />
        </TabsContent>

        <TabsContent value="payments">
          <RecentPayments />
        </TabsContent>
      </Tabs>
    </div>
  );
}
