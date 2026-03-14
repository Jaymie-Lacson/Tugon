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

export const CATEGORY_OPTIONS = REPORT_TAXONOMY.map((item) => item.category);

export function getCategoryTaxonomy(category: ReportCategory) {
  return REPORT_TAXONOMY.find((item) => item.category === category) ?? null;
}
