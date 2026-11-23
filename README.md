# MiniGeo

MiniGeo é uma calculadora gráfica educacional inspirada no GeoGebra, recriada em HTML, CSS e JavaScript puro. A interface preserva o visual limpo e amigável do protótipo, mas agora executa cálculos reais no navegador e desenha os gráficos dinamicamente em SVG.

Desenvolvido pela equipe:

Brian , Bruno, Fernando Fuques, Guilherme, Guilhermo, Moisés de Jesus,Marcos Patric, Rennan Ferreira, Yan Ramos

## Como abrir

### Acesse pelo link:

<a>https://devfuques.github.io/mini-geogebra/<a>

### OU

Não há dependências externas nem etapa de build. A partir desta pasta, execute:

```bash
python3 -m http.server 3000
```

Depois abra `http://localhost:3000/`. Também é possível abrir `index.html` diretamente, embora um servidor local seja recomendado para evitar restrições do navegador.

## Funcionalidades

- Parser matemático seguro, sem `eval`, com números, `x`, constantes `π`/`e`, parênteses, multiplicação implícita e operadores `+`, `−`, `*`, `/`, `^`.
- Aceita potências com sobrescrito (`x²`, `x³`, `(x+1)²`, `x⁻¹`), raiz com `√` e decimais com vírgula (`1,5`), além da forma com `^`.
- Funções `sin`, `cos`, `tan`, `sqrt`, `abs`, `ln`, `log`, `exp`, `asin`, `acos`, `atan`, `floor`, `ceil` e `round`.
- Funções múltiplas no mesmo projeto, com cores, seleção, edição, remoção e visibilidade; o botão **+** da lista de objetos abre um diálogo para criar a próxima função.
- Gráfico SVG dinâmico com eixos, grade, zoom, deslocamento por arraste e centralização.
- Painel de análise recolhível pelo botão **Análise** da barra de ferramentas, deixando mais espaço para o gráfico.
- Guia **Como escrever** no campo de comando, com tabela de sintaxe e exemplos clicáveis.
- Limites bilaterais e laterais por aproximação numérica, tabela de amostras, identificação básica de divergência e extrapolação para melhorar a precisão de limites suaves.
- Derivadas simbólicas de primeira, segunda e terceira ordem, valor em ponto, reta tangente e visualização da derivada.
- Pontos críticos, máximos e mínimos locais, extremos absolutos no intervalo e intervalos de crescimento/decrescimento.
- Otimização numérica com objetivo, restrição, domínio e comparação de candidatos.
- Persistência do projeto e da viewport em `localStorage`, além de desfazer/refazer.
- Exportação do gráfico em SVG e PNG.

## Comandos

No campo de comando da tela principal:

```text
f(x) = x^2 - 4
f(x) = x³ - 3x² + 1
Derivada(f)
Limite(f, 2)
Tangente(f, 1)
```

Qualquer letra pode nomear a função, como `g(x) = sin(x)`. Também é possível criar objetos pelo botão **+**, que sugere o próximo nome livre e valida a expressão antes de adicionar.

## Estrutura

```text
index.html                  estrutura de todas as telas
css/styles.css              identidade visual, layout e responsividade
js/math-engine.js           parser, avaliação, derivação e métodos numéricos
js/app.js                   estado, formulários, gráficos, comandos e persistência
public/manus-routes.json    rotas reconhecidas pelo Preview Webdev
```

## Telas

| Tela | Endereço |
|---|---|
| Boas-vindas | `index.html#boas-vindas` |
| Tela principal | `index.html#principal` |
| Calcular derivada | `index.html#derivada` |
| Calcular limite | `index.html#limite` |
| Máximos e mínimos | `index.html#extremos` |
| Assistente de otimização | `index.html#otimizacao` |
| Tutorial | `index.html#tutorial` |

## Observações técnicas

Os cálculos são numéricos quando o problema exige busca, amostragem ou comparação de candidatos. A derivação usa regras simbólicas para a árvore de expressão suportada. Limites em pontos problemáticos, assíntotas e problemas de otimização muito não lineares são apresentados com aproximações e avisos quando não é possível garantir uma forma fechada.

O projeto não usa backend, conta de usuário ou banco de dados: o estado local é armazenado no navegador. As fontes Instrument Sans e STIX Two Text vêm do Google Fonts, com fallback para fontes do sistema quando não há internet.
