import { create } from 'zustand';
import { Day, Stop } from '../types';

export interface SurveyState {
  ageRange: string;
  accessibilityNeeds: string[];
  groupComposition: string;
  tripDuration: number;
  budgetPerPerson: string;
  luggageAmount: string;
  startingCity: { name: string; coordinates?: [number, number] } | null;

  // Results from AI Step 1
  travellerArchetype: string | null;
  recommendedProvinces: string[];

  // Preferences Phase
  activities: string[];
  dreamTrip: string;

  // Final Itinerary
  itinerary: Day[];

  // Phase 4b: Street View coverage cache keyed by stopId
  streetViewCoverage: Record<string, boolean>;

  // Phase 5: Immersive view state
  immersiveConfig: { stop: Stop; time: string; season: string } | null;

  // Actions
  setField: <K extends keyof Omit<SurveyState, 'setField' | 'resetSurvey'>>(
    field: K,
    value: SurveyState[K]
  ) => void;
  resetSurvey: () => void;
}

const initialState = {
  ageRange: '',
  accessibilityNeeds: [],
  groupComposition: '',
  tripDuration: 7,
  budgetPerPerson: '',
  luggageAmount: '',
  startingCity: null,
  travellerArchetype: null,
  recommendedProvinces: [],
  activities: [],
  dreamTrip: '',
  itinerary: [],
  streetViewCoverage: {},
  immersiveConfig: null,
};

export const useSurveyStore = create<SurveyState>()((set) => ({
  ...initialState,

  setField: (field, value) => set((state) => ({ ...state, [field]: value })),
  resetSurvey: () => set(initialState),
}));
