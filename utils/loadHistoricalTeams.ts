//baseball/loadHistoricalTeams.ts
export async function loadHistoricalTeams() {
  const response = await fetch(
    `https://raw.githubusercontent.com/tkirk21/mybaseballpassport-data/main/historicalTeams.json?t=${Date.now()}`
  );

  if (!response.ok) {
    throw new Error('Failed to load historical teams');
  }

  return await response.json();
}