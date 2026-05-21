import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FCODE_META, COUNTRY_META, elevClass, elevColor } from '../lib/utils';

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function MapBounds({ items }) {
  const map = useMap();
  useEffect(() => {
    if (items.length > 0) {
      const group = L.featureGroup(items.map(i => L.marker([i.lat, i.lon])));
      map.fitBounds(group.getBounds().pad(0.05), { maxZoom: 9 });
    }
  }, [items, map]);
  return null;
}

export default function MapView({ mountains, provider, gmapsReady, gmapsKey, onInitGmaps, onSelect, theme }) {
  const mapRef = useRef(null);
  const [center, setCenter] = useState([12.5, 104.5]);
  const [zoom, setZoom] = useState(7);
  const gmapDivRef = useRef(null);
  const gmapInstanceRef = useRef(null);
  const gmarkersRef = useRef([]);
  const gmapInfoRef = useRef(null);

  const osmItems = provider === 'osm' ? mountains.slice(0, 500) : [];

  const darkGMapStyles = [
    { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#eaeaee' }] },
    { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#16162a' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1a3a' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  ];

  // Initialize Google Maps
  useEffect(() => {
    if (provider !== 'gmaps' || !gmapsKey) return;
    if (gmapsReady && gmapDivRef.current && !gmapInstanceRef.current) {
      try {
        gmapInstanceRef.current = new window.google.maps.Map(gmapDivRef.current, {
          center: { lat: 12.5, lng: 104.5 },
          zoom: 7,
          mapTypeId: 'terrain',
          styles: theme === 'dark' ? darkGMapStyles : [],
        });
      } catch (e) {
        console.error('GMap init error', e);
      }
    }
  }, [provider, gmapsReady, gmapsKey, theme]);

  // Update Google Maps theme reactively
  useEffect(() => {
    if (gmapInstanceRef.current) {
      gmapInstanceRef.current.setOptions({
        styles: theme === 'dark' ? darkGMapStyles : [],
      });
    }
  }, [theme]);

  // Update Google Maps markers
  useEffect(() => {
    if (provider !== 'gmaps' || !gmapInstanceRef.current || !gmapsReady) return;
    gmarkersRef.current.forEach(m => m.setMap(null));
    gmarkersRef.current = [];

    const items = mountains.slice(0, 500);
    items.forEach((m) => {
      const col = elevColor(m.elev);
      const marker = new window.google.maps.Marker({
        position: { lat: m.lat, lng: m.lon },
        map: gmapInstanceRef.current,
        title: m._name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: m.fcode === 'MT' ? 8 : m.fcode === 'PK' ? 7 : 5,
          fillColor: col,
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: 1.5,
        },
      });
      marker.addListener('click', () => {
        onSelect(m);
      });
      gmarkersRef.current.push(marker);
    });

    if (items.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      items.forEach(m => bounds.extend({ lat: m.lat, lng: m.lon }));
      gmapInstanceRef.current.fitBounds(bounds, 40);
    }
  }, [mountains, provider, gmapsReady, onSelect]);

  // Invalidate map size when switching provider
  useEffect(() => {
    if (provider === 'osm' && mapRef.current) {
      setTimeout(() => mapRef.current.invalidateSize(), 200);
    }
    if (provider === 'gmaps' && gmapInstanceRef.current) {
      setTimeout(() => window.google.maps.event.trigger(gmapInstanceRef.current, 'resize'), 200);
    }
  }, [provider]);

  const handleGmapsLoad = useCallback(() => {
    onInitGmaps();
  }, [onInitGmaps]);

  // Dynamically load Google Maps script
  useEffect(() => {
    if (!gmapsKey || typeof window.google !== 'undefined') return;
    const existing = document.querySelector('script[data-gmaps]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${gmapsKey}&loading=async&libraries=places&callback=onGmapsReactReady`;
    script.async = true;
    script.defer = true;
    script.dataset.gmaps = '1';
    script.onerror = () => console.error('GMaps load error');
    window.onGmapsReactReady = () => {
      onInitGmaps();
    };
    document.head.appendChild(script);
  }, [gmapsKey, onInitGmaps]);

  const focusMap = useCallback((lat, lon, z = 12) => {
    if (provider === 'osm') {
      setCenter([lat, lon]);
      setZoom(z);
    } else if (gmapInstanceRef.current && gmapsReady) {
      gmapInstanceRef.current.setCenter({ lat, lng: lon });
      gmapInstanceRef.current.setZoom(z);
    }
  }, [provider, gmapsReady]);

  return (
    <div className="relative h-full w-full">
      {provider === 'osm' && (
        <MapContainer
          center={center}
          zoom={zoom}
          zoomControl={true}
          attributionControl={true}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(map) => { mapRef.current = map; }}
        >
          <MapController center={center} zoom={zoom} />
          <TileLayer
            key={theme}
            attribution={theme === 'dark' ? '&copy; <a href="https://carto.com/">CARTO</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' : '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'}
            url={theme === 'dark' ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            maxZoom={18}
          />
          {osmItems.map((m) => {
            const col = elevColor(m.elev);
            const radius = m.fcode === 'MT' ? 7 : m.fcode === 'PK' ? 6 : 5;
            return (
              <CircleMarker
                key={m.id}
                center={[m.lat, m.lon]}
                radius={radius}
                pathOptions={{ fillColor: col, color: '#fff', weight: 1.5, fillOpacity: 0.85 }}
                eventHandlers={{
                  click: () => onSelect(m),
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{m._name}</strong><br />
                    {m.elev ? `${m.elev}m` : m.dem ? `${m.dem}m` : '—'}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
          <MapBounds items={osmItems} />
        </MapContainer>
      )}

      {provider === 'gmaps' && (
        <div className="h-full w-full relative">
          {!gmapsReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-secondary)] bg-[var(--bg)] z-10">
              <div className="w-8 h-8 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin mb-2" />
              <span className="text-sm">Loading Google Maps…</span>
            </div>
          )}
          {!gmapsKey && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-secondary)] bg-[var(--bg)] z-10 p-6 text-center">
              <MapPin className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Set your Google Maps API key in the menu ☰</p>
            </div>
          )}
          <div ref={gmapDivRef} className="h-full w-full" />
        </div>
      )}
    </div>
  );
}
