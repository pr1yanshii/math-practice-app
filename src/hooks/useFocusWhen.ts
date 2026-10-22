import { useEffect, type RefObject } from 'react'

// Focuses the element when `condition` becomes true. Waits one frame
// because Chrome ignores focus() during the same event that makes the
// element visible or removes `inert` (found while building the card flip).
export function useFocusWhen(
  ref: RefObject<HTMLElement | null>,
  condition: boolean,
) {
  useEffect(() => {
    if (!condition) return
    const frame = requestAnimationFrame(() => ref.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [ref, condition])
}
