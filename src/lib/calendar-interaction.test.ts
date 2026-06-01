import assert from 'node:assert/strict';
import {
  TOUCH_MOVE_CANCEL_PX,
  fixedDurationSelection,
  isDesktopSelectionPointer,
  isTouchLongPressPointer,
  movedBeyondTouchSlop,
} from './calendar-interaction';

assert.equal(isDesktopSelectionPointer('mouse', 0), true, 'mouse left button should select a block');
assert.equal(isDesktopSelectionPointer('mouse', 2), false, 'mouse right button should not start drag selection');
assert.equal(isDesktopSelectionPointer('touch', 0), false, 'touch should not create a block on pointer down');

assert.equal(isTouchLongPressPointer('touch', 0), true, 'touch primary pointer can enter long-press mode');
assert.equal(isTouchLongPressPointer('mouse', 0), false, 'mouse should not use long-press mode');

assert.equal(movedBeyondTouchSlop(10, 10, 10 + TOUCH_MOVE_CANCEL_PX, 10), false, 'movement at the threshold stays within long-press slop');
assert.equal(movedBeyondTouchSlop(10, 10, 10 + TOUCH_MOVE_CANCEL_PX + 1, 10), true, 'movement beyond the threshold cancels long press');
assert.equal(movedBeyondTouchSlop(10, 10, 10, 10 + TOUCH_MOVE_CANCEL_PX + 1), true, 'vertical movement beyond threshold cancels long press');

assert.deepEqual(
  fixedDurationSelection(9 * 60, 60, 6 * 60, 23 * 60),
  { startMinutes: 9 * 60, endMinutes: 10 * 60 },
  'touch block should keep a fixed one-hour duration'
);

assert.deepEqual(
  fixedDurationSelection(22 * 60 + 30, 60, 6 * 60, 23 * 60),
  { startMinutes: 22 * 60, endMinutes: 23 * 60 },
  'touch block should stay within the day end'
);

console.log('calendar-interaction tests passed');
