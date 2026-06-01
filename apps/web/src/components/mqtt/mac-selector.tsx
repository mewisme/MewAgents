"use client"

import { useState } from "react"
import { HelpCircleIcon } from "lucide-react"

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatMac, parseMac } from "@/lib/mac"

export type MacSelectorProps = {
  recentMacs: string[]
  selectedMac: string
  onSelectedMacChange: (mac: string) => void
  datalistId?: string
}

export function useMacFromSelector(
  inputMode: "text" | "otp",
  selectedMac: string,
  otpValue: string
): string {
  const macFromOtp =
    otpValue.length === 12
      ? formatMac(
        Array.from({ length: 6 }, (_, i) =>
          parseInt(otpValue.slice(i * 2, i * 2 + 2), 16)
        ) as [number, number, number, number, number, number]
      )
      : ""
  return inputMode === "text" ? selectedMac : macFromOtp
}

export function MacSelector({
  recentMacs,
  selectedMac,
  onSelectedMacChange,
  datalistId = "recent-macs-datalist",
}: MacSelectorProps) {
  const [inputMode, setInputMode] = useState<"text" | "otp">("text")
  const [otpValue, setOtpValue] = useState("")

  const macFromOtp =
    otpValue.length === 12
      ? formatMac(
        Array.from({ length: 6 }, (_, i) =>
          parseInt(otpValue.slice(i * 2, i * 2 + 2), 16)
        ) as [number, number, number, number, number, number]
      )
      : ""

  return (
    <MacSelectorFields
      inputMode={inputMode}
      onInputModeChange={setInputMode}
      selectedMac={selectedMac}
      onSelectedMacChange={onSelectedMacChange}
      otpValue={otpValue}
      onOtpValueChange={setOtpValue}
      macFromOtp={macFromOtp}
      recentMacs={recentMacs}
      datalistId={datalistId}
    />
  )
}

type MacSelectorFieldsProps = {
  inputMode: "text" | "otp"
  onInputModeChange: (mode: "text" | "otp") => void
  selectedMac: string
  onSelectedMacChange: (mac: string) => void
  otpValue: string
  onOtpValueChange: (value: string) => void
  macFromOtp: string
  recentMacs: string[]
  datalistId: string
}

export function MacSelectorFields({
  inputMode,
  onInputModeChange,
  selectedMac,
  onSelectedMacChange,
  otpValue,
  onOtpValueChange,
  macFromOtp,
  recentMacs,
  datalistId,
}: MacSelectorFieldsProps) {
  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel>Input mode</FieldLabel>
        <RadioGroup
          value={inputMode}
          onValueChange={(v) => onInputModeChange(v as "text" | "otp")}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="text" id={`${datalistId}-mode-text`} />
            <Label htmlFor={`${datalistId}-mode-text`}>Text</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="otp" id={`${datalistId}-mode-otp`} />
            <Label htmlFor={`${datalistId}-mode-otp`}>OTP (12 hex)</Label>
          </div>
        </RadioGroup>
      </Field>

      {inputMode === "text" ? (
        <Field>
          <FieldLabel>MAC address</FieldLabel>
          <InputGroup>
            <InputGroupInput
              placeholder="AA:BB:CC:DD:EE:FF"
              value={selectedMac}
              onChange={(e) => onSelectedMacChange(e.target.value)}
              list={datalistId}
            />
            <InputGroupAddon align="inline-end">
              <Popover>
                <PopoverTrigger asChild>
                  <InputGroupButton size="icon-xs" variant="ghost">
                    <HelpCircleIcon className="size-4" />
                  </InputGroupButton>
                </PopoverTrigger>
                <PopoverContent className="w-80 text-sm">
                  Accepted: AA:BB:CC:DD:EE:FF, AA-BB-CC-DD-EE-FF, or
                  AABBCCDDEEFF (case-insensitive).
                </PopoverContent>
              </Popover>
            </InputGroupAddon>
          </InputGroup>
          <datalist id={datalistId}>
            {recentMacs.map((mac) => (
              <option key={mac} value={mac} />
            ))}
          </datalist>
          {recentMacs.length > 0 && (
            <ToggleGroup
              type="single"
              className="flex flex-wrap justify-start gap-1 pt-2"
              value={selectedMac}
              onValueChange={(v) => v && onSelectedMacChange(v)}
            >
              {recentMacs.slice(0, 6).map((mac) => (
                <ToggleGroupItem
                  key={mac}
                  value={mac}
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs"
                >
                  {mac}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
          <FieldDescription>
            Pick from recent MACs or type a new address.
          </FieldDescription>
        </Field>
      ) : (
        <Field>
          <FieldLabel>MAC (12 hex digits)</FieldLabel>
          <InputOTP
            maxLength={12}
            value={otpValue}
            onChange={onOtpValueChange}
            pattern="[0-9A-Fa-f]*"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={6} />
              <InputOTPSlot index={7} />
              <InputOTPSlot index={8} />
              <InputOTPSlot index={9} />
              <InputOTPSlot index={10} />
              <InputOTPSlot index={11} />
            </InputOTPGroup>
          </InputOTP>
          {otpValue.length === 12 && parseMac(macFromOtp) && (
            <FieldDescription className="font-mono">
              → {macFromOtp}
            </FieldDescription>
          )}
        </Field>
      )}
    </div>
  )
}

/** Controlled MAC selector with lifted input mode (for flip card). */
export function MacSelectorControlled({
  recentMacs,
  selectedMac,
  onSelectedMacChange,
  inputMode,
  onInputModeChange,
  otpValue,
  onOtpValueChange,
  datalistId = "recent-macs-datalist",
}: MacSelectorProps & {
  inputMode: "text" | "otp"
  onInputModeChange: (mode: "text" | "otp") => void
  otpValue: string
  onOtpValueChange: (value: string) => void
}) {
  const macFromOtp =
    otpValue.length === 12
      ? formatMac(
        Array.from({ length: 6 }, (_, i) =>
          parseInt(otpValue.slice(i * 2, i * 2 + 2), 16)
        ) as [number, number, number, number, number, number]
      )
      : ""

  return (
    <MacSelectorFields
      inputMode={inputMode}
      onInputModeChange={onInputModeChange}
      selectedMac={selectedMac}
      onSelectedMacChange={onSelectedMacChange}
      otpValue={otpValue}
      onOtpValueChange={onOtpValueChange}
      macFromOtp={macFromOtp}
      recentMacs={recentMacs}
      datalistId={datalistId}
    />
  )
}
