export type ConfessionPreparationSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
  afterItems?: string[];
  itemHeadingIndexes?: number[];
};

export const CONFESSION_PREPARATION: ConfessionPreparationSection[] = [
  {
    title: "COMO ME PREPARAR PARA A CONFISSÃO?",
    paragraphs: [
      "A confissão é um encontro com a misericórdia de Deus.",
      "Reserve alguns minutos para silenciar o coração e peça ao Espírito Santo que lhe mostre, com sinceridade, aquilo que precisa ser entregue a Deus.",
      "Para se preparar:",
    ],
    items: [
      "Reze e coloque-se na presença de Deus.",
      "Faça seu exame de consciência, recordando seus pecados desde a última confissão.",
      "Arrependa-se sinceramente e tenha o desejo de mudar.",
      "Confesse seus pecados com sinceridade, sem esconder voluntariamente aquilo que sabe que precisa confessar.",
      "Acolha a absolvição e cumpra a penitência indicada pelo sacerdote.",
    ],
    afterItems: [
      "Não precisa decorar nenhuma fórmula e nem encontrar as palavras perfeitas. Se não souber como começar, diga isso ao padre. Ele vai ajudá-lo.",
      "A própria CNBB recomenda que a preparação envolva oração, recordação da última confissão, reflexão sobre a própria vida, confissão sincera e acolhida do perdão de Deus.",
    ],
  },
  {
    title: "ORAÇÃO ANTES DO EXAME DE CONSCIÊNCIA",
    paragraphs: [
      "Vinde, Espírito Santo.",
      "Iluminai minha inteligência e meu coração para que eu possa olhar com sinceridade para a minha vida.",
      "Mostrai-me aquilo que me afastou de Deus, as vezes em que feri o próximo e também as vezes em que deixei de fazer o bem.",
      "Dai-me a graça de reconhecer meus pecados sem medo e sem desculpas, confiando sempre na misericórdia de Deus.",
      "Jesus, dai-me um coração verdadeiramente arrependido e o desejo sincero de recomeçar.",
      "Amém.",
    ],
  },
  {
    title: "FAÇA SEU EXAME DE CONSCIÊNCIA",
    paragraphs: [
      "Aqui eu evitaria uma lista enorme de pecados. O próprio Catecismo orienta que o exame seja feito à luz da Palavra de Deus, especialmente do Decálogo e dos ensinamentos de Jesus.",
      "Minha relação com Deus",
    ],
    items: [
      "Tenho colocado Deus em primeiro lugar ou tenho vivido como se Ele não fizesse parte da minha vida?",
      "Tenho rezado? Tenho participado da Missa aos domingos?",
      "Tenho vergonha da minha fé ou me afastado conscientemente de Deus?",
      "Usei o nome de Deus de maneira desrespeitosa?",
      "Busquei superstição, horóscopo, espiritismo, ocultismo ou práticas contrárias à fé?",
      "Minha relação com as pessoas",
      "Tenho desrespeitado meus pais, familiares ou pessoas que têm responsabilidade sobre mim?",
      "Guardo ódio, rancor ou desejo de vingança? Recuso-me a perdoar?",
      "Menti, enganei, manipulei ou prejudiquei alguém?",
      "Fiz fofoca, difamei, humilhei ou falei mal de alguém?",
      "Roubei, peguei algo que não era meu ou fui desonesto?",
      "Fui indiferente diante de alguém que precisava de mim?",
      "Minha afetividade e meu corpo",
      "Tenho respeitado a dignidade do meu corpo e do corpo das outras pessoas?",
      "Vivi minha sexualidade de maneira contrária à castidade?",
      "Busquei ou compartilhei pornografia?",
      "Usei alguém para minha satisfação ou alimentei pensamentos e atitudes que tiram do outro sua dignidade?",
      "Em meus relacionamentos, tenho amado verdadeiramente ou tenho usado, manipulado, traído ou desrespeitado?",
      "Minha vida e minhas escolhas",
      "Tenho abusado de álcool ou usado drogas? Coloquei minha vida ou a vida de outras pessoas em risco?",
      "Tenho sido dominado pela inveja, orgulho, egoísmo, raiva ou ganância?",
      "Tenho sido irresponsável com meus estudos, trabalho e deveres?",
      "Nas redes sociais, tenho ferido, exposto, julgado ou alimentado aquilo que me afasta de Deus?",
      "Existe algum pecado que eu esteja tentando justificar porque não quero abandoná-lo?",
      "Agora pense: O que hoje mais pesa no meu coração e precisa ser colocado diante da misericórdia de Deus?",
    ],
    itemHeadingIndexes: [5, 12, 18],
  },
  {
    title: "PARA UMA BOA CONFISSÃO",
    items: [
      "Exame de consciência: Reconhecer com sinceridade os pecados cometidos.",
      "Arrependimento (contrição): Sentir pesar por ter pecado e reconhecê-lo como uma ofensa a Deus. A contrição ocupa o primeiro lugar entre os atos do penitente.",
      "Propósito de mudança: Desejar sinceramente abandonar o pecado. Isso não significa prometer que nunca mais vai cair, mas estar disposto, naquele momento, a lutar para não permanecer voluntariamente no pecado.",
      "Confissão sincera: Dizer ao sacerdote os pecados de que se recorda, especialmente todos os pecados graves ainda não confessados. Não esconda deliberadamente um pecado grave por vergonha.",
      "Penitência: Depois da absolvição, cumprir a penitência indicada pelo sacerdote e, quando necessário, procurar reparar o mal causado.",
    ],
    paragraphs: [
      "Não tenha medo. O padre está ali para ser instrumento da misericórdia de Deus. Se você estiver nervoso, não souber se algo é pecado ou não souber como se confessar, simplesmente diga isso a ele.",
    ],
  },
  {
    title: "O QUE EU DIGO AO PADRE?",
    paragraphs: [
      "Ao chegar, você pode dizer:",
      "“Padre, abençoai-me porque pequei. Minha última confissão foi há... (falar há quanto tempo não se confessa)”",
      "Se não lembrar, tudo bem:",
      "“Padre, faz muito tempo que não me confesso e não lembro exatamente quando foi.”",
      "Depois, conte com simplicidade os pecados que você reconheceu no seu exame de consciência.",
      "Você não precisa contar uma história enorme nem justificar cada pecado. Diga com sinceridade aquilo que fez.",
      "Se for um pecado grave, procure dizer também aproximadamente quantas vezes aconteceu, na medida em que conseguir se recordar. A Igreja pede que os pecados graves sejam confessados em espécie e número, na medida em que sejam conhecidos após diligente exame.",
      "Ao terminar, você pode dizer:",
      "“Por estes e por todos os pecados da minha vida, peço perdão a Deus.”",
      "Então escute o sacerdote. Ele poderá aconselhá-lo, dará uma penitência e pedirá que manifeste seu arrependimento.",
      "Não lembra como continuar? Pode falar para ele. O padre conduz o restante.",
    ],
  },
  {
    title: "ATO DE CONTRIÇÃO",
    paragraphs: [
      "Meu Deus, eu me arrependo de todo o coração de Vos ter ofendido, porque sois tão bom e amável.",
      "Com a vossa graça, quero mudar de vida, evitar o pecado e tudo aquilo que me afasta de Vós.",
      "Confio na vossa infinita misericórdia e peço que me perdoeis e me ajudeis a recomeçar.",
      "Amém.",
      "Você foi perdoado. Agradeça a Deus pela graça recebida, cumpra sua penitência e siga em frente com o coração renovado.",
      "“Vai, e de agora em diante não peques mais.”Jo 8,11",
    ],
  },
];
