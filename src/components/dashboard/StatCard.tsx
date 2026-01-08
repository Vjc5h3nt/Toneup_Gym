import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  link?: string;
  change?: number;
  sparklineData?: number[];
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
  link,
  change,
  sparklineData,
}: StatCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (link) {
      navigate(link);
    }
  };

  const getChangeColor = (val: number) => {
    if (val > 0) return 'text-success';
    if (val < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getChangeIcon = (val: number) => {
    if (val > 0) return TrendingUp;
    if (val < 0) return TrendingDown;
    return Minus;
  };

  const ChangeIcon = change !== undefined ? getChangeIcon(change) : null;

  const chartData = sparklineData?.map((value, index) => ({ value, index })) || [];

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-lg',
        link && 'cursor-pointer hover:border-primary/50'
      )}
      onClick={handleClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', color)} />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <div className="text-lg sm:text-2xl font-bold">{value}</div>
          {change !== undefined && ChangeIcon && (
            <div className={cn('flex items-center gap-1 text-xs font-medium', getChangeColor(change))}>
              <ChangeIcon className="h-3 w-3" />
              <span>{Math.abs(change).toFixed(1)}%</span>
            </div>
          )}
        </div>
        
        {sparklineData && sparklineData.length > 0 && (
          <div className="h-10 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={change && change >= 0 ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)'}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
