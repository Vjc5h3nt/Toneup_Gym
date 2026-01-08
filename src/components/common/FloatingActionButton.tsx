import { useState } from 'react';
import { Plus, X, UserPlus, Users, ClipboardCheck, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';

interface FABAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions?: FABAction[];
  onMainClick?: () => void;
  mainLabel?: string;
}

export function FloatingActionButton({
  actions,
  onMainClick,
  mainLabel = 'Add',
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Don't show on pages that don't need it
  const hiddenPaths = ['/dashboard/settings', '/dashboard/reports'];
  if (hiddenPaths.some((path) => location.pathname.includes(path))) {
    return null;
  }

  // If no actions provided and has main click, show simple FAB
  if (!actions && onMainClick) {
    return (
      <Button
        onClick={onMainClick}
        size="lg"
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg gradient-primary lg:hidden"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">{mainLabel}</span>
      </Button>
    );
  }

  if (!actions || actions.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 lg:hidden">
      {/* Action buttons */}
      <div
        className={cn(
          'absolute bottom-16 right-0 flex flex-col-reverse gap-3 transition-all duration-200',
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        {actions.map((action, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="rounded-lg bg-card px-3 py-1.5 text-sm font-medium shadow-md">
              {action.label}
            </span>
            <Button
              size="icon"
              className={cn(
                'h-12 w-12 rounded-full shadow-lg',
                action.color || 'bg-primary hover:bg-primary/90'
              )}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
            >
              <action.icon className="h-5 w-5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Main FAB */}
      <Button
        size="lg"
        onClick={() => (actions.length > 0 ? setIsOpen(!isOpen) : onMainClick?.())}
        className={cn(
          'h-14 w-14 rounded-full shadow-lg transition-transform duration-200 gradient-primary',
          isOpen && 'rotate-45'
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        <span className="sr-only">{isOpen ? 'Close' : mainLabel}</span>
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 -z-10 bg-background/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Pre-configured FAB for common pages
export function DashboardFAB() {
  const navigate = useNavigate();
  const location = useLocation();

  const actions: FABAction[] = [
    {
      icon: UserPlus,
      label: 'Add Lead',
      onClick: () => navigate('/dashboard/leads?action=add'),
    },
    {
      icon: Users,
      label: 'Add Member',
      onClick: () => navigate('/dashboard/members?action=add'),
    },
    {
      icon: ClipboardCheck,
      label: 'Attendance',
      onClick: () => navigate('/dashboard/attendance'),
    },
  ];

  // Hide on specific pages
  const hiddenPaths = ['/dashboard/settings', '/dashboard/reports'];
  if (hiddenPaths.some((path) => location.pathname.includes(path))) {
    return null;
  }

  return <FloatingActionButton actions={actions} mainLabel="Quick Actions" />;
}