import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  BarChart3,
  Menu 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const mobileNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/dashboard/leads', icon: UserPlus, label: 'Leads' },
  { to: '/dashboard/members', icon: Users, label: 'Members' },
  { to: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Bottom Navigation Bar - Only on mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {mobileNavItems.map((item) => {
            const active = isActive(item.to);
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-colors min-w-[64px]',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', active && 'text-primary')} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                className="flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-colors min-w-[64px]"
              >
                <Menu className="h-5 w-5" />
                <span className="text-xs font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80vh]">
              <SheetHeader>
                <SheetTitle>More Options</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-4 py-6">
                <QuickNavButton
                  icon={Users}
                  label="Staff"
                  onClick={() => {
                    navigate('/dashboard/staff');
                    setSheetOpen(false);
                  }}
                />
                <QuickNavButton
                  icon={LayoutDashboard}
                  label="Plans"
                  onClick={() => {
                    navigate('/dashboard/membership-plans');
                    setSheetOpen(false);
                  }}
                />
                <QuickNavButton
                  icon={BarChart3}
                  label="Attendance"
                  onClick={() => {
                    navigate('/dashboard/attendance');
                    setSheetOpen(false);
                  }}
                />
                <QuickNavButton
                  icon={LayoutDashboard}
                  label="Settings"
                  onClick={() => {
                    navigate('/dashboard/settings');
                    setSheetOpen(false);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Spacer for bottom nav on mobile */}
      <div className="h-16 lg:hidden" />
    </>
  );
}

function QuickNavButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted"
    >
      <div className="rounded-full bg-primary/10 p-3">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}