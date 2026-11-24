// The monster pen's clock (designer, Round 89): pen monsters grow over real time while the game is
// open. Once a minute, every pen monster gets a minute's XP (rules in src/logic/pen.ts) and the game
// saves. Time with the game closed doesn't count.
import { content } from '../data';
import { penTick } from '../logic/pen';
import { currentGame, saveGame, setGame } from './game';

const MINUTE_MS = 60_000;
let timer: ReturnType<typeof setInterval> | undefined;

export function startPenClock(): void {
  if (timer !== undefined) return;
  timer = setInterval(() => {
    const g = currentGame();
    if (!g || g.pen.length === 0) return;
    setGame(penTick(content, g, 1).state);
    saveGame();
  }, MINUTE_MS);
}
