import { create } from 'zustand';

export interface SurveyState {
  ageRange: string;
  accessibilityNeeds: string[];
  groupComposition: string;
  tripDuration: number;
  budgetPerPerson: string;
  luggageAmount: string;
  startingCity: { name: string; coordinates?: [number, number] } | null;
  
  // Results from AI
  travellerArchetype: string | null;
  recommendedProvinces: string[];

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
};

export const useSurveyStore = create<SurveyState>()((set) => ({
  ...initialState,
  
  setField: (field, value) => set((state) => ({ ...state, [field]: value })),
  resetSurvey: () => set(initialState),
}));
