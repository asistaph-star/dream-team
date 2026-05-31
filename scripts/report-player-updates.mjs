import { readFileSync } from "node:fs";

const updates = JSON.parse(readFileSync("src/lib/data/players_update.json", "utf8"));
const mockPlayersSource = readFileSync("src/lib/data/mockPlayers.ts", "utf8");

const args = new Set(process.argv.slice(2));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 50;
const rosterOnly = args.has("--roster");

const normalize = (name) => name.replace(/[^a-zA-Z]/g, "").toLowerCase();
const rosterNames = new Map();
for (const match of mockPlayersSource.matchAll(/name:\s*"([^"]+)"/g)) {
  rosterNames.set(normalize(match[1]), match[1]);
}

const rows = Object.entries(updates)
  .filter(([key]) => !rosterOnly || rosterNames.has(key))
  .sort(([, a], [, b]) => a.rankFinal - b.rankFinal)
  .slice(0, limit)
  .map(([key, value]) => ({
    rank: value.rankFinal,
    name: rosterNames.get(key) ?? key,
    ovr: value.ovr,
    marketScore: value.marketScore,
    seasonRating: value.seasonRating,
    gp: value.currentSeasonStats?.gamesPlayed,
    min: value.currentSeasonStats?.minutesPerGame,
    ppg: value.currentSeasonStats?.pointsPerGame,
    rpg: value.currentSeasonStats?.reboundsPerGame,
    apg: value.currentSeasonStats?.assistsPerGame,
    price: value.price,
    salary: value.salary,
    trend: value.priceTrend,
  }));

console.table(rows);
console.log(
  rosterOnly
    ? `Showing top ${rows.length} implemented mockPlayers only.`
    : `Showing top ${rows.length} global market rows. Use --roster to show implemented game players only.`
);
