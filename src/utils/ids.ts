let fallbackCounter = 0

// crypto.randomUUID only exists in secure contexts, so opening the dev
// server from a tablet over plain http on the local network needs a fallback.
export function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  fallbackCounter += 1
  return [
    Date.now().toString(36),
    fallbackCounter.toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join('-')
}
