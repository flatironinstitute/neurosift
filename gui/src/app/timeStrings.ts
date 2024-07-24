// thanks https://stackoverflow.com/a/6109105/160863 and gh copilot!
export function timeAgoString(timestampSeconds?: number) {
  if (timestampSeconds === undefined) return "";
  const now = Date.now();
  const diff = now - timestampSeconds * 1000;
  const diffSeconds = Math.floor(diff / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffWeeks / 4);
  const diffYears = Math.floor(diffMonths / 12);
  if (diffYears > 0) {
    return `${diffYears} yr${diffYears === 1 ? "" : "s"} ago`;
  } else if (diffWeeks > 0) {
    return `${diffWeeks} wk${diffWeeks === 1 ? "" : "s"} ago`;
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} min ago`;
  } else {
    return `${diffSeconds} sec ago`;
  }
}

export function elapsedTimeString(numSeconds?: number) {
  if (numSeconds === undefined) return "";
  numSeconds = Math.floor(numSeconds);
  const numMinutes = Math.floor(numSeconds / 60);
  const numHours = Math.floor(numMinutes / 60);
  const numDays = Math.floor(numHours / 24);
  const numWeeks = Math.floor(numDays / 7);
  const numMonths = Math.floor(numWeeks / 4);
  const numYears = Math.floor(numMonths / 12);
  if (numYears > 0) {
    return `${numYears} yr${numYears === 1 ? "" : "s"}`;
  } else if (numWeeks > 5) {
    return `${numWeeks} wk${numWeeks === 1 ? "" : "s"}`;
  } else if (numDays > 5) {
    return `${numDays} day${numDays === 1 ? "" : "s"}`;
  } else if (numHours > 5) {
    return `${numHours} hr${numHours === 1 ? "" : "s"}`;
  } else if (numMinutes > 5) {
    return `${numMinutes} min`;
  } else {
    return `${numSeconds} sec`;
  }
}
