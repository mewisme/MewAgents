"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  createClientId,
  DEFAULT_MQTT_URI,
  type MqttConfig,
} from "@/types/mqtt"
import { ShieldAlertIcon } from "lucide-react"

type BrokerSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: MqttConfig
  onSave: (config: MqttConfig) => void
  onConnect: (config: MqttConfig) => void
}

export function BrokerSettingsDialog({
  open,
  onOpenChange,
  config,
  onSave,
}: BrokerSettingsDialogProps) {
  const { theme, setTheme } = useTheme()
  const [draft, setDraft] = useState(config)

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(config)
    }
    onOpenChange(next)
  }

  const handleSave = () => {
    onSave(draft)
    toast.success("Settings saved")
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Broker settings</DialogTitle>
          <DialogDescription>
            HiveMQ Cloud WebSocket (wss://…:8884/mqtt). ESP32 uses mqtts:// on
            port 8883 with the same topics.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>WebSocket URI</FieldLabel>
            <Input
              value={draft.uri}
              placeholder={DEFAULT_MQTT_URI}
              onChange={(e) => setDraft({ ...draft, uri: e.target.value })}
            />
            <FieldDescription>
              Example: wss://cluster.s1.eu.hivemq.cloud:8884/mqtt
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Username</FieldLabel>
            <Input
              value={draft.username}
              onChange={(e) =>
                setDraft({ ...draft, username: e.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel>Password</FieldLabel>
            <Input
              type="password"
              value={draft.password}
              onChange={(e) =>
                setDraft({ ...draft, password: e.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel>Client ID</FieldLabel>
            <div className="flex gap-2">
              <Input
                value={draft.clientId}
                onChange={(e) =>
                  setDraft({ ...draft, clientId: e.target.value })
                }
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDraft({ ...draft, clientId: createClientId() })
                }
              >
                New ID
              </Button>
            </div>
          </Field>
          <Field orientation="horizontal">
            <Switch
              checked={draft.autoReconnect}
              onCheckedChange={(checked) =>
                setDraft({ ...draft, autoReconnect: checked })
              }
            />
            <FieldLabel>Auto-reconnect</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) =>
                setTheme(checked ? "dark" : "light")
              }
            />
            <FieldLabel>Dark mode</FieldLabel>
          </Field>
        </FieldGroup>

        <Alert>
          <ShieldAlertIcon />
          <AlertTitle>Stored locally</AlertTitle>
          <AlertDescription>
            Credentials are saved in this browser&apos;s localStorage only.
          </AlertDescription>
        </Alert>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
