import { SafetyPolicyWorkspace } from "@/components/safety-policy-workspace";
import { getAuthorizationContext, requirePageSession } from "@/server/auth/session";
import { isLocalPreviewSession } from "@/server/local-preview";
import { getLocalSafetyPolicyPreview } from "@/server/safety-policy/preview";
import { getSafetyPolicyWorkspace } from "@/server/safety-policy/service";

function serialize(data: Awaited<ReturnType<typeof getSafetyPolicyWorkspace>> | ReturnType<typeof getLocalSafetyPolicyPreview>) {
  return (data.policy?.versions ?? []).map((version) => ({ ...version, effectiveFrom: version.effectiveFrom?.toISOString() ?? null, effectiveTo: version.effectiveTo?.toISOString() ?? null, approval: version.approval ? { ...version.approval, approvedAt: version.approval.approvedAt.toISOString() } : null, reviews: version.reviews.map((review) => ({ ...review, reviewedAt: review.reviewedAt.toISOString(), nextReviewAt: review.nextReviewAt?.toISOString() ?? null })), communications: version.communications.map((communication) => ({ ...communication, communicatedAt: communication.communicatedAt.toISOString() })), objectives: version.objectives.map((objective) => ({ ...objective, dueDate: objective.dueDate.toISOString(), targetValue: objective.targetValue ?? null, unit: objective.unit ?? null })) }));
}
export default async function SafetyPolicyPage() {
  const session = await requirePageSession();
  if (isLocalPreviewSession(session)) return <SafetyPolicyWorkspace airportName="Aeródromo de visualização local" versions={serialize(getLocalSafetyPolicyPreview())} previewMode />;
  if (!session.activeOrganizationId || !session.activeAirportId) return <><p className="eyebrow">Configurações</p><h1>Política e Objetivos</h1><div className="card"><p className="muted">Selecione uma organização e um aeródromo.</p></div></>;
  const authz = await getAuthorizationContext(session.userId);
  const data = await getSafetyPolicyWorkspace({ authz, organizationId: session.activeOrganizationId, airportId: session.activeAirportId });
  return <SafetyPolicyWorkspace airportName={session.activeAirport?.name ?? "Aeródromo selecionado"} versions={serialize(data)} />;
}
