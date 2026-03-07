import { prisma } from "../../config/prisma.js";
import { defaultBarangayBoundaries } from "./defaultBarangayBoundaries.js";

type Position = [number, number];
type LinearRing = Position[];
type PolygonCoordinates = LinearRing[];
type MultiPolygonCoordinates = PolygonCoordinates[];

type PolygonGeoJson = {
  type: "Polygon";
  coordinates: PolygonCoordinates;
};

type MultiPolygonGeoJson = {
  type: "MultiPolygon";
  coordinates: MultiPolygonCoordinates;
};

type SupportedGeoJson = PolygonGeoJson | MultiPolygonGeoJson;

type BarangayWithBoundary = {
  id: string;
  code: string;
  name: string;
  boundaryGeojson: string;
};

class GeofencingError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPointInsideRing(point: Position, ring: LinearRing): boolean {
  let inside = false;
  const [x, y] = point;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersects = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function isPointInsidePolygon(point: Position, polygon: PolygonCoordinates): boolean {
  if (polygon.length === 0) {
    return false;
  }

  if (!isPointInsideRing(point, polygon[0])) {
    return false;
  }

  for (let holeIndex = 1; holeIndex < polygon.length; holeIndex += 1) {
    if (isPointInsideRing(point, polygon[holeIndex])) {
      return false;
    }
  }

  return true;
}

function parseBoundary(rawBoundary: string): SupportedGeoJson {
  const parsed = JSON.parse(rawBoundary) as { type?: string; coordinates?: unknown };
  if (parsed.type !== "Polygon" && parsed.type !== "MultiPolygon") {
    throw new GeofencingError("Unsupported boundary geometry type.", 500);
  }

  if (!Array.isArray(parsed.coordinates)) {
    throw new GeofencingError("Invalid boundary coordinates.", 500);
  }

  return parsed as SupportedGeoJson;
}

function distancePointToSegment(point: Position, segmentStart: Position, segmentEnd: Position): number {
  const [px, py] = point;
  const [x1, y1] = segmentStart;
  const [x2, y2] = segmentEnd;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const projectedX = x1 + t * dx;
  const projectedY = y1 + t * dy;
  return Math.hypot(px - projectedX, py - projectedY);
}

function distancePointToRing(point: Position, ring: LinearRing): number {
  let minDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < ring.length - 1; i += 1) {
    const distance = distancePointToSegment(point, ring[i], ring[i + 1]);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
}

function distancePointToGeometryBoundary(point: Position, geometry: SupportedGeoJson): number {
  if (geometry.type === "Polygon") {
    return Math.min(...geometry.coordinates.map((ring) => distancePointToRing(point, ring)));
  }

  return Math.min(
    ...geometry.coordinates.flatMap((polygon) => polygon.map((ring) => distancePointToRing(point, ring))),
  );
}

async function listSupportedBarangaysWithBoundary(): Promise<BarangayWithBoundary[]> {
  const rows = await prisma.barangay.findMany({
    where: {
      code: {
        in: ["251", "252", "256"],
      },
      boundaryGeojson: {
        not: null,
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      boundaryGeojson: true,
    },
  });

  return rows.filter((row): row is BarangayWithBoundary => Boolean(row.boundaryGeojson));
}

async function ensureDefaultBoundaries() {
  await Promise.all(
    defaultBarangayBoundaries.map((boundary) =>
      prisma.barangay.upsert({
        where: { code: boundary.code },
        update: {
          name: boundary.name,
          boundaryGeojson: boundary.boundaryGeojson,
        },
        create: {
          code: boundary.code,
          name: boundary.name,
          boundaryGeojson: boundary.boundaryGeojson,
        },
      }),
    ),
  );
}

export const geofencingService = {
  async resolveBarangayFromCoordinates(latitude: number, longitude: number) {
    if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
      throw new GeofencingError("Valid latitude and longitude are required.", 400);
    }

    await ensureDefaultBoundaries();

    const barangays = await listSupportedBarangaysWithBoundary();

    const point: Position = [longitude, latitude];

    const owningBarangay = barangays.find((barangay) => {
      if (!barangay.boundaryGeojson) {
        return false;
      }

      const geometry = parseBoundary(barangay.boundaryGeojson);
      if (geometry.type === "Polygon") {
        return isPointInsidePolygon(point, geometry.coordinates);
      }

      return geometry.coordinates.some((polygon) => isPointInsidePolygon(point, polygon));
    });

    if (!owningBarangay) {
      throw new GeofencingError("Pinned location is outside supported barangay boundaries.", 400);
    }

    return {
      id: owningBarangay.id,
      code: owningBarangay.code,
      name: owningBarangay.name,
    };
  },

  async findNearbyBarangaysForAlert(
    latitude: number,
    longitude: number,
    owningBarangayCode: string,
    threshold = 15,
  ) {
    if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
      throw new GeofencingError("Valid latitude and longitude are required.", 400);
    }

    await ensureDefaultBoundaries();
    const point: Position = [longitude, latitude];
    const barangays = await listSupportedBarangaysWithBoundary();
    const owningBarangay = barangays.find((barangay) => barangay.code === owningBarangayCode);
    if (!owningBarangay) {
      return [];
    }

    const owningBoundaryDistance = distancePointToGeometryBoundary(
      point,
      parseBoundary(owningBarangay.boundaryGeojson),
    );

    if (owningBoundaryDistance > threshold) {
      return [];
    }

    // When close to the owning boundary, neighboring jurisdiction alerts are informational only.
    return barangays
      .filter((barangay) => barangay.code !== owningBarangayCode)
      .map((barangay) => ({
        id: barangay.id,
        code: barangay.code,
        name: barangay.name,
      }));
  },

  parseError(error: unknown) {
    if (error instanceof GeofencingError) {
      return { status: error.status, message: error.message };
    }

    return { status: 500, message: "Unexpected geofencing error." };
  },
};
