import { getTurnStatus, type TurnStatus } from "./gameHelpers";
import type { Card, GameState, LogEntry, OpponentView, Player } from "./types";

// everything one player is allowed to see
export interface PlayerView {
  me: Player;
  opponents: OpponentView[];
  drawPileCount: number;
  discardPile: Card[];
  turn: TurnStatus;
  log: LogEntry[];
}

// their own hand, and only the face-up cards of everyone else. never the deck or the seed:
// the seed replays the shuffle, so it would give away every card still to come
export function viewFor(game: GameState, playerId: number): PlayerView {
  const me = game.players.find((p) => p.id === playerId);
  if (!me) throw new Error(`Player ${playerId} isn't in this game`);

  const turn = getTurnStatus(game);
  return {
    me,
    opponents: game.players
      .filter((p) => p.id !== playerId)
      .map((p) => ({ id: p.id, name: p.name, handCount: p.hand.length, bank: p.bank, properties: p.properties })),
    drawPileCount: game.deck.length,
    discardPile: game.discardPile,
    // the turn is worked out for whoever's playing it, so other players can't draw, discard or end it
    turn:
      turn.currentPlayerId === playerId
        ? turn
        : {
            ...turn,
            canDraw: false,
            canEndTurn: false,
            mustDiscard: false,
            playBlockedReason: turn.playBlockedReason ?? "Wait for your turn",
          },
    log: game.log,
  };
}
