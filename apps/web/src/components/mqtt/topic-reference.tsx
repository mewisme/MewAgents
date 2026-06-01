import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Kbd } from "@/components/ui/kbd"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  MAC_LIST_GET_TOPIC,
  MAC_LIST_TOPIC,
  MQTT_SUB_ALL,
  SHUTDOWN_PREFIX,
  SHUTDOWN_SUB,
  WAKEUP_PREFIX,
  WAKEUP_RESULT_SUB,
  WAKEUP_SUB,
} from "@/lib/topics"
import { InfoIcon } from "lucide-react"

const topics = [
  {
    topic: MQTT_SUB_ALL,
    direction: "ESP32 subscribe",
    ui: "UI subscribe",
    purpose: "Log all broker messages",
    qos: "1",
  },
  {
    topic: WAKEUP_SUB,
    direction: "ESP32 subscribe (command)",
    ui: "UI publish (command)",
    purpose: "Wake command wildcard; MAC is last segment",
    qos: "1",
  },
  {
    topic: `${WAKEUP_PREFIX}{mac}/result`,
    direction: "ESP32 publish",
    ui: "UI subscribe",
    purpose: "Wake attempt result JSON",
    qos: "1",
  },
  {
    topic: SHUTDOWN_SUB,
    direction: "Client subscribe (command)",
    ui: "UI publish (command)",
    purpose: "Shutdown request; arms 1-minute pending TTL per MAC",
    qos: "1",
  },
  {
    topic: `${SHUTDOWN_PREFIX}{mac}/confirm`,
    direction: "Client subscribe (command)",
    ui: "UI publish (command)",
    purpose: "Confirm shutdown only if request was sent within 1 minute",
    qos: "1",
  },
  {
    topic: `${SHUTDOWN_PREFIX}{mac}/cancel`,
    direction: "Client subscribe (command)",
    ui: "UI publish (command)",
    purpose: "Cancel pending shutdown for this MAC",
    qos: "1",
  },
  {
    topic: MAC_LIST_GET_TOPIC,
    direction: "ESP32 subscribe (command)",
    ui: "UI publish (command)",
    purpose: "Request recent MAC list from Redis",
    qos: "1",
  },
  {
    topic: MAC_LIST_TOPIC,
    direction: "ESP32 publish",
    ui: "UI subscribe",
    purpose: 'Recent MACs JSON `{"macs":["AA:BB:..."]}`',
    qos: "1",
  },
]

export function TopicReference() {
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon />
        <AlertTitle>Topic parity</AlertTitle>
        <AlertDescription>
          Both clients subscribe to <Kbd>{MQTT_SUB_ALL}</Kbd> to log all traffic.
          Commands are handled on <Kbd>{WAKEUP_SUB}</Kbd>, <Kbd>{SHUTDOWN_SUB}</Kbd>
          , and <Kbd>{MAC_LIST_GET_TOPIC}</Kbd>. The UI publishes those commands and
          subscribes to <Kbd>{WAKEUP_RESULT_SUB}</Kbd> and{" "}
          <Kbd>{MAC_LIST_TOPIC}</Kbd> for structured responses.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>MQTT topics</CardTitle>
          <CardDescription>
            Same contract as{" "}
            <code className="text-xs">main/mqtt_manager.c</code> and{" "}
            <code className="text-xs">docs/TOPICS.md</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>ESP32</TableHead>
                <TableHead>UI</TableHead>
                <TableHead>QoS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((row) => (
                <TableRow key={row.topic}>
                  <TableCell className="font-mono text-xs">{row.topic}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.direction}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.ui}</Badge>
                  </TableCell>
                  <TableCell>{row.qos}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="wake">
          <AccordionTrigger>Wake a PC</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Publish any payload (or empty) to{" "}
              <Kbd>wakeup/AA:BB:CC:DD:EE:FF</Kbd>
            </p>
            <p>
              MAC formats: colon, dash, or bare hex (case-insensitive).
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="result">
          <AccordionTrigger>Result payload</AccordionTrigger>
          <AccordionContent>
            <pre className="rounded-md bg-muted p-3 text-xs">
              {`{
  "status": "sent",
  "mac": "AA:BB:CC:DD:EE:FF",
  "broadcast": "192.168.1.255"
}`}
            </pre>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="shutdown">
          <AccordionTrigger>Shutdown a PC (two-step)</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Publish (empty) to <Kbd>shutdown/AA:BB:CC:DD:EE:FF</Kbd> — pending
                shutdown, 1-minute TTL.
              </li>
              <li>
                Publish (empty) to <Kbd>shutdown/AA:BB:CC:DD:EE:FF/confirm</Kbd> —
                shuts down only if step 1 happened within the last minute.
              </li>
              <li>
                Publish (empty) to <Kbd>shutdown/AA:BB:CC:DD:EE:FF/cancel</Kbd> —
                clears the pending shutdown.
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="redis">
          <AccordionTrigger>Recent MAC list (Redis)</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">
            <p>
              Publish to <Kbd>{MAC_LIST_GET_TOPIC}</Kbd> → response on{" "}
              <Kbd>{MAC_LIST_TOPIC}</Kbd>. Requires REDIS_URL on ESP32.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
