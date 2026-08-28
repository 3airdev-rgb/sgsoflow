import { ConflictError } from "@/server/errors";

export type VersionedProfile = {
  id: string;
  airportId: string;
  version: number;
  status: "DRAFT" | "ACTIVE" | "SUPERSEDED";
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

export function nextProfileVersion(existing: ReadonlyArray<VersionedProfile>) {
  return Math.max(0, ...existing.map((profile) => profile.version)) + 1;
}

export function assertValidProfilePeriod(effectiveFrom: Date, effectiveTo: Date | null) {
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new ConflictError("A data final da vigência não pode anteceder a data inicial.");
  }
}

export function planProfileActivation(profiles: ReadonlyArray<VersionedProfile>, profileId: string, activatedAt: Date) {
  const target = profiles.find((profile) => profile.id === profileId);
  if (!target) throw new ConflictError("Perfil regulatório não encontrado para ativação.");
  if (target.status === "SUPERSEDED") throw new ConflictError("Uma versão substituída não pode ser reativada.");
  const dayBefore = new Date(activatedAt);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  return {
    targetId: target.id,
    superseded: profiles
      .filter((profile) => profile.status === "ACTIVE" && profile.id !== target.id)
      .map((profile) => ({ id: profile.id, status: "SUPERSEDED" as const, effectiveTo: profile.effectiveTo ?? dayBefore })),
  };
}

export function rejectCompletedAssessmentMutation(): never {
  throw new ConflictError("Avaliações regulatórias concluídas são imutáveis; execute uma nova avaliação.");
}
