"use client"

import "leaflet/dist/leaflet.css"

import type * as Leaflet from "leaflet"
import { useEffect, useRef, useState } from "react"

import { STORES } from "@lib/data/stores"
import { DATENSCHUTZ_URL } from "@lib/data/legal-links"

const OSMF_PRIVACY_POLICY_URL = "https://osmfoundation.org/wiki/Privacy_Policy"

// shortcut: OSM's public tile servers are only allowed for low traffic (OSM
// Tile Usage Policy), switch to an own/contracted tile provider before go-live.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'

// Static markup only: no store data goes into the HTML string.
const PIN_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30" aria-hidden="true"><path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>'

const pinIcon = (L: typeof Leaflet, isSelected: boolean) =>
  L.divIcon({
    html: PIN_SVG,
    className: isSelected
      ? "text-bo-accent drop-shadow"
      : "text-bo-line-strong drop-shadow",
    iconSize: [30, 30],
    iconAnchor: [15, 29],
  })

type StoreMapProps = {
  selected: string
  onSelect: (id: string) => void
}

/**
 * Two-click map: nothing is requested from OpenStreetMap until the customer
 * clicks "Karte laden". The consent is not persisted (per page view only).
 */
const StoreMap = ({ selected, onSelect }: StoreMapProps) => {
  const [consented, setConsented] = useState(false)
  const [ready, setReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<typeof Leaflet | null>(null)
  const markersRef = useRef<Record<string, Leaflet.Marker>>({})
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!consented) return
    let cancelled = false
    let map: Leaflet.Map | undefined

    // Loaded on demand: leaflet touches `window` at import time.
    import("leaflet").then((mod) => {
      const L = (mod.default ?? mod) as typeof Leaflet
      if (cancelled || !containerRef.current) return

      map = L.map(containerRef.current, { scrollWheelZoom: false })
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(
        map
      )
      // Set the view first: Leaflet only creates marker elements on a loaded map.
      map.fitBounds(
        L.latLngBounds(STORES.map((s) => [s.lat, s.lng] as [number, number])),
        { padding: [40, 40] }
      )

      for (const store of STORES) {
        const marker = L.marker([store.lat, store.lng], {
          icon: pinIcon(L, false),
          title: store.name,
          alt: store.name,
        })
          .on("click", () => onSelectRef.current(store.id))
          .addTo(map)
        // Leaflet makes markers focusable buttons but ignores Enter/Space.
        marker.getElement()?.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelectRef.current(store.id)
          }
        })
        markersRef.current[store.id] = marker
      }

      leafletRef.current = L
      setReady(true)
    })

    return () => {
      cancelled = true
      map?.remove()
      markersRef.current = {}
    }
  }, [consented])

  useEffect(() => {
    const L = leafletRef.current
    if (!ready || !L) return
    for (const [id, marker] of Object.entries(markersRef.current)) {
      marker.setIcon(pinIcon(L, id === selected))
      marker.setZIndexOffset(id === selected ? 1000 : 0)
    }
  }, [selected, ready])

  return (
    <div className="relative isolate min-h-[260px] shrink-0 overflow-hidden rounded-[10px] border border-bo-line bg-bo-surface-2 [background-image:repeating-linear-gradient(135deg,var(--bo-line)_0px,var(--bo-line)_1px,transparent_1px,transparent_9px)] md:w-[42%]">
      {consented ? (
        <div
          ref={containerRef}
          className="absolute inset-0"
          role="region"
          aria-label="Karte der BikeOne Standorte"
        />
      ) : (
        <div className="flex h-full min-h-[260px] flex-col items-start justify-center gap-3 p-4">
          <div className="rounded-[9px] border border-bo-line bg-bo-surface p-3.5 text-[12.5px] leading-relaxed text-bo-ink-muted">
            <p className="m-0 font-semibold text-bo-ink">Kartenansicht</p>
            <p className="mt-1.5">
              Beim Laden der Karte werden Kartenkacheln von OpenStreetMap
              abgerufen. Dabei werden deine IP-Adresse und Browserdaten (z. B.
              Browsertyp und aufrufende Seite) an die OpenStreetMap Foundation
              (Vereinigtes Königreich) übertragen; die Kacheln werden über ein
              Content-Delivery-Netzwerk (CDN) ausgeliefert. Zweck ist allein
              die Darstellung der Karte. Deine Einwilligung gilt nur für diesen
              Seitenaufruf.
            </p>
            <p className="mt-1.5">
              Mehr dazu in unserer{" "}
              <a
                href={DATENSCHUTZ_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-bo-accent underline"
              >
                Datenschutzerklärung
              </a>{" "}
              und der{" "}
              <a
                href={OSMF_PRIVACY_POLICY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-bo-accent underline"
              >
                Datenschutzerklärung der OpenStreetMap Foundation
              </a>
              .
            </p>
            <button
              type="button"
              onClick={() => setConsented(true)}
              className="mt-3 rounded border-[1.5px] border-bo-ink bg-bo-ink px-4 py-2.5 text-[13px] font-semibold text-bo-bg hover:border-bo-accent hover:bg-bo-accent hover:text-bo-accent-ink"
            >
              Karte laden
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default StoreMap
