import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, parseISO, subDays } from 'date-fns';
import { FileText, Search, MoreVertical, Printer, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { generateInvoicePDF } from './InvoiceGenerator';

interface PaymentWithDetails {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  invoice_number: string | null;
  notes: string | null;
  member: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
  };
  membership: {
    id: string;
    type: string;
    start_date: string;
    end_date: string;
  } | null;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
};

export default function RecentPayments() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: payments, isLoading } = useQuery({
    queryKey: ['recent-payments'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          invoice_number,
          notes,
          member:members(id, name, phone, email, address),
          membership:memberships(id, type, start_date, end_date)
        `)
        .gte('payment_date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data as unknown as PaymentWithDetails[];
    },
  });

  const filteredPayments = payments?.filter(p => 
    p.member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.member.phone.includes(searchQuery)
  ) || [];

  const handlePrintInvoice = (payment: PaymentWithDetails) => {
    try {
      generateInvoicePDF({
        invoiceNumber: payment.invoice_number || `INV-${payment.id.slice(0, 8).toUpperCase()}`,
        paymentDate: payment.payment_date,
        memberName: payment.member.name,
        memberPhone: payment.member.phone,
        memberEmail: payment.member.email,
        memberAddress: payment.member.address,
        amount: payment.amount,
        paymentMethod: payment.payment_method,
        membershipType: payment.membership?.type,
        membershipStart: payment.membership?.start_date,
        membershipEnd: payment.membership?.end_date,
        notes: payment.notes,
      });
      toast.success('Invoice opened for printing');
    } catch (error) {
      toast.error('Failed to generate invoice');
    }
  };

  const handleSendWhatsAppReceipt = (payment: PaymentWithDetails) => {
    const message = encodeURIComponent(
      `Hi ${payment.member.name}! 🧾\n\n` +
      `Thank you for your payment!\n\n` +
      `📋 Receipt Details:\n` +
      `• Invoice: ${payment.invoice_number || 'N/A'}\n` +
      `• Amount: ₹${payment.amount.toLocaleString()}\n` +
      `• Date: ${format(parseISO(payment.payment_date), 'PPP')}\n` +
      `• Method: ${PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}\n\n` +
      `Thank you for choosing us! 💪`
    );
    
    const phone = payment.member.phone.replace(/\D/g, '');
    const fullPhone = phone.startsWith('91') ? phone : `91${phone}`;
    window.open(`https://wa.me/${fullPhone}?text=${message}`, '_blank');
    toast.success('WhatsApp receipt sent');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Payments
            </CardTitle>
            <CardDescription>Last 30 days payment history</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No payments found</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(parseISO(payment.payment_date), 'PP')}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment.invoice_number || '-'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.member.name}</p>
                        <p className="text-xs text-muted-foreground">{payment.member.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ₹{payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePrintInvoice(payment)}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendWhatsAppReceipt(payment)}>
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Send Receipt (WhatsApp)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
