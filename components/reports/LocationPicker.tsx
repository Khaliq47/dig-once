"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, GeoJSON, useMap, useMapEvents } from "react-leaflet";

type Props = {
  value: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
  center?: [number, number];
  geometry?: any; // GeoJSON of the project, drawn so people know where to tap
};

function Clicker({ onPick }: { onPick: Props["onPick"] }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ value, center }: { value: Props["value"]; center?: [number, number] }) {
  const map = useMap();
  const cLat = center?.[0], cLng = center?.[1];
  useEffect(() => {
    if (value) map.setView([value.lat, value.lng], Math.max(map.getZoom(), 17));
    else if (cLat !== undefined && cLng !== undefined) map.setView([cLat, cLng], 17);
  }, [value, cLat, cLng, map]);
  return null;
}

export default function LocationPicker({ value, onPick, center, geometry }: Props) {
  const start: [number, number] = center ?? [12.937, 77.62];
  return (
    <MapContainer
      center={value ? [value.lat, value.lng] : start}
      zoom={value ? 17 : 14}
      className="h-64 w-full rounded-lg"
      aria-label="Map. Tap to place a pin where the problem is."
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Clicker onPick={onPick} />
      <Recenter value={value} center={center} />
      {geometry && (
        <GeoJSON key={JSON.stringify(geometry).slice(0, 200)} data={geometry}
          pathOptions={{ color: "#2563eb", weight: 6, opacity: 0.8 }} />
      )}
      {value && (
        <CircleMarker center={[value.lat, value.lng]} radius={10}
          pathOptions={{ color: "#be123c", fillColor: "#e11d48", fillOpacity: 0.8 }} />
      )}
    </MapContainer>
  );
}
