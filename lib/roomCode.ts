// no I or O
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 4;

export function makeRoomCode(): string {
  const picks = crypto.getRandomValues(new Uint32Array(ROOM_CODE_LENGTH));
  return Array.from(picks, (n) => LETTERS[n % LETTERS.length]).join("");
}

export const tidyCode = (code: string) => code.trim().toUpperCase();
