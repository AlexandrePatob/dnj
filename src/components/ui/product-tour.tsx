"use client";

import { Joyride, STATUS, type Step } from "react-joyride";

const Tour = Joyride as any;

const steps: Step[] = [
  { target: "[data-tour='participant-header']", title: "Bem-vindo ao DNJ!", content: "Conheça rapidamente sua Home e descubra onde encontrar cada funcionalidade do app." },
  { target: "[data-tour='bottom-nav']", title: "Tudo em um só lugar", content: "Use esta barra para navegar por Home, Momentos, DNJ Game, Fila e Conta. Depois, a Home fica com você para começar sua jornada." },
];

export function ParticipantProductTour({ run, onFinish }: { run: boolean; onFinish: () => void }) {
  return <Tour steps={steps} run={run} continuous showSkipButton showProgress callback={(data: { status?: string }) => { if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) onFinish(); }} locale={{ back: "Voltar", close: "Fechar", last: "Concluir", next: "Próximo", skip: "Pular" }} styles={{ options: { primaryColor: "#ed7222", zIndex: 100 } }} />;
}
