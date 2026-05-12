export async function loadArenaHistory() {
  const response = await fetch(
    `https://raw.githubusercontent.com/tkirk21/mybaseballpassport-data/main/arenaHistory.json?t=${Date.now()}`
  );

  if (!response.ok) {
    throw new Error('Failed to load arena history');
  }

  return await response.json();
}