export interface Day {
  date_offset: number;
  city: string;
  province: string;
  stops: string[];
  overnight_hotel: string;
  drive_time_from_prev_hours: number;
}

export interface Trip {
  id: string;
  title: string;
  days: Day[];
  travellerProfile: string;
  totalCostEstimate: number;
}
