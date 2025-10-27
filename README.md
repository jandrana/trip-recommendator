# Trip Recommendator

A web application that generates personalized travel itineraries using Google's Gemini AI. The app provides intelligent trip recommendations with interactive maps, categorized places, and trip itineraries.

## Features

- 🤖 **AI-Powered Recommendations**: Leverages Google Gemini AI to generate personalized travel itineraries
- 🗺️ **Interactive Maps**: Built with Leaflet for visualizing trip locations
- 📱 **Responsive Design**: Modern React/TypeScript interface with Tailwind CSS styling
- 🏷️ **Categorized Places**: Organized by Food, Culture, Nature, Shopping, Accommodation, Beach, and more
- 🌍 **Geolocation Support**: Automatically detects user location for relevant recommendations
- 🐳 **Docker Support**: Easy deployment with Docker and Docker Compose

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Maps**: Leaflet
- **AI**: Google Gemini API
- **Build Tool**: Vite
- **Container**: Docker & Docker Compose

## Prerequisites

Before running this application, make sure you have:

- **Node.js** (version 18 or higher)
- **npm** or **yarn**
- **Docker** and **Docker Compose** (for containerized deployment)
- **Google Gemini API Key** (for AI recommendations)

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/jandrana/trip-recommendator.git
cd trip-recommendator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory and add your Google Gemini API key:

You can use the provided `.env.template` as a starting point:

```bash
cp .env.template .env
```

Then, edit the `.env` and replace `your_gemini_api_key_here` with your actual API key

> **Note**: Get your API key from [Google AI Studio](https://aistudio.google.com/api-keys)

## Running the Application

```bash
# Start the application
docker-compose up -d --build

# Stop the application
docker-compose down

# Stop and clean up (removes containers, networks, and volumes)
docker-compose down --volumes

# Clean up unused Docker resources
docker system prune -a --volumes
```

## Accessing the Application

Once the application is running, you can access it at: [http://localhost:3000](http://localhost:3000)

## How to Use

1. **Allow Location Access**: Grant permission for geolocation to get personalized recommendations
2. **Enter Trip Destination and Preferences**: Specify where you want to travel along with your preferences
3. **Generate Itinerary**: Click to generate your AI-powered travel plan
4. **Explore Map**: View recommended places on the interactive map
5. **Review Schedule**: Check your day-by-day itinerary

## Project Structure

```
trip-recommendator/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── TripRecommendator.tsx
│   ├── geminiService.ts
│   ├── types.ts
│   ├── vite-env.d.ts
│   └── icons/
├── index.html
├── .env.template
├── docker-compose.yml
├── Dockerfile
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## API Integration

This application uses Google's Gemini AI API for generating travel recommendations. Make sure to:

1. Obtain an API key from Google AI Studio at [Google AI Studio](https://aistudio.google.com/)
2. Add the key to your `.env` file

**Happy Traveling! 🌍✈️**