# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Brasileiros jovens adultos — freelancers, estudantes e empreendedores — que gerenciam finanças pessoais e compartilhadas. Usam o app no celular ou desktop depois do trabalho ou fim de semana, querendo entender rapidamente para onde o dinheiro foi e quanto estão devendo ou a receber de amigos.

## Product Purpose

Hedge é um controlador financeiro pessoal e colaborativo: registra gastos pessoais, divide contas entre amigos com rastreio de quem pagou, gerencia cartões de crédito e limites de gasto, e entrega dashboards e relatórios PDF. O sucesso é quando o usuário abre o app e em 30 segundos sabe seu saldo real, o que deve e o que tem a receber.

## Positioning

Dividir e cobrar fazem parte da mesma conta. Um gasto dividido já vira a cobrança de cada pessoa em A receber, e o que elas devolvem entra no saldo e na previsão do fim do mês. Um app de controle de gastos comum registra só a parte de quem usa; o Hedge acompanha o dinheiro que saiu inteiro e volta em pedaços.

## Operating Context

- Site oficial: https://gethedge.vercel.app/. Web responsivo, usado no celular e no desktop; não há app nativo.
- Cada pessoa tem a própria conta (email e senha ou Google). As pessoas com quem ela divide gastos são só nomes cadastrados por ela; não têm acesso ao app.
- O saldo parte do que o banco mostra: a conta nasce com o saldo de hoje e o cartão é conferido com o app do banco (limite disponível e próxima fatura). Não há integração bancária; tudo é lançado à mão.
- A renda fixa só entra no saldo depois de confirmada ("o salário caiu?").
- O Início responde "quanto tenho hoje e quanto vou ter no fim do mês".

## Capabilities and Constraints

- Áreas do app: Início, Gastos (Lançamentos e Limites), A receber (Pessoas, Cobranças, Do mês), Carteira (Contas e Cartões), Configurações e um painel de administração.
- Vocabulário fixo: "Limites de gasto" (não "metas": os testadores entendiam meta como guardar dinheiro), "A receber", "Cobranças", "Do mês", "Fixo", "Minha parte", "Conferir com o banco".
- Categorias de gasto: lista curta e exclusiva (oito por padrão), personalizável por pessoa.
- Dados e autenticação no Supabase, com Row Level Security: cada pessoa só vê o que é dela.
- Gratuito e sem anúncios.
- Em aberto: não há importação de extrato nem conexão com bancos.

## Brand Personality

Confiável, claro, direto. O app mostra os números sem enfeite. Não suaviza déficits nem celebra excessivamente. Fala como um amigo que entende de finanças: honesto, sem jargão, sem melodrama.

## Brand Commitments

- Nome: Hedge. Assinatura da landing: "Seu dinheiro deixa pistas."
- Não existe verde na interface: entrada e saída se distinguem pelo sinal ("+" e "−"), não pela cor.
- Um único acento, o laranja, para a ação principal e para o que pede atenção.

## Anti-references

- **Nubank:** não é app de banco com identidade visual roxa e minimalismo de fintech.
- **Notion / ferramentas genéricas:** não é canvas branco sem identidade; tem personalidade financeira própria.
- **Excel estético:** tabelas densas sem hierarquia visual, interface que parece planilha.
- **SaaS americano genérico:** nada de hero metrics com big numbers + label, glassmorphism decorativo ou cream/sand como cor de fundo.

## Evidence on Hand

- Não há depoimento real. `src/content/testimonials.ts` está vazio de propósito, e a seção "Quem já usa" da landing só aparece quando houver depoimento verdadeiro, com autorização de quem deu. Nenhum deve ser inventado.
- As telas do app mostradas na landing usam dados de demonstração (`src/components/landing/app/mock.ts`), não de usuários.
- Feedback de testadores existe e já orientou mudanças (por exemplo, "Metas" virou "Limites de gasto"), mas não está publicado nem pode ser citado como depoimento.
- Não há números de uso, de clientes ou de imprensa para citar.

## Product Principles

1. **Números são o conteúdo** — os dados financeiros são o herói de cada tela; os componentes visuais servem para revelar os números, não competir com eles.
2. **Uma pergunta por tela** — cada página deve responder uma coisa de forma imediata; complexidade vive nos dados, não na interface.
3. **Vocabulário consistente** — mesmo botão, mesmo card, mesmos indicadores de estado em todo o app; coerência é confiança.
4. **Densidade respeitosa** — informações densas quando o usuário precisa, mas sempre com hierarquia clara entre o que importa agora e o que é detalhe.
5. **A interface deve desaparecer** — o usuário pensa no dinheiro, não na ferramenta; cada clique e cada estado deve ser previsível.

## Accessibility & Inclusion

WCAG AA como piso. Suporte a modo escuro (já implementado). Atenção especial a contraste de texto em surfaces acinzentadas e estados de erro/alerta que não dependam apenas de cor.
