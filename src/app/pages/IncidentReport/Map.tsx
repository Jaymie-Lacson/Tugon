import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TONDO_MAP_CENTER, TONDO_MAP_BOUNDS } from './shared';
import type { LatLng } from './types';

interface Props {
  height: number | string;
  tileUrl: string;
  tileAttribution: string;
  allowedBarangays: Array<{ code: string; name: string; boundary: LatLng[] }>;
  pin: { lat: number; lng: number; barangay: string } | null;
  onMapClick: (lat: number, lng: number) => void;
  pinLabel: string;
  boundaryBounds: [LatLng, LatLng];
}

function MapClickCapture({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (event) => {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function FitToBoundaryBounds({ bounds }: { bounds: [LatLng, LatLng] }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, bounds]);
  return null;
}

export default function IncidentReportMap({
  height,
  tileUrl,
  tileAttribution,
  allowedBarangays,
  pin,
  onMapClick,
  pinLabel,
  boundaryBounds,
}: Props) {
  return (
    <MapContainer
      className="incident-step2-map block w-full"
      center={TONDO_MAP_CENTER}
      zoom={18}
      minZoom={17}
      maxZoom={22}
      maxBounds={TONDO_MAP_BOUNDS}
      maxBoundsViscosity={1}
      style={{ height }}
    >
      <TileLayer
        key={tileUrl}
        attribution={tileAttribution}
        url={tileUrl}
        maxNativeZoom={20}
        maxZoom={22}
      />

      {allowedBarangays.map((barangay) => (
        <Polygon
          key={barangay.code}
          positions={barangay.boundary}
          pathOptions={{
            color: pin?.barangay === barangay.name ? 'var(--severity-critical)' : 'var(--primary)',
            weight: pin?.barangay === barangay.name ? 5 : 4,
            dashArray: '10 6',
            fillColor: '#93C5FD',
            fillOpacity: pin?.barangay === barangay.name ? 0.26 : 0.18,
          }}
        >
          <Tooltip direction="center" permanent sticky>
            {barangay.name}
          </Tooltip>
        </Polygon>
      ))}

      <FitToBoundaryBounds bounds={boundaryBounds} />
      <MapClickCapture onMapClick={onMapClick} />

      {pin && (
        <CircleMarker
          center={[pin.lat, pin.lng]}
          radius={8}
          pathOptions={{ color: 'var(--severity-critical)', fillColor: 'var(--severity-critical)', fillOpacity: 1 }}
        >
          <Tooltip direction="top" offset={[0, -8]} permanent>
            {pinLabel}
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
