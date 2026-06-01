export const LONG_PRESS_MS = 500;
export const TOUCH_MOVE_CANCEL_PX = 10;

export function isDesktopSelectionPointer(pointerType: string, button: number) {
  return (pointerType === 'mouse' || pointerType === 'pen') && button === 0;
}

export function isTouchLongPressPointer(pointerType: string, button: number) {
  return pointerType === 'touch' && button === 0;
}

export function movedBeyondTouchSlop(startX: number, startY: number, currentX: number, currentY: number) {
  return Math.abs(currentX - startX) > TOUCH_MOVE_CANCEL_PX || Math.abs(currentY - startY) > TOUCH_MOVE_CANCEL_PX;
}
