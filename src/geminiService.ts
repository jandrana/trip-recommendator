import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { ItineraryDay } from './types';

const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
    throw new Error("VITE_API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash'},
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]['id'];

// Free geocoding using Nominatim (OpenStreetMap)
// Rate limit: 1 request per second
const geocodeWithNominatim = async (
  placeName: string, 
  address: string
): Promise<{ lat: number; lon: number } | null> => {
  try {
    // Extract postal code if present
    const postalCodeMatch = address.match(/\b\d{5}\b/);
    const postalCode = postalCodeMatch ? postalCodeMatch[0] : null;
    
    // Better city extraction - look for city/town before postal code or at end
    // Common patterns: "City, Province, PostalCode" or "Street, City, PostalCode"
    let city = null;
    
    // Try to extract city before postal code
    if (postalCode) {
      const beforePostal = address.split(postalCode)[0];
      const parts = beforePostal.split(',').map(p => p.trim()).filter(p => p.length > 0);
      // Get the last meaningful part (usually the city)
      city = parts.length > 0 ? parts[parts.length - 1] : null;
    }
    
    // Fallback: get last part after last comma
    if (!city) {
      const parts = address.split(',').map(p => p.trim()).filter(p => p.length > 0);
      city = parts.length > 0 ? parts[parts.length - 1] : null;
    }
    
    // Extract country (usually the last part)
    const countryMatch = address.match(/,\s*([A-Za-zá-úÁ-Ú]+)\s*$/);
    const country = countryMatch ? countryMatch[1] : null;
    
    // Strategy 1: Place name + city + postal code + country (most specific)
    if (city && postalCode && country) {
      const query1 = `${placeName}, ${city}, ${postalCode}, ${country}`;
      const result1 = await tryGeocode(query1);
      if (result1) {
        console.log(`✓ Geocoded with strategy 1 (name+city+postal+country): "${query1}"`);
        return result1;
      }
    }
    
	// Strategy 2: Address (without place name)
	if (address) {
	const result2 = await tryGeocode(address);
		if (result2) {
			console.log(`✓ Geocoded with strategy 2 (address): "${address}"`);
			return result2;
		}
	}

    console.warn(`No geocoding results found for "${placeName}" at "${address}"`);
    return null;
  } catch (error) {
    console.error(`Error geocoding "${placeName}":`, error);
    return null;
  }
};

// Helper function to try a single geocoding query
const tryGeocode = async (query: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'TripRecommendator/1.0'
        }
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.length > 0 && data[0].lat && data[0].lon) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

// Helper to add delay between requests (respect rate limits)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const itinerarySchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      day: {
        type: Type.INTEGER,
        description: "The day number of the itinerary, starting from 1."
      },
      title: {
        type: Type.STRING,
        description: "A concise title or theme for the day's activities."
      },
      places: {
        type: Type.ARRAY,
        description: "A list of places to visit or activities for the day.",
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "The name of the place or activity."
            },
            description: {
              type: Type.STRING,
              description: "A short, 1-2 sentence description of the place or activity."
            },
            address: {
              type: Type.STRING,
              description: "Full address including street (if applicable), city name, postal code (5 digits), and country. MUST always include city and postal code. Format: 'Street, City, PostalCode, Country'"
            },
            latitude: {
              type: Type.NUMBER,
              description: "The geographic latitude of the place. Must be accurate and based on real location data."
            },
            longitude: {
              type: Type.NUMBER,
              description: "The geographic longitude of the place. Must be accurate and based on real location data."
            },
            category: {
              type: Type.STRING,
              description: "Categorize the place.",
              enum: ['Food', 'Culture', 'Nature', 'Shopping', 'Accommodation', 'Beach', 'Other'],
            }
          },
          required: ["name", "description", "address", "latitude", "longitude", "category"],
        },
      },
    },
    required: ["day", "title", "places"],
  },
};

export const generateItinerary = async (
  prompt: string,
  _location: { latitude: number; longitude: number } | null,
  modelId: ModelId = 'gemini-2.0-flash-exp'
): Promise<ItineraryDay[]> => {
  try {
    const fullPrompt = `
      Crea un itinerario de viaje detallado basado en la solicitud del usuario. Responde en español.
      Solicitud del usuario: "${prompt}"
      
      El itinerario debe estar desglosado día por día, apropiado para la duración del viaje mencionada en la solicitud.
      Para cada día, proporciona un título o tema conciso para las actividades del día.
      Para cada día, sugiere de 2 a 4 lugares para visitar o actividades.
      
      IMPORTANTE - Para cada lugar/actividad:
      1. Proporciona el NOMBRE COMPLETO y OFICIAL del lugar (tal como aparece en mapas)
      2. Breve descripción (1-2 oraciones)
      3. DIRECCIÓN COMPLETA: OBLIGATORIO incluir:
         - Calle o dirección específica (si aplica)
         - CIUDAD (nombre de la ciudad donde está ubicado el lugar)
         - CÓDIGO POSTAL (5 dígitos, siempre requerido)
         - País
         Formato ejemplo: "Calle Principal 123, Málaga, 29001, España" o "Playa de Burriana, Nerja, 29780, España"
      4. COORDENADAS PRECISAS: Proporciona la latitud y longitud EXACTAS del lugar. Usa tus conocimientos geográficos para proporcionar coordenadas lo más precisas posible basándote en la ubicación real del lugar. Por ejemplo:
         - Torre Eiffel, París: 48.8584, 2.2945
         - Sagrada Familia, Barcelona: 41.4036, 2.1744
         - Central Park, Nueva York: 40.7829, -73.9654
      5. Categoría: 'Food', 'Culture', 'Nature', 'Shopping', 'Accommodation', 'Beach', 'Other'
      
      CRÍTICO: La dirección DEBE incluir siempre el nombre de la ciudad y el código postal. Sin estos datos, la geolocalización fallará.
      Las coordenadas deben ser lo suficientemente precisas para ubicar el lugar en un mapa. Usa tu conocimiento de geografía mundial para proporcionar coordenadas reales y exactas.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelId,
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: itinerarySchema,
        }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No se recibió respuesta del modelo de IA.");
    }
    const itinerary = JSON.parse(text);

    for (const day of itinerary) {
      for (const place of day.places) {
        // Try geocoding with Nominatim first, passing both name and address
        const geocoded = await geocodeWithNominatim(place.name, place.address);
        
        if (geocoded) {
          // Use geocoded coordinates (more accurate)
          place.latitude = geocoded.lat;
          place.longitude = geocoded.lon;
          console.log(`✓ Geocoded "${place.name}": ${geocoded.lat}, ${geocoded.lon}`);
        } else {
          // Fallback to Gemini's coordinates
          console.log(`⚠ Using AI coordinates for "${place.name}": ${place.latitude}, ${place.longitude}`);
        }
        
        // Respect Nominatim rate limit: 1 request per second
        await delay(1100);
      }
    }

    return itinerary;
  } catch (error: any) {
    console.error("Error generating itinerary:", error);
    
    // Check if it's an overload error (503)
    if (error?.message?.includes('overloaded') || error?.message?.includes('503')) {
      throw new Error("El modelo está sobrecargado en este momento. Por favor, intenta nuevamente en unos segundos o selecciona otro modelo.");
    }
    
    if (error instanceof SyntaxError) {
      throw new Error("No se pudo generar el itinerario de viaje. El modelo devolvió un formato JSON no válido.");
    }
    
    throw new Error("No se pudo generar el itinerario de viaje. Ocurrió un error inesperado.");
  }
};
