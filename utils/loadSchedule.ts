export async function loadSchedule(fileName: string) {
  const response = await fetch(
    `https://raw.githubusercontent.com/tkirk21/mybaseballpassport-data/main/${fileName}?t=${Date.now()}`
  );

  if (!response.ok) {
    throw new Error(`Failed to load ${fileName}`);
  }

  return await response.json();
}