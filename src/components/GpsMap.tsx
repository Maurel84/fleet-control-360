import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from './Card';
import type { GpsPosition } from '../lib/types';
import { formatDateTime } from '../lib/format';
import { VEHICLE_STATUS_LABELS } from '../lib/labels';

// Couleurs par statut de véhicule (assorties au design system)
const STATUS_HEX: Record<string, string> = {
  available: '#10b981',   // Emerald
  reserved: '#f59e0b',    // Amber
  rented: '#3b82f6',      // Blue
  on_mission: '#6366f1',  // Indigo
  maintenance: '#f97316', // Orange
  immobilized: '#ef4444', // Red
  accident: '#ef4444',    // Red
  out_of_service: '#78716c', // Stone
};

// Formule de Haversine pour calculer la distance géographique en mètres
function getDistanceFromCenter(lat: number, lng: number): number {
  const R = 6371e3; // Rayon de la Terre en mètres
  const lat1 = lat * Math.PI / 180;
  const lat2 = 5.3600 * Math.PI / 180;
  const deltaLat = (5.3600 - lat) * Math.PI / 180;
  const deltaLng = (-4.0083 - lng) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance en mètres
}

interface GpsMapProps {
  positions: GpsPosition[];
  selectedVehicleId?: string | null;
  heightClass?: string;
  title?: string;
  subtitle?: string;
}

export function GpsMap({
  positions,
  selectedVehicleId,
  heightClass = 'h-[380px]',
  title = 'Carte de suivi en temps réel',
  subtitle = 'Positions géographiques des véhicules actifs'
}: GpsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const [mapReady, setMapReady] = useState(false);

  // Styles injectés pour l'animation de ping de géolocalisation
  useEffect(() => {
    const styleId = 'gps-map-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes gps-ping {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes gps-ping-alert {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        .leaflet-container {
          font-family: inherit;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(226, 232, 240, 0.8);
          padding: 4px;
        }
        .dark .custom-popup .leaflet-popup-content-wrapper {
          background-color: #1e1e24;
          color: #f3f4f6;
          border-color: #2e2e38;
        }
        .custom-popup .leaflet-popup-tip {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .dark .custom-popup .leaflet-popup-tip {
          background-color: #1e1e24;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // 1. Initialisation de la carte
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Centrage initial sur Abidjan, Côte d'Ivoire
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([5.3600, -4.0083], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.control.zoom({
      position: 'bottomright',
    }).addTo(map);

    // DESSINER LE CERCLE DE GEOFENCING (Barrière virtuelle de 25 km d'Abidjan)
    L.circle([5.3600, -4.0083], {
      radius: 25000, // 25 km
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.05,
      weight: 1.5,
      dashArray: '5, 8'
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // 2. Gestion des marqueurs lors du changement de positions
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Nettoyage des anciens marqueurs
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    if (positions.length === 0) return;

    const bounds = L.latLngBounds([]);

    positions.forEach((pos) => {
      if (!pos.latitude || !pos.longitude) return;

      const vehicle = pos.vehicle;
      const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule Inconnu';
      const registration = vehicle?.registration || 'Non immatriculé';
      const internalNumber = vehicle?.internal_number || 'N/A';
      const status = vehicle?.status || 'available';
      const statusLabel = VEHICLE_STATUS_LABELS[status] || status;

      // Calculer si le véhicule est en infraction
      const distance = getDistanceFromCenter(pos.latitude, pos.longitude);
      const isOutOfBounds = distance > 25000;
      const isOverspeed = pos.speed !== null && pos.speed > 120;
      const isAlert = isOutOfBounds || isOverspeed;

      const statusColor = isAlert ? '#ef4444' : (STATUS_HEX[status] || '#94a3b8');
      const animName = isAlert ? 'gps-ping-alert' : 'gps-ping';
      const animDuration = isAlert ? '0.7s' : '1.6s';

      // Création d'un marqueur SVG animé
      const iconHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: ${statusColor}; opacity: 0.45; animation: ${animName} ${animDuration} infinite ease-in-out;"></div>
          <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background-color: ${statusColor}; border: 2.5px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
            ${isAlert ? '<div style="width: 4px; height: 4px; border-radius: 50%; background-color: white;"></div>' : ''}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-gps-icon-container',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const latLng: L.LatLngExpression = [pos.latitude, pos.longitude];
      bounds.extend(latLng);

      // Section d'alertes à afficher dans le popup
      let alertBadge = '';
      if (isOutOfBounds) {
        alertBadge += `
          <div style="margin-top: 4px; padding: 2px 6px; background-color: #ef444415; border: 1px solid #ef444440; border-radius: 4px; color: #ef4444; font-size: 10px; font-weight: bold; display: inline-flex; align-items: center; gap: 4px;">
            ⚠️ HORS ZONE AUTORISÉE (${(distance/1000).toFixed(1)} km)
          </div>
        `;
      }
      if (isOverspeed) {
        alertBadge += `
          <div style="margin-top: 4px; margin-left: ${isOutOfBounds ? '4px' : '0'}; padding: 2px 6px; background-color: #f9731615; border: 1px solid #f9731640; border-radius: 4px; color: #f97316; font-size: 10px; font-weight: bold; display: inline-flex; align-items: center; gap: 4px;">
            ⚡ SURVITESSE (${pos.speed} km/h)
          </div>
        `;
      }

      const popupHtml = `
        <div style="font-size: 13px; line-height: 1.4;">
          <div style="font-weight: 700; margin-bottom: 2px; font-size: 14px;">${vehicleName}</div>
          <div style="color: #6b7280; margin-bottom: 6px; font-size: 11px;">Immat: ${registration} · N° Int: ${internalNumber}</div>
          <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 6px 0;" />
          <div style="margin-bottom: 4px;">
            <strong>Statut:</strong> 
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; background-color: ${isAlert ? '#ef444420' : `${statusColor}20`}; color: ${isAlert ? '#ef4444' : statusColor}; border: 1px solid ${isAlert ? '#ef444440' : `${statusColor}40`};">
              ${isAlert ? 'Alerte Sécurité' : statusLabel}
            </span>
          </div>
          ${pos.speed !== null ? `<div style="margin-bottom: 4px;"><strong>Vitesse:</strong> ${pos.speed} km/h</div>` : ''}
          ${alertBadge}
          <div style="color: #9ca3af; font-size: 10px; margin-top: 6px;">Dernière synchro: ${formatDateTime(pos.recorded_at)}</div>
        </div>
      `;

      const marker = L.marker(latLng, { icon: customIcon })
        .addTo(map)
        .bindPopup(popupHtml, { className: 'custom-popup', minWidth: 200 });

      markersRef.current[pos.vehicle_id] = marker;
    });

    // Ajustement de la vue pour inclure tous les marqueurs au chargement initial
    if (positions.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [positions, mapReady]);

  // 3. Zoom / Centrage sur le véhicule sélectionné
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedVehicleId) return;

    const marker = markersRef.current[selectedVehicleId];
    if (marker) {
      const latLng = marker.getLatLng();
      map.setView(latLng, 16, { animate: true, duration: 0.8 });
      marker.openPopup();
    }
  }, [selectedVehicleId, mapReady]);

  return (
    <Card className="mb-6 overflow-hidden">
      <div className="px-5 py-4 border-b border-ink-200/60 dark:border-ink-800/60 flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-base text-ink-900 dark:text-white">{title}</h3>
          <p className="text-xs text-ink-400 mt-0.5">{subtitle}</p>
        </div>
        {positions.length > 0 && (
          <span className="badge bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-semibold text-[10px]">
            {positions.length} véhicule(s) localisé(s)
          </span>
        )}
      </div>
      <div className="relative">
        <div ref={mapContainerRef} className={`w-full ${heightClass} z-10`} />
        {positions.length === 0 && (
          <div className="absolute inset-0 bg-ink-50/50 dark:bg-ink-950/50 backdrop-blur-[1px] flex flex-col items-center justify-center z-20 text-center p-4">
            <p className="text-sm font-medium text-ink-500">Aucun signal GPS actif</p>
            <p className="text-xs text-ink-400 mt-1">Les données géographiques s'afficheront dès qu'un boîtier enverra sa position.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
