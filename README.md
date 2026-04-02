# ClearPath: Health-First Smart Navigation Ecosystem

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-v18.x-green)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-v18.x-blue)](https://reactjs.org/)
[![Express Version](https://img.shields.io/badge/Express-v5.x-lightgrey)](https://expressjs.com/)

> **ClearPath** is a next-generation navigation engine that prioritizes human health by routing users through areas with the lowest Air Quality Index (AQI). Unlike traditional GPS, ClearPath optimizes for "Cleanest Air" rather than just the "Quickest Route."

---

## 🚀 The Core Innovation: Virtual AI Sensors

The biggest challenge in environmental monitoring is **Hardware Density**. Most cities have fewer than 5 official monitoring stations, creating "blind spots" in navigation data.

**ClearPath solves this by synthesizing an 8-node Virtual Sensor Mesh:**
- **The Concept**: Instead of deploying $50,000 physical sensors, we use **AI Virtual Sensors**.
- **The Logic**: By feeding real-time environmental metadata (humidity, wind speed, traffic density, and proximity to industrial zones) into a Deep Learning model, we predict AQI levels with high confidence at any coordinate.
- **The Result**: Neighborhood-level granular data coverage (500m resolution) without the cost of physical infrastructure.

---

## ✨ Key Features

- **Health-Optimized Routing**: A custom A* implementation that weights paths by pollution exposure.
- **Real-Time AQI Heatmaps**: Dynamic Leaflet/Mapbox overlays showing pollution hotspots.
- **Virtual Sensor Network**: Predictive AI nodes bridging the hardware data gap.
- **Caching Layer**: Redis-integrated backend for low-latency spatial queries.
- **Developer Documentation**: Fully integrated Swagger (OpenAPI) documentation.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Leaflet, Axios, CSS3 (Modular) |
| **Backend** | Node.js, Express (v5), Redis (Caching), FastPriorityQueue |
| **Database** | MongoDB (Mongoose) for spatial indices and user data |
| **Data Engine** | Python (Scikit-Learn/TensorFlow) for AQI predictive modelling |
| **APIs** | OpenStreetMap (via Overpass), OpenWeather, AirVisual |

---

## 🏗️ System Architecture

1.  **Data Ingestion**: Background jobs (`node-cron`) poll official APIs and local virtual sensors.
2.  **Processing**: The ML engine recalibrates predictions based on latest environmental shifts.
3.  **Storage**: MongoDB stores historical data, while Redis handles the "Live" state for routing.
4.  **Client**: The React frontend requests routes while providing a "Health Weight" preference toggle.

---

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas (or local instance)
- Redis Server
- API Keys: OpenWeather, Mapbox (optional)

### Backend Setup
1.  Navigate to the root directory.
2.  Install dependencies: `npm install`
3.  Configure `.env` file (see `.env.example`).
4.  Start the server: `npm run dev`

### Frontend Setup
1.  `cd frontend`
2.  `npm install`
3.  Start development server: `npm start`

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

## ✉️ Contact
**Author** - https://github.com/pKm720
- Project Link: (https://github.com/pKm720/Clear_Path)

---
*Created with ❤️ to help urban commuters breathe better.*
