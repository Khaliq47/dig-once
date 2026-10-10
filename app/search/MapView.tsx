
"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type WorkLocation = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  description: string;
};

const workLocations: WorkLocation[] = [
  {
    id: 1,
    name: "Sample Digging Site",
    lat: 13.0827,
    lng: 80.2707,
    description: "Example work location in Chennai",
  },
  {
    id: 2,
    name: "Sample Utility Work",
    lat: 13.0569,
    lng: 80.2425,
    description: "Example utility work location",
  },
];

function FixMapSize() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export default function MapView() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [gpsError, setGpsError] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by this browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (location) => {
        setPosition([
          location.coords.latitude,
          location.coords.longitude,
        ]);
        setGpsError("");
      },
      () => {
        setGpsError(
          "Location unavailable. Allow location access in your browser."
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const userIcon = L.divIcon({
    className: "user-location-icon",
    html: '<div style="width:18px;height:18px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 0 7px #2563eb33"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const workIcon = L.divIcon({
    className: "work-location-icon",
    html: '<div style="width:18px;height:18px;background:#dc2626;border:3px solid white;border-radius:50%;box-shadow:0 1px 5px #555"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Live Work Map</h1>
        <p className="text-sm text-gray-600">
          Blue marker: your location · Red markers: work locations
        </p>
      </div>

      {gpsError && (
        <p className="rounded bg-amber-100 p-3 text-sm text-amber-900">
          {gpsError}
        </p>
      )}

      <div className="h-[65vh] min-h-[400px] w-full overflow-hidden rounded-xl border">
        <MapContainer
          center={[13.0827, 80.2707]}
          zoom={12}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <FixMapSize />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {workLocations.map((work) => (
            <Marker
              key={work.id}
              position={[work.lat, work.lng]}
              icon={workIcon}
            >
              <Popup>
                <strong>{work.name}</strong>
                <br />
                {work.description}
              </Popup>
            </Marker>
          ))}

          {position && (
            <Marker position={position} icon={userIcon}>
              <Popup>You are here.</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <p className="text-sm text-gray-600">
        {position
          ? `GPS active: ${position[0].toFixed(5)}, ${position[1].toFixed(5)}`
          : "Waiting for GPS permission..."}
      </p>
    </section>
  );
}