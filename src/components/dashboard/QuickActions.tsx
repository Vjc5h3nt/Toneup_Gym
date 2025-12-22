import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Users, FileText, Calendar } from 'lucide-react';

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: 'Add Member', icon: UserPlus, onClick: () => navigate('/members'), color: 'bg-primary/10 text-primary hover:bg-primary/20' },
    { label: 'Add Lead', icon: Users, onClick: () => navigate('/leads'), color: 'bg-accent/10 text-accent hover:bg-accent/20' },
    { label: 'View Reports', icon: FileText, onClick: () => navigate('/reports'), color: 'bg-info/10 text-info hover:bg-info/20' },
    { label: 'Lead Calendar', icon: Calendar, onClick: () => navigate('/lead-calendar'), color: 'bg-warning/10 text-warning hover:bg-warning/20' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            size="sm"
            className={action.color}
            onClick={action.onClick}
          >
            <action.icon className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
