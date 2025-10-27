export type PlaceCategory = 'Food' | 'Culture' | 'Nature' | 'Shopping' | 'Accommodation' | 'Beach' | 'Other';

export interface Place {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
}

export interface ItineraryDay {
  day: number;
  title: string;
  places: Place[];
}