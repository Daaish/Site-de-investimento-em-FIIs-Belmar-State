# Belmar State

Plataforma acadêmica de acompanhamento de Fundos de Investimento Imobiliário (FIIs), consulta de criptoativos e educação financeira. Combina Vue 3, Vite, Chart.js, Express e PostgreSQL 17, com temas Belmar Light/Dark e interface responsiva.

**Repositório:** [Daaish/Site-de-investimento-em-FIIs-Belmar-State](https://github.com/Daaish/Site-de-investimento-em-FIIs-Belmar-State.git).

Este guia descreve a execução **local**, principalmente em Windows 10/11 com Ubuntu no WSL2 e Docker Desktop. Não é um procedimento de publicação na internet.

## O que a plataforma oferece

- **Cadastro, login e logout:** contas locais, senhas protegidas por scrypt e sessões individuais.
- **Carteira Patrimonial:** compras e vendas de FIIs persistidas no PostgreSQL, preço médio, quantidade, histórico e validação de saldo. Cada conta tem sua carteira; registros simultâneos são protegidos por transação e bloqueio. Há proteção de idempotência contra repetição de compras/vendas.
- **Dashboard e gráficos:** capital investido, valor de mercado, resultado não realizado, distribuição por FII, evolução histórica e modo Desempenho (%).
- **Mercado de FIIs:** catálogo dinâmico da brapi com pesquisa, paginação e ordenação, cache e cadastro local de contingência.
- **Calendário de proventos:** cadastro manual de eventos confirmados/estimados e cálculo com as cotas da data-com.
- **DNA e Conquistas:** questionário de preferências, indicadores de progresso e conquistas calculadas a partir dos dados da conta.
- **Belmar Digital (`/digital`):** mercado de criptoativos em BRL via CoinGecko, pesquisa e históricos de 7, 30 e 90 dias. Somente consulta; não adiciona criptoativos à carteira.
- **Belmar Academy (`/academy`):** quatro módulos, 21 lições, simulador de juros compostos, quiz de 12 questões e reinício da experiência, sem login.

## 1. Pré-requisitos: prepare o computador

Se já possui tudo instalado, confirme as verificações abaixo e siga para a [instalação rápida](#2-instalação-rápida-do-projeto).

### 1.1 Windows e WSL2 — PowerShell

Use uma versão do Windows compatível com a versão instalada do Docker Desktop, virtualização habilitada e recursos suficientes para o Docker. Em computadores antigos ou institucionais, a instalação pode exigir suporte do administrador. Os requisitos atuais devem ser conferidos na [documentação do Docker Desktop para Windows](https://docs.docker.com/desktop/setup/install/windows-install/); não é garantido que qualquer edição antiga do Windows 10 seja suportada.

**PowerShell como administrador**, em uma máquina sem Ubuntu/WSL:

```powershell
wsl --install -d Ubuntu
```

Reinicie o Windows se solicitado. Abra **Ubuntu** no menu Iniciar e crie o usuário e a senha Linux quando solicitado. Essa senha Linux é diferente da senha do banco e da conta Belmar.

**PowerShell**, para conferir e atualizar:

```powershell
wsl --update
wsl --status
wsl --list --verbose
```

A distribuição utilizada deve aparecer com `VERSION 2`. Se estiver na versão 1, execute no **PowerShell**, substituindo `Ubuntu` pelo nome exato mostrado na lista:

```powershell
wsl --set-version Ubuntu 2
```

Referência: [instalação oficial do WSL](https://learn.microsoft.com/en-us/windows/wsl/install).

### 1.2 Docker Desktop — interface do Windows e terminal Ubuntu

Instale e abra o [Docker Desktop para Windows](https://docs.docker.com/desktop/setup/install/windows-install/). Na interface:

1. Em **Settings → General**, use o mecanismo WSL2 (*Use WSL 2 based engine*; pode já estar habilitado ou não aparecer em algumas versões).
2. Em **Settings → Resources → WSL Integration**, habilite a integração com a distribuição Ubuntu utilizada.
3. Aplique as alterações e aguarde o mecanismo iniciar. Utilize **Linux containers**.

Não instale outro Docker Engine dentro do Ubuntu para seguir este fluxo com Docker Desktop. Veja a [integração oficial Docker/WSL2](https://docs.docker.com/desktop/features/wsl/).

Abra um terminal **Ubuntu/WSL** e verifique:

```bash
docker --version
docker compose version
docker info --format '{{.ServerVersion}}'
```

Os dois primeiros verificam os clientes; o terceiro confirma acesso ao mecanismo Docker. O projeto usa o comando `docker compose` e precisa de uma versão com suporte a `up --wait`. Mantenha o Docker Desktop aberto durante o uso do PostgreSQL.

### 1.3 Git, Node.js e npm — Ubuntu/WSL

**A partir daqui, todos os blocos `bash` devem ser executados no Ubuntu/WSL, não no PowerShell.** Node e npm devem estar instalados no Ubuntu. Ter Node instalado somente no Windows não basta para este guia.

Instale as ferramentas básicas:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates nano
```

Use **Node.js 24 LTS**, com npm, instalado pelo nvm no Ubuntu. O Vite instalado no projeto declara compatibilidade com Node `^20.19.0 || >=22.12.0`; Node 18 e versões antigas do Node 20 não atendem ao requisito. O fluxo deste guia adota Node 24.

Se não possui nvm, execute o instalador da versão indicada no [repositório oficial do nvm](https://github.com/nvm-sh/nvm#installing-and-updating):

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh -o /tmp/belmar-nvm-install.sh
bash /tmp/belmar-nvm-install.sh
source ~/.bashrc
nvm install 24
nvm alias default 24
nvm use 24
```

Se já possui nvm, execute apenas os três últimos comandos. O instalador é externo ao projeto; confira sua origem antes de executá-lo. Consulte também o [guia Microsoft de Node no WSL](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl).

Confira no **Ubuntu/WSL**:

```bash
git --version
node --version
npm --version
command -v node
command -v npm
```

Node deve informar `v24.x`. Com nvm, os caminhos devem apontar para o ambiente Linux, normalmente dentro de `~/.nvm/`, e não para executáveis em `/mnt/c/`.

## 2. Instalação rápida do projeto

Use esta sequência depois de preparar Git, Node/npm e Docker. As seções seguintes explicam as configurações e o uso; não há uma segunda sequência de instalação diferente.

### Passo 1 — clonar e instalar dependências

**Ubuntu/WSL:** mantenha o projeto no sistema de arquivos Linux, como `~/projetos`, conforme a [orientação Microsoft para Node no WSL](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl).

```bash
mkdir -p ~/projetos
cd ~/projetos
git clone https://github.com/Daaish/Site-de-investimento-em-FIIs-Belmar-State.git
cd Site-de-investimento-em-FIIs-Belmar-State
npm ci
npm ci --prefix frontend
```

São dois projetos npm, cada um com seu `package-lock.json`. Use `npm ci` para instalar as versões registradas. Não execute comandos npm com `sudo`.

### Passo 2 — configurar os dois arquivos de ambiente

Ainda na **raiz do repositório**, copie o exemplo de banco sem sobrescrever um arquivo existente:

```bash
if [ ! -f .env.postgres ]; then cp .env.postgres.example .env.postgres; fi
nano .env.postgres
```

Preencha `PGPASSWORD` com uma senha local forte e mantenha os demais valores conforme a [configuração detalhada](#3-configuração-detalhada-dos-ambientes). No nano: `Ctrl+O`, Enter para salvar e `Ctrl+X` para sair.

Crie/edite o `.env` **também na raiz**, sem copiar credenciais de outra pessoa:

```bash
nano .env
```

Coloque os nomes abaixo e substitua os textos ilustrativos pelas suas próprias chaves:

```dotenv
BRAPI_TOKEN=SUBSTITUA_PELO_SEU_TOKEN_BRAPI
COINGECKO_API_KEY=SUBSTITUA_PELA_SUA_CHAVE_DEMO_COINGECKO
```

Os textos `SUBSTITUA_...` **não são credenciais válidas**. Não inclua as chaves no frontend. Salve e proteja os arquivos:

```bash
chmod 600 .env .env.postgres
git check-ignore .env .env.postgres
```

O último comando deve listar os dois arquivos, confirmando que estão ignorados pelo Git.

### Passo 3 — iniciar PostgreSQL, validar conexão e migrar

**Ubuntu/WSL, na raiz:**

```bash
docker compose --env-file .env.postgres up -d --wait postgres
docker compose --env-file .env.postgres ps
npm run db:check
npm run db:migrate
```

Prossiga somente se a conexão for confirmada e as migrações terminarem sem erro. O primeiro comando pode demorar para baixar a imagem `postgres:17`. O Compose inicia **somente o banco**, não os servidores Node/Vite.

### Passo 4 — iniciar backend e frontend em terminais separados

**Terminal 1 — Ubuntu/WSL, raiz do repositório:**

```bash
cd ~/projetos/Site-de-investimento-em-FIIs-Belmar-State
npm start
```

Deixe aberto. O backend escuta em `http://127.0.0.1:3000`.

**Terminal 2 — outro terminal Ubuntu/WSL:**

```bash
cd ~/projetos/Site-de-investimento-em-FIIs-Belmar-State
npm run dev --prefix frontend -- --host 127.0.0.1 --port 5173 --strictPort
```

Deixe aberto. A porta fixa evita que o Vite escolha outra origem incompatível com as rotas de sessão. Se clonou em outro diretório, ajuste os dois comandos `cd`.

Abra no **navegador do Windows**: **http://127.0.0.1:5173**. Essa é a aplicação; a porta 3000 disponibiliza a API, não a interface. O encaminhamento local Windows/WSL deve estar funcionando; VPNs e configurações de rede podem interferir.

## 3. Configuração detalhada dos ambientes

### `.env.postgres`: PostgreSQL local

O arquivo real deve ter esta estrutura, já fornecida por `.env.postgres.example`:

```dotenv
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=belmar
PGUSER=belmar
PGPASSWORD=SUBSTITUA_POR_UMA_SENHA_LOCAL_FORTE
```

Escolha sua própria senha e substitua a última linha. Uma sequência aleatória longa de letras e números evita também problemas de interpretação de caracteres especiais em arquivos de ambiente.

- `PGHOST`: deve permanecer local; o código aceita `127.0.0.1`, `localhost` ou `::1`. O guia usa `127.0.0.1`.
- `PGPORT`: porta externa do banco, utilizada tanto pelo Compose quanto pelo cliente Node. Se 5432 estiver ocupada, escolha, por exemplo, 5433 neste arquivo e repita o passo 3.
- `PGDATABASE`, `PGUSER`, `PGPASSWORD`: usados para inicializar o banco na **primeira criação do volume**.
- O serviço `postgres` publica a porta somente em `127.0.0.1`; não é necessário instalar PostgreSQL ou `psql` no Ubuntu.

**Alterar a senha, usuário ou nome do banco no arquivo não altera um volume já inicializado.** Se houver dados, preserve a configuração correspondente ou peça ajuda para uma alteração administrativa. Não remova o volume para resolver senha incorreta.

O projeto Compose chama-se `belmar-state`; o volume lógico `postgres_data` normalmente resulta em `belmar-state_postgres_data`. Outra cópia do projeto com o mesmo nome Compose pode compartilhar esse mesmo banco local: clonar novamente não cria necessariamente um banco novo.

Variáveis já exportadas no terminal podem prevalecer sobre os arquivos dotenv e sobre a interpolação do Compose. Se houver divergência inexplicável, confira se você definiu variáveis `PG*` fora dos arquivos, sem publicar seus valores.

### `.env`: APIs externas e segredo opcional de sessão

| Variável real | Uso |
| --- | --- |
| `BRAPI_TOKEN` | Acesso do backend à brapi para catálogo, cotações e históricos de FIIs. Obtenha em [brapi.dev](https://brapi.dev/). |
| `COINGECKO_API_KEY` | Chave **Demo** da [CoinGecko](https://www.coingecko.com/en/api/pricing), enviada pelo backend em `x-cg-demo-api-key`. |
| `SESSION_SECRET` | Opcional: segredo privado da assinatura da sessão. Se ausente, o servidor gera um por processo. |

Não substitua o token da brapi pela chave CoinGecko. Não use prefixo `VITE_` nessas variáveis, não as coloque em `frontend/.env` e não envie arquivos `.env` ao GitHub. Reinicie o backend após alterar o `.env`.

A carteira e a autenticação dependem do banco, não das chaves de mercado. Sem acesso às APIs, podem faltar preços e históricos; o catálogo de FIIs pode apresentar apenas o cadastro local sem valores financeiros. A Academy tem conteúdo e cálculo locais.

O `.gitignore` protege os arquivos de ambiente, mas não impede que sejam adicionados à força ou compartilhados em prints. Não publique chaves, senhas ou cookies. Se uma credencial for divulgada, revogue/substitua no provedor; removê-la do texto não invalida a chave.

## 4. Primeiro acesso e verificação manual

1. Abra http://127.0.0.1:5173/cadastro. Informe nome, e-mail e senha de 8 a 128 caracteres, com confirmação. Use uma senha exclusiva para a demonstração.
2. Depois do cadastro, faça login. O cadastro cria a conta e uma carteira vazia, mas não inicia sessão automaticamente. Não existe usuário/senha padrão.
3. Entre em **Carteira Patrimonial** e registre uma **compra de teste**: ticker `HGLG11`, quantidade `2`, preço `100,00` (ou `100.00`, conforme o navegador) e data de hoje. Esses valores são fictícios de teste, não cotações ou recomendações. Você estará criando um registro real no seu banco local.
4. Aguarde a confirmação e recarregue a página. A compra deve permanecer. A indisponibilidade de cotação externa não deve impedir o registro nem a consulta das operações.
5. Registre uma **venda de teste** de `1` cota do mesmo ticker, preço `110,00` e data de hoje. A posição deve ficar com `1` cota. Uma venda de `2` cotas agora deve ser rejeitada por saldo insuficiente.
6. Saia pela sidebar e entre novamente: o histórico deve continuar disponível. Outra conta cadastrada deve ter carteira própria, sem essas operações.
7. O botão **Desfazer última** remove a última operação registrada, após confirmação. Para limpar apenas esse teste, desfaça primeiro a venda e depois a compra, se continuarem sendo as últimas operações. Não remova o banco.
8. Visite `/explorar`, `/digital` e `/academy`. Na Academy, experimente o simulador e o quiz, alterne Light/Dark e use **Recomeçar experiência** antes do próximo visitante.

## 5. Parar e retomar sem perder os dados

Para parar backend e frontend, pressione **Ctrl+C em cada terminal** que os executa.

Para parar apenas o banco, no **Ubuntu/WSL, raiz**:

```bash
docker compose --env-file .env.postgres stop postgres
```

Isso preserva o volume. Para retomar, abra o Docker Desktop e execute:

```bash
cd ~/projetos/Site-de-investimento-em-FIIs-Belmar-State
docker compose --env-file .env.postgres up -d --wait postgres
npm run db:check
npm run db:migrate
```

Depois repita os comandos dos terminais 1 e 2 do passo 4. A migração é idempotente: versões já aplicadas são verificadas, não repetidas. Não é preciso reinstalar dependências a cada inicialização.

**Não use `docker compose down -v`, remoção de volumes, limpeza de volumes ou restauração de fábrica do Docker Desktop para simplesmente parar o projeto.** Esses procedimentos podem apagar contas e operações. Um volume persistente não substitui backup.

Reiniciar o backend encerra as sessões em memória: faça login novamente. As contas e operações permanecem no PostgreSQL. Reiniciar o banco encerra conexões, mas não remove os dados do volume.

## 6. Arquitetura, armazenamento e limites

```text
Navegador no Windows → Vite no Ubuntu/WSL (5173)
                           └─ /api/* → Express (3000)
                                          ├─ PostgreSQL 17 no Docker (5432)
                                          ├─ brapi: FIIs
                                          └─ CoinGecko Demo: criptoativos
```

O proxy de `frontend/vite.config.js` remove `/api` e encaminha ao Express em `http://localhost:3000`. Exemplo: `/api/carteira/operacoes` no navegador chega a `/carteira/operacoes` no backend.

| Informação | Onde fica | O que acontece em outro computador/navegador |
| --- | --- | --- |
| Contas, hashes de senha, carteiras, operações e recibos de idempotência | PostgreSQL, volume local do Docker | Não acompanham o clone; exigiriam transferência/backup explícito. |
| Sessões | Memória do backend e cookie `belmar.sid` no navegador | Não são compartilhadas; reiniciar o backend exige novo login. |
| Proventos manuais, respostas do DNA e snapshots locais existentes | `localStorage`, separado por ID de usuário | Não sincronizam pelo PostgreSQL nem pelo GitHub. |
| Conquistas/XP e indicadores | Calculados a partir das operações e demais dados disponíveis | Dependem dos dados da conta e dos registros locais usados. |
| Confirmação de operação pendente | Nova chave de `sessionStorage` por conta | Auxilia reenvio idempotente após resposta perdida/F5 na mesma aba. |
| Tema | Preferência local do navegador, com suporte à preferência do sistema | Pode ser diferente em outro navegador. |
| Cache de mercado | Memória do backend | Desaparece ao reiniciar o processo. |
| Academy | Conteúdo no código; atividade apenas em memória no frontend | Reinicia ao sair da página ou recarregar. |

**O GitHub contém o código e exemplos de configuração, não as contas e operações do seu PostgreSQL, seus `.env`, cookies ou dados do navegador.** Um clone em uma instalação nova começa sem suas contas pessoais. Não existe importação automática dos dados antigos do localStorage: tanto as chaves globais antigas quanto as chaves temporárias de carteira por usuário são preservadas, sem mistura com as operações do banco.

### Migrações e sessões

As migrações versionadas criam:

- `001_criar_schema_belmar.sql`: schema `belmar`.
- `002_modelar_usuarios_carteiras_operacoes.sql`: usuários, carteiras e operações.
- `003_idempotencia_operacoes.sql`: recibos persistentes para repetição segura de requisições.

O executor registra checksums em `public.belmar_migracoes`, usa transação e bloqueio. **Não edite migrações já aplicadas**. Divergências interrompem a execução; mudanças futuras precisam de nova migração.

A sessão demonstrativa usa cookie HttpOnly/SameSite=Lax, validade de uma hora e armazenamento em memória (`express-session`). As origens de navegador permitidas para autenticação/carteira são `localhost` e `127.0.0.1` nas portas 3000 e 5173. O ambiente é HTTP local; não está configurado como serviço de produção exposto na rede.

### Mercado, cálculos e educação

- brapi: catálogo e cotações têm TTL de 15 minutos, com dados antigos permitidos em falhas temporárias até 24 horas desde a última consulta bem-sucedida. Histórico tem TTL de 6 horas e limite de 7 dias para dados antigos. Há deduplicação e controle compartilhado de 429.
- O catálogo consulta uma página por vez. DY, P/VP e classificação Papel/Tijolo não são inferidos; controles sem fonte adequada ficam indisponíveis. O cadastro local de contingência não contém preços atuais.
- CoinGecko: cache independente; mercado por 2 minutos e histórico por 30 minutos. Em falha temporária, os limites de idade são 30 minutos e 6 horas, respectivamente. Pesquisa usa cache de 15 minutos. A página sinaliza dados antigos; veja [Belmar Digital](docs/BELMAR_DIGITAL.md).
- Planos das APIs, cotas e disponibilidade podem mudar. Nem todo ticker terá histórico; ausência de dados não significa preço zero. O horário da consulta não substitui o horário informado pela fonte.
- A rota de histórico de FIIs usa atualmente período de 3 meses e intervalo diário. Reconstrução e desempenho são limitados pela cobertura; não incluem retorno total com proventos, impostos, taxas nem tratamento completo de eventos corporativos.
- A ordem de registro é preservada na carteira. Gráficos/proventos usam datas e desempate pela ordem de registro; operações retroativas podem gerar diferenças entre reconstrução cronológica e posição calculada na sequência registrada.
- Criptomoedas não integram a carteira. O DNA é educativo/recreativo e não é avaliação formal de adequação de investimentos.
- O simulador Academy usa taxa hipotética constante, conversão efetiva anual/mensal e aportes no fim do mês. Não considera impostos, taxas, inflação ou oscilações. Resultados não são garantias ou recomendações. Veja [Belmar Academy](docs/BELMAR_ACADEMY.md).
- Google Fonts e APIs externas dependem de conectividade. Não há garantia de demonstração completa offline.

## 7. Endpoints e páginas

Rotas abaixo são do **Express, sem `/api`**. Pelo navegador/Vite, acrescente `/api`. Não há endpoint `/` de interface no backend.

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| POST | `/auth/cadastro` | Cria usuário e carteira; corpo com `nome`, `email`, `senha`. |
| POST | `/auth/login` | Inicia sessão com `email` e `senha`. |
| GET | `/auth/me` | Consulta usuário e carteira da sessão; 401 sem login. |
| POST | `/auth/logout` | Encerra sessão; 204. |
| GET | `/carteira/operacoes` | Lista operações da conta autenticada por ordem de registro. |
| POST | `/carteira/operacoes` | Registra `tipo`, `ticker`, `quantidade`, `preco`, `data`; exige `Idempotency-Key` UUID. |
| DELETE | `/carteira/operacoes/:id` | Exclui operação da própria carteira se não deixar vendas posteriores sem saldo. |
| GET | `/fiis` | Catálogo dinâmico com paginação, pesquisa e ordenação. |
| GET | `/buscar` | Cadastro local limitado; filtros legados `tipo` e `min_dy`, sem DY financeiro verificado. |
| GET | `/cotacao/:ticker` | Cotação de FII via brapi/cache. |
| GET | `/historico/:ticker` | Histórico de FII via brapi/cache. |
| GET | `/cripto/moedas` | Mercado BRL; `pagina` e `pesquisa`. |
| GET | `/cripto/moedas/:id/historico` | Histórico BRL; `dias=7`, `30` ou `90`. |

`/fiis` aceita `page`, `limit` (até 50), `search`, `sortBy` (`name`, `close`, `volume`, `change`) e `sortOrder` (`asc`, `desc`). A carteira identifica o proprietário pela sessão, não por IDs livres enviados pelo cliente. Compras/vendas são validadas no backend; não repita uma criação com nova chave de idempotência só porque a resposta se perdeu.

Páginas públicas: `/login`, `/cadastro`, `/explorar`, `/digital`, `/academy`. Páginas com sessão: `/` (Dashboard), `/carteira`, `/calendario`, `/conquistas`, `/dna`. Não há API própria para a Academy.

## 8. Problemas comuns

| Sintoma | Verificação e correção |
| --- | --- |
| `docker: command not found` no Ubuntu | Abra Docker Desktop e habilite **WSL Integration** para a distribuição correta. Feche/reabra o terminal Ubuntu. Não execute os passos do projeto no PowerShell por engano. |
| `Cannot connect to the Docker daemon` | Docker Desktop precisa estar iniciado. Teste `docker info --format '{{.ServerVersion}}'`. Se necessário, reinicie o aplicativo sem restaurar dados de fábrica. |
| Integração WSL não aparece ou fica desabilitada | Confira `wsl --list --verbose` no PowerShell, versão 2 da distribuição e modo Linux containers do Docker. Atualize WSL e aplique a integração novamente. |
| `npm`/`node` não encontrado ou Vite reclama de versão | No Ubuntu, execute `source ~/.bashrc`, `nvm use 24`, `node --version` e `command -v npm`. Instale nvm/Node no WSL se estiverem só no Windows. |
| `npm ci` falha | Confirme internet, Node 24 e o diretório correto. Não apague lockfiles nem use `--force` como correção genérica. Backend e frontend exigem instalações separadas. |
| `PGPASSWORD` ausente/configuração inválida | O arquivo é `.env.postgres`, na raiz, não `.env.postgres.example` nem `.env.postgres.txt`. Preencha a senha e use `--env-file .env.postgres` no Compose. |
| Banco não conecta (`ECONNREFUSED`/timeout) | Verifique `docker compose --env-file .env.postgres ps`, porta e `npm run db:check`. Aguarde o estado saudável. Confira Docker/WSL e se outro PostgreSQL está usando a mesma porta. |
| Senha rejeitada (`28P01`) ou banco inexistente | Compare a configuração com a usada ao inicializar o volume. Alterar `.env.postgres` não altera credenciais do banco existente. Não apague o volume. |
| Erro de tabela/schema inexistente | Após `db:check` passar, execute `npm run db:migrate`. Se houver checksum divergente, restaure a migração original; não apague o controle de versões do banco. |
| Porta 5432 ocupada | Altere `PGPORT` no `.env.postgres` para uma porta livre, como 5433, e repita o passo 3. Preserve os demais dados da configuração. |
| Porta 3000 ou 5173 ocupada | Encerre com Ctrl+C uma instância anterior que você reconheça. O backend tem porta 3000 fixa e o guia fixa 5173 para o frontend. Não aceite outra porta automaticamente para o login. |
| Vite não chega ao backend / `ECONNREFUSED` no proxy | Mantenha `npm start` aberto no Ubuntu e confira `curl -I http://127.0.0.1:3000/buscar`. O proxy existente usa `localhost:3000`; em ambientes com resolução IPv6 incompatível, `curl -I http://localhost:3000/buscar` pode falhar enquanto `127.0.0.1` funciona. Isso exige avaliar o ambiente/proxy, não as chaves das APIs. |
| Login não mantém sessão / 403 de origem | Use sempre `http://127.0.0.1:5173`, com cookies habilitados. Não misture `localhost` e `127.0.0.1` entre abas. Não acesse pelo IP da rede nem pela porta 5174. Reinício do backend ou expiração exige login novamente. |
| HTTP 401 em `/auth/me` | Sem sessão, é esperado. Faça login. Não confunda esse 401 com autenticação das APIs externas. |
| HTTP 401/403 na brapi ou CoinGecko | Confira chave, plano e permissões no painel do provedor, sem divulgar o valor. CoinGecko usa chave Demo. Reinicie o backend após editar `.env`. Alguns erros externos são convertidos localmente em 502/503 ou em catálogo de contingência. |
| HTTP 429 / aviso de limite | Aguarde o prazo indicado; não atualize repetidamente. Cache e bloqueio reduzem chamadas, mas não renovam a cota do provedor. Sem cache permitido, será exibido erro em vez de preço inventado. |
| Tela pública demora com backend parado | A navegação existente tenta verificar a sessão. Inicie o backend para o fluxo normal; Academy não exige login nem dados de mercado. |
| Dados “sumiram” em outro navegador ou após clone | Veja a tabela de armazenamento. O GitHub não transfere banco nem localStorage. Verifique conta, endereço do navegador e volume Docker utilizado. |

Para identificar portas em uso, **Ubuntu/WSL**:

```bash
ss -ltnp '( sport = :3000 or sport = :5173 or sport = :5432 )'
```

Se o conflito estiver no Windows, **PowerShell**:

```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 3000,5173,5432 }
```

Esses comandos consultam portas; não encerram processos. O PID pode não estar visível sem permissões adicionais.

## 9. Testes, auditoria e build

**Ubuntu/WSL, raiz**, com dependências instaladas:

```bash
npm test
node --test frontend/tests/*.test.mjs
npm run build --prefix frontend
git diff --check
```

Para integração, mantenha PostgreSQL ativo e configurado:

```bash
npm run test:db
```

A suíte de integração cria bancos temporários com nomes aleatórios e remove **somente esses bancos de teste** ao terminar. Precisa de permissão de criação de bancos; o usuário criado pela imagem demonstrativa do Compose a possui. Não é um comando para apagar o volume ou o banco principal.

Para consultar vulnerabilidades atuais, com internet:

```bash
npm audit
npm audit --prefix frontend
```

Auditorias mudam conforme novos avisos são publicados. [AUDITORIA_DEPENDENCIAS.md](docs/AUDITORIA_DEPENDENCIAS.md) é um registro histórico, não substitui o resultado atual. Não use `npm audit fix --force` para preparar uma apresentação.

O build gera `frontend/dist`, mas **não inicia a aplicação completa**. O proxy `/api` está configurado no servidor de desenvolvimento do Vite; servir apenas `dist` ou executar `npm run preview` não substitui a configuração de API/roteamento necessária em produção. Para a demonstração local, use os dois terminais do passo 4.

## 10. Organização e escopo

```text
.
├── compose.yaml                 # PostgreSQL 17 e volume persistente
├── .env.postgres.example        # Exemplo sem senha real
├── database/
│   ├── conexao.js
│   ├── migrar.js
│   └── migrations/              # Migrações SQL versionadas
├── scripts/banco.js             # db:check e db:migrate
├── routes/                      # Autenticação, carteira e cripto
├── middleware/                  # Sessão e proteção das rotas privadas
├── services/                    # APIs externas, cache e regras de negócio
├── data/                        # Cadastro local de FIIs e referências legadas
├── server.js                    # Express, porta 3000
├── frontend/
│   ├── src/                     # Vue, rotas, componentes, conteúdo Academy
│   ├── tests/
│   ├── vite.config.js           # Proxy de desenvolvimento /api
│   └── package.json
├── tests/                       # Backend e integração PostgreSQL
├── docs/                        # Detalhes de funcionalidades
└── package.json
```

A aplicação tem finalidade acadêmica e educativa. Não realiza negociação real, não importa automaticamente operações antigas e não oferece recomendação personalizada de investimento. Para disponibilização pública seriam necessários, entre outros ajustes, configuração de HTTPS, armazenamento de sessão apropriado, gestão de segredos, backups e proxy de produção.
