"use client";

import { useState, type FormEvent } from "react";

type Person = { id: string; name: string; email: string };
type Role = {
  id: string; code: string; name: string; description: string; holderMultiplicity: "SINGLE" | "MULTIPLE";
  accumulationPolicy: "ALLOWED" | "REQUIRES_REVIEW";
  responsibilities: Array<{ id: string; code: string; title: string; description: string }>;
  authorities: Array<{ id: string; regulatoryAuthority: { id: string; code: string; name: string } }>;
};
type Designation = {
  id: string; effectiveFrom: string; effectiveTo: string | null; status: "DRAFT" | "ACTIVE" | "SUPERSEDED" | "REVOKED";
  designationReference: string | null; designationDate: string; notificationDueDate: string | null; effectiveNotificationStatus: "PENDING" | "SUBMITTED" | "OVERDUE" | "NOT_APPLICABLE"; holder: Person; regulatoryRole: Pick<Role, "id" | "code" | "name" | "description" | "holderMultiplicity" | "accumulationPolicy">;
};
type Committee = {
  id: string; name: string; status: string; applicability: "REQUIRED" | "NOT_REQUIRED" | "REQUIRES_REVIEW";
  effectiveFrom: string; effectiveTo: string | null;
  composition: { decision: "COMPLIANT_STRUCTURE" | "INCOMPLETE" | "REQUIRES_REVIEW"; rationale: string; missingRoleCodes: string[] };
  members: Array<{ id: string; roleInCommittee: string; memberType: "REQUIRED_MEMBER" | "ADDITIONAL_MEMBER"; status: "ACTIVE" | "REVOKED"; effectiveFrom: string; effectiveTo: string | null; user: Person }>;
};
type Workspace = { organizationId: string; airportId: string; airportName: string; people: Person[]; roles: Role[]; designations: Designation[]; committees: Committee[] };

const roleOrder = ["ACCOUNTABLE_MANAGER", "SAFETY_MANAGER", "OPERATIONS_MANAGER", "MAINTENANCE_MANAGER", "EMERGENCY_RESPONSE_MANAGER"];
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value)) : "vigente";

export function GovernanceWorkspace({ initial, previewMode = false }: { initial: Workspace; previewMode?: boolean }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function request(url: string, body: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ organizationId: initial.organizationId, ...body }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message ?? "Não foi possível concluir a operação.");
      window.location.reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Erro inesperado."); setBusy(false); }
  }
  function createDesignation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void request(`/api/governance/airports/${initial.airportId}/designations`, { holderUserId: form.get("holderUserId"), regulatoryRoleId: form.get("regulatoryRoleId"), designationDate: form.get("designationDate"), effectiveFrom: form.get("effectiveFrom"), designationReference: form.get("designationReference") || null });
  }
  function createCommittee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void request(`/api/governance/airports/${initial.airportId}/committees`, { name: form.get("name"), effectiveFrom: form.get("effectiveFrom") });
  }
  const activeByRole = new Map(initial.designations.filter((item) => item.status === "ACTIVE").map((item) => [item.regulatoryRole.code, item]));
  return <div className="stack">
    <div><p className="eyebrow">Configurações</p><h1>Estrutura Organizacional</h1><p className="muted">{initial.airportName} · funções regulamentares, vigência e autoridade.</p></div>
    {previewMode && <p className="preview-notice">Demonstração visual sem PostgreSQL. Todas as mutações estão bloqueadas no servidor.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <section className="card"><h2>Estrutura gerencial vigente</h2><div className="governance-grid">
      {roleOrder.map((code) => { const role = initial.roles.find((item) => item.code === code); const designation = activeByRole.get(code); return <article className="governance-position" key={code}><span className="status">{role?.name ?? code}</span><strong>{designation?.holder.name ?? "Não designado"}</strong><small>{designation ? `Desde ${dateLabel(designation.effectiveFrom)}` : "Designação pendente"}</small></article>; })}
    </div></section>
    <section className="card"><h2>Nova designação</h2><p className="muted">A criação gera rascunho. A ativação preserva o histórico e verifica exclusividade e acumulação.</p><form className="grid two" onSubmit={createDesignation}>
      <label>Pessoa<select name="holderUserId" required>{initial.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
      <label>Função regulamentar<select name="regulatoryRoleId" required>{initial.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
      <label>Data do ato de designação<input name="designationDate" type="date" required /></label><label>Início da vigência<input name="effectiveFrom" type="date" required /></label><label>Referência da designação<input name="designationReference" maxLength={200} /></label>
      <div className="actions"><button disabled={busy || previewMode}>Salvar rascunho</button></div>
    </form></section>
    <section className="card"><h2>Histórico de designações</h2><div className="table-wrap"><table><thead><tr><th>Função</th><th>Titular</th><th>Status</th><th>Vigência</th><th>Notificação ANAC</th><th>Ação</th></tr></thead><tbody>
      {initial.designations.map((item) => <tr key={item.id}><td>{item.regulatoryRole.name}</td><td>{item.holder.name}</td><td>{item.status}</td><td>{dateLabel(item.effectiveFrom)} — {dateLabel(item.effectiveTo)}</td><td>{item.effectiveNotificationStatus}{item.notificationDueDate ? ` · prazo ${dateLabel(item.notificationDueDate)}` : ""}</td><td>{item.status === "DRAFT" && <button className="secondary" disabled={busy || previewMode} onClick={() => void request(`/api/governance/airports/${initial.airportId}/designations/${item.id}/activate`, {})}>Ativar</button>}</td></tr>)}
      {initial.designations.length === 0 && <tr><td colSpan={6} className="muted">Nenhuma designação registrada.</td></tr>}
    </tbody></table></div></section>
    <section className="card"><h2>Comissão de Segurança Operacional — CSO</h2><form className="grid two" onSubmit={createCommittee}>
      <label>Nome<input name="name" defaultValue="Comissão de Segurança Operacional" required /></label><p className="muted">A aplicabilidade é calculada no servidor a partir do regime vigente.</p>
      <label>Início da vigência<input name="effectiveFrom" type="date" required /></label><div className="actions"><button disabled={busy || previewMode}>Criar CSO</button></div>
    </form>{initial.committees.map((committee) => <div className="committee" key={committee.id}><h3>{committee.name}</h3><p><span className="status">{committee.applicability}</span> · composição: {committee.composition.decision} · {dateLabel(committee.effectiveFrom)} — {dateLabel(committee.effectiveTo)}</p><p className="muted">{committee.composition.rationale}</p><ul>{committee.members.map((member) => <li key={member.id}>{member.user.name} — {member.roleInCommittee} · {member.memberType} ({member.status})</li>)}</ul></div>)}</section>
    <section className="card"><h2>Matriz de autoridade regulamentar</h2><p className="muted">Autoridade efetiva depende de designação ativa, aeródromo e vigência. Roles técnicas, inclusive SYSTEM_ADMIN, não concedem autoridade automaticamente.</p><div className="table-wrap"><table><thead><tr><th>Função regulamentar</th><th>Multiplicidade</th><th>Acumulação</th><th>Autoridades configuradas</th></tr></thead><tbody>
      {initial.roles.map((role) => <tr key={role.id}><td>{role.name}<br /><span className="muted">{role.code}</span></td><td>{role.holderMultiplicity}</td><td>{role.accumulationPolicy}</td><td>{role.authorities.map((mapping) => mapping.regulatoryAuthority.code).join(", ") || "Nenhuma"}</td></tr>)}
    </tbody></table></div></section>
  </div>;
}
