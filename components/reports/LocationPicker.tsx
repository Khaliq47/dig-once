"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from "react-leaflet";

type Props = {
  value: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
  center?: [number, number];
};

function Clicker({ onPick }: { onPick: Props["onPick"] }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ value }: { value: Props["value"] }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.setView([value.lat, value.lng], Math.max(map.getZoom(), 17));
  }, [value, map]);
  return null;
}

export default function LocationPicker({ value, onPick, center = [13.0827, 80.2707] }: Props) {
  return (
    <MapContainer
      center={value ? [value.lat, value.lng] : center}
      zoom={value ? 17 : 14}
      className="h-64 w-full rounded-lg"
      aria-label="Map. Tap to place a pin where the problem is."
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Clicker onPick={onPick} />
      <Recenter value={value} />
      {value && (
        <CircleMarker center={[value.lat, value.lng]} radius={10}
          pathOptions={{ color: "#be123c", fillColor: "#e11d48", fillOpacity: 0.8 }} />
      )}
    </MapContainer>
  );
}
