import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  UserPlus, 
  FileText, 
  CreditCard, 
  ClipboardList,
  Calendar,
  BarChart3,
  Search,
  Inbox,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'search' | 'filter';
}

const iconMap: Record<string, LucideIcon> = {
  members: Users,
  leads: UserPlus,
  reports: FileText,
  payments: CreditCard,
  attendance: ClipboardList,
  schedule: Calendar,
  analytics: BarChart3,
  search: Search,
  default: Inbox,
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className={cn(
          'mb-4 rounded-full p-4',
          variant === 'search' ? 'bg-muted' : 'bg-primary/10'
        )}>
          <Icon className={cn(
            'h-8 w-8',
            variant === 'search' ? 'text-muted-foreground' : 'text-primary'
          )} />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="mb-4 max-w-sm text-sm text-muted-foreground">{description}</p>
        {action && (
          <Button onClick={action.onClick} className="gradient-primary">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Pre-configured empty states for common use cases
export function MembersEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No Members Yet"
      description="Start building your gym community by adding your first member. Track memberships, payments, and attendance all in one place."
      action={{ label: 'Add First Member', onClick: onAdd }}
    />
  );
}

export function LeadsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={UserPlus}
      title="No Leads Yet"
      description="Capture potential gym members by adding leads. Track follow-ups and convert them into loyal members."
      action={{ label: 'Add First Lead', onClick: onAdd }}
    />
  );
}

export function StaffEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No Staff Members"
      description="Add trainers, managers, and other staff members to help run your gym smoothly."
      action={{ label: 'Add Staff Member', onClick: onAdd }}
    />
  );
}

export function SearchEmptyState({ searchTerm }: { searchTerm: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No Results Found"
      description={`No items match your search for "${searchTerm}". Try adjusting your search terms or filters.`}
      variant="search"
    />
  );
}

export function FilterEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No Matching Results"
      description="No items match your current filters. Try adjusting or clearing your filters."
      action={{ label: 'Clear Filters', onClick: onClear }}
      variant="filter"
    />
  );
}