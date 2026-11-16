// VOID BLOOM — keyboard and mouse state. The world reads a plain snapshot each
// step: a movement vector, an aim point in field coordinates, and edge-triggered
// flags for the actions that must fire exactly once per press.

export function createInput(canvas, toField) {
  const keys = new Set();
  const pressed = new Set();
  const state = {
    aimX: 640,
    aimY: 300,
    firing: false,
    // Consume-once flags, set by events and cleared by the game loop.
    dashQueued: false,
    pauseQueued: false,
    muteQueued: false,
    confirmQueued: false,
    restartQueued: false,
    upgradeQueued: 0, // 0 = none, 1 or 2 = the chosen card
  };

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    pressed.add(event.code);
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') state.dashQueued = true;
    if (event.code === 'KeyP' || event.code === 'Escape') state.pauseQueued = true;
    if (event.code === 'KeyM') state.muteQueued = true;
    if (event.code === 'Enter') state.confirmQueued = true;
    if (event.code === 'KeyR') state.restartQueued = true;
    if (event.code === 'Digit1') state.upgradeQueued = 1;
    if (event.code === 'Digit2') state.upgradeQueued = 2;
    if (event.code === 'Space') event.preventDefault();
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseMove(event) {
    const point = toField(event.clientX, event.clientY);
    state.aimX = point.x;
    state.aimY = point.y;
  }
  function onMouseDown(event) {
    if (event.button === 0) {
      state.firing = true;
      state.confirmQueued = true;
    }
  }
  function onMouseUp(event) {
    if (event.button === 0) state.firing = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => {
    keys.clear();
    state.firing = false;
  });
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    state,
    /** Current movement vector from WASD / arrow keys, normalised. */
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = Math.SQRT1_2;
        return { x: x * inv, y: y * inv };
      }
      return { x, y };
    },
    firing() {
      return state.firing || keys.has('Space');
    },
    /** Clear the consume-once flags at the end of a frame. */
    endFrame() {
      pressed.clear();
      state.dashQueued = false;
      state.pauseQueued = false;
      state.muteQueued = false;
      state.confirmQueued = false;
      state.restartQueued = false;
      state.upgradeQueued = 0;
    },
  };
}
