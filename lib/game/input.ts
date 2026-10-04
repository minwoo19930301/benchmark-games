import type { GameInput } from './simulation.ts';

export type GameAction = 'left' | 'right' | 'jump' | 'run';

const keyActions: Readonly<Record<string, GameAction>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
  ShiftLeft: 'run',
  ShiftRight: 'run',
};

export function actionForKey(code: string): GameAction | undefined {
  return Object.hasOwn(keyActions, code) ? keyActions[code] : undefined;
}

/** Keep individual keys/fingers held independently and retain brief jump taps. */
export class GameControls {
  private sources: Record<GameAction, Set<string>> = {
    left: new Set(),
    right: new Set(),
    jump: new Set(),
    run: new Set(),
  };
  private jumpPressed = false;
  private runToggle = false;

  setRunToggle(enabled: boolean) {
    this.runToggle = enabled;
  }

  set(action: GameAction, source: string, pressed: boolean) {
    const held = this.sources[action];
    if (pressed) {
      if (action === 'jump' && held.size === 0) this.jumpPressed = true;
      held.add(source);
    } else held.delete(source);
  }

  clear() {
    // Clear physical presses, retaining the user's hands-free run preference.
    for (const held of Object.values(this.sources)) held.clear();
    this.jumpPressed = false;
  }

  sample(): GameInput {
    const input = {
      left: this.sources.left.size > 0,
      right: this.sources.right.size > 0,
      jump: this.sources.jump.size > 0,
      run: this.runToggle || this.sources.run.size > 0,
      jumpPressed: this.jumpPressed,
    };
    this.jumpPressed = false;
    return input;
  }
}

export function createKeyboardHandlers(
  controls: GameControls,
  isPlaying: () => boolean,
  togglePause: () => void,
) {
  return {
    keydown: (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !e.repeat) {
        togglePause();
        return;
      }
      if (
        (e.target as HTMLElement)?.closest?.(
          'button,input,textarea,select,a,[contenteditable]:not([contenteditable="false"]),[role="textbox"]',
        )
      )
        return;
      const action = actionForKey(e.code);
      if (action && isPlaying()) {
        e.preventDefault();
        // OS repeat after blur/pause must not revive a cleared held key.
        if (!e.repeat) controls.set(action, `key:${e.code}`, true);
      }
    },
    keyup: (e: KeyboardEvent) => {
      const action = actionForKey(e.code);
      if (action) controls.set(action, `key:${e.code}`, false);
    },
  };
}
