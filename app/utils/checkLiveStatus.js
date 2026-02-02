export const checkLiveStatus = (dateOfLive, timeOfLive) => {
  if (!dateOfLive || !timeOfLive) return null;

  const liveDateTime = new Date(`${dateOfLive}T${timeOfLive}`);
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
  const videoStartTime = new Date(liveDateTime.getTime() - 5 * 60000);

  return {
    isLive: now >= videoStartTime && now < liveDateTime,
    canJoin: now >= videoStartTime,
    startsIn: liveDateTime.getTime() - now.getTime(),
    liveDateTime,
  };
};