import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { addDays, format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { startOfToday, endOfToday, subDays } from "date-fns";
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateUS } from "@/utils/formatdate";

export default function DateRangePicker({ date, setDate, className }) {
  const handleSelectPreset = (value) => {
    const now = new Date();
    switch (value) {
      case 'this_week':
        setDate({ from: startOfWeek(now), to: endOfWeek(now) });
        break;
      case 'last_week':
        setDate({ from: startOfWeek(subWeeks(now, 1)), to: endOfWeek(subWeeks(now, 1)) });
        break;
      case 'this_month':
        setDate({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'last_month':
        setDate({ from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) });
        break;
      case 'this_year':
        setDate({ from: startOfYear(now), to: endOfYear(now) });
        break;
      case 'last_year':
        setDate({ from: startOfYear(subYears(now, 1)), to: endOfYear(subYears(now, 1)) });
        break;
      case "today":
        setDate({ from: startOfToday(), to: endOfToday() });
        break;
      case "yesterday":
        setDate({ from: subDays(startOfToday(), 1), to: subDays(endOfToday(), 1), });
        break;
      case "last_7_days":
        setDate({ from: subDays(now, 6), to: now, });
        break;
      case "last_30_days":
        setDate({ from: subDays(now, 29), to: now, });
        break;
      case "q1":
        setDate({ from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 2, 31), });
        break;
      case "q2":
        setDate({ from: new Date(now.getFullYear(), 3, 1), to: new Date(now.getFullYear(), 5, 30), });
        break;

      case "q3":
        setDate({ from: new Date(now.getFullYear(), 6, 1), to: new Date(now.getFullYear(), 8, 30), });
        break;
      case "q4":
        setDate({ from: new Date(now.getFullYear(), 9, 1), to: new Date(now.getFullYear(), 11, 31), });
        break;
      case "all":
        setDate({ from: null, to: null, isAllTime: true });
        break;
      default:
        setDate({ from: undefined, to: undefined });
        break;
    }
  };

  return (
    <div className={cn('grid gap-2', className)}>
      < Popover >
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-full justify-start text-left text-sm font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.isAllTime ? (
              "All Time"
            ) : date?.from ? (
              date.to ? (
                <>
                  {formatDateUS(date.from)} - {formatDateUS(date.to)}
                </>
              ) : (
                formatDateUS(date.from)
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-2">
            <Select onValueChange={handleSelectPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="q1">Q1 (Jan - Mar)</SelectItem>
                <SelectItem value="q2">Q2 (Apr - Jun)</SelectItem>
                <SelectItem value="q3">Q3 (Jul - Sep)</SelectItem>
                <SelectItem value="q4">Q4 (Oct - Dec)</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="p-2 border-t">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover >
    </div >
  );
}