# Auditoria das dependências do backend

Verificação desta etapa com `npm audit --json` e consulta ao registro npm. Foram identificados quatro pacotes vulneráveis, todos transitivos do Express já existente. A inclusão de `express-session@1.19.0` não alterou essas versões. Não foi executado `npm audit fix` nem instalada uma atualização principal.

| Pacote instalado | Severidade npm | Correção disponível na mesma versão principal |
| --- | --- | --- |
| `body-parser@2.2.0` | Alta | `2.4.0` |
| `proxy-addr@2.0.7` | Crítica | `2.0.8` |
| `path-to-regexp@8.3.0` | Alta | `8.4.0` |
| `qs@6.14.0` | Moderada | `6.16.1` |

As versões acima estão dentro das faixas declaradas pelas dependências atuais (`^2.2.0`, `^2.0.7`, `^8.0.0` e `^6.14.0`). Portanto, há atualizações sem necessidade de mudar a versão principal do Express ou desses pacotes. A versão mais recente de `path-to-regexp` no registro é 9, mas a correção 8.4.0 existe e evita essa mudança principal. Essas atualizações ainda exigem aplicação e testes; compatibilidade semântica não substitui validação.

A vulnerabilidade crítica de `proxy-addr` envolve interpretação de sub-redes IPv4 mapeadas em IPv6 na configuração de confiança de proxies, permitindo falsificação de IP. O backend não habilita `trust proxy` e sua inicialização demonstrativa fica restrita a `127.0.0.1`; a dependência vulnerável continua instalada e o alerta permanece aberto.

Referências dos mantenedores/advisories:

- Proxy: https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h
- Body parser: https://github.com/advisories/GHSA-27r3-jxmh-p828
- Rotas: https://github.com/advisories/GHSA-j3q9-mxjg-w52f e https://github.com/advisories/GHSA-27v5-c462-wpq7
- Query strings: https://github.com/advisories/GHSA-4mjr-xmp4-gh2g

Proposta de correção posterior: atualizar somente as dependências transitivas listadas, respeitando suas versões principais, revisar o lockfile e repetir as suítes do backend e PostgreSQL. Nenhum `--force` é necessário.
