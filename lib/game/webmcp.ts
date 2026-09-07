import type { GameHandle } from './renderer';
type Context = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function registerGameTools(game: GameHandle) {
  const lifecycle = new AbortController();
  const context = (document as Document & { modelContext?: Context })
    .modelContext;
  if (!context?.registerTool) return () => lifecycle.abort();
  const schema = {
    type: 'object',
    properties: {},
    additionalProperties: false,
  };
  const valid = (input: unknown) => {
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input) ||
      Object.keys(input).length
    )
      throw new TypeError('Expected an empty object');
  };
  const tools = [
    {
      name: 'read_mario_game',
      description:
        'Read current phase, world, lives, coins, remaining time and progress; does not move the player.',
      readOnly: true,
      act: () => game.getSnapshot(),
    },
    {
      name: 'start_mario_game',
      description:
        'Start or restart Mario from the beginning with three lives, clearing the current run.',
      readOnly: false,
      act: () => {
        game.start();
        return game.getSnapshot();
      },
    },
    {
      name: 'toggle_mario_pause',
      description:
        'Pause a playing game or resume a paused game. Does not start or restart.',
      readOnly: false,
      act: () => {
        game.togglePause();
        return game.getSnapshot();
      },
    },
  ];
  for (const tool of tools)
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: tool.name,
            description: tool.description,
            inputSchema: schema,
            annotations: { readOnlyHint: tool.readOnly },
            execute(input) {
              valid(input);
              return tool.act();
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch((e) => console.warn('Game tools unavailable', e));
    } catch (e) {
      console.warn('Game tools unavailable', e);
    }
  return () => lifecycle.abort();
}
