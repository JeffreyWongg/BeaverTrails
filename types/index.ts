export interface Stop {
  id?: string;
  name: string;
  type: 'park' | 'restaurant' | 'hotel' | 'attraction' | 'airport' | 'other';
  coordinates: [number, number]; // [longitude, latitude]
  description?: string; // Short 1-2 sentence description
  address?: string;
  estimatedCost?: string;
  notes?: string;
}

export interface Day {
  date_offset: number;
  city: string;
  city_coordinates: [number, number]; // [longitude, latitude]
  province: string;
  stops: Stop[];
  overnight_hotel: string;
  overnight_hotel_coordinates?: [number, number]; // [longitude, latitude]
  airport?: {
    name: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  travel_time_from_prev_hours: number;
  travel_method_from_prev: 'flight' | 'drive' | 'train' | 'boat' | 'none';
}

export interface TikTokClip {
  url: string;
  caption?: string;
  summary?: string; // AI-generated location summary
}

export interface Trip {
  id: string;
  title: string;
  days: Day[];
  travellerProfile: string;
  totalCostEstimate: number;
  budgetTier?: string;
}

export interface CostEstimate {
  day: number;
  city: string;
  accommodationLow: number;
  accommodationHigh: number;
  foodLow: number;
  foodHigh: number;
  transport: number;
  activities: number;
}
