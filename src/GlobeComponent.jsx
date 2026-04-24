import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

const COUNTRIES_URL = '/countries.geojson';

const COUNTRY_PALETTE = [
  '#3a86ff', '#8338ec', '#ff006e', '#fb5607', '#ffbe0b',
  '#06d6a0', '#118ab2', '#ef476f', '#ffd166', '#2ec4b6',
  '#e63946', '#457b9d', '#a8dadc', '#f4a261', '#2a9d8f',
];

function countryColor(name) {
  const hash = [...(name ?? '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return COUNTRY_PALETTE[hash % COUNTRY_PALETTE.length];
}

export default function GlobeComponent() {
  const svgRef = useRef();
  const containerRef = useRef();
  const [countries, setCountries] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const rotationRef = useRef([0, -20, 0]);
  const scaleRef = useRef(1);
  const animFrameRef = useRef();
  const isDragging = useRef(false);
  const lastPos = useRef(null);

  // Load country data
  useEffect(() => {
    fetch(COUNTRIES_URL)
      .then((r) => r.json())
      .then(setCountries);
  }, []);

  const draw = useCallback(() => {
    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    if (!container || !svg) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    const baseRadius = Math.min(W, H) * 0.44;
    const radius = baseRadius * scaleRef.current;

    svg.attr('width', W).attr('height', H);

    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([W / 2, H / 2])
      .rotate(rotationRef.current)
      .clipAngle(90);

    const path = d3.geoPath(projection);

    // Globe sphere (ocean)
    svg.select('.globe-sphere').attr('d', path({ type: 'Sphere' }));

    // Graticule grid
    const graticule = d3.geoGraticule()();
    svg.select('.graticule').attr('d', path(graticule));

    // Countries
    if (countries) {
      svg
        .select('.countries')
        .selectAll('path')
        .data(countries.features)
        .join('path')
        .attr('d', path)
        .attr('fill', (d) =>
          d === hoveredCountry
            ? '#ffffff'
            : countryColor(d.properties?.ADMIN)
        )
        .attr('fill-opacity', (d) => (d === hoveredCountry ? 0.95 : 0.82))
        .attr('stroke', 'rgba(255,255,255,0.25)')
        .attr('stroke-width', 0.5)
        .on('mouseenter', (event, d) => setHoveredCountry(d))
        .on('mouseleave', () => setHoveredCountry(null));
    }

    // Atmosphere glow
    const defs = svg.select('defs');
    defs
      .select('#glow')
      .select('feGaussianBlur')
      .attr('stdDeviation', radius * 0.04);
  }, [countries, hoveredCountry]);

  // Auto-rotation animation
  useEffect(() => {
    const animate = () => {
      if (!isDragging.current) {
        rotationRef.current = [
          rotationRef.current[0] + 0.2,
          rotationRef.current[1],
          rotationRef.current[2],
        ];
      }
      draw();
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    lastPos.current = [e.clientX, e.clientY];
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current || !lastPos.current) return;
    const dx = e.clientX - lastPos.current[0];
    const dy = e.clientY - lastPos.current[1];
    rotationRef.current = [
      rotationRef.current[0] + dx * 0.4,
      rotationRef.current[1] - dy * 0.4,
      rotationRef.current[2],
    ];
    lastPos.current = [e.clientX, e.clientY];
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    lastPos.current = null;
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e) => {
    isDragging.current = true;
    lastPos.current = [e.touches[0].clientX, e.touches[0].clientY];
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current || !lastPos.current) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - lastPos.current[0];
    const dy = e.touches[0].clientY - lastPos.current[1];
    rotationRef.current = [
      rotationRef.current[0] + dx * 0.4,
      rotationRef.current[1] - dy * 0.4,
      rotationRef.current[2],
    ];
    lastPos.current = [e.touches[0].clientX, e.touches[0].clientY];
  }, []);

  // Scroll-to-zoom handler
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    scaleRef.current = Math.min(4, Math.max(0.3, scaleRef.current * delta));
  }, []);

  return (
    <div
      ref={containerRef}
      className="globe-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      onWheel={handleWheel}
    >
      <svg ref={svgRef} style={{ display: 'block', cursor: 'grab' }}>
        <defs>
          <radialGradient id="ocean-gradient" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#1a4a7a" />
            <stop offset="100%" stopColor="#0a1628" />
          </radialGradient>
          <radialGradient id="atmosphere" cx="50%" cy="50%">
            <stop offset="70%" stopColor="transparent" />
            <stop offset="100%" stopColor="#3a86ff" stopOpacity="0.35" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ocean */}
        <path className="globe-sphere" fill="url(#ocean-gradient)" />

        {/* Graticule */}
        <path
          className="graticule"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={0.5}
        />

        {/* Countries */}
        <g className="countries" />

        {/* Atmosphere glow overlay */}
        <path
          className="globe-sphere"
          fill="url(#atmosphere)"
          style={{ pointerEvents: 'none' }}
        />
      </svg>

      {/* Country name tooltip */}
      {hoveredCountry && (
        <div className="country-label">
          {hoveredCountry.properties?.ADMIN}
        </div>
      )}
    </div>
  );
}


