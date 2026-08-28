"use client";

import { useState, type FormEvent } from "react";

type Profile = {
  id: string; version: number; status: "DRAFT" | "ACTIVE" | "SUPERSEDED"; effectiveFrom: string; effectiveTo: string | null;
  aerodromeUse: "PUBLIC" | "PRIVATE" | null; operationalClass: string | null; hasOperationalCertificate: boolean | null;
  isMilitarySharedAerodrome: boolean | null;
  certificateNumber: string | null; operatesRegularRBAC121: boolean | null; operatesRegularRBAC135: boolean | null;
  hasSGSO: boolean | null; hasPGSO: boolean | null; regulatoryNotes: string | null; createdAt: string; updatedAt: string;
};
type Assessment = {
  id: string; evaluatedAt: string; engineVersion: string; managementRegime: string; overallResult: string; rationale: string; profileVersion: number;
  items: Array<{ id: string; section: string; title: string; status: string; rationale: string; ruleVersion: number | null }>;
};
type Workspace = { airport: { id: string; name: string; organizationId: string }; profiles: Profile[]; assessments: Assessment[] };

const regimeLabels: Record<string, string> = {
  SGSO: "SGSO", PGSO: "PGSO", CRITICAL_SAFETY_ASPECTS: "GERENCIAMENTO DE ASPECTOS CRÍTICOS", REVIEW_REQUIRED: "REVISÃO NECESSÁRIA",
};
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: value.includes("T00:00:00") ? undefined : "short" }).format(new Date(value));

export function RegulatoryProfileWorkspace({ initial }: { initial: Workspace }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = initial.profiles.find((profile) => profile.status === "ACTIVE");
  const latestAssessment = initial.assessments[0];

  async function request(url: string, body: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Não foi possível concluir a operação.");
      window.location.reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Erro inesperado."); setBusy(false); }
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const checked = (name: string) => form.get(name) === "on";
    void request(`/api/regulatory/airports/${initial.airport.id}/profiles`, {
      organizationId: initial.airport.organizationId,
      effectiveFrom: form.get("effectiveFrom"),
      effectiveTo: form.get("effectiveTo") || null,
      aerodromeUse: form.get("aerodromeUse"),
      operationalClass: form.get("operationalClass"),
      hasOperationalCertificate: checked("hasOperationalCertificate"),
      isMilitarySharedAerodrome: checked("isMilitarySharedAerodrome"),
      certificateNumber: form.get("certificateNumber") || null,
      operatesRegularRBAC121: checked("operatesRegularRBAC121"),
      operatesRegularRBAC135: checked("operatesRegularRBAC135"),
      hasSGSO: checked("hasSGSO"), hasPGSO: checked("hasPGSO"),
      regulatoryNotes: form.get("regulatoryNotes") || null,
    });
  }

  return <div className="stack">
    <div><p className="eyebrow">Configurações</p><h1>Perfil Regulatório</h1><p className="muted">{initial.airport.name}</p></div>
    {error && <p className="error" role="alert">{error}</p>}
    <section className="card">
      <h2>Perfil vigente</h2>
      {current ? <div className="grid two">
        <p><span className="status">v{current.version} · {current.status}</span><br />Vigente desde {formatDate(current.effectiveFrom)}</p>
        <p>Uso: {current.aerodromeUse ?? "Não informado"}<br />Classe: {current.operationalClass ?? "Não informada"}</p>
        <p>Certificado operacional: {current.hasOperationalCertificate ? current.certificateNumber : "Não"}<br />Compartilhado/militar: {current.isMilitarySharedAerodrome ? "Sim — revisão necessária" : "Não"}</p>
        <p>RBAC 135 regular: {current.operatesRegularRBAC135 ? "Sim" : "Não"}<br />SGSO/PGSO existente: {current.hasSGSO ? "SGSO" : current.hasPGSO ? "PGSO" : "Não informado"}</p>
      </div> : <p className="muted">Nenhum perfil ativo. Crie uma versão e ative-a.</p>}
    </section>
    <section className="card">
      <h2>Criar nova versão</h2>
      <form className="stack" onSubmit={submitProfile}>
        <div className="grid two">
          <label>Vigência inicial<input name="effectiveFrom" type="date" required /></label>
          <label>Vigência final (opcional)<input name="effectiveTo" type="date" /></label>
          <label>Uso do aeródromo<select name="aerodromeUse" required><option value="PUBLIC">Público</option><option value="PRIVATE">Privativo</option></select></label>
          <label>Classe operacional<select name="operationalClass" required><option value="CLASS_I">Classe I</option><option value="CLASS_II">Classe II</option><option value="CLASS_III">Classe III</option><option value="CLASS_IV">Classe IV</option></select></label>
          <label className="checkbox"><input name="hasOperationalCertificate" type="checkbox" /> Possui certificado operacional RBAC 139</label>
          <label>Número do certificado<input name="certificateNumber" maxLength={80} /></label>
          <label className="checkbox"><input name="isMilitarySharedAerodrome" type="checkbox" /> Compartilhado e operado pelo Comando da Aeronáutica</label>
          <label className="checkbox"><input name="operatesRegularRBAC121" type="checkbox" /> Opera RBAC 121 regular</label>
          <label className="checkbox"><input name="operatesRegularRBAC135" type="checkbox" /> Opera RBAC 135 regular</label>
          <label className="checkbox"><input name="hasSGSO" type="checkbox" /> Possui SGSO</label>
          <label className="checkbox"><input name="hasPGSO" type="checkbox" /> Possui PGSO</label>
        </div>
        <label>Notas regulatórias<textarea name="regulatoryNotes" maxLength={4000} /></label>
        <div className="actions"><button disabled={busy}>Salvar como rascunho</button></div>
      </form>
    </section>
    <section className="card">
      <h2>Histórico de perfis</h2>
      <div className="table-wrap"><table><thead><tr><th>Versão</th><th>Status</th><th>Vigência</th><th>Ação</th></tr></thead><tbody>
        {initial.profiles.map((profile) => <tr key={profile.id}><td>v{profile.version}</td><td>{profile.status}</td><td>{formatDate(profile.effectiveFrom)}{profile.effectiveTo ? ` — ${formatDate(profile.effectiveTo)}` : " — vigente"}</td><td>{profile.status === "DRAFT" && <button className="secondary" disabled={busy} onClick={() => void request(`/api/regulatory/airports/${initial.airport.id}/profiles/${profile.id}/activate`, { organizationId: initial.airport.organizationId })}>Ativar</button>}</td></tr>)}
      </tbody></table></div>
    </section>
    <section className="card">
      <h2>Avaliação de aplicabilidade</h2>
      <div className="actions"><button disabled={busy || !current} onClick={() => current && void request(`/api/regulatory/airports/${initial.airport.id}/assessments`, { organizationId: initial.airport.organizationId, regulatoryProfileId: current.id })}>Executar avaliação do perfil vigente</button></div>
      {latestAssessment && <div className="stack">
        <div className="result"><p className="eyebrow">Regime identificado</p><h2>{latestAssessment.overallResult === "NOT_APPLICABLE" ? "NENHUM REGIME DA SUBPARTE C APLICÁVEL" : regimeLabels[latestAssessment.managementRegime] ?? latestAssessment.managementRegime}</h2><p>{latestAssessment.rationale}</p></div>
        <p className="muted">Avaliação: {formatDate(latestAssessment.evaluatedAt)} · Perfil v{latestAssessment.profileVersion} · Motor v{latestAssessment.engineVersion}</p>
        <div className="table-wrap"><table><thead><tr><th>Requisito</th><th>Status</th><th>Regra</th><th>Justificativa</th></tr></thead><tbody>
          {latestAssessment.items.map((item) => <tr key={item.id}><td>{item.section}<br /><span className="muted">{item.title}</span></td><td>{item.status}</td><td>v{item.ruleVersion ?? "—"}</td><td>{item.rationale}</td></tr>)}
        </tbody></table></div>
      </div>}
      <p className="disclaimer">Esta avaliação apoia o gerenciamento regulatório e não substitui decisão da autoridade competente nem atesta conformidade.</p>
    </section>
  </div>;
}
