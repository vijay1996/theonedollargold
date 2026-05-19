import { useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Props {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}

const PRESETS = [
  { label: 'Last 30 days', range: () => ({ from: subMonths(new Date(), 1), to: new Date() }) },
  { label: 'Last 3 months', range: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
  { label: 'Last 6 months', range: () => ({ from: startOfMonth(subMonths(new Date(), 5)), to: endOfMonth(new Date()) }) },
  { label: 'Last 12 months', range: () => ({ from: startOfMonth(subMonths(new Date(), 11)), to: endOfMonth(new Date()) }) },
  { label: 'This year', range: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const label =
    value?.from && value?.to
      ? `${format(value.from, 'MMM d, yyyy')} – ${format(value.to, 'MMM d, yyyy')}`
      : value?.from
      ? `${format(value.from, 'MMM d, yyyy')} – ?`
      : 'Select date range';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id="date-range-trigger"
            variant="outline"
            className={cn(
              'w-[260px] justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Presets sidebar */}
          <div className="flex flex-col gap-1 border-r p-3 min-w-[140px]">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 px-1">Presets</p>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => {
                  onChange(p.range());
                  setOpen(false);
                }}
                className="text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => onChange(undefined)}
              className="text-left text-sm px-2 py-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors mt-1"
            >
              Clear
            </button>
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={value}
              onSelect={onChange}
              numberOfMonths={2}
              toDate={new Date()}
              captionLayout="label"
            />
            <div className="flex justify-end pt-2 border-t mt-2">
              <Button size="sm" onClick={() => setOpen(false)}>Apply</Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
