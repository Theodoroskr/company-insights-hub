import React, { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { useNavigate } from 'react-router-dom';
import CountryFlag from '../ui/CountryFlag';
import CoverageTierBadge from '../ui/CoverageTierBadge';
import RiskTrafficLight from '../ui/RiskTrafficLight';
import type { Country } from '../../types/database';

// Public TopoJSON of world countries (no API key)
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ISO numeric → ISO alpha-2 mapping for the most common countries we care about.
// Source: ISO 3166-1. Built inline to avoid extra deps.
const NUM_TO_ISO2: Record<string, string> = {
  '008':'AL','012':'DZ','032':'AR','036':'AU','040':'AT','048':'BH','050':'BD','051':'AM','056':'BE',
  '070':'BA','076':'BR','100':'BG','112':'BY','124':'CA','144':'LK','152':'CL','156':'CN','158':'TW',
  '170':'CO','188':'CR','191':'HR','196':'CY','203':'CZ','208':'DK','214':'DO','218':'EC','222':'SV',
  '231':'ET','233':'EE','246':'FI','250':'FR','268':'GE','276':'DE','288':'GH','300':'GR','320':'GT',
  '348':'HU','352':'IS','356':'IN','360':'ID','364':'IR','368':'IQ','372':'IE','376':'IL','380':'IT',
  '388':'JM','392':'JP','398':'KZ','400':'JO','404':'KE','410':'KR','414':'KW','417':'KG','418':'LA',
  '422':'LB','426':'LS','428':'LV','430':'LR','434':'LY','438':'LI','440':'LT','442':'LU','450':'MG',
  '454':'MW','458':'MY','466':'ML','470':'MT','478':'MR','484':'MX','492':'MC','496':'MN','498':'MD',
  '499':'ME','504':'MA','508':'MZ','512':'OM','516':'NA','524':'NP','528':'NL','554':'NZ','558':'NI',
  '562':'NE','566':'NG','578':'NO','586':'PK','591':'PA','598':'PG','600':'PY','604':'PE','608':'PH',
  '616':'PL','620':'PT','624':'GW','626':'TL','630':'PR','634':'QA','642':'RO','643':'RU','646':'RW',
  '682':'SA','686':'SN','688':'RS','694':'SL','702':'SG','703':'SK','704':'VN','705':'SI','706':'SO',
  '710':'ZA','716':'ZW','724':'ES','729':'SD','752':'SE','756':'CH','760':'SY','762':'TJ','764':'TH',
  '768':'TG','776':'TO','780':'TT','784':'AE','788':'TN','792':'TR','795':'TM','800':'UG','804':'UA',
  '807':'MK','818':'EG','826':'GB','834':'TZ','840':'US','854':'BF','858':'UY','860':'UZ','862':'VE',
  '887':'YE','894':'ZM',
};

const TIER_FILL: Record<string, string> = {
  premium:    'hsl(43 74% 49%)',   // gold
  standard:   'hsl(217 91% 60%)',  // accent blue
  on_request: 'hsl(215 20% 75%)',  // soft slate
};

interface WorldCoverageMapProps {
  countries: Country[];
}

export default function WorldCoverageMap({ countries }: WorldCoverageMapProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<{ country: Country; x: number; y: number } | null>(null);

  const byIso2 = useMemo(() => {
    const map = new Map<string, Country>();
    countries.forEach((c) => {
      if (c.iso2) map.set(c.iso2.toUpperCase(), c);
    });
    return map;
  }, [countries]);

  const stats = useMemo(() => {
    const premium = countries.filter((c) => c.coverage_tier === 'premium').length;
    const standard = countries.filter((c) => c.coverage_tier === 'standard').length;
    const onreq = countries.filter((c) => c.coverage_tier === 'on_request').length;
    return { premium, standard, onreq, total: premium + standard + onreq };
  }, [countries]);

  return (
    <div className="relative w-full">
      {/* Stats above map */}
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-6">
        <LegendDot color={TIER_FILL.premium} label={`${stats.premium} Premium · Instant`} />
        <LegendDot color={TIER_FILL.standard} label={`${stats.standard} Standard · 24h`} />
        <LegendDot color={TIER_FILL.on_request} label={`${stats.onreq} On Request`} />
      </div>

      <div className="relative rounded-2xl overflow-hidden" style={{ backgroundColor: '#0F2444' }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 145 }}
          width={980}
          height={500}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <ZoomableGroup center={[15, 25]} zoom={1} maxZoom={4} minZoom={1}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const numId = String(geo.id).padStart(3, '0');
                  const iso2 = NUM_TO_ISO2[numId];
                  const country = iso2 ? byIso2.get(iso2) : undefined;
                  const tier = country?.coverage_tier;
                  const fill = tier ? TIER_FILL[tier] : 'hsl(215 30% 20%)';
                  const isCovered = !!country;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={(evt) => {
                        if (country) {
                          setHovered({
                            country,
                            x: (evt as React.MouseEvent).clientX,
                            y: (evt as React.MouseEvent).clientY,
                          });
                        }
                      }}
                      onMouseMove={(evt) => {
                        if (country) {
                          setHovered({
                            country,
                            x: (evt as React.MouseEvent).clientX,
                            y: (evt as React.MouseEvent).clientY,
                          });
                        }
                      }}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => {
                        if (country) navigate(`/country/${country.code.toLowerCase()}`);
                      }}
                      style={{
                        default: {
                          fill,
                          stroke: '#0F2444',
                          strokeWidth: 0.5,
                          outline: 'none',
                          opacity: isCovered ? 0.85 : 0.5,
                          cursor: isCovered ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                        },
                        hover: {
                          fill,
                          stroke: '#FFFFFF',
                          strokeWidth: 1,
                          outline: 'none',
                          opacity: 1,
                          cursor: isCovered ? 'pointer' : 'default',
                        },
                        pressed: { fill, outline: 'none' },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Hover tooltip */}
        {hovered && (
          <div
            className="fixed z-50 pointer-events-none rounded-lg shadow-2xl p-3 min-w-[220px]"
            style={{
              left: hovered.x + 16,
              top: hovered.y + 16,
              backgroundColor: '#fff',
              border: '1px solid var(--bg-border)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <CountryFlag iso2={hovered.country.iso2} emoji={hovered.country.flag_emoji} size="md" />
              <div className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>
                {hovered.country.name}
              </div>
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <CoverageTierBadge tier={hovered.country.coverage_tier} size="sm" />
              {hovered.country.risk_band && (
                <RiskTrafficLight band={hovered.country.risk_band} showLabel={false} />
              )}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Click to view country dashboard →
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
        Hover any country for coverage details · Click to open the country dashboard
      </p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-xs font-medium" style={{ color: 'var(--text-body)' }}>{label}</span>
    </div>
  );
}
