"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; name: string };
export function ContextSelector({ organizations, airports, activeOrganizationId, activeAirportId, readOnly = false }: { organizations: Option[]; airports: (Option & { organizationId: string })[]; activeOrganizationId: string | null; activeAirportId: string | null; readOnly?: boolean }) {
  const router = useRouter(); const [error, setError] = useState("");
  async function update(organizationId: string, airportId: string | null) {
    setError(""); const response = await fetch("/api/context", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId, airportId }) });
    if (!response.ok) { setError("Contexto não autorizado."); return; } router.refresh();
  }
  const visibleAirports = airports.filter((airport) => airport.organizationId === activeOrganizationId);
  return <div className="context-selector">
    <label>Organização<select value={activeOrganizationId ?? ""} disabled={readOnly} onChange={(event) => update(event.target.value, null)}><option value="" disabled>Selecione</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
    <label>Aeródromo<select value={activeAirportId ?? ""} disabled={readOnly || !activeOrganizationId} onChange={(event) => update(activeOrganizationId!, event.target.value || null)}><option value="">Todos / nenhum</option>{visibleAirports.map((airport) => <option key={airport.id} value={airport.id}>{airport.name}</option>)}</select></label>
    {error && <span className="error" role="alert">{error}</span>}
  </div>;
}
