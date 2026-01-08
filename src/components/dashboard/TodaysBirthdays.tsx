import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Cake, PartyPopper, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface MemberBirthday {
  id: string;
  name: string;
  phone: string;
  photo_url: string | null;
}

export function TodaysBirthdays() {
  const [birthdays, setBirthdays] = useState<MemberBirthday[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const today = format(new Date(), 'MM-dd');
        
        const { data } = await supabase
          .from('members')
          .select('id, name, phone, photo_url, date_of_birth')
          .eq('is_active', true)
          .not('date_of_birth', 'is', null);

        if (data) {
          const todaysBirthdays = data.filter((member) => {
            if (!member.date_of_birth) return false;
            const dob = format(new Date(member.date_of_birth), 'MM-dd');
            return dob === today;
          });
          setBirthdays(todaysBirthdays);
        }
      } catch (error) {
        console.error('Error fetching birthdays:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBirthdays();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const message = encodeURIComponent(
      `🎂 Happy Birthday, ${name}! 🎉\n\nWishing you a wonderful birthday filled with joy and happiness! From all of us at the gym. 💪`
    );
    window.open(`https://wa.me/91${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Cake className="h-4 w-4 text-pink-500" />
            Today's Birthdays
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Cake className="h-4 w-4 text-pink-500" />
          Today's Birthdays
          {birthdays.length > 0 && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {birthdays.length} {birthdays.length === 1 ? 'member' : 'members'}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {birthdays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <PartyPopper className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No birthdays today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {birthdays.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-orange-500/10 p-3"
              >
                <Avatar className="h-10 w-10 border-2 border-pink-500/20">
                  {member.photo_url ? (
                    <AvatarImage src={member.photo_url} alt={member.name} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-orange-500 text-white text-xs">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Cake className="h-3 w-3" /> Birthday today! 🎉
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-8 w-8 p-0 border-success/30 text-success hover:bg-success/10"
                  onClick={() => handleWhatsApp(member.phone, member.name)}
                  title="Send birthday wishes via WhatsApp"
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
