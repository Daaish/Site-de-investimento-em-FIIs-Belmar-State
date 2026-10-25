# Belmar Digital — Mercado de Criptoativos

Página pública `/digital`, acessível pela sidebar. Apenas consulta: criptoativos não integram operações, patrimônio ou desempenho da carteira de FIIs.

## Configuração

Defina `COINGECKO_API_KEY` no `.env` da raiz e reinicie o backend. A credencial é lida somente pelo servidor e enviada pelo cabeçalho `x-cg-demo-api-key` à Demo API. Não use prefixo `VITE_`. Não publique o `.env`. `BRAPI_TOKEN` continua independente.

Execute `npm start` na raiz e `npm run dev --prefix frontend` em outro terminal. O proxy Vite encaminha `/api/cripto` para `/cripto` no Express.

## Endpoints locais

- `GET /cripto/moedas?pagina=1&pesquisa=`: 20 ativos por página, ordenados por capitalização. Sem pesquisa, faz uma chamada a `/coins/markets`. Com texto, consulta `/search` e busca preços dos primeiros 20 IDs em uma chamada agrupada a `/coins/markets`. Pesquisa vazia nunca chama `/search`.
- `GET /cripto/moedas/:id/historico?dias=7`: consulta `/coins/{id}/market_chart`. Apenas 7, 30 e 90 dias; moeda BRL e granularidade automática.

A pesquisa usa debounce de 450 ms. Trocar filtros ou desmontar a página cancela consultas e invalida respostas anteriores, inclusive quando o transporte ignora o cancelamento. A seleção e o período não dependem do tema.

Preços, volume e capitalização estão em BRL. Variação refere-se a 24 horas. Campos numéricos ausentes permanecem `null`, apresentados como indisponíveis. `last_updated` é mostrado como atualização da fonte; `consultadoEm` identifica a consulta do backend; `ultimaAmostraEm` identifica o último ponto real do histórico. Não são horários intercambiáveis.

## Cache e disponibilidade

Instância de cache independente da brapi, usando o utilitário genérico existente sem modificá-lo. Limite de 200 entradas e 16 consultas distintas pendentes; deduplicação por endpoint/parâmetros. Trocar a credencial cria outro cache.

| Dados | TTL | Idade máxima em falha temporária |
|---|---|---|
| Mercado | 2 minutos | 30 minutos |
| IDs de pesquisa | 15 minutos | 15 minutos (sem extensão) |
| Histórico | 30 minutos | 6 horas |

Idade contada desde a última consulta bem-sucedida. Falhas de rede, timeout, HTTP 5xx, saturação ou 429 podem usar cache antigo dentro desse limite. HTTP 401/403 e respostas inválidas não autorizam reutilização de cache expirado. A resposta informa `expiraEm`, `validoAte` e `desatualizado`. O frontend sinaliza desatualização e remove dados cujo prazo máximo venceu, sem inventar substitutos.

Chamadas externas são serializadas com intervalo mínimo de 2,1 segundos e limite de cinco trabalhos na fila. HTTP 429 ativa bloqueio compartilhado entre endpoints CoinGecko, respeitando `Retry-After`; sem cabeçalho válido, usa 60 segundos. Não há repetição automática nem atualização periódica da API. Timeout externo de 10 segundos; frontend de 25 segundos.

O cache fica em memória e é perdido ao reiniciar o backend. Não há garantia de funcionamento offline ou de cota mensal disponível. Se a primeira consulta falhar, a página continua acessível com mensagem e ação de tentar novamente. A atribuição à CoinGecko permanece visível.

## Verificação

- `npm test`: inclui `tests/cripto.test.js`, cobrindo contratos, validação, cache, deduplicação, 429, falhas, pesquisa em lote e ausência de dados.
- `npm run test:db`: regressão em bancos PostgreSQL temporários isolados.
- `node --test frontend/tests/*.test.mjs`: pesquisa, seleção, períodos, cancelamento, expiração, estados, compilação e temas.
- `npm run build --prefix frontend`
- `git diff --check`

A implementação foi validada com `/ping`, listagem BRL e históricos reais de Bitcoin em 7/30/90 dias. Testes automatizados usam respostas sintéticas e não consomem a cota CoinGecko.

## Referências

- [Listagem Demo](https://docs.coingecko.com/demo/reference/coins-markets)
- [Histórico Demo](https://docs.coingecko.com/demo/reference/coins-id-market-chart)
- [Pesquisa Demo](https://docs.coingecko.com/demo/reference/search-data)

A documentação oficial apresenta limites por minuto divergentes entre suporte e página de preços. O intervalo conservador foi adotado por esse motivo. Os períodos propostos estão dentro da janela histórica Demo de 365 dias documentada na implementação.
