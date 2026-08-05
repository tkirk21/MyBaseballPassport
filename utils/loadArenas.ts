//baseball/loadArenas.ts
export async function loadArenas() {
  const response = await fetch(
    `https://raw.githubusercontent.com/tkirk21/mybaseballpassport-data/main/arenas.json?t=${Date.now()}`
  );

  if (!response.ok) {
    throw new Error('Failed to load arenas');
  }

  return await response.json();
}