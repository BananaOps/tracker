"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DateTimePickerProps {
  date?: Date
  setDate: (date: Date | undefined) => void
  placeholder?: string
}

export function DateTimePicker({ date, setDate, placeholder = "Pick a date" }: DateTimePickerProps) {
  const [selectedDateTime, setSelectedDateTime] = React.useState<Date | undefined>(date)

  React.useEffect(() => {
    setSelectedDateTime(date)
  }, [date])

  const handleSelect = (newDay: Date | undefined) => {
    if (!newDay) return
    if (!selectedDateTime) {
      setSelectedDateTime(newDay)
      setDate(newDay)
      return
    }
    const diff = selectedDateTime.getTime() - new Date(selectedDateTime).setHours(0, 0, 0, 0)
    const newDate = new Date(newDay.getTime() + diff)
    setSelectedDateTime(newDate)
    setDate(newDate)
  }

  const handleTimeChange = (type: "hour" | "minute", value: string) => {
    const numValue = parseInt(value) || 0
    if (type === "hour" && (numValue < 0 || numValue > 23)) return
    if (type === "minute" && (numValue < 0 || numValue > 59)) return

    const base = selectedDateTime || new Date()
    const newDate = new Date(base)
    if (type === "hour") newDate.setHours(numValue)
    if (type === "minute") newDate.setMinutes(numValue)
    setSelectedDateTime(newDate)
    setDate(newDate)
  }

  return (
    <div className="flex flex-col gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDateTime && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDateTime ? (
              format(selectedDateTime, "PPP HH:mm")
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDateTime}
            onSelect={handleSelect}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      <div className="flex items-center gap-2">
        <div className="grid gap-1 text-center flex-1">
          <Label htmlFor="hours" className="text-xs">
            Hours
          </Label>
          <Input
            id="hours"
            type="number"
            min="0"
            max="23"
            value={selectedDateTime ? format(selectedDateTime, "HH") : "00"}
            onChange={(e) => handleTimeChange("hour", e.target.value)}
            className="text-center"
          />
        </div>
        <span className="mt-5 text-lg font-bold">:</span>
        <div className="grid gap-1 text-center flex-1">
          <Label htmlFor="minutes" className="text-xs">
            Min
          </Label>
          <Input
            id="minutes"
            type="number"
            min="0"
            max="59"
            value={selectedDateTime ? format(selectedDateTime, "mm") : "00"}
            onChange={(e) => handleTimeChange("minute", e.target.value)}
            className="text-center"
          />
        </div>
      </div>
    </div>
  )
}
