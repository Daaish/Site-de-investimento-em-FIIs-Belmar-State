# Belmar Academy — Educação Financeira

Área pública `/academy`, disponível pela sidebar. Implementação local no frontend, sem tabelas, migrações, novas dependências ou chamadas próprias de API. A navegação global continua usando a infraestrutura existente da aplicação.

## Experiência na feira

- Entrada com destaque para **Experimente o simulador**.
- Quatro módulos e 21 lições, com título, nível, descrição, tempo estimado de leitura, exemplo educativo, destaque e pergunta de reflexão.
- Simulador com atualização reativa e comparação visual entre patrimônio hipotético e total aportado.
- Quiz de 12 perguntas (três por módulo), com uma resposta por questão, explicação imediata e revisão final.
- **Recomeçar experiência** restaura a área Aprender, fecha o módulo, limpa respostas e pontuação e restaura todos os valores iniciais do simulador. O foco retorna ao título e uma mensagem acessível confirma o reinício.
- A alternância Light/Dark preserva o estado. Navegar entre as três áreas também preserva valores e respostas.
- Nada é persistido em localStorage, sessionStorage ou PostgreSQL. Sair da rota ou recarregar inicia uma nova experiência. Não são solicitados dados pessoais nem credenciais.

## Conteúdo e manutenção

`frontend/src/data/academy/modulos.js` contém os módulos e suas lições. Cada lição tem ID estável, título, minutos estimados, resumo, exemplo, destaque e reflexão. `quiz.js` contém opções, índice da resposta correta, explicação e módulo de cada pergunta. Tempos são estimativas editoriais, não medições individuais.

Exemplos são hipotéticos e não representam cotações. Fontes públicas de educação financeira são vinculadas no rodapé (Banco Central, CVM, IBGE e documentação de segurança Ethereum). Conteúdo não fornece recomendação personalizada nem promessa de retorno.

## Cálculo do simulador

A função pura `simularInvestimento` usa taxa anual efetiva em porcentagem:

```
i_m = (1 + taxaAnual / 100)^(1/12) - 1
saldo_0 = inicial
saldo_m = saldo_(m-1) * (1 + i_m) + aporte
totalAportado_m = inicial + m * aporte
rendimento_m = saldo_m - totalAportado_m
```

O código usa `log1p`/`expm1` para estabilidade em taxas pequenas. Os aportes entram ao fim do mês; o último aporte ainda não recebe juros. O gráfico inclui o mês zero e todos os meses do prazo. A taxa zero é calculada diretamente, evitando resíduos numéricos em aportes decimais. Não há arredondamento mensal; apenas a apresentação usa centavos.

Valores iniciais: R$ 1.000 de investimento inicial, R$ 100 de aporte mensal, 10 anos e taxa anual hipotética de 6%.

Limites educativos: investimento e aporte entre zero e R$ 1 bilhão; prazo inteiro entre 1 e 50 anos; taxa de −99,99% a 100% ao ano. Taxas iguais ou inferiores a −100% são rejeitadas; entradas vazias, não numéricas, infinitas e projeções acima de `Number.MAX_SAFE_INTEGER` são rejeitadas. Taxas negativas válidas geram perda hipotética, sem saldo negativo, quando entradas não negativas são usadas.

A hipótese é de taxa constante e rendimentos reinvestidos. Não considera impostos, taxas, inflação ou oscilações. Não importa nem modifica a carteira e não usa os algoritmos de desempenho existentes. Precisão é a de números JavaScript; não se trata de sistema contábil de centavos.

## Visual e acessibilidade

Estilos prefixados por `.academy`, com tokens institucionais e responsividade. Gráfico com linha sólida para patrimônio e tracejada para aportes, legenda, tooltip em BRL e resumo textual. As cores das duas linhas são verificadas com contraste mínimo de 3:1 contra a superfície nos dois temas. Controles usam labels, descrições, estados de resposta, foco de navegação e regiões de feedback. Respostas incorretas não dependem apenas de cor.

## Testes

- `node --test frontend/tests/*.test.mjs`: matemática, casos extremos, navegação, conteúdo, quiz, reinício, acesso público, compilação e preservação do estado nos temas.
- `npm test`: regressão do backend, incluindo mercado, cache e carteira.
- `npm run test:db`: regressão com bancos PostgreSQL temporários isolados.
- `npm run build --prefix frontend`
- `git diff --check`

Não foi realizada inspeção visual manual em navegador neste ambiente. Os testes de acessibilidade e tema cobrem estrutura, reatividade e contraste das linhas; não substituem avaliação com leitor de tela e aparelhos reais.
