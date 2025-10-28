import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { ItineraryDay } from './types';

const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
    throw new Error("VITE_API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Recommended)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B' },
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]['id'];

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
            latitude: {
              type: Type.NUMBER,
              description: "The geographic latitude of the place."
            },
            longitude: {
              type: Type.NUMBER,
              description: "The geographic longitude of the place."
            },
            category: {
              type: Type.STRING,
              description: "Categorize the place.",
              enum: ['Food', 'Culture', 'Nature', 'Shopping', 'Accommodation', 'Beach', 'Other'],
            }
          },
          required: ["name", "description", "latitude", "longitude", "category"],
        },
      },
    },
    required: ["day", "title", "places"],
  },
};

export const generateItinerary = async (
  prompt: string,
  location: { latitude: number; longitude: number } | null,
  modelId: ModelId = 'gemini-2.0-flash-exp'
): Promise<ItineraryDay[]> => {
  try {
    const fullPrompt = `
      Crea un itinerario de viaje detallado basado en la solicitud del usuario. Responde en español.
      Solicitud del usuario: "${prompt}"
      ${location ? `El usuario se encuentra actualmente en la latitud ${location.latitude} y longitud ${location.longitude}. Usa esto como contexto si la solicitud es sobre lugares cercanos.` : ''}
      El itinerario debe estar desglosado día por día, apropiado para la duración del viaje mencionada en la solicitud.
      Para cada día, proporciona un título o tema conciso para las actividades del día.
      Para cada día, sugiere de 2 a 4 lugares para visitar o actividades.
      Para cada lugar/actividad, proporciona un nombre, una breve descripción (1-2 oraciones), sus coordenadas geográficas precisas (latitud y longitud), y una categoría de las siguientes opciones: 'Food', 'Culture', 'Nature', 'Shopping', 'Accommodation', 'Beach', 'Other'.
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
