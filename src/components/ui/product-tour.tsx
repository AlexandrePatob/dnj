"use client";

import { Joyride, ACTIONS, STATUS, type Step } from "react-joyride";

const Tour = Joyride as any;

const steps: Step[] = [
  { target: "[data-tour='bottom-nav']", title: "Home", content: "Aqui começa sua jornada. Agora vamos conhecer as outras áreas do app." },
  { target: "[data-tour='bottom-nav']", title: "Momentos", content: "Em Momentos, você acompanha os registros e experiências da comunidade." },
  { target: "[data-tour='bottom-nav']", title: "DNJ Game", content: "No DNJ Game, você participa das experiências e acompanha seus pontos." },
  { target: "[data-tour='bottom-nav']", title: "Fila", content: "Na Fila, você acompanha sua posição nas experiências do evento." },
  { target: "[data-tour='bottom-nav']", title: "Conta", content: "Na Conta, você confere seus dados e preferências. Depois, voltamos para a Home." },
];

export function ParticipantProductTour({ run, onFinish, onNavigate }: { run: boolean; onFinish: () => void; onNavigate: (screen: "home" | "gallery" | "game" | "queue" | "account") => void }) {
  const routeByStep = ["home", "gallery", "game", "queue", "account"] as const;
  const handleCallback = (data: { status?: string; action?: string; index?: number }) => {
    const index = data.index ?? 0;
    if (data.status === STATUS.SKIPPED || data.status === STATUS.FINISHED) { onNavigate("home"); onFinish(); return; }
    if (data.action === ACTIONS.NEXT && index < routeByStep.length - 1) onNavigate(routeByStep[index + 1]);
    if (data.action === ACTIONS.PREV && index > 0) onNavigate(routeByStep[index - 1]);
  };
  return <Tour steps={steps} run={run} continuous showSkipButton showProgress callback={handleCallback} locale={{ back: "Voltar", close: "Fechar", last: "Concluir", next: "Próximo", skip: "Pular" }} styles={{ options: { primaryColor: "#ed7222", zIndex: 100 } }} />;
}
