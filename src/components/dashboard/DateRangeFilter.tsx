import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
  startDate: Date;
  endDate: Date;
  onDateChange: (start: Date, end: Date) => void;
}

const presets = [
  { label: 'Today', getValue: () => ({ start: new Date(), end: new Date() }) },
  { label: 'Last 7 Days', getValue: () => ({ start: subDays(new Date(), 6), end: new Date() }) },
  { label: 'Last 30 Days', getValue: () => ({ start: subDays(new Date(), 29), end: new Date() }) },
  { label: 'This Week', getValue: () => ({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }) },
  { label: 'This Month', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
];

export function DateRangeFilter({ startDate, endDate, onDateChange }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePreset = (preset: typeof presets[0]) => {
    const { start, end } = preset.getValue();
    onDateChange(start, end);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[240px] justify-start text-left font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          <div className="flex flex-col gap-1 border-r p-2">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              selected={{ from: startDate, to: endDate }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateChange(range.from, range.to);
                } else if (range?.from) {
                  onDateChange(range.from, range.from);
                }
              }}
              numberOfMonths={2}
              className={cn("pointer-events-auto")}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
