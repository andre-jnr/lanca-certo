# Lança Certo

Jogo de quiz para treinar a entrada de nota fiscal na Unidade Morada do Sol (Frigorífico Amazonas). As regras vêm do guia de faturamento (`guia-faturamento-morada-do-sol.html` / `.pdf`) e das orientações da equipe.

## Como abrir

Dê dois cliques em `lanca-certo.html`. Abre em qualquer navegador (Chrome, Edge, Firefox) no computador ou no celular. Não precisa instalar nada.

Sem internet o jogo funciona normalmente, só que as fontes do Google não carregam e o navegador usa as fontes padrão do sistema.

## Estrutura

```
Joguinhos-faturamento/
├── lanca-certo.html                     página do jogo (só a marcação)
├── css/
│   └── lanca-certo.css                  estilos, tema claro/escuro e a réplica da tela do sistema
├── js/
│   └── lanca-certo.js                   regras, perguntas e lógica do jogo
├── guia-faturamento-morada-do-sol.html  guia original (fonte das regras)
├── guia-faturamento-morada-do-sol.pdf
└── README.md
```

## Modos de jogo

- **Partida completa:** 12 rodadas misturando todos os tipos. Tem combo (acertos seguidos multiplicam os pontos até 2×) e recorde salvo no navegador.
- **Treino por fase:** escolha uma das 8 fases na tela inicial.

| Fase | O que treina |
|---|---|
| Tela do sistema | Réplica do "Cadastro de Entrada de Produto": Depósito, Forma de Pagto, Tipo de entrada, CFOP e CST |
| Separe a mercadoria | Revenda, uso e consumo ou patrimônio, contra o relógio |
| Macete do CST | 540 → 040 e CST no Simples Nacional |
| CFOP certo | Troca de industrialização, serviço e transferência |
| Verdadeiro ou falso | Afirmações do guia |
| Confira o CNPJ | Achar o documento fora do CNPJ 19.234.190/0007-25 |
| Markup na ponta do lápis | Custo × 1,6667 = preço de venda |
| Financeiro | Conta corrente e vencimento (boleto ou transferência entre lojas) |

Atalhos no computador: teclas `1` a `4` para as opções, `V`/`F` no verdadeiro ou falso, `Enter` para começar.

## Regras usadas

**Depósito:** `LOJA` para revenda. `DEPÓSITO` para uso e consumo e patrimônio (não têm saída).

**Forma de pagamento:** boleto → `A Prazo`. Transferência bancária → `A Vista`.

**Tipo de entrada**

| Tipo | Quando usar |
|---|---|
| Compra para Revenda | Carnes, congelados, frios, hortifruti (FLV), gôndola, laticínios |
| Compra para Consumo | Limpeza e higiene, expediente, material para produção, embalagens |
| Transferência | Produtos vindos de outra filial do Frigorífico Amazonas |
| Bens e Patrimônio | TV, notebook, mesa, compressor, armário, máquinas |
| Bonificação | Sem boleto, com CFOP 5.910 na nota |
| Serviço | Nota de serviço e CT-e (frete) |

**CFOP e CST**

| Situação | CFOP | CST |
|---|---|---|
| Revenda isenta | 1.102 (nunca 1.101) | 000, 020, 040, 041 · Simples: 090 |
| Revenda com ST | 1.403 (nunca 1.401) | 060, 070 · Simples: 060 |
| Uso e consumo | 1.556 | 041 · Simples: 090 |
| Bens e patrimônio | 1.551 | O que vier na nota |
| Transferência de isentos | 1.152 | 040 |
| Transferência de produção própria | 1.152 | 020 |
| Transferência com ST | 1.409 | 060 |
| Transferência de uso e consumo | 1.557 | 040 |
| Transferência de bens | 1.552 | Conforme a nota |
| Serviço dentro do estado | 1.933 | — |
| Serviço fora do estado | 2.933 | — |

Macete: CST com outro primeiro dígito (540, 640, 140, 560…) troca o primeiro dígito por 0.

**Financeiro:** boleto → conta corrente 45730, vencimento conforme o boleto físico. Transferência entre lojas → conta corrente 2, vencimento na data da entrada.

### Decisões que não estão no guia

- Patrimônio vai para o depósito `DEPÓSITO`.
- Em transferência entre lojas e bonificação, a forma de pagamento não é avaliada.
- No CT-e só são avaliados o tipo (Serviço) e a forma de pagamento. O CFOP não é cobrado.

## Como editar o conteúdo

Todo o conteúdo fica no início de `js/lanca-certo.js`, em listas fáceis de mudar:

| Lista | Conteúdo |
|---|---|
| `SCEN` | Notas da fase "Tela do sistema": emitente, itens, CFOP/CST importados (`imp`) e respostas certas (`ans`). Use `null` em `ans` para um campo que não deve ser avaliado |
| `SORT` | Produtos da fase "Separe a mercadoria": `[nome, categoria, 'R' / 'C' / 'P']` |
| `MACETE`, `SIMPLES_Q` | Perguntas de CST |
| `CFOP_Q` | Perguntas de CFOP. A primeira opção de `o` é sempre a correta (as opções são embaralhadas na tela) |
| `TF` | Verdadeiro ou falso: `[afirmação, true/false, explicação]` |
| `MC` | Perguntas de múltipla escolha: `[pergunta, [opção certa, ...erradas], explicação]` |
| `FIN_CASES` | Casos do financeiro |
| `CNPJ_LOJA`, `CNPJ_WRONG` | CNPJ correto da loja e as variações erradas |

As cores e fontes ficam no bloco `:root` no início de `css/lanca-certo.css`.

## Dados salvos

O recorde e a preferência de som ficam no `localStorage` do navegador (`lancaCerto.best` e `lancaCerto.som`). Cada computador ou celular guarda os seus.
