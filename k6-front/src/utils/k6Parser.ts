export function parseK6TimeSeriesData(rawOutput: string) {
  const lines = rawOutput.split('\n');
  const stats: { time: number; vus: number; tps: number }[] = [];
  let prevComplete = 0;
  let prevTime = 0;

  const regexWithMinutes = /running \((\d+)m([\d.]+)s\), (\d+)\/(\d+) VUs, (\d+) complete/;
  const regexSecondsOnly = /running \(0*(\d+\.?\d*)s\), (\d+)\/(\d+) VUs, (\d+) complete/;

  for (const line of lines) {
    let timeInSeconds = 0;
    let currentVus = 0;
    let complete = 0;
    let matched = false;

    const matchMinutes = regexWithMinutes.exec(line);
    if (matchMinutes) {
      const minutes = Number.parseInt(matchMinutes[1], 10);
      const seconds = Number.parseFloat(matchMinutes[2]);
      timeInSeconds = minutes * 60 + seconds;
      currentVus = Number.parseInt(matchMinutes[3], 10);
      complete = Number.parseInt(matchMinutes[5], 10);
      matched = true;
    } else {
      const matchSeconds = regexSecondsOnly.exec(line);
      if (matchSeconds) {
        timeInSeconds = Number.parseFloat(matchSeconds[1]);
        currentVus = Number.parseInt(matchSeconds[2], 10);
        complete = Number.parseInt(matchSeconds[4], 10);
        matched = true;
      }
    }

    if (matched) {
      const tps = prevTime > 0 ? Math.round((complete - prevComplete) / (timeInSeconds - prevTime)) : 0;

      stats.push({
        time: Math.round(timeInSeconds * 10) / 10,
        vus: currentVus,
        tps: tps
      });

      prevComplete = complete;
      prevTime = timeInSeconds;
    }
  }

  if (stats.length > 0 && stats.at(-1)?.vus === 0) {
    stats.pop();
  }

  return stats;
}
