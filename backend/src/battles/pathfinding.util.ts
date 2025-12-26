/**
 * Pathfinding utility for battle simulation
 * Implements A* pathfinding with wall detection
 */

import { Building, Troop } from './battle-session.manager';

export interface GridNode {
  x: number;
  y: number;
  walkable: boolean;
  g: number; // Cost from start
  h: number; // Heuristic cost to end
  f: number; // Total cost
  parent: GridNode | null;
}

export interface PathResult {
  path: { x: number; y: number }[];
  hasWallBlockage: boolean; // If true, wall is blocking the direct path
  wallToDestroy: Building | null; // The wall that needs to be destroyed
}

const GRID_WIDTH = 80;
const GRID_HEIGHT = 40;

/**
 * Create a grid representation of the battlefield with walls marked as obstacles
 */
export function createGrid(buildings: Building[], ignoredBuilding?: Building): GridNode[][] {
  const grid: GridNode[][] = [];

  // Initialize empty grid
  for (let y = 0; y < GRID_HEIGHT; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      grid[y][x] = {
        x,
        y,
        walkable: true,
        g: 0,
        h: 0,
        f: 0,
        parent: null,
      };
    }
  }

  // Mark walls as non-walkable
  for (const building of buildings) {
    if (building.isDestroyed) continue;
    if (ignoredBuilding && building.id === ignoredBuilding.id) continue;

    // Only walls block movement
    if (building.type.toLowerCase() === 'wall') {
      const startX = Math.floor(building.position.x);
      const startY = Math.floor(building.position.y);
      const endX = Math.ceil(building.position.x + building.width);
      const endY = Math.ceil(building.position.y + building.height);

      for (let y = Math.max(0, startY); y < Math.min(GRID_HEIGHT, endY); y++) {
        for (let x = Math.max(0, startX); x < Math.min(GRID_WIDTH, endX); x++) {
          grid[y][x].walkable = false;
        }
      }
    }
  }

  return grid;
}

/**
 * A* pathfinding algorithm
 */
export function findPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  grid: GridNode[][],
): { x: number; y: number }[] {
  const startNode = grid[Math.floor(start.y)]?.[Math.floor(start.x)];
  const endNode = grid[Math.floor(end.y)]?.[Math.floor(end.x)];

  if (!startNode || !endNode) {
    return [];
  }

  const openList: GridNode[] = [];
  const closedList: Set<GridNode> = new Set();

  openList.push(startNode);

  while (openList.length > 0) {
    // Find node with lowest f cost
    let currentIndex = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[currentIndex].f) {
        currentIndex = i;
      }
    }

    const current = openList[currentIndex];

    // Reached the end
    if (current.x === endNode.x && current.y === endNode.y) {
      return reconstructPath(current);
    }

    // Move current from open to closed
    openList.splice(currentIndex, 1);
    closedList.add(current);

    // Check neighbors
    const neighbors = getNeighbors(current, grid);
    for (const neighbor of neighbors) {
      if (closedList.has(neighbor) || !neighbor.walkable) {
        continue;
      }

      const tentativeG = current.g + 1;

      let isInOpenList = false;
      for (const node of openList) {
        if (node.x === neighbor.x && node.y === neighbor.y) {
          isInOpenList = true;
          if (tentativeG < neighbor.g) {
            neighbor.g = tentativeG;
            neighbor.parent = current;
          }
          break;
        }
      }

      if (!isInOpenList) {
        neighbor.g = tentativeG;
        neighbor.h = heuristic(neighbor, endNode);
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = current;
        openList.push(neighbor);
      }
    }
  }

  // No path found
  return [];
}

/**
 * Find path considering walls - returns path and wall blocking info
 */
export function findPathWithWallInfo(
  troop: Troop,
  target: { x: number; y: number },
  buildings: Building[],
): PathResult {
  // First, try to find path with all walls as obstacles
  const gridWithWalls = createGrid(buildings);
  const pathWithWalls = findPath(troop.position, target, gridWithWalls);

  // If path found, no wall is blocking
  if (pathWithWalls.length > 0) {
    return {
      path: pathWithWalls,
      hasWallBlockage: false,
      wallToDestroy: null,
    };
  }

  // No path found, find the closest wall blocking the path
  const directLine = getDirectLinePath(troop.position, target);
  const blockingWall = findBlockingWall(directLine, buildings);

  if (blockingWall) {
    // Create path towards the blocking wall
    const wallCenter = {
      x: blockingWall.position.x + blockingWall.width / 2,
      y: blockingWall.position.y + blockingWall.height / 2,
    };

    return {
      path: [wallCenter],
      hasWallBlockage: true,
      wallToDestroy: blockingWall,
    };
  }

  // Fallback to direct line
  return {
    path: directLine,
    hasWallBlockage: false,
    wallToDestroy: null,
  };
}

/**
 * Check if a building is in line of sight (no walls blocking)
 */
export function hasLineOfSight(
  from: { x: number; y: number },
  to: { x: number; y: number },
  buildings: Building[],
): boolean {
  const walls = buildings.filter((b) => !b.isDestroyed && b.type.toLowerCase() === 'wall');

  if (walls.length === 0) return true;

  // Check if any wall intersects the line
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(distance * 2);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const checkX = from.x + dx * t;
    const checkY = from.y + dy * t;

    for (const wall of walls) {
      if (
        checkX >= wall.position.x &&
        checkX <= wall.position.x + wall.width &&
        checkY >= wall.position.y &&
        checkY <= wall.position.y + wall.height
      ) {
        return false; // Wall blocks line of sight
      }
    }
  }

  return true;
}

/**
 * Find walls that need to be destroyed to reach target
 */
export function findWallsInPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  buildings: Building[],
): Building[] {
  const walls = buildings.filter((b) => !b.isDestroyed && b.type.toLowerCase() === 'wall');

  const blockingWalls: Building[] = [];
  const directLine = getDirectLinePath(from, to);

  for (const wall of walls) {
    for (const point of directLine) {
      if (
        point.x >= wall.position.x &&
        point.x <= wall.position.x + wall.width &&
        point.y >= wall.position.y &&
        point.y <= wall.position.y + wall.height
      ) {
        if (!blockingWalls.includes(wall)) {
          blockingWalls.push(wall);
        }
        break;
      }
    }
  }

  return blockingWalls;
}

// Helper functions

function getNeighbors(node: GridNode, grid: GridNode[][]): GridNode[] {
  const neighbors: GridNode[] = [];
  const { x, y } = node;

  // 4-directional movement
  const directions = [
    { dx: 0, dy: -1 }, // Up
    { dx: 1, dy: 0 }, // Right
    { dx: 0, dy: 1 }, // Down
    { dx: -1, dy: 0 }, // Left
  ];

  for (const { dx, dy } of directions) {
    const newX = x + dx;
    const newY = y + dy;

    if (newY >= 0 && newY < grid.length && newX >= 0 && newX < grid[0].length) {
      neighbors.push(grid[newY][newX]);
    }
  }

  return neighbors;
}

function heuristic(a: GridNode, b: GridNode): number {
  // Manhattan distance
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function reconstructPath(endNode: GridNode): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  let current: GridNode | null = endNode;

  while (current) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }

  return path;
}

function getDirectLinePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(Math.ceil(distance), 1);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    path.push({
      x: from.x + dx * t,
      y: from.y + dy * t,
    });
  }

  return path;
}

function findBlockingWall(
  path: { x: number; y: number }[],
  buildings: Building[],
): Building | null {
  const walls = buildings.filter((b) => !b.isDestroyed && b.type.toLowerCase() === 'wall');

  for (const point of path) {
    for (const wall of walls) {
      if (
        point.x >= wall.position.x &&
        point.x <= wall.position.x + wall.width &&
        point.y >= wall.position.y &&
        point.y <= wall.position.y + wall.height
      ) {
        return wall;
      }
    }
  }

  return null;
}
