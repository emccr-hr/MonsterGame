// Save file backup (Development Plan §2, UI-and-HUD.md "Export/Import save"): the browser save lives
// in localStorage, which is per browser and per address (the dev server and the preview build keep
// separate saves). A save file can be kept as a backup or moved to another browser.
import { deserialize, serialize } from '../logic/save';
import { getGame, saveGame, setGame } from './game';

/** "magic-and-monsters-save-2026-11-22.json" */
export function saveFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `magic-and-monsters-save-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/** Downloads the game in play as a JSON file. */
export function downloadSave(): void {
  const blob = new Blob([serialize(getGame())], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = saveFileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Puts a save file's game into play and into the browser save. Returns why it failed, or null. */
export function importSave(text: string): string | null {
  const result = deserialize(text);
  if (!result.ok) return result.reason;
  setGame(result.state);
  saveGame();
  return null;
}

/** Opens the file picker for a save file. Resolves with its text, or null if none was picked. */
export function pickSaveFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) resolve(null);
      else file.text().then(resolve, () => resolve(null));
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
