const SQUARE_251 = {
  type: "Polygon",
  coordinates: [
    [
      [120, 80],
      [220, 80],
      [220, 220],
      [120, 220],
      [120, 80],
    ],
  ],
};

const SQUARE_252 = {
  type: "Polygon",
  coordinates: [
    [
      [220, 80],
      [320, 80],
      [320, 220],
      [220, 220],
      [220, 80],
    ],
  ],
};

const SQUARE_256 = {
  type: "Polygon",
  coordinates: [
    [
      [320, 80],
      [420, 80],
      [420, 220],
      [320, 220],
      [320, 80],
    ],
  ],
};

export const defaultBarangayBoundaries = [
  {
    code: "251",
    name: "Barangay 251",
    boundaryGeojson: JSON.stringify(SQUARE_251),
  },
  {
    code: "252",
    name: "Barangay 252",
    boundaryGeojson: JSON.stringify(SQUARE_252),
  },
  {
    code: "256",
    name: "Barangay 256",
    boundaryGeojson: JSON.stringify(SQUARE_256),
  },
] as const;
