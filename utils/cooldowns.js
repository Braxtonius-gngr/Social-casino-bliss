/* Pure timer math shared by the browser app and the dependency-free tests. */
const CooldownEngine = (() => {
  const MINUTE_MS = 60000;
  const DAY_MS = 86400000;

  function minuteOfDay(time) {
    if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) return null;
    const [hour, minute] = time.split(':').map(Number);
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }

  function fixedInstantsAround(timestamp, times) {
    const minuteValues = [...new Set(times.map(minuteOfDay).filter(Number.isFinite))]
      .sort((a, b) => a - b);
    if (!minuteValues.length) return [];
    const dayStart = Math.floor(timestamp / DAY_MS) * DAY_MS;
    const instants = [];
    for (let dayOffset = -1; dayOffset <= 2; dayOffset += 1) {
      minuteValues.forEach((minute) => {
        instants.push(dayStart + dayOffset * DAY_MS + minute * MINUTE_MS);
      });
    }
    return instants.sort((a, b) => a - b);
  }

  function streamState(stream, collectedAt, now) {
    if (!collectedAt) {
      return { id: stream.id, isReady: true, remainingMs: 0, totalMs: 0, nextReadyAt: now };
    }

    if (stream.type === 'interval') {
      const totalMs = Number(stream.minutes) * MINUTE_MS;
      const nextReadyAt = collectedAt + totalMs;
      return {
        id: stream.id,
        isReady: nextReadyAt <= now,
        remainingMs: Math.max(0, nextReadyAt - now),
        totalMs,
        nextReadyAt,
      };
    }

    if (stream.type === 'fixedUtc') {
      const instants = fixedInstantsAround(collectedAt, stream.times || []);
      const nextReadyAt = instants.find((instant) => instant > collectedAt);
      if (!Number.isFinite(nextReadyAt)) {
        return { id: stream.id, isReady: true, remainingMs: 0, totalMs: 0, nextReadyAt: now };
      }
      return {
        id: stream.id,
        isReady: nextReadyAt <= now,
        remainingMs: Math.max(0, nextReadyAt - now),
        totalMs: Math.max(0, nextReadyAt - collectedAt),
        nextReadyAt,
      };
    }

    return { id: stream.id, isReady: true, remainingMs: 0, totalMs: 0, nextReadyAt: now };
  }

  function getState(streams, collectedByStream, fallbackCollectedAt, now = Date.now()) {
    const states = streams.map((stream) => streamState(
      stream,
      Number(collectedByStream && collectedByStream[stream.id]) || fallbackCollectedAt || 0,
      now
    ));
    if (!states.length) return { isReady: true, remainingMs: 0, totalMs: 0, nextReadyAt: now, streams: [] };
    const selected = states.find((state) => state.isReady)
      || states.reduce((soonest, state) => (
        state.remainingMs < soonest.remainingMs ? state : soonest
      ));
    return { ...selected, streams: states };
  }

  function formatHours(minutes) {
    const hours = minutes / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
  }

  function label(streams) {
    if (streams.length === 1 && streams[0].type === 'interval') {
      return formatHours(streams[0].minutes);
    }
    const fixedTimes = [...new Set(streams
      .filter((stream) => stream.type === 'fixedUtc')
      .flatMap((stream) => stream.times || []))].sort();
    const intervalLabels = streams
      .filter((stream) => stream.type === 'interval')
      .map((stream) => formatHours(stream.minutes));
    if (fixedTimes.length === 1 && !intervalLabels.length) return `${fixedTimes[0]}Z`;
    if (fixedTimes.length && !intervalLabels.length) return `${fixedTimes.length}x UTC`;
    const pieces = [...new Set([...intervalLabels, fixedTimes.length ? `${fixedTimes.length}x UTC` : null].filter(Boolean))];
    return pieces.join('+') || '24h';
  }

  return { getState, label };
})();
