export const MEDIATION_WARNING =
  "Filing this report requires both parties to attend a face-to-face mediation hearing at the barangay hall.";

export const REPORT_TAXONOMY = [
  {
    category: "Garbage and Sanitation",
    requiresMediation: false,
    subcategories: ["Uncollected trash", "Illegal dumping", "Clogged canals", "Dead animals"],
  },
  {
    category: "Public Disturbance",
    requiresMediation: false,
    subcategories: ["Loud noises or late-night karaoke", "Drinking in public streets", "Loitering"],
  },
  {
    category: "Road and Street Issues",
    requiresMediation: false,
    subcategories: ["Broken streetlights", "Illegal parking", "Blocked sidewalks", "Potholes"],
  },
  {
    category: "Hazards and Safety",
    requiresMediation: false,
    subcategories: ["Dangling or sparking electric wires", "Stray or aggressive animals", "Fire hazards"],
  },
  {
    category: "Neighbor Disputes / Lupon",
    requiresMediation: true,
    mediationWarning: MEDIATION_WARNING,
    subcategories: [
      "Petty quarrels and fighting",
      "Unpaid personal debts",
      "Gossip and slander",
      "Property boundary disputes",
    ],
  },
  {
    category: "Others",
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
