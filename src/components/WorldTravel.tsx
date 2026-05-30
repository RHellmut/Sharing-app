import React, { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { ArrowLeft, Search, Check } from 'lucide-react';
import countries from 'i18n-iso-countries';
import deLocale from 'i18n-iso-countries/langs/de.json';
import { geoCentroid } from 'd3-geo';
import worldData from 'world-atlas/countries-50m.json';

countries.registerLocale(deLocale);

// Geometries without an ISO numeric id — map their English name to a stable code + German label.
const SPECIAL: Record<string, { code: string; name: string }> = {
  'N. Cyprus':         { code: 'x-ncyprus',    name: 'Nordzypern' },
  'Somaliland':        { code: 'x-somaliland', name: 'Somaliland' },
  'Kosovo':            { code: 'x-kosovo',     name: 'Kosovo' },
  'Indian Ocean Ter.': { code: 'x-biot',       name: 'Brit. Ind. Oz.' },
  'Siachen Glacier':   { code: 'x-siachen',    name: 'Siachen' },
};

interface GeoLike {
  id?: string | number;
  properties: { name: string };
}

/** Resolve a geography to a stable country code + German display name. */
function resolve(geo: GeoLike): { code: string; name: string } {
  if (geo.id != null) {
    const code = String(geo.id).padStart(3, '0');
    const name = countries.getName(code, 'de') ?? geo.properties.name;
    return { code, name };
  }
  return SPECIAL[geo.properties.name] ?? { code: `x-${geo.properties.name}`, name: geo.properties.name };
}

// Full alphabetical country list, derived once from the map geometries.
type CountryDef = { code: string; name: string };
const ALL_COUNTRIES: CountryDef[] = (() => {
  const geos = (worldData as unknown as {
    objects: { countries: { geometries: GeoLike[] } };
  }).objects.countries.geometries;
  const seen = new Map<string, string>();
  for (const g of geos) {
    const { code, name } = resolve(g);
    if (!seen.has(code)) seen.set(code, name);
  }
  return [...seen.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
})();

interface Props {
  visited: Set<string>;
  onToggle: (code: string) => void;
  onBack: () => void;
}

export function WorldTravel({ visited, onToggle, onBack }: Props) {
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(1);

  const { visitedList, openList } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (c: CountryDef) => !q || c.name.toLowerCase().includes(q);
    return {
      visitedList: ALL_COUNTRIES.filter(c => visited.has(c.code) && match(c)),
      openList:    ALL_COUNTRIES.filter(c => !visited.has(c.code) && match(c)),
    };
  }, [visited, search]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-2 pb-4 flex items-center gap-1 sticky top-0 z-40"
              style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
          aria-label="Zurück"
        >
          <ArrowLeft size={22} className="text-gray-600" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-800 truncate">Lisl&apos;s World Travel</h1>
          <p className="text-xs text-gray-400">
            {visited.size} von {ALL_COUNTRIES.length} Ländern bereist
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-10">

        {/* ── Map ── */}
        <div className="bg-sky-50 border-b border-gray-100">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 95 }}
            width={400}
            height={320}
            style={{ width: '100%', height: 'auto' }}
          >
            <ZoomableGroup center={[10, 30]} zoom={1} minZoom={1} maxZoom={40} onMoveEnd={({ zoom: z }) => setZoom(z)}>
              <Geographies geography={worldData}>
                {({ geographies, projection }) => (
                  <>
                    {geographies.map(geo => {
                      const { code } = resolve(geo);
                      const isVisited = visited.has(code);
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onClick={() => onToggle(code)}
                          style={{
                            default: {
                              fill: isVisited ? '#0ea5e9' : '#e2e8f0',
                              stroke: '#ffffff',
                              strokeWidth: 0.4 / zoom,
                              outline: 'none',
                            },
                            hover: {
                              fill: isVisited ? '#0284c7' : '#cbd5e1',
                              stroke: '#ffffff',
                              strokeWidth: 0.4 / zoom,
                              outline: 'none',
                              cursor: 'pointer',
                            },
                            pressed: {
                              fill: '#0369a1',
                              outline: 'none',
                            },
                          }}
                        />
                      );
                    })}
                    {geographies.map(geo => {
                      const centroid = geoCentroid(geo);
                      const pos = projection(centroid);
                      if (!pos) return null;
                      const { name } = resolve(geo);
                      return (
                        <text
                          key={`lbl-${geo.rsmKey}`}
                          x={pos[0]}
                          y={pos[1]}
                          fontSize={3.4 / zoom + 0.0015 * zoom}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#1e293b"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {name}
                        </text>
                      );
                    })}
                  </>
                )}
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
          <p className="text-center text-[11px] text-gray-400 py-2">
            Tippe ein Land an, um es zu markieren · Zwei Finger zum Zoomen
          </p>
        </div>

        {/* ── Search ── */}
        <div className="px-4 pt-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Land suchen…"
              className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* ── Lists ── */}
        <div className="px-4 pt-4 space-y-5">

          {/* Visited */}
          <section>
            <h2 className="text-sm font-semibold text-sky-700 mb-2 flex items-center gap-1.5">
              <Check size={15} />
              Bereist ({visitedList.length})
            </h2>
            {visitedList.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Noch keine Länder markiert.</p>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
                {visitedList.map(c => (
                  <button
                    key={c.code}
                    onClick={() => onToggle(c.code)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-sky-50 transition-colors"
                  >
                    <span className="w-5 h-5 rounded-md bg-sky-500 flex items-center justify-center flex-shrink-0">
                      <Check size={13} className="text-white" />
                    </span>
                    <span className="text-sm text-gray-800">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Open */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              Noch offen ({openList.length})
            </h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
              {openList.map(c => (
                <button
                  key={c.code}
                  onClick={() => onToggle(c.code)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="w-5 h-5 rounded-md border-2 border-gray-200 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{c.name}</span>
                </button>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
