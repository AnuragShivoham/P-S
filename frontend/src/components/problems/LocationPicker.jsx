import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, Shield, CheckCircle2, Loader2 } from 'lucide-react';

export default function LocationPicker({ value, onChange, privacyLevel, onPrivacyChange }) {
  const [lat, setLat] = useState(value?.latitude || 28.6139);
  const [lng, setLng] = useState(value?.longitude || 77.2090);
  const [address, setAddress] = useState(value?.formatted_address || '');
  const [district, setDistrict] = useState(value?.district || '');
  const [state, setState] = useState(value?.state || '');
  const [country, setCountry] = useState(value?.country || 'India');
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locating, setLocating] = useState(false);

  // Sync internal state with external prop changes
  useEffect(() => {
    if (value) {
      if (value.latitude) setLat(value.latitude);
      if (value.longitude) setLng(value.longitude);
      if (value.formatted_address) setAddress(value.formatted_address);
      if (value.district) setDistrict(value.district);
      if (value.state) setState(value.state);
      if (value.country) setCountry(value.country);
    }
  }, [value]);

  // Reverse geocode lat/lng to human-readable address & district via Nominatim
  const reverseGeocode = async (latitude, longitude) => {
    try {
      setSearching(true);
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await res.json();
      if (data && data.address) {
        const addr = data.display_name || '';
        const dist = data.address.state_district || data.address.district || data.address.county || data.address.city || '';
        const st = data.address.state || '';
        const ctry = data.address.country || 'India';

        setAddress(addr);
        setDistrict(dist);
        setState(st);
        setCountry(ctry);

        onChange({
          latitude,
          longitude,
          formatted_address: addr,
          district: dist,
          state: st,
          country: ctry
        });
      }
    } catch (e) {
      console.warn('[LocationPicker] Reverse geocode failed:', e);
    } finally {
      setSearching(false);
    }
  };

  // Forward search for a location query
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const newLat = parseFloat(item.lat);
        const newLng = parseFloat(item.lon);
        setLat(newLat);
        setLng(newLng);
        const dist = item.address?.state_district || item.address?.district || item.address?.city || '';
        const st = item.address?.state || '';
        const ctry = item.address?.country || 'India';

        setAddress(item.display_name);
        setDistrict(dist);
        setState(st);
        setCountry(ctry);

        onChange({
          latitude: newLat,
          longitude: newLng,
          formatted_address: item.display_name,
          district: dist,
          state: st,
          country: ctry
        });
      }
    } catch (e) {
      console.warn('[LocationPicker] Search failed:', e);
    } finally {
      setSearching(false);
    }
  };

  // GPS "Use My Location"
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setLat(newLat);
        setLng(newLng);
        setLocating(false);
        reverseGeocode(newLat, newLng);
      },
      (err) => {
        setLocating(false);
        alert('Could not access your location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle map click
  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Map click simulation within delta bounding box around current center
    const latDelta = (0.5 - (y / rect.height)) * 0.08;
    const lngDelta = ((x / rect.width) - 0.5) * 0.08;
    const newLat = Number((lat + latDelta).toFixed(6));
    const newLng = Number((lng + lngDelta).toFixed(6));
    setLat(newLat);
    setLng(newLng);
    reverseGeocode(newLat, newLng);
  };

  return (
    <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} color="#58a6ff" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3' }}>Interactive Location Selector</span>
        </div>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          style={{
            background: 'rgba(88,166,255,0.12)',
            border: '1px solid #58a6ff',
            color: '#58a6ff',
            borderRadius: 6,
            padding: '5px 12px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {locating ? <Loader2 size={12} className="spin" /> : <Navigation size={12} />}
          Use Current Location
        </button>
      </div>

      {/* Search Input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} color="#8b949e" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search village, city, district, landmark..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch(e)}
            style={{
              width: '100%',
              background: '#010409',
              border: '1px solid #30363d',
              borderRadius: 6,
              padding: '7px 12px 7px 32px',
              color: '#e6edf3',
              fontSize: 12,
              fontFamily: 'inherit'
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          style={{
            background: '#21262d',
            border: '1px solid #30363d',
            color: '#e6edf3',
            borderRadius: 6,
            padding: '0 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {searching ? <Loader2 size={14} className="spin" /> : 'Search'}
        </button>
      </div>

      {/* Interactive Map Canvas Container */}
      <div
        onClick={handleMapClick}
        style={{
          position: 'relative',
          width: '100%',
          height: 220,
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: 8,
          overflow: 'hidden',
          cursor: 'crosshair',
          backgroundImage: `radial-gradient(#30363d 1px, transparent 1px), linear-gradient(135deg, #0d1117 0%, #161b22 100%)`,
          backgroundSize: '24px 24px, 100% 100%'
        }}
      >
        {/* OpenStreetMap Tile Background Frame */}
        <iframe
          title="Map View"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          style={{ pointerEvents: 'none', opacity: 0.65 }}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.03}%2C${lat - 0.02}%2C${lng + 0.03}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`}
        />

        {/* Pin Marker Overlay */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            background: '#f85149',
            color: 'white',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(248,81,73,0.5)',
            border: '2px solid white'
          }}>
            <MapPin size={16} />
          </div>
          <div style={{
            width: 8,
            height: 8,
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '50%',
            filter: 'blur(2px)',
            marginTop: 2
          }} />
        </div>

        <div style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          background: 'rgba(1,4,9,0.85)',
          padding: '3px 8px',
          borderRadius: 4,
          fontSize: 10,
          color: '#8b949e',
          fontFamily: 'monospace'
        }}>
          Click map to reposition pin (Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)})
        </div>
      </div>

      {/* Resolved Location Details */}
      <div style={{ marginTop: 12, background: '#010409', border: '1px solid #21262d', borderRadius: 6, padding: '10px 14px' }}>
        <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 2 }}>Detected District & State</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>
          {district ? `${district}, ` : ''}{state ? `${state}, ` : ''}{country}
        </div>
        {address && (
          <div style={{ fontSize: 11, color: '#7d8590', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {address}
          </div>
        )}
      </div>

      {/* Location Privacy Level Selector */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Shield size={14} color="#58a6ff" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#e6edf3' }}>Location Privacy Level</span>
          <span style={{ fontSize: 10, color: '#8b949e' }}>(Controls what the public sees)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { id: 'locality', label: 'Locality', desc: 'Town / Neighborhood (~1 km)' },
            { id: 'district', label: 'District', desc: 'District & State only' },
            { id: 'approximate', label: 'Approximate', desc: 'State / Region level' },
            { id: 'exact', label: 'Exact Pin', desc: 'Full street address' }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPrivacyChange(p.id)}
              style={{
                background: privacyLevel === p.id ? 'rgba(88,166,255,0.15)' : '#010409',
                border: privacyLevel === p.id ? '1px solid #58a6ff' : '1px solid #30363d',
                borderRadius: 6,
                padding: '8px 10px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: privacyLevel === p.id ? '#58a6ff' : '#e6edf3' }}>
                {p.label}
              </div>
              <div style={{ fontSize: 9, color: '#8b949e', marginTop: 2 }}>{p.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
