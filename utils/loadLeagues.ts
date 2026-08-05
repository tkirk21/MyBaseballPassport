//baseball/loadLeagues.ts
export async function loadLeagues() {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/tkirk21/mybaseballpassport-data/refs/heads/main/leagues.json'
    );

    if (!response.ok) {
      throw new Error('Failed to load leagues');
    }

    return await response.json();
  } catch (error) {
    console.log('loadLeagues failed', error);
    return [];
  }
}