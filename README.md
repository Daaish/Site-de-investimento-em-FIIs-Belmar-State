# 🏢 Belmar State — Plataforma de Investimentos em FIIs

**Uma plataforma interativa para explorar, acompanhar e analisar investimentos em Fundos de Investimento Imobiliário (FIIs).**

A **Belmar State** é um projeto de desenvolvimento web que busca oferecer uma experiência diferenciada no acompanhamento de investimentos imobiliários, combinando análise de dados, visualizações interativas, ferramentas de organização financeira e gamificação.

O objetivo é ir além da simples consulta de cotações, permitindo que investidores visualizem seu patrimônio, explorem informações históricas e acompanhem sua evolução ao longo do tempo.

## 🚀 Funcionalidades

### 📊 Dashboard Financeiro
- Visualização do capital investido e valor de mercado.
- Cálculo de lucro ou prejuízo não realizado.
- Consulta de cotações pela API brapi.dev.
- Gráfico de distribuição patrimonial por FII.
- Gráfico de evolução histórica do patrimônio.
- Indicadores de desempenho da carteira.

### 💼 Minha Carteira
- Cadastro de compras e vendas de FIIs.
- Cálculo automático do preço médio.
- Controle de quantidade de cotas.
- Histórico de operações.
- Comparação entre preço de aquisição e cotação de mercado.
- Armazenamento local dos registros.

### 📅 Calendário Inteligente de Dividendos
- Calendário interativo de pagamentos.
- Cadastro de proventos confirmados e estimados.
- Cálculo dos rendimentos conforme a quantidade de cotas na data-com.
- Resumo mensal dos proventos.
- Integração com as operações da carteira.

### 🏆 Conquistas do Investidor
Sistema de gamificação que recompensa o progresso dentro da plataforma.

Inclui:
- Medalhas por objetivos alcançados.
- Sistema de experiência (XP).
- Níveis de investidor.
- Desafios relacionados a operações, patrimônio e diversificação.
- Acompanhamento do progresso individual.

### 🧬 DNA do Investidor
Questionário interativo que identifica preferências do usuário em relação ao acompanhamento de investimentos.

Perfis disponíveis:
- 💰 Caçador de Dividendos
- 📈 Construtor de Patrimônio
- 🛡️ Guardião da Estabilidade
- 🧭 Explorador de Oportunidades

O resultado apresenta um perfil predominante e a distribuição das características identificadas.

### 🔎 Explorar FIIs
- Pesquisa por ticker e setor.
- Filtros por tipo de fundo.
- Filtro por Dividend Yield mínimo.
- Ordenação por preço e DY.
- Consulta dos fundos cadastrados no backend.

### 📈 Reconstrução Histórica e Desempenho
- Consulta de fechamentos históricos de FIIs.
- Reconstrução das posições a partir de compras e vendas.
- Visualização histórica do capital investido e valor de mercado.
- Filtros por períodos.
- Modo Desempenho (%) com cálculo aproximado de retorno, buscando separar a valorização do efeito dos aportes.

A reconstrução histórica está limitada à disponibilidade dos dados da API e ainda não contempla todos os eventos corporativos.

## 🛠️ Tecnologias Utilizadas

**Frontend**
- Vue.js 3
- Vite
- JavaScript
- HTML5 e CSS3
- Vue Router
- Chart.js
- vue-chartjs

**Backend**
- Node.js
- Express.js
- API REST
- dotenv
- brapi.dev (dados de mercado)

**Ferramentas de Desenvolvimento**
- Visual Studio Code
- Git e GitHub
- WSL / Ubuntu
- NPM

## 🏗️ Arquitetura

A aplicação possui frontend e backend separados.

O frontend Vue 3 é responsável pela interface, navegação, gráficos e interatividade.

O backend Express disponibiliza endpoints para consulta de FIIs, cotações e históricos, realizando a comunicação com a API externa.

Os dados pessoais da carteira, proventos, conquistas e preferências são armazenados localmente no navegador por meio do `localStorage`.

## ⚙️ Como Executar o Projeto

### Pré-requisitos

- Node.js e NPM instalados
- Git
- Token da API brapi.dev para consultas de mercado

### 1. Clonar o repositório

```bash
git clone https://github.com/Daaish/Site-de-investimento-em-FIIs.git
cd Site-de-investimento-em-FIIs
```

### 2. Instalar as dependências do backend

```bash
npm install
```

### 3. Configurar as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto e adicione:

```env
BRAPI_TOKEN=seu_token_aqui
```

O token pode ser obtido em https://brapi.dev/.

**Nunca compartilhe seu token ou envie o arquivo `.env` para o GitHub.**

### 4. Iniciar o backend

```bash
npm start
```

O servidor será iniciado, por padrão, em:

`http://localhost:3000`

### 5. Instalar e iniciar o frontend

Abra outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Acesse o endereço exibido pelo Vite, normalmente:

`http://localhost:5173`

## 🔗 Principais Endpoints

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/buscar` | Consulta fundos cadastrados na base local |
| GET | `/cotacao/:ticker` | Consulta cotação de um ativo |
| GET | `/historico/:ticker` | Consulta fechamentos históricos de um ativo |

No ambiente de desenvolvimento, o frontend acessa essas rotas utilizando o prefixo `/api`, configurado por meio do proxy do Vite.

## 📂 Organização do Projeto

```text
Site-de-investimento-em-FIIs/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── router/
│   │   ├── services/
│   │   ├── views/
│   │   └── App.vue
│   └── package.json
├── services/
│   └── cotacoes.js
├── server.js
├── package.json
└── README.md
```

## 🎯 Diferenciais da Plataforma

A Belmar State procura oferecer uma experiência que combina **informação financeira, personalização e interatividade**.

Seus principais diferenciais são:

1. **Reconstrução histórica:** permite visualizar a evolução de carteiras a partir de operações registradas anteriormente, dentro da cobertura de preços disponível.
2. **Gamificação:** transforma objetivos e atividades de investimento em conquistas e níveis.
3. **DNA do Investidor:** oferece uma experiência personalizada baseada nas preferências declaradas pelo usuário.
4. **Calendário vinculado à carteira:** estima os proventos considerando as cotas registradas na data-com.
5. **Análise de desempenho:** diferencia visualmente o crescimento do patrimônio causado por aportes da variação percentual estimada dos investimentos.

## 🔮 Próximas Melhorias

- Importação de operações antigas por CSV.
- Ampliação da cobertura de cotações históricas.
- Integração automática de anúncios de dividendos.
- Cálculos de retorno total incluindo proventos.
- Banco de dados PostgreSQL.
- Sistema de autenticação e contas de usuário.
- Sincronização de carteiras entre dispositivos.
- Tratamento de desdobramentos, amortizações e outros eventos corporativos.

## ⚠️ Observações

Este projeto está em desenvolvimento e possui finalidade acadêmica e educativa.

As informações financeiras podem apresentar atrasos ou limitações de cobertura. Os cálculos de desempenho ainda são aproximados e não devem ser utilizados como referência definitiva para decisões financeiras.

O DNA do Investidor é uma ferramenta recreativa, não substituindo uma avaliação formal de perfil de risco.

**A plataforma não oferece recomendações personalizadas de investimentos.**

## 👨‍💻 Desenvolvimento

Projeto desenvolvido para aplicação prática de conhecimentos em desenvolvimento web, integração de APIs, visualização de dados e engenharia de software.

**Repositório:** https://github.com/Daaish/Site-de-investimento-em-FIIs

---

**Belmar State — Acompanhe seu patrimônio. Explore sua evolução.**

### Catálogo dinâmico e fontes de mercado

- `GET /fiis` consulta `/api/quote/list` com `subType=fii`. Aceita `page` (inicial 1), `limit` (inicial 20, máximo 50), `search` (ticker/nome, até 100 caracteres), `sortBy` (`name`, `close`, `volume`, `change`) e `sortOrder` (`asc`, `desc`). Retorna `itens`, `paginacao`, `origem`, `estado`, `motivo`, `consultadoEm`, `cacheStatus` e `desatualizado`.
- A listagem usa a mesma instância do cache e cliente de cotações/históricos: TTL de 15 minutos, stale temporário até 24 horas, deduplicação e cooldown 429 compartilhados. Cada combinação normalizada de parâmetros possui uma chave própria, sob o limite global de 500 entradas. Não há chamadas individuais por card nem preenchimento do cache de cotações a partir da listagem.
- A página carrega somente uma página por consulta. Pesquisa e ordenação aguardam 400 ms, reiniciam a página e descartam respostas ultrapassadas. Atualizar mantém pesquisa, ordenação e página, corrigindo páginas que deixaram de existir.
- Os preços são fechamentos informados pela brapi. `atualizadoEm` permanece nulo quando não há data da fonte; `consultadoEm` registra somente a consulta bem-sucedida da listagem, não o horário do preço. Ausências nunca viram zero. O menor fechamento refere-se somente à página exibida.
- DY, P/VP e classificação Papel/Tijolo não são inferidos. Seus controles ficam indisponíveis até existir uma fonte adequada. `sector` é mostrado como setor informado pela API, sem conversão para segmento de FII.
- Os estados são `atualizado` (fonte ou cache válido), `desatualizado` (stale permitido durante falha temporária) e `local` (cadastro limitado, sem preços). Falhas de autenticação e respostas inválidas não usam dados financeiros antigos: mostram fallback local e motivo explícito. Parâmetros inválidos retornam HTTP 400 sem consultar a fonte.
- `data/fiis.json` permanece como fallback cadastral. `GET /buscar` preserva seu array com `codigo`, `tipo`, `setor`, `dy: null` e `preco: null`; mantém o filtro `tipo`, e `min_dy` positivo não retorna dados sem DY verificado.
- `data/indicadores-referencia.json` é exclusivamente legado, com data, período e fonte externa desconhecidos. Não é importado pelos serviços.
- O catálogo não é uma lista de ativos permitidos: operações, posições, gráficos, cotações e históricos continuam aceitando tickers válidos ausentes do cadastro local, como VGHF11.

### PostgreSQL local — Etapa 1

A Etapa 1 adicionou Docker Compose, conexão Node.js (`pg`) e migrações SQL versionadas. As rotas de mercado continuam funcionando sem conexão com o banco. A autenticação e as tabelas de negócio são descritas na Etapa 2 abaixo; o localStorage permanece inalterado.

Requisitos no WSL: Node.js, Docker com daemon ativo e Docker Compose. Se utilizar Docker Desktop, habilite a integração com sua distribuição WSL.

Na raiz do projeto, prepare a configuração somente se ainda não existir:

```bash
cp -n .env.postgres.example .env.postgres
```

Preencha `PGPASSWORD` no arquivo local `.env.postgres` antes de iniciar. Esse arquivo é ignorado pelo Git e separado do `.env` que contém a configuração da brapi. `PGHOST` deve permanecer local. Se a porta 5432 estiver ocupada, escolha outra em `PGPORT`; o Compose e os comandos Node usarão a mesma porta externa.

```bash
npm ci
docker compose --env-file .env.postgres up -d --wait postgres
npm run db:check
npm run db:migrate
```

O PostgreSQL 17 fica disponível somente em `127.0.0.1`, com dados persistentes no volume do Compose. O arquivo `001_criar_schema_belmar.sql` cria o schema `belmar`; o executor registra versões e checksums em `public.belmar_migracoes`. Não modifica dados da aplicação.

As migrações são executadas em transação, sob lock para impedir aplicação concorrente. Uma nova execução não repete versões aplicadas. Migrações aplicadas não devem ser editadas, renomeadas ou removidas: crie outro arquivo `002_descricao.sql`, sem comandos `BEGIN`/`COMMIT`, pois o executor controla a transação. Uma divergência de checksum ou erro SQL interrompe e desfaz o lote pendente.

Validação:

```bash
npm test
npm run test:db
```

`npm test` mantém os testes existentes e adiciona verificações unitárias de configuração e migrações. `npm run test:db` é separado e exige o banco ativo: cria um banco temporário com nome aleatório, verifica conexão, idempotência, concorrência, checksum e rollback, e remove somente esse banco ao terminar. O usuário local precisa de permissão de criação de bancos, disponível no serviço demonstrativo criado pelo Compose.

Para parar sem apagar o volume:

```bash
docker compose --env-file .env.postgres stop postgres
```

Para iniciar novamente, repita `up -d --wait postgres`. `npm start` continua iniciando o backend na porta 3000, independentemente do banco nesta etapa. Alterar a senha em `.env.postgres` não altera automaticamente a senha de um volume já inicializado; mantenha o arquivo local compatível com o banco existente. Nunca remova o volume para corrigir credenciais sem antes preservar seus dados.

### Autenticação local — Etapa 2 (somente backend)

A migração `002_modelar_usuarios_carteiras_operacoes.sql` acrescenta `belmar.usuarios`, `belmar.carteiras` e `belmar.operacoes`, com chaves estrangeiras e restrições. A migração 001 permanece intacta. O cadastro cria uma carteira inicial na mesma transação. Preços são `NUMERIC` sem arredondamento de escala; as operações têm ordem explícita e identificação opcional da origem para preparar uma futura importação. Nenhuma operação local é importada nesta etapa.

```bash
docker compose --env-file .env.postgres up -d --wait postgres
npm ci
npm run db:migrate
npm start
```

O backend inicia em `http://127.0.0.1:3000`. A sessão demonstrativa usa `express-session`, armazenamento em memória e cookie `belmar.sid` HttpOnly, SameSite=Lax, com validade de uma hora. O identificador é renovado no login e invalidado no logout. O cookie não exige HTTPS porque este fluxo é exclusivamente HTTP local. O segredo é gerado aleatoriamente por processo; opcionalmente, `SESSION_SECRET` pode ser fornecido pelo ambiente. Reiniciar o backend encerra sessões; usuários e carteiras continuam no PostgreSQL.

As rotas privadas ficam antes do CORS público das rotas de mercado. Requisições de navegador são aceitas nas origens locais com portas 3000 e 5173 (`localhost` e `127.0.0.1`); o proxy `/api` do Vite mantém as chamadas no mesmo origin. Requisições JSON são limitadas a 8 KB. Senhas têm entre 8 e 128 caracteres e são protegidas com scrypt assíncrono, salt aleatório e comparação segura. Erros de login não distinguem usuário inexistente de senha incorreta; hashes, senhas, SQL e credenciais nunca são retornados.

| Método | Endpoint | Comportamento |
| --- | --- | --- |
| POST | `/auth/cadastro` | Nome, e-mail e senha; responde 201 com usuário e carteira. Não inicia sessão automaticamente. |
| POST | `/auth/login` | E-mail e senha; responde com usuário e cookie. |
| GET | `/auth/me` | Usuário e carteira da sessão; 401 sem login. IDs na query ou no corpo não mudam o proprietário. |
| POST | `/auth/logout` | Destrói a sessão e limpa o cookie; responde 204. |

Exemplo local com dados escolhidos por você (substitua os valores antes de executar):

```bash
curl -i http://127.0.0.1:3000/auth/cadastro \
  -H 'Content-Type: application/json' \
  --data '{"nome":"Seu Nome","email":"seu-email@example.com","senha":"SUBSTITUA_POR_SUA_SENHA"}'

curl -i -c /tmp/belmar-cookies.txt http://127.0.0.1:3000/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"email":"seu-email@example.com","senha":"SUBSTITUA_POR_SUA_SENHA"}'

curl -i -b /tmp/belmar-cookies.txt http://127.0.0.1:3000/auth/me

curl -i -b /tmp/belmar-cookies.txt -c /tmp/belmar-cookies.txt \
  -X POST http://127.0.0.1:3000/auth/logout
```

O jar de cookies é um arquivo local de sessão; não o adicione ao Git. Os comandos acima criam dados apenas quando executados por você. As telas Vue e a proteção das páginas são descritas na Etapa 3 abaixo. A importação explícita dos dados legados e a persistência das operações por API continuam reservadas para uma etapa futura.

Validação:

```bash
npm test
npm run test:db
git diff --check
```

A suíte PostgreSQL cria e remove somente bancos temporários aleatórios. Cobre cadastro, duplicidade, rollback, hash, login inválido, renovação e persistência de sessão, isolamento entre contas, cookie adulterado, origem externa, limites de corpo e logout. Nenhum teste destrutivo usa o banco principal. A auditoria das quatro dependências preexistentes está em [docs/AUDITORIA_DEPENDENCIAS.md](docs/AUDITORIA_DEPENDENCIAS.md).

### Login e cadastro Vue — Etapa 3

As páginas públicas `/login` e `/cadastro` usam o monograma e os tokens institucionais Light/Dark. `/explorar` continua público. Dashboard, carteira, calendário, perfil e conquistas exigem sessão. A interface consulta `/api/auth/me` ao iniciar, revalida ao navegar para páginas privadas e ao recuperar foco, e usa `credentials: 'include'` em todas as requisições de autenticação.

Fluxo: cadastro com confirmação de senha → login → Dashboard → sair pela sidebar. O cadastro não faz login automático. Usuários já autenticados são redirecionados de login/cadastro para o Dashboard. O nome da sidebar vem da sessão. Envios em andamento ficam bloqueados; erros de credenciais, duplicidade de e-mail e conexão são apresentados sem expor detalhes internos. O logout só é confirmado depois de o backend destruir a sessão.

#### Separação temporária dos dados financeiros

- As chaves globais antigas `belmar-carteira-v1`, `belmar-proventos-v1`, `belmar-dna-v1` e `belmar-historico-patrimonio-v1` nunca são lidas, sobrescritas, apagadas ou importadas pela interface autenticada.
- Novos registros da demonstração usam `belmar-demo-v1:<id-da-sessao>:<chave-original>`. Uma conta sem registros nesse espaço começa vazia. Não existe associação automática dos dados antigos ao primeiro usuário que entrar.
- Operações e snapshots compartilhados em memória são recarregados/limpos ao mudar o usuário. As páginas privadas são remontadas na troca de conta, limpando proventos, formulários e respostas do perfil. Callbacks do usuário anterior não podem gravar no espaço do usuário seguinte.
- O tema e o cache público de mercado permanecem independentes da conta. O catálogo público não é remontado por uma simples troca de usuário.
- Um evento local sem credenciais avisa outras abas de login/logout; elas revalidam a sessão. Respostas antigas de `/auth/me` são descartadas. Durante a verificação, a apresentação financeira privada fica oculta.
- Esta é uma separação de apresentação para o protótipo, sem criptografia dos dados do navegador. Não substitui as futuras APIs de carteira com autorização no backend. Os novos registros ainda não são gravados em `belmar.operacoes`.

Para verificar no WSL, mantenha o banco ativo, execute `npm start` na raiz e, em outro terminal:

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Abra `http://127.0.0.1:5173/cadastro`. A porta 5173 é importante porque está entre as origens locais permitidas pelo backend. Teste cadastro, login, recarga da página, tema e logout. Entre com duas contas diferentes e confirme que os novos registros de uma não aparecem na outra; os dados legados continuam guardados nas chaves antigas. Não adicione credenciais reais aos arquivos de exemplo ou ao Git.

Testes do frontend, sem dependências adicionais:

```bash
cd frontend
node --test --test-isolation=none tests/*.test.mjs
npm run build
```

Os testes cobrem os formulários e guardas reais do Vue Router, sessão restaurada, tratamento de erros, isolamento entre contas, callbacks antigos, preservação byte a byte dos valores legados, catálogo público e temas. Não substituem inspeção visual em navegador/mobile.
