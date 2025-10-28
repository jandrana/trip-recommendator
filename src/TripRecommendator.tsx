import React, { useState, useEffect, useRef } from 'react';
import { generateItinerary, AVAILABLE_MODELS, ModelId } from './geminiService';
import { ItineraryDay, Place, PlaceCategory } from './types';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import L, { Map, LayerGroup, Marker } from 'leaflet';

interface GeolocationState {
  loading: boolean;
  error: GeolocationPositionError | null;
  data: {
    latitude: number;
    longitude: number;
  } | null;
}

const categoryIcons: Record<PlaceCategory, { svg: string, color: string }> = {
  Food: { svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.362-3.797z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214C14.018 4.032 12.042 3 10.5 3v.151c2.138.906 3.9 2.793 4.862 5.063z" /></svg>', color: 'bg-orange-500' },
  Culture: { svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>', color: 'bg-purple-500' },
  Nature: { svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>', color: 'bg-green-500' },
  Shopping: { svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.658-.463 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>', color: 'bg-pink-500' },
  Accommodation: { svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m-3-1l-3-1m-3 1l-3 1M9 3l3 1.5m-3-1.5l-3-1.5m12 0l-3 1.5m0 0l-3-1.5m0 0l3-1.5m-3 1.5l3 1.5" /></svg>', color: 'bg-cyan-500' },
  Beach: { svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22V12M4.5 12C4.5 8.27 7.84 5.25 12 5.25s7.5 3.02 7.5 6.75H4.5z" /></svg>', color: 'bg-yellow-500' },
  Other: { svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>', color: 'bg-gray-500' },
};

const getCategoryIcon = (category: PlaceCategory): L.DivIcon => {
  const iconInfo = categoryIcons[category] || categoryIcons['Other'];
  const iconHtml = `
    <div class="relative flex items-center justify-center w-8 h-8 ${iconInfo.color} rounded-full text-white shadow-lg transform hover:scale-110 transition-transform">
      ${iconInfo.svg}
      <div class="absolute bottom-[-4px] w-3 h-3 ${iconInfo.color} transform rotate-45"></div>
    </div>
  `;
  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 36],
    popupAnchor: [0, -38],
  });
};

const TripRecommendator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>('gemini-2.0-flash-exp');

  const [location, setLocation] = useState<GeolocationState>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    const onEvent = ({ coords }: GeolocationPosition) => {
      setLocation({
        loading: false,
        error: null,
        data: {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
      });
    };

    const onEventError = (error: GeolocationPositionError) => {
      setLocation({
        loading: false,
        error,
        data: null,
      });
    };

    navigator.geolocation.getCurrentPosition(onEvent, onEventError);
    const watchId = navigator.geolocation.watchPosition(onEvent, onEventError);

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);
  const markerRefs = useRef<Record<string, Marker>>({});

  useEffect(() => {
    if (itinerary.length > 0 && mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [20, 0],
        zoom: 2,
        scrollWheelZoom: true,
      });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);
      mapRef.current = map;
      markersRef.current = L.layerGroup().addTo(map);

      setTimeout(() => map.invalidateSize(), 100);
    }
  }, [itinerary]);

  useEffect(() => {
    if (mapRef.current && markersRef.current) {
        markersRef.current.clearLayers();
        markerRefs.current = {};
        const allPlaces = itinerary.flatMap(day => day.places);
        if (allPlaces.length > 0) {
            const markers: Marker[] = [];
            allPlaces.forEach(place => {
              if (place.latitude != null && place.longitude != null) {
                  const icon = getCategoryIcon(place.category);
                  const marker = L.marker([place.latitude, place.longitude], { icon })
                    .bindPopup(`<b>${place.name}</b>`);
                  markersRef.current?.addLayer(marker);
                  markers.push(marker);
                  markerRefs.current[place.name] = marker;
              }
            });
            if (markers.length > 0) {
              const group = L.featureGroup(markers);
              // Auto-zoom to fit all markers with some padding
              setTimeout(() => {
                if (mapRef.current) {
                  mapRef.current.fitBounds(group.getBounds().pad(0.1), { 
                    animate: true,
                    maxZoom: 15
                  });
                }
              }, 100);
            }
        } else if (mapRef.current) {
            mapRef.current.flyTo([20, 0], 2, { animate: true });
        }
    }
  }, [itinerary]);

  const handlePlaceClick = (place: Place) => {
    const marker = markerRefs.current[place.name];
    if (mapRef.current && marker) {
      mapRef.current.flyTo(marker.getLatLng(), 14, { animate: true, duration: 1 });
      marker.openPopup();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setItinerary([]);
    setSearchAttempted(true);

    try {
      const newItinerary = await generateItinerary(prompt, location.data, selectedModel);
      setItinerary(newItinerary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const PlaceCardIcon = ({ category }: { category: PlaceCategory }) => {
    const iconInfo = categoryIcons[category] || categoryIcons['Other'];
    return (
      <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 ${iconInfo.color} rounded-lg text-white`}>
        <div dangerouslySetInnerHTML={{ __html: iconInfo.svg }} />
      </div>
    );
  };
  
  return (
    <div className="flex flex-col items-center justify-center text-center animate-fade-in space-y-8">
      <div className="w-full max-w-3xl">
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">Planifica Tu Viaje</h2>
        <p className="text-lg text-gray-400 mb-8">Describe tu viaje ideal y generaremos con IA un itinerario y un mapa para tu próximo viaje.</p>
      
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Unas relajantes vacaciones de 5 días en el Caribe, priorizando buenas playas y buena comida..."
            className="w-full h-32 p-4 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
          />
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <PaperAirplaneIcon className="w-5 h-5" />
              )}
              {loading ? 'Creando...' : 'Crear Itinerario'}
            </button>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as ModelId)}
              className="w-full sm:w-auto px-4 py-3 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
              disabled={loading}
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        </form>

        {error && <div className="mt-6 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">{error}</div>}
      </div>

      <div className="w-full max-w-7xl">

        {searchAttempted && !loading && itinerary.length === 0 && !error && (
          <div className="p-4 bg-yellow-900/50 border border-yellow-700 text-yellow-300 rounded-lg">
            No se pudo generar un itinerario. Por favor, inténtalo de nuevo con otra descripción.
          </div>
        )}

        {itinerary.length > 0 && !loading && (
          <div className="animate-fade-in text-left">
            <div className="flex flex-col gap-8">
              <div className="h-96 md:h-[50vh] w-full rounded-lg overflow-hidden shadow-lg border border-gray-700 bg-gray-800">
                <div ref={mapContainerRef} className="h-full w-full" style={{zIndex: 0}}/>
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Tu Itinerario</h2>
                <div className="space-y-8">
                  {itinerary.map((day) => (
                    <div key={day.day}>
                      <h3 className="text-lg font-bold text-white mb-3 pb-2 border-b-2 border-gray-700">Día {day.day}: {day.title}</h3>
                      <div className="space-y-4">
                        {day.places.map((place, placeIndex) => (
                          <div 
                            key={placeIndex} 
                            onClick={() => handlePlaceClick(place)}
                            className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-blue-500 cursor-pointer flex items-start gap-4"
                          >
                            <PlaceCardIcon category={place.category} />
                            <div className="flex-1">
                              <h4 className="font-bold text-blue-400">{place.name}</h4>
                              <p className="text-gray-400 text-sm">{place.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripRecommendator;