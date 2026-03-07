export interface Stop {
  name: string;
  type: 'park' | 'restaurant' | 'hotel' | 'attraction' | 'other';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Day {
  date_offset: number;
  city: string;
  city_coordinates: [number, number]; // [longitude, latitude]
  province: string;
  stops: Stop[];
  overnight_hotel: string;
  travel_time_from_prev_hours: number;
  travel_method_from_prev: 'flight' | 'drive' | 'train' | 'boat' | 'none';
}

export interface Trip {
  id: string;
  title: string;
  days: Day[];
  travellerProfile: string;
  totalCostEstimate: number;
}
