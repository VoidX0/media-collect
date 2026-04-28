'use client'

import { format } from 'date-fns'
import { Calendar as CalendarIcon, Clock } from 'lucide-react'
import { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface DateTimePickerProps {
  mode?: 'single' | 'range'
  /** 单选模式下的时间戳 */
  value?: number
  /** 范围模式下的时间戳范围 */
  rangeValue?: { start?: number; end?: number }
  /** 单选模式的回调 */
  onChange?: (value: number | undefined) => void
  /** 范围模式的回调 */
  onRangeChange?: (value: { start?: number; end?: number } | undefined) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 选择器的占位文本，默认为 "请选择日期和时间" */
  placeholder?: string
}

export function DateTimePicker({
  mode = 'single',
  value,
  rangeValue,
  onChange,
  onRangeChange,
  disabled = false,
  placeholder = 'DateTime',
}: DateTimePickerProps) {
  // --- 内部状态处理 ---
  const initialDate = value ? new Date(value) : undefined
  const initialTime = initialDate ? format(initialDate, 'HH:mm:ss') : '00:00:00'

  const initialRange: DateRange | undefined = {
    from: rangeValue?.start ? new Date(rangeValue.start) : undefined,
    to: rangeValue?.end ? new Date(rangeValue.end) : undefined,
  }
  const initialStartTime = initialRange.from
    ? format(initialRange.from, 'HH:mm:ss')
    : '00:00:00'
  const initialEndTime = initialRange.to
    ? format(initialRange.to, 'HH:mm:ss')
    : '00:00:00'

  // --- 合并日期和时间的工具函数 ---
  const combineDateAndTime = (date: Date | undefined, timeString: string) => {
    if (!date) return undefined
    const [hours, minutes, seconds] = timeString.split(':').map(Number)
    const newDate = new Date(date)
    newDate.setHours(hours || 0, minutes || 0, seconds || 0, 0)
    return newDate.getTime()
  }

  // --- 单选模式处理 ---
  const handleSingleSelect = (date: Date | undefined, time: string) => {
    if (onChange) {
      onChange(combineDateAndTime(date, time))
    }
  }

  // --- 范围模式处理 ---
  const handleRangeSelect = (
    range: DateRange | undefined,
    startTime: string,
    endTime: string,
  ) => {
    if (onRangeChange) {
      onRangeChange({
        start: combineDateAndTime(range?.from, startTime),
        end: combineDateAndTime(range?.to, endTime),
      })
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            mode === 'range' && 'h-auto py-2',
            !value && !rangeValue?.start && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />

          {mode === 'single' ? (
            // 单选模式
            value ? (
              format(new Date(value), 'yyyy-MM-dd HH:mm:ss')
            ) : (
              <span>{placeholder}</span>
            )
          ) : rangeValue?.start ? (
            // 范围模式
            <div className="flex flex-col gap-1 text-sm leading-none">
              <span>
                {format(new Date(rangeValue.start), 'yyyy-MM-dd HH:mm:ss')}
              </span>
              <span className="text-muted-foreground">
                {rangeValue.end
                  ? format(new Date(rangeValue.end), 'yyyy-MM-dd HH:mm:ss')
                  : 'please select end'}
              </span>
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        {/* 日历部分 */}
        {mode === 'single' ? (
          <Calendar
            mode="single"
            selected={initialDate}
            defaultMonth={initialDate}
            onSelect={(selected) => handleSingleSelect(selected, initialTime)}
            autoFocus
            captionLayout="dropdown"
            startMonth={new Date(1950, 0)}
            endMonth={new Date(2100, 11)}
          />
        ) : (
          <Calendar
            mode="range"
            selected={initialRange}
            defaultMonth={initialRange?.from}
            onSelect={(selected) =>
              handleRangeSelect(selected, initialStartTime, initialEndTime)
            }
            autoFocus
            captionLayout="dropdown"
            startMonth={new Date(1950, 0)}
            endMonth={new Date(2100, 11)}
          />
        )}

        {/* 底部时间选择部分 */}
        <div className="bg-card border-t p-3">
          {mode === 'single' ? (
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Clock className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  type="time"
                  step="1"
                  disabled={!initialDate}
                  value={initialTime}
                  onChange={(e) =>
                    handleSingleSelect(initialDate, e.target.value)
                  }
                  className="appearance-none pl-9 [&::-webkit-calendar-picker-indicator]:hidden"
                />
              </div>
            </div>
          ) : (
            <div className="flex-col gap-4 space-y-2">
              <div className="flex flex-1 flex-col gap-2">
                <div className="relative">
                  <Clock className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                  <Input
                    type="time"
                    step="1"
                    disabled={!initialRange?.from}
                    value={initialStartTime}
                    onChange={(e) =>
                      handleRangeSelect(
                        initialRange,
                        e.target.value,
                        initialEndTime,
                      )
                    }
                    className="appearance-none pl-9 [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="relative">
                  <Clock className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                  <Input
                    type="time"
                    step="1"
                    disabled={!initialRange?.to}
                    value={initialEndTime}
                    onChange={(e) =>
                      handleRangeSelect(
                        initialRange,
                        initialStartTime,
                        e.target.value,
                      )
                    }
                    className="appearance-none pl-9 [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
