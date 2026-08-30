export type MazeCell = { column: number; row: number };

export type MazeWall = {
  x: number;
  z: number;
  width: number;
  depth: number;
};

export type MazeLayout = {
  columns: number;
  rows: number;
  cellWidth: number;
  cellDepth: number;
  start: MazeCell;
  goal: MazeCell;
  startPosition: { x: number; z: number };
  goalPosition: { x: number; z: number };
  walls: MazeWall[];
  solutionDistance: number;
  directDistance: number;
  estimatedSeconds: number;
};

type Direction = {
  dc: number;
  dr: number;
  bit: number;
  opposite: number;
};

const NORTH = 1;
const EAST = 2;
const SOUTH = 4;
const WEST = 8;

const DIRECTIONS: Direction[] = [
  { dc: 0, dr: -1, bit: NORTH, opposite: SOUTH },
  { dc: 1, dr: 0, bit: EAST, opposite: WEST },
  { dc: 0, dr: 1, bit: SOUTH, opposite: NORTH },
  { dc: -1, dr: 0, bit: WEST, opposite: EAST },
];

const COLUMNS = 7;
const ROWS = 18;
const CELL_WIDTH = 5;
const CELL_DEPTH = 5.7;
const NORTH_EDGE = -50;
const PLAYER_SPEED = 8.8;
const MIN_SECONDS = 28;
const DESIRED_SECONDS = 32;
const MAX_SECONDS = 38;
const MIN_DIRECT_DISTANCE = 45;
const MAX_CANDIDATES = 120;
const WALL_THICKNESS = 0.34;

export function generateMaze(start: MazeCell = { column: Math.floor(COLUMNS / 2), row: ROWS - 1 }, random: () => number = Math.random): MazeLayout {
  let best: MazeLayout | null = null;

  for (let attempt = 0; attempt < MAX_CANDIDATES; attempt += 1) {
    const candidate = generateCandidate(start, random);
    const candidateScore = Math.abs(candidate.estimatedSeconds - DESIRED_SECONDS) + Math.max(0, MIN_DIRECT_DISTANCE - candidate.directDistance) * 2;
    const bestScore = best
      ? Math.abs(best.estimatedSeconds - DESIRED_SECONDS) + Math.max(0, MIN_DIRECT_DISTANCE - best.directDistance) * 2
      : Number.POSITIVE_INFINITY;
    if (!best || candidateScore < bestScore) best = candidate;
    if (
      candidate.estimatedSeconds >= MIN_SECONDS &&
      candidate.estimatedSeconds <= MAX_SECONDS &&
      candidate.directDistance >= MIN_DIRECT_DISTANCE
    ) return candidate;
  }

  if (!best) throw new Error("No se pudo generar un laberinto");
  return best;
}

function generateCandidate(start: MazeCell, random: () => number): MazeLayout {
  const passages = new Uint8Array(COLUMNS * ROWS);
  const visited = new Uint8Array(COLUMNS * ROWS);
  const stack: MazeCell[] = [start];
  visited[indexOf(start.column, start.row)] = 1;

  while (stack.length) {
    const current = stack[stack.length - 1];
    const neighbors = DIRECTIONS
      .map((direction) => ({
        direction,
        column: current.column + direction.dc,
        row: current.row + direction.dr,
      }))
      .filter(({ column, row }) => inside(column, row) && !visited[indexOf(column, row)]);

    if (!neighbors.length) {
      stack.pop();
      continue;
    }

    const next = neighbors[Math.floor(random() * neighbors.length)];
    passages[indexOf(current.column, current.row)] |= next.direction.bit;
    passages[indexOf(next.column, next.row)] |= next.direction.opposite;
    visited[indexOf(next.column, next.row)] = 1;
    stack.push({ column: next.column, row: next.row });
  }

  const { goal, distance, directDistance } = findFarthestCell(passages, start);
  const estimatedSeconds = distance / PLAYER_SPEED;

  return {
    columns: COLUMNS,
    rows: ROWS,
    cellWidth: CELL_WIDTH,
    cellDepth: CELL_DEPTH,
    start,
    goal,
    startPosition: cellPosition(start),
    goalPosition: cellPosition(goal),
    walls: buildWalls(passages),
    solutionDistance: distance,
    directDistance,
    estimatedSeconds,
  };
}

function findFarthestCell(passages: Uint8Array, start: MazeCell) {
  const queue: MazeCell[] = [start];
  const distances = new Float32Array(COLUMNS * ROWS);
  distances.fill(-1);
  distances[indexOf(start.column, start.row)] = 0;
  let farthest = start;

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const currentIndex = indexOf(current.column, current.row);
    const currentDistance = distances[currentIndex];
    if (currentDistance > distances[indexOf(farthest.column, farthest.row)]) farthest = current;

    for (const direction of DIRECTIONS) {
      if (!(passages[currentIndex] & direction.bit)) continue;
      const column = current.column + direction.dc;
      const row = current.row + direction.dr;
      const nextIndex = indexOf(column, row);
      if (distances[nextIndex] >= 0) continue;
      const stepDistance = direction.dc === 0 ? CELL_DEPTH : CELL_WIDTH;
      distances[nextIndex] = currentDistance + stepDistance;
      queue.push({ column, row });
    }
  }

  const desiredDistance = DESIRED_SECONDS * PLAYER_SPEED;
  const minimumDistance = MIN_SECONDS * PLAYER_SPEED;
  const startPosition = cellPosition(start);
  const directDistanceFor = (cell: MazeCell) => {
    const position = cellPosition(cell);
    return Math.hypot(position.x - startPosition.x, position.z - startPosition.z);
  };
  const distantCells = queue.filter((cell) => directDistanceFor(cell) >= MIN_DIRECT_DISTANCE);
  const eligible = distantCells.filter((cell) => distances[indexOf(cell.column, cell.row)] >= minimumDistance);
  const candidates = eligible.length ? eligible : distantCells.length ? distantCells : queue;
  const goal = candidates.reduce((closest, cell) => {
    const distance = distances[indexOf(cell.column, cell.row)];
    const closestDistance = distances[indexOf(closest.column, closest.row)];
    return Math.abs(distance - desiredDistance) < Math.abs(closestDistance - desiredDistance) ? cell : closest;
  }, farthest);

  return {
    goal,
    distance: distances[indexOf(goal.column, goal.row)],
    directDistance: directDistanceFor(goal),
  };
}

function buildWalls(passages: Uint8Array) {
  const walls: MazeWall[] = [];

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const cell = cellPosition({ column, row });
      const openings = passages[indexOf(column, row)];

      if (!(openings & NORTH)) {
        walls.push({ x: cell.x, z: cell.z - CELL_DEPTH / 2, width: CELL_WIDTH + WALL_THICKNESS, depth: WALL_THICKNESS });
      }
      if (!(openings & WEST)) {
        walls.push({ x: cell.x - CELL_WIDTH / 2, z: cell.z, width: WALL_THICKNESS, depth: CELL_DEPTH + WALL_THICKNESS });
      }
      if (column === COLUMNS - 1 && !(openings & EAST)) {
        walls.push({ x: cell.x + CELL_WIDTH / 2, z: cell.z, width: WALL_THICKNESS, depth: CELL_DEPTH + WALL_THICKNESS });
      }
      if (row === ROWS - 1 && !(openings & SOUTH)) {
        walls.push({ x: cell.x, z: cell.z + CELL_DEPTH / 2, width: CELL_WIDTH + WALL_THICKNESS, depth: WALL_THICKNESS });
      }
    }
  }

  return walls;
}

function cellPosition(cell: MazeCell) {
  return {
    x: (cell.column - (COLUMNS - 1) / 2) * CELL_WIDTH,
    z: NORTH_EDGE + CELL_DEPTH / 2 + cell.row * CELL_DEPTH,
  };
}

function indexOf(column: number, row: number) {
  return row * COLUMNS + column;
}

function inside(column: number, row: number) {
  return column >= 0 && column < COLUMNS && row >= 0 && row < ROWS;
}
