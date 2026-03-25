export const MEDIATION_WARNING =
  "Filing this report requires both parties to attend a face-to-face mediation hearing at the barangay hall.";

export const REPORT_TAXONOMY = [
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

export const CATEGORY_OPTIONS = REPORT_TAXONOMY.map((item) => item.category);

export function getCategoryTaxonomy(category: ReportCategory) {
  return REPORT_TAXONOMY.find((item) => item.category === category) ?? null;
}
