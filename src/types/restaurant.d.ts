// Type-only declarations describing the normalized restaurant shapes.
// Colocated for future TS migration; not imported from any .js file.
// This project is plain JS (CRA, react-scripts 5) — no tsconfig/typescript
// dependency is required for this file to exist.

export interface Structure {
  concept: string; // default: "Bistro moderne & cuisine locale"
  location: string; // default: "Lyon, France"
  capacity: number; // default: 92
  seats: number; // default: capacity
  materials: string[]; // default: []
  equipment: string[]; // default: []
  floors?: number; // default: 1
  sections?: string[]; // default: ["main"]
  layout?: string; // default: "standard"
  openingHours?: string; // default: ""
}

export interface Finance {
  day?: number | string;
  months: Record<string, number>; // jan..dec keys, default: all 0
  revenue: number[]; // default: 6 values
  costs: number[]; // default: 6 values
  payroll: number; // default: 9800
  fixedCosts: number; // default: 6200
  rent: number; // default: 4600
  taxes: number | number[]; // default: 20
  waste?: number[];
  energy?: number[];
  energyCost?: number[];
}

export interface MarketingChannel {
  id: number | string;
  name: string;
  enabled: boolean;
  budget: number;
  reach: number;
}

export interface MarketingCampaign {
  id: number | string;
  name: string;
  objective: string;
  status: "draft" | "active" | "paused" | string;
  budget: number;
  conversion: number;
}

export interface Marketing {
  budget: number; // default: 1800
  positioning: string; // default: "Cuisine locale, service chaleureux"
  channels: MarketingChannel[]; // default: 3 channels
  campaigns: MarketingCampaign[]; // default: 1 campaign
  roi?: number; // default: 0
  visibility?: number; // default: 0
}

export interface ESG {
  wasteReduction: number; // default: 35
  localSourcing: number; // default: 60
  energyEfficiency: number; // default: 40
  staffWellbeing: number; // default: 70
  certifications: string[]; // default: []
  monthlyInvestment: number; // default: 900
}

export interface Progression {
  xp: number; // default: 0
  completedTutorials: string[]; // default: []
  unlockedAchievements: string[]; // default: []
  difficulty: "easy" | "normal" | "hard" | "expert" | string; // default: "easy"
  cycles: number; // default: 0
}

export interface Establishment {
  id: number | string;
  name: string;
  city: string;
  capacity: number;
  status: "active" | "planned" | "paused" | string;
  manager: string;
}

export interface Expansion {
  establishments: Establishment[];
  pipeline: unknown[];
  availableCapital: number; // default: 120000
}

export interface Restaurant {
  structure: Structure;
  finance: Finance;
  staff: unknown[];
  menu: unknown[];
  operations: unknown[];
  marketing: Marketing;
  esg: ESG;
  expansion: Expansion;
  progression: Progression;
  pmsContext?: {
    hotelOccupancy: number;
    activeGuests: number;
    housekeepingIssues: number;
    scheduledEvents: number;
    processedEventIds: (number | string)[];
  };
}
