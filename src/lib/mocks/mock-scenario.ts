import type { ExperienceError, ExperienceErrorCode } from "@/types/experience";

export type MockScenario = "success" | "offline" | "timeout" | ExperienceErrorCode;

export function mockError(code: ExperienceErrorCode): ExperienceError {
  const messages: Record<ExperienceErrorCode, string> = {
    UNAUTHENTICATED: "Entre novamente para continuar.",
    QR_INVALID: "Este QR Code não é válido.",
    QR_EXPIRED: "Este QR Code expirou.",
    QR_ALREADY_USED: "Este QR Code já foi utilizado.",
    QR_OTHER_EVENT: "Este QR Code pertence a outro evento.",
    COOLDOWN_ACTIVE: "Aguarde antes de participar novamente.",
    PARTICIPATION_REQUIRED: "Participe de uma atividade antes de criar um momento.",
    MOMENT_ALREADY_CREATED: "Já existe um momento para esta participação.",
    IMAGE_INVALID: "A imagem não é válida.",
    IMAGE_TOO_LARGE: "A imagem excede o tamanho permitido.",
    CONSENT_REQUIRED: "Informe o consentimento de publicação.",
    RATE_LIMITED: "Muitas tentativas. Aguarde um instante.",
    OFFLINE: "Você está sem conexão.",
    TIMEOUT: "A solicitação demorou demais. Tente novamente.",
  };
  return { code, message: messages[code] };
}

export async function resolveMockScenario<T>(scenario: MockScenario, value: T, latencyMs = 250): Promise<T> {
  await new Promise<void>((resolve) => setTimeout(resolve, latencyMs));
  if (scenario === "success") return value;
  if (scenario === "offline") throw mockError("OFFLINE");
  if (scenario === "timeout") throw mockError("TIMEOUT");
  throw mockError(scenario);
}
