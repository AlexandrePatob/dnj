"use client";

import { Joyride, STATUS, type Step } from "react-joyride";

const Tour = Joyride as any;

const steps: Step[] = [
  { target: "[data-tour='participant-header']", content: "Aqui você acessa sua conta e acompanha seus pontos no DNJ Game." },
  { target: "[data-tour='journey']", content: "Esta é a sua jornada: veja seu progresso e as próximas conquistas." },
  { target: "[data-tour='schedule']", content: "Consulte a programação e descubra o que está acontecendo agora." },
  { target: "[data-tour='map']", content: "Use o mapa para encontrar os espaços e experiências do evento." },
  { target: "[data-tour='bottom-nav']", content: "Navegue entre Home, Momentos, DNJ Game, Fila e Conta." },
];

export function ParticipantProductTour({ run, onFinish }: { run: boolean; onFinish: () => void }) {
  return <Tour steps={steps} run={run} continuous showSkipButton showProgress callback={(data: { status?: string }) => { if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) onFinish(); }} locale={{ back: "Voltar", close: "Fechar", last: "Concluir", next: "Próximo", skip: "Pular" }} styles={{ options: { primaryColor: "#ed7222", zIndex: 100 } }} />;
}
