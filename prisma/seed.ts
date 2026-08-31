import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const SOURCE_ID = "10000000-0000-4000-8000-000000000001";
const EFFECTIVE_FROM = new Date("2026-05-27T00:00:00.000Z");
const requirementSeed = [
  ["153.51", "Sistema de Gerenciamento da Segurança Operacional (SGSO) - Generalidades", "Identifica a aplicabilidade das disposições gerais de SGSO.", "SGSO"],
  ["153.53", "SGSO - Política e objetivos de segurança operacional", "Identifica a aplicabilidade do componente de política e objetivos do SGSO.", "SGSO"],
  ["153.55", "SGSO - Gerenciamento dos riscos de segurança operacional", "Identifica a aplicabilidade do componente de gerenciamento de riscos do SGSO.", "SGSO"],
  ["153.57", "SGSO - Garantia da segurança operacional", "Identifica a aplicabilidade do componente de garantia do SGSO.", "SGSO"],
  ["153.59", "SGSO - Promoção da segurança operacional", "Identifica a aplicabilidade do componente de promoção do SGSO.", "SGSO"],
  ["153.63", "Plano de Gerenciamento da Segurança Operacional (PGSO) - Generalidades", "Identifica a aplicabilidade das disposições gerais de PGSO.", "PGSO"],
  ["153.73", "Gerenciamento de aspectos críticos de segurança operacional", "Identifica a aplicabilidade do gerenciamento de aspectos críticos.", "CRITICAL_SAFETY_ASPECTS"],
] as const;

const governanceRoleSeed = [
  ["ACCOUNTABLE_MANAGER", "Gestor Responsável", "Titular da responsabilidade executiva regulamentar do aeródromo.", "SINGLE", "REQUIRES_REVIEW", "RBAC 153.15(a)(1) e 153.23"],
  ["SAFETY_MANAGER", "Responsável pelo SGSO", "Responsável pela coordenação da segurança operacional.", "SINGLE", "REQUIRES_REVIEW", "RBAC 153.15(a)(2) e 153.25"],
  ["OPERATIONS_MANAGER", "Gestor de Operações", "Responsável gerencial pela área de operações.", "SINGLE", "REQUIRES_REVIEW", "RBAC 153.15(a)(3) e 153.27"],
  ["MAINTENANCE_MANAGER", "Gestor de Manutenção", "Responsável gerencial pela área de manutenção.", "SINGLE", "REQUIRES_REVIEW", "RBAC 153.15(a)(4) e 153.29"],
  ["EMERGENCY_RESPONSE_MANAGER", "Gestor de Resposta à Emergência", "Responsável gerencial pela preparação de resposta à emergência.", "SINGLE", "REQUIRES_REVIEW", "RBAC 153.15(a)(5) e 153.31"],
  ["CSO_MEMBER", "Membro da CSO", "Participante designado para a Comissão de Segurança Operacional.", "MULTIPLE", "ALLOWED", "RBAC 153.53(c)(2); IS 153.51-001A"],
] as const;
const governanceAuthoritySeed = [
  ["VIEW_SAFETY_GOVERNANCE", "Visualizar governança de segurança", "Consulta da estrutura de governança de segurança operacional."],
  ["MANAGE_REGULATORY_DESIGNATIONS", "Gerenciar designações regulamentares", "Administração estrutural das designações regulamentares."],
  ["MANAGE_CSO", "Gerenciar CSO", "Administração estrutural da Comissão de Segurança Operacional."],
  ["VIEW_REGULATORY_STRUCTURE", "Visualizar estrutura regulamentar", "Consulta da estrutura regulamentar e da matriz de autoridade."],
  ["DIRECT_ACCESS_ACCOUNTABLE_MANAGER", "Acesso direto ao Gestor Responsável", "Prerrogativa funcional do responsável pelo SGSO.", "RBAC 153.25(b)(1); IS 153.51-001A"],
  ["ACCESS_REQUIRED_SAFETY_DATA", "Acesso aos dados de segurança necessários", "Prerrogativa funcional do responsável pelo SGSO.", "RBAC 153.25(b)(2); IS 153.51-001A"],
] as const;

const publicAerodrome = { field: "aerodromeUse", operator: "EQ", value: "PUBLIC" } as const;
const subjectToSubpartC = { field: "isMilitarySharedAerodrome", operator: "EQ", value: false } as const;
const noCertificate = { field: "hasOperationalCertificate", operator: "EQ", value: false } as const;
const noSGSO = { field: "hasSGSO", operator: "EQ", value: false } as const;
const regularOperation = { any: [
  { field: "operatesRegularRBAC121", operator: "EQ", value: true },
  { field: "operatesRegularRBAC135", operator: "EQ", value: true },
] } as const;
const noRegularOperation = { all: [
  { field: "operatesRegularRBAC121", operator: "EQ", value: false },
  { field: "operatesRegularRBAC135", operator: "EQ", value: false },
] } as const;

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-before-production";
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD deve conter pelo menos 12 caracteres.");
  const user = await prisma.user.upsert({ where: { email }, update: { name: "Administrador local", passwordHash: await hash(password, 12), status: "ACTIVE" }, create: { name: "Administrador local", email, passwordHash: await hash(password, 12) } });
  const organization = await prisma.organization.upsert({ where: { id: "00000000-0000-4000-8000-000000000001" }, update: {}, create: { id: "00000000-0000-4000-8000-000000000001", legalName: "Organização local de desenvolvimento", tradeName: "Operador local" } });
  const airport = await prisma.airport.upsert({ where: { id: "00000000-0000-4000-8000-000000000002" }, update: {}, create: { id: "00000000-0000-4000-8000-000000000002", organizationId: organization.id, name: "Aeródromo local de desenvolvimento", city: "São Paulo", state: "SP" } });
  const membership = await prisma.membership.upsert({ where: { userId_organizationId: { userId: user.id, organizationId: organization.id } }, update: { role: "ORGANIZATION_ADMIN", status: "ACTIVE" }, create: { userId: user.id, organizationId: organization.id, role: "ORGANIZATION_ADMIN" } });
  await prisma.airportAccess.upsert({ where: { membershipId_airportId: { membershipId: membership.id, airportId: airport.id } }, update: { role: "AIRPORT_ADMIN", status: "ACTIVE" }, create: { membershipId: membership.id, airportId: airport.id, role: "AIRPORT_ADMIN" } });
  await prisma.regulatorySource.upsert({
    where: { id: SOURCE_ID },
    update: { status: "ACTIVE", title: "Aeródromos - Operação, Manutenção e Resposta à Emergência" },
    create: {
      id: SOURCE_ID, authority: "ANAC", regulation: "RBAC 153", amendment: "EMD 11",
      title: "Aeródromos - Operação, Manutenção e Resposta à Emergência",
      effectiveFrom: EFFECTIVE_FROM,
      officialReference: "https://pergamum.anac.gov.br/pergamum/vinculos/RBAC153EMD11.pdf",
    },
  });
  for (const [index, [section, title, summary, regime]] of requirementSeed.entries()) {
    const suffix = String(index + 1).padStart(12, "0");
    const requirementId = `20000000-0000-4000-8000-${suffix}`;
    const ruleId = `30000000-0000-4000-8000-${suffix}`;
    await prisma.regulatoryRequirement.upsert({
      where: { id: requirementId },
      update: { title, summary, status: "ACTIVE" },
      create: { id: requirementId, regulatorySourceId: SOURCE_ID, section, title, summary, requirementType: "OBR", effectiveFrom: EFFECTIVE_FROM },
    });
    const conditions = regime === "SGSO"
      ? { all: [publicAerodrome, subjectToSubpartC, { field: "hasOperationalCertificate", operator: "EQ", value: true }] }
      : regime === "PGSO"
        ? { all: [publicAerodrome, subjectToSubpartC, noCertificate, noSGSO, regularOperation] }
        : { all: [publicAerodrome, subjectToSubpartC, noCertificate, noSGSO, { field: "hasPGSO", operator: "EQ", value: false }, noRegularOperation] };
    const rationaleTemplate = regime === "SGSO"
      ? `RBAC ${section} aplicável porque o aeródromo é de uso público e detentor de Certificado Operacional de Aeroporto conforme o RBAC 139.`
      : regime === "PGSO"
        ? "RBAC 153.63 aplicável porque o aeródromo é de uso público, não possui SGSO e opera RBAC 121 ou RBAC 135 regular."
        : "RBAC 153.73 aplicável porque o aeródromo é de uso público, não possui SGSO nem PGSO e não opera RBAC 121 ou RBAC 135 regular.";
    await prisma.applicabilityRule.upsert({
      where: { id: ruleId },
      update: { conditions, status: "ACTIVE", rationaleTemplate },
      create: {
        id: ruleId, regulatoryRequirementId: requirementId, version: 1, conditions,
        resultWhenMatched: "APPLICABLE", managementRegime: regime,
        rationaleTemplate,
        effectiveFrom: EFFECTIVE_FROM,
      },
    });
  }
  const roleIds = new Map<string, string>();
  for (const [index, [code, name, description, holderMultiplicity, accumulationPolicy, sourceReference]] of governanceRoleSeed.entries()) {
    const id = `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    roleIds.set(code, id);
    await prisma.regulatoryRole.upsert({ where: { code }, update: { name, description, sourceReference, status: "ACTIVE", holderMultiplicity, accumulationPolicy }, create: { id, code, name, description, sourceReference, holderMultiplicity, accumulationPolicy } });
  }
  const authorityIds = new Map<string, string>();
  for (const [index, [code, name, description, sourceReference]] of governanceAuthoritySeed.entries()) {
    const id = `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    authorityIds.set(code, id);
    await prisma.regulatoryAuthority.upsert({ where: { code }, update: { name, description, sourceReference: sourceReference ?? null, status: "ACTIVE" }, create: { id, code, name, description, sourceReference: sourceReference ?? null } });
  }
  const accountableManagerId = roleIds.get("ACCOUNTABLE_MANAGER")!;
  await prisma.regulatoryResponsibility.upsert({
    where: { regulatoryRoleId_code: { regulatoryRoleId: accountableManagerId, code: "ENSURE_RESOURCE_AVAILABILITY" } },
    update: { title: "Garantir disponibilidade de recursos", description: "Responsabilidade técnica estrutural, sujeita à fonte normativa aplicável.", status: "ACTIVE" },
    create: { regulatoryRoleId: accountableManagerId, code: "ENSURE_RESOURCE_AVAILABILITY", title: "Garantir disponibilidade de recursos", description: "Responsabilidade técnica estrutural, sujeita à fonte normativa aplicável." },
  });
  const mappings = [
    ["ACCOUNTABLE_MANAGER", "VIEW_SAFETY_GOVERNANCE"], ["ACCOUNTABLE_MANAGER", "VIEW_REGULATORY_STRUCTURE"],
    ["SAFETY_MANAGER", "VIEW_SAFETY_GOVERNANCE"], ["SAFETY_MANAGER", "VIEW_REGULATORY_STRUCTURE"],
    ["ACCOUNTABLE_MANAGER", "MANAGE_REGULATORY_DESIGNATIONS"], ["SAFETY_MANAGER", "MANAGE_CSO"],
    ["SAFETY_MANAGER", "DIRECT_ACCESS_ACCOUNTABLE_MANAGER"], ["SAFETY_MANAGER", "ACCESS_REQUIRED_SAFETY_DATA"],
  ] as const;
  for (const [index, [roleCode, authorityCode]] of mappings.entries()) {
    const regulatoryRoleId = roleIds.get(roleCode)!; const regulatoryAuthorityId = authorityIds.get(authorityCode)!;
    await prisma.regulatoryRoleAuthority.upsert({
      where: { regulatoryRoleId_regulatoryAuthorityId_effectiveFrom: { regulatoryRoleId, regulatoryAuthorityId, effectiveFrom: EFFECTIVE_FROM } }, update: { status: "ACTIVE" },
      create: { id: `60000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, regulatoryRoleId, regulatoryAuthorityId, effectiveFrom: EFFECTIVE_FROM },
    });
  }
  await prisma.auditLog.create({ data: { userId: user.id, organizationId: organization.id, airportId: airport.id, action: "DEVELOPMENT_SEED_APPLIED", entityType: "System", metadata: { environment: "local", regulatorySource: "RBAC 153 EMD 11", requirements: requirementSeed.length } } });
}
main().finally(() => prisma.$disconnect());
