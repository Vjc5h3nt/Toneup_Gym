import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, ArrowRight, Calendar } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';

interface ExpiringMembership {
  id: string;
  end_date: string;
  type: string;
  member: {
    id: string;
    name: string;
    phone: string;
  };
}

export function ExpiringMemberships() {
  const [memberships, setMemberships] = useState<ExpiringMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExpiringMemberships();
  }, []);

  const fetchExpiringMemberships = async () => {
    try {
      const nextWeek = addDays(new Date(), 7).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      const { data } = await supabase
        .from('memberships')
        .select(`
          id, end_date, type,
          members!inner(id, name, phone)
        `)
        .eq('status', 'active')
        .gte('end_date', today)
        .lte('end_date', nextWeek)
        .order('end_date', { ascending: true })
        .limit(10);

      const formatted = data?.map((m) => ({
        id: m.id,
        end_date: m.end_date,
        type: m.type,
        member: m.members as unknown as { id: string; name: string; phone: string },
      })) || [];

      setMemberships(formatted);
    } catch (error) {
      console.error('Error fetching expiring memberships:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysLabel = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    if (days === 0) return { label: 'Today', color: 'bg-destructive/10 text-destructive' };
    if (days === 1) return { label: 'Tomorrow', color: 'bg-warning/10 text-warning' };
    return { label: `${days} days`, color: 'bg-info/10 text-info' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Expiring Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Expiring Soon
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/members')}>
          View All <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {memberships.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No memberships expiring soon</p>
          ) : (
            <div className="space-y-3">
              {memberships.map((m) => {
                const daysInfo = getDaysLabel(m.end_date);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/members')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.member.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(m.end_date), 'MMM d, yyyy')}
                        <Badge variant="outline" className="text-xs">
                          {m.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <Badge className={daysInfo.color}>{daysInfo.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
