import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { Bell, MessageCircle, Phone, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ExpiringMembership {
  id: string;
  end_date: string;
  member: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  type: string;
  price: number;
}

export default function PaymentReminders() {
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());

  const { data: expiringMemberships, isLoading } = useQuery({
    queryKey: ['expiring-memberships-reminders'],
    queryFn: async () => {
      const today = new Date();
      const in14Days = addDays(today, 14);
      
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          id,
          end_date,
          type,
          price,
          member:members(id, name, phone, email)
        `)
        .eq('status', 'active')
        .gte('end_date', format(today, 'yyyy-MM-dd'))
        .lte('end_date', format(in14Days, 'yyyy-MM-dd'))
        .order('end_date', { ascending: true });
      
      if (error) throw error;
      return data as unknown as ExpiringMembership[];
    },
  });

  const getDaysRemaining = (endDate: string) => {
    return differenceInDays(parseISO(endDate), new Date());
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 2) return 'bg-destructive text-destructive-foreground';
    if (days <= 5) return 'bg-warning text-warning-foreground';
    return 'bg-info text-info-foreground';
  };

  const sendWhatsAppReminder = (membership: ExpiringMembership) => {
    const daysLeft = getDaysRemaining(membership.end_date);
    const message = encodeURIComponent(
      `Hi ${membership.member.name}! 🏋️\n\n` +
      `This is a friendly reminder that your gym membership is expiring in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} ` +
      `(on ${format(parseISO(membership.end_date), 'PPP')}).\n\n` +
      `Renew now to continue your fitness journey without interruption!\n\n` +
      `Renewal Amount: ₹${membership.price.toLocaleString()}\n\n` +
      `Reply to this message or visit the gym to renew. We'd love to see you continue! 💪`
    );
    
    const phone = membership.member.phone.replace(/\D/g, '');
    const fullPhone = phone.startsWith('91') ? phone : `91${phone}`;
    window.open(`https://wa.me/${fullPhone}?text=${message}`, '_blank');
    
    setSentReminders(prev => new Set([...prev, membership.id]));
    toast.success(`WhatsApp reminder sent to ${membership.member.name}`);
  };

  const callMember = (phone: string, name: string) => {
    window.location.href = `tel:${phone}`;
    toast.info(`Calling ${name}...`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Payment Reminders
            </CardTitle>
            <CardDescription>
              Members with memberships expiring in the next 14 days
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {expiringMemberships?.length || 0}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!expiringMemberships || expiringMemberships.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-success" />
            <p>No memberships expiring in the next 14 days</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {expiringMemberships.map((membership) => {
                const daysLeft = getDaysRemaining(membership.end_date);
                const hasSentReminder = sentReminders.has(membership.id);
                
                return (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {membership.member.name}
                        </span>
                        <Badge className={getUrgencyColor(daysLeft)}>
                          {daysLeft === 0 ? 'Today' : daysLeft === 1 ? '1 day' : `${daysLeft} days`}
                        </Badge>
                        {hasSentReminder && (
                          <Badge variant="outline" className="text-success border-success">
                            Reminded
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires: {format(parseISO(membership.end_date), 'PPP')}
                        </span>
                        <span>₹{membership.price.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => callMember(membership.member.phone, membership.member.name)}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#25D366] hover:bg-[#128C7E] text-white"
                        onClick={() => sendWhatsAppReminder(membership)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Remind
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
