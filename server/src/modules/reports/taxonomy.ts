export const MEDIATION_WARNING =
  "Filing this report requires both parties to attend a face-to-face mediation hearing at the barangay hall.";

export const REPORT_TAXONOMY = [
  {
    category: "Fire",
    requiresMediation: false,
    subcategories: ["Structural fire", "Electrical fire hazard", "Open burning", "Gas leak or flammable risk"],
  },
  {
    category: "Pollution",
    requiresMediation: false,
    subcategories: [
      "Air pollution (smoke or fumes)",
      "Water contamination",
      "Illegal dumping or waste",
      "Blocked drainage or unsanitary area",
    ],
  },
  {
    category: "Noise",
    requiresMediation: false,
    subcategories: [
      "Loud music or karaoke",
      "Construction noise",
      "Street disturbance noise",
      "Animal-related noise",
    ],
  },
  {
    category: "Crime",
    requiresMediation: false,
    subcategories: ["Theft or robbery", "Assault or physical altercation", "Vandalism", "Suspicious activity"],
  },
  {
    category: "Road Hazard",
    requiresMediation: false,
    subcategories: ["Potholes", "Broken streetlights", "Blocked sidewalks", "Road obstruction or illegal parking"],
  },
  {
    category: "Other",
    requiresMediation: false,
    subcategories: ["Unlisted general issues"],
  },
] as const;

export type ReportCategory = (typeof REPORT_TAXONOMY)[number]["category"];

export type ReportSubcategory = (typeof REPORT_TAXONOMY)[number]["subcategories"][number];

const CATEGORY_SET = new Set<string>(REPORT_TAXONOMY.map((item) => item.category));
const SUBCATEGORY_SET = new Set<string>(REPORT_TAXONOMY.flatMap((item) => item.subcategories));
const CATEGORY_TO_SUBCATEGORIES = new Map<string, Set<string>>(
  REPORT_TAXONOMY.map((item) => [item.category, new Set(item.subcategories)]),
);

export function isValidReportCategory(category: string): category is ReportCategory {
  return CATEGORY_SET.has(category);
}

export function isValidReportSubcategory(subcategory: string): subcategory is ReportSubcategory {
  return SUBCATEGORY_SET.has(subcategory);
}

export function isValidCategorySubcategoryPair(category: string, subcategory: string): boolean {
  const allowed = CATEGORY_TO_SUBCATEGORIES.get(category);
  return Boolean(allowed && allowed.has(subcategory));
}

export function getCategoryMetadata(category: ReportCategory): {
  requiresMediation: boolean;
  mediationWarning: string | null;
} {
  const item = REPORT_TAXONOMY.find((entry) => entry.category === category);
  if (!item) {
    return {
      requiresMediation: false,
      mediationWarning: null,
    };
  }

  return {
    requiresMediation: item.requiresMediation,
    mediationWarning: item.requiresMediation ? MEDIATION_WARNING : null,
  };
}
