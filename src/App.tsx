import React from 'react';
import TripRecommendator from './TripRecommendator';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 flex flex-col">
      <header className="bg-gray-800/80 backdrop-blur-sm shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <PaperAirplaneIcon className="w-8 h-8 text-blue-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Trip Recommendator
            </h1>
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <TripRecommendator />
        </div>
      </main>
    </div>
  );
};

export default App;