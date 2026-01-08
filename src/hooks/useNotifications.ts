import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, isToday } from 'date-fns';

export function useNotificationGenerator() {
  const { user } = useAuth();

  const generateNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const threeDaysLater = format(addDays(today, 3), 'yyyy-MM-dd');

      // Check for upcoming follow-ups (today and next 3 days)
      const { data: followUps } = await supabase
        .from('leads')
        .select('id, name, next_follow_up')
        .gte('next_follow_up', todayStr)
        .lte('next_follow_up', threeDaysLater)
        .not('status', 'in', '("converted","lost")');

      // Check for expiring memberships (next 7 days)
      const sevenDaysLater = format(addDays(today, 7), 'yyyy-MM-dd');
      const { data: expiringMemberships } = await supabase
        .from('memberships')
        .select('id, member_id, end_date, members!inner(name)')
        .eq('status', 'active')
        .gte('end_date', todayStr)
        .lte('end_date', sevenDaysLater);

      // Check for today's birthdays
      const todayMD = format(today, 'MM-dd');
      const { data: members } = await supabase
        .from('members')
        .select('id, name, date_of_birth')
        .eq('is_active', true)
        .not('date_of_birth', 'is', null);

      const todaysBirthdays = members?.filter((m) => {
        if (!m.date_of_birth) return false;
        return format(new Date(m.date_of_birth), 'MM-dd') === todayMD;
      });

      // Check existing notifications to avoid duplicates
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('title, created_at')
        .eq('user_id', user.id)
        .gte('created_at', format(today, "yyyy-MM-dd'T'00:00:00"));

      const existingTitles = new Set(existingNotifications?.map((n) => n.title) || []);

      const newNotifications: Array<{
        user_id: string;
        type: string;
        title: string;
        message: string;
        link: string;
      }> = [];

      // Add follow-up notifications
      followUps?.forEach((lead) => {
        const title = `Follow-up: ${lead.name}`;
        if (!existingTitles.has(title)) {
          const isTodays = lead.next_follow_up === todayStr;
          newNotifications.push({
            user_id: user.id,
            type: 'follow_up',
            title,
            message: isTodays
              ? `Follow-up due today for ${lead.name}`
              : `Follow-up scheduled for ${format(new Date(lead.next_follow_up!), 'MMM d')}`,
            link: '/dashboard/leads',
          });
        }
      });

      // Add expiring membership notifications
      expiringMemberships?.forEach((membership: any) => {
        const memberName = membership.members?.name || 'Member';
        const title = `Expiring: ${memberName}`;
        if (!existingTitles.has(title)) {
          const daysLeft = Math.ceil(
            (new Date(membership.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          newNotifications.push({
            user_id: user.id,
            type: 'expiring',
            title,
            message:
              daysLeft === 0
                ? `${memberName}'s membership expires today!`
                : `${memberName}'s membership expires in ${daysLeft} days`,
            link: '/dashboard/members',
          });
        }
      });

      // Add birthday notifications
      todaysBirthdays?.forEach((member) => {
        const title = `Birthday: ${member.name}`;
        if (!existingTitles.has(title)) {
          newNotifications.push({
            user_id: user.id,
            type: 'birthday',
            title,
            message: `🎂 ${member.name} has a birthday today! Send them wishes!`,
            link: '/dashboard/members',
          });
        }
      });

      // Insert new notifications
      if (newNotifications.length > 0) {
        await supabase.from('notifications').insert(newNotifications);
      }
    } catch (error) {
      console.error('Error generating notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      generateNotifications();
      
      // Regenerate notifications every hour
      const interval = setInterval(generateNotifications, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, generateNotifications]);
}
