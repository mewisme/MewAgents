/** MAC parsing/formatting mirroring main/wol_sender.c */

export type MacBytes = [number, number, number, number, number, number]

export function parseMac(macStr: string): MacBytes | null {
  if (!macStr) {
    return null
  }

  const s = macStr.trim()
  let hexCount = 0
  for (const ch of s) {
    if (/[0-9a-fA-F]/.test(ch)) {
      hexCount++
    } else if (ch === ":" || ch === "-" || /\s/.test(ch)) {
      continue
    } else {
      return null
    }
  }
  if (hexCount !== 12) {
    return null
  }

  const bytes: number[] = []
  let i = 0
  while (i < s.length && bytes.length < 6) {
    while (i < s.length && (s[i] === ":" || s[i] === "-" || /\s/.test(s[i]))) {
      i++
    }
    if (i + 2 > s.length) {
      return null
    }
    const pair = s.slice(i, i + 2)
    if (!/^[0-9a-fA-F]{2}$/.test(pair)) {
      return null
    }
    bytes.push(parseInt(pair, 16))
    i += 2
  }

  while (i < s.length && (s[i] === ":" || s[i] === "-" || /\s/.test(s[i]))) {
    i++
  }
  if (i !== s.length || bytes.length !== 6) {
    return null
  }

  return bytes as MacBytes
}

export function formatMac(mac: MacBytes): string {
  return mac.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(":")
}

export function normalizeMacForTopic(input: string): string {
  const parsed = parseMac(input)
  if (parsed) {
    return formatMac(parsed)
  }
  return input.trim()
}

export function isValidMac(input: string): boolean {
  return parseMac(input) !== null
}

export function macAvatarHue(mac: string): number {
  let hash = 0
  for (let i = 0; i < mac.length; i++) {
    hash = mac.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}
