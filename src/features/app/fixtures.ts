export const YOUTH_GROUPS = [
  "Jovens da Paróquia Nossa Senhora da Luz",
  "Grupo Chama Viva – Bairro Alto",
  "Comunidade Jovem São Francisco",
  "Jovens Esperança – Fazendinha",
  "GJC Santa Teresinha – Portão",
  "Grupo Viver Cristo – CIC",
  "Jovens da Sagrada Família – Bacacheri",
  "Movimento Jovem São José – Cajuru",
  "Jovens do Caminho – Água Verde",
  "GJC Ressurreição – Boa Vista",
];

export const SPACES = [
  { id: 1, name: "Espaço Juventude", desc: "Local central de encontro e convivência dos jovens durante o evento. Programação cultural, música ao vivo e momentos de partilha." },
  { id: 2, name: "Espaço Esperança", desc: "Dedicado à reconciliação e à escuta. Oferece confissões e direção espiritual com sacerdotes e orientadores." },
  { id: 3, name: "Espaço Radicalidade", desc: "Dinâmicas e desafios para aprofundar a fé. Testemunhos, debates e atividades que provocam uma resposta radical ao Evangelho." },
  { id: 4, name: "Espaço Santidade", desc: "Momentos de adoração, oração e contemplação. Ambiente preparado para o encontro pessoal com Deus." },
  { id: 5, name: "Feira Vocacional", desc: "Conheça comunidades religiosas, congregações e movimentos. Uma oportunidade para descobrir o chamado de Deus na sua vida." },
  { id: 6, name: "Espaço Missão", desc: "Informações sobre projetos missionários, voluntariado e ação social da Diocese de Curitiba." },
];

export const MAP_PINS = [
  { id: 1, label: "Espaço Juventude", x: 48, y: 38, color: "var(--primary)" },
  { id: 2, label: "Espaço Esperança", x: 27, y: 55, color: "var(--chart-2)" },
  { id: 3, label: "Espaço Radicalidade", x: 65, y: 58, color: "var(--accent)" },
  { id: 4, label: "Espaço Santidade", x: 42, y: 72, color: "var(--secondary)" },
  { id: 5, label: "Feira Vocacional", x: 72, y: 30, color: "var(--chart-5)" },
];

export const POINTS_LOG = [
  { id: 1, icon: "qr", label: "QR Code – Abertura do evento", points: 50, time: "14:32" },
  { id: 2, icon: "star", label: "Desafio bíblico completado", points: 30, time: "15:10" },
  { id: 3, icon: "heart", label: "Ação solidária registrada", points: 40, time: "15:55" },
  { id: 4, icon: "zap", label: "Primeiro acesso ao app", points: 10, time: "14:00" },
  { id: 5, icon: "users", label: "Participação em grupo", points: 20, time: "16:20" },
];

export const INDIVIDUAL_RANKING = [
  { id: 1, name: "Ana Carolina Silva", group: "Chama Viva", points: 380, isUser: false },
  { id: 2, name: "Lucas Fernandes", group: "GJC Santa Teresinha", points: 340, isUser: false },
  { id: 3, name: "Maria Eduarda Costa", group: "Jovens da Luz", points: 310, isUser: false },
  { id: 4, name: "João Pedro Alves", group: "Grupo São Francisco", points: 280, isUser: false },
  { id: 5, name: "Beatriz Oliveira", group: "Jovens Esperança", points: 260, isUser: false },
  { id: 6, name: "Rafael Santos", group: "Jovens do Caminho", points: 240, isUser: false },
  { id: 7, name: "Júlia Mendes", group: "GJC Ressurreição", points: 210, isUser: false },
  { id: 8, name: "Gabriel Lima", group: "Mov. Jovem São José", points: 190, isUser: false },
  { id: 9, name: "Você", group: "Chama Viva", points: 150, isUser: true },
  { id: 10, name: "Larissa Rocha", group: "Jovens do Caminho", points: 130, isUser: false },
  { id: 11, name: "Pedro Henrique", group: "Comunidade São Francisco", points: 120, isUser: false },
  { id: 12, name: "Camila Souza", group: "Grupo Viver Cristo", points: 110, isUser: false },
  { id: 13, name: "Felipe Andrade", group: "Jovens da Luz", points: 105, isUser: false },
  { id: 14, name: "Isabela Martins", group: "GJC Santa Teresinha", points: 98, isUser: false },
  { id: 15, name: "Thiago Carvalho", group: "Jovens Esperança", points: 92, isUser: false },
  { id: 16, name: "Fernanda Lima", group: "Chama Viva", points: 87, isUser: false },
  { id: 17, name: "Mateus Oliveira", group: "Grupo São Francisco", points: 83, isUser: false },
  { id: 18, name: "Vitória Pereira", group: "GJC Ressurreição", points: 78, isUser: false },
  { id: 19, name: "Bruno Costa", group: "Mov. Jovem São José", points: 74, isUser: false },
  { id: 20, name: "Amanda Ferreira", group: "Jovens do Caminho", points: 70, isUser: false },
  { id: 21, name: "Rodrigo Almeida", group: "Jovens da Luz", points: 66, isUser: false },
  { id: 22, name: "Natália Souza", group: "Grupo Viver Cristo", points: 62, isUser: false },
  { id: 23, name: "Leonardo Gomes", group: "GJC Santa Teresinha", points: 58, isUser: false },
  { id: 24, name: "Priscila Nunes", group: "Chama Viva", points: 54, isUser: false },
  { id: 25, name: "Diego Ribeiro", group: "Jovens Esperança", points: 50, isUser: false },
  { id: 26, name: "Caroline Teixeira", group: "Grupo São Francisco", points: 46, isUser: false },
  { id: 27, name: "Samuel Borges", group: "GJC Ressurreição", points: 42, isUser: false },
  { id: 28, name: "Mariana Castro", group: "Jovens do Caminho", points: 38, isUser: false },
  { id: 29, name: "Henrique Dias", group: "Mov. Jovem São José", points: 34, isUser: false },
  { id: 30, name: "Júlia Ramos", group: "Comunidade São Francisco", points: 30, isUser: false },
];

export const GROUP_RANKING = [
  { id: 1, name: "Chama Viva – Bairro Alto", members: 12, points: 1840 },
  { id: 2, name: "GJC Santa Teresinha", members: 10, points: 1620 },
  { id: 3, name: "Jovens da Luz", members: 14, points: 1540 },
  { id: 4, name: "Jovens Esperança", members: 9, points: 1320 },
  { id: 5, name: "Grupo São Francisco", members: 11, points: 1180 },
  { id: 6, name: "Jovens do Caminho", members: 8, points: 1040 },
  { id: 7, name: "GJC Ressurreição", members: 13, points: 960 },
  { id: 8, name: "Movimento Jovem São José", members: 7, points: 820 },
  { id: 9, name: "Comunidade São Francisco", members: 9, points: 740 },
  { id: 10, name: "Grupo Viver Cristo – CIC", members: 6, points: 650 },
];

export const CONFESSION_FAQ = [
  { q: "Como me preparar para a confissão?", a: "Reserve um momento de silêncio e faça um exame de consciência, recordando seus atos, palavras e omissões desde a última confissão. Peça ao Espírito Santo que ilumine sua memória e seu coração." },
  { q: "Como fazer um bom exame de consciência?", a: "Reflita sobre os 10 mandamentos e as virtudes cristãs. Pergunte-se: amei a Deus acima de tudo? Respeitei o próximo? Fui honesto? Pratiquei obras de misericórdia?" },
  { q: "O que digo ao padre na confissão?", a: "Diga o tempo da última confissão, seus pecados com sinceridade e peça a absolvição. Não precisa ser perfeito — Deus valoriza a honestidade e a contrição do coração." },
  { q: "O que é a contrição?", a: "É o arrependimento sincero pelos pecados cometidos e o firme propósito de não pecar mais. É o elemento mais importante para uma boa confissão." },
  { q: "O sigilo da confissão é garantido?", a: "Sim. O sigilo sacramental é absoluto. O padre nunca pode revelar o que ouviu em confissão, sob nenhuma circunstância." },
];

export const SPIRITUAL_FAQ = [
  { q: "O que é direção espiritual?", a: "É um acompanhamento pessoal feito por um padre ou orientador espiritual para ajudá-lo a discernir a vontade de Deus em sua vida, crescer na oração e tomar decisões à luz da fé." },
  { q: "Qual a diferença entre confissão e direção espiritual?", a: "A confissão é um sacramento de perdão. A direção espiritual é um diálogo de discernimento — não precisa incluir absolvição, embora possa acontecer junto." },
  { q: "Como aproveitar melhor esse momento?", a: "Venha com abertura e honestidade. Pense antes nas perguntas que carrega no coração — vocação, relacionamentos, oração, dificuldades na fé. O diretor espiritual é um companheiro de caminho, não um juiz." },
  { q: "Preciso me preparar?", a: "Não é obrigatório, mas ajuda. Passe alguns minutos em oração antes, pedindo luz ao Espírito Santo. Trazer um tema ou questão específica torna o encontro mais frutífero." },
];
