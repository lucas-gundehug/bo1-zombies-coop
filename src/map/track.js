// Recent positions of one player, so the map can glide a dot between the samples it gets a few times a second.
// A track is an array of { at, x, y, yaw }, oldest first.

const KEEP = 8;

/**
 * Others are drawn this far in the past, so there are two samples to glide between at 4 a second, with room for a
 * sample that comes late (a busy console on the host, network jitter on a guest).
 */
export const RENDER_DELAY_MS = 400;

export function pushSample(track, at, x, y, yaw) {
  track.push({ at, x, y, yaw });
  if (track.length > KEEP) track.splice(0, track.length - KEEP);
}

const turn = (yaw) => ((yaw % 360) + 360) % 360;

/** Where the player was at `at`: between the two samples around it, or the nearest end (never guessed ahead). */
export function sampleTrack(track, at) {
  if (!track.length) return null;
  const pick = ({ x, y, yaw }) => ({ x, y, yaw });
  if (at <= track[0].at) return pick(track[0]);
  const last = track[track.length - 1];
  if (at >= last.at) return pick(last);
  let i = 0;
  while (track[i + 1].at <= at) i += 1;
  const a = track[i];
  const b = track[i + 1];
  const f = (at - a.at) / (b.at - a.at);
  const d = ((b.yaw - a.yaw + 540) % 360) - 180; // the short way round
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, yaw: turn(a.yaw + d * f) };
}
