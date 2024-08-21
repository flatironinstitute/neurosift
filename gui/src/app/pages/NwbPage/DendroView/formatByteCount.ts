const formatByteCount = (a: number) => {
  if (a < 10000) {
    return `${a} bytes`;
  } else if (a < 100 * 1024) {
    return `${formatNum(a / 1024)} KB`;
  } else if (a < 100 * 1024 * 1024) {
    return `${formatNum(a / (1024 * 1024))} MB`;
  } else if (a < 600 * 1024 * 1024 * 1024) {
    return `${formatNum(a / (1024 * 1024 * 1025))} GB`;
  } else {
    return `${formatNum(a / (1024 * 1024 * 1024 * 1024))} TB`;
  }
};

export const formatGiBCount = (a: number) => {
  return formatByteCount(a * 1000 * 1000 * 1000);
};

const formatNum = (a: number) => {
  const b = a.toFixed(2);
  if (Number(b) - Math.floor(Number(b)) === 0) {
    return a.toFixed(0);
  } else return b;
};

export default formatByteCount;
