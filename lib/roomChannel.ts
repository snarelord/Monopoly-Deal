// pages in a room listen on this channel, and reload when the server says the room has changed
export const roomChannel = (code: string) => `room:${code}`;
export const ROOM_CHANGED = "changed";
