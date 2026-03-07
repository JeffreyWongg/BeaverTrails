export interface Day {
  id: string;
  date?: string;
  activities?: string[];
  description?: string;
}

export interface Trip {
  id: string;
  title: string;
  days: Day[];
  travellerProfile: string;
  totalCostEstimate: number;
}
