const fs = require("fs");
const path = require("path");

const arenasPath = path.join(__dirname, "assets/data/arenas.json");
const historicalPath = path.join(__dirname, "assets/data/historicalTeams.json");
const historyPath = path.join(__dirname, "assets/data/arenaHistory.json");

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

function generateArenaId(arena, city) {
  const cityBase = city ? city.split(",")[0] : "";
  return `${normalize(arena)}_${normalize(cityBase)}`;
}

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function buildRenameMap(historyData) {
  const map = {};

  historyData.forEach(entry => {
    const currentNormalized = normalize(entry.currentArena);
    entry.history.forEach(h => {
      const oldNormalized = normalize(h.name);
      map[oldNormalized] = currentNormalized;
    });
  });

  return map;
}

function processFile(data, renameMap) {
  return data.map(item => {
    if (!item.arena || !item.city) return item;

    const normalizedArena = normalize(item.arena);

    let finalArenaName = item.arena;

    if (renameMap[normalizedArena]) {
      finalArenaName = renameMap[normalizedArena]
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    const newArenaId = generateArenaId(finalArenaName, item.city);

    return {
      ...item,
      arenaId: newArenaId
    };
  });
}

function main() {
  const arenasData = loadJSON(arenasPath);
  const historicalData = loadJSON(historicalPath);
  const historyData = loadJSON(historyPath);

  const renameMap = buildRenameMap(historyData);

  const updatedArenas = processFile(arenasData, renameMap);
  const updatedHistorical = processFile(historicalData, renameMap);

  saveJSON(arenasPath, updatedArenas);
  saveJSON(historicalPath, updatedHistorical);

  console.log("arenaId generation complete.");
}

main();