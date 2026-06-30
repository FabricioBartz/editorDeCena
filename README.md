# Editor de Cena 3D - WebGL2

Este projeto consiste em um editor de cenários tridimensionais interativo desenvolvido em **WebGL2 nativo**. A aplicação utiliza as bibliotecas auxiliares **`TWGL.js`** (para simplificação da API do WebGL, gerenciamento de buffers, atributos e uniformes) e **`m4.js`** (para operações de álgebra linear e matrizes de transformação 4x4).

---

## 🛠️ Princípios Gráficos e Arquitetura

O ecossistema foi construído sobre conceitos consolidados de computação gráfica de alto desempenho e otimização de recursos de hardware:

* **Piso de Grade (`gl.LINES`):** O chão estruturado do cenário é gerado dinamicamente no arquivo `geometry-utils.js`. O sistema calcula os vértices espaciais no plano $Y = 0$ e utiliza a primitiva gráfica `gl.LINES` para conectar os pontos através da GPU, fornecendo uma referência métrica estável de $20 \times 20$ unidades para o usuário.
* **Transformações Afins (Matrizes Homogêneas $4 \times 4$):** Cada monstro instanciado sofre transformações geométricas computadas de forma sequencial (Translação $\rightarrow$ Rotação X $\rightarrow$ Rotação Y $\rightarrow$ Rotação Z $\rightarrow$ Escala). O pipeline converte esses dados em matrizes homogêneas de dimensão 4 para enviar os dados unificados de posicionamento diretamente aos Shaders.
* **Grafo de Cenas e Vínculos Hierárquicos:** O motor implementa uma árvore de herança física baseada em matrizes globais. Através de um laço estruturado, o loop principal computa de forma iterativa as multiplicações matriciais necessárias para que os objetos "filhos" herdem e acompanhem organicamente a posição, escala e rotação de seus respectivos objetos "pais".
* **Instanciamento Inteligente e Reutilização de Memória:** O motor gráfico utiliza um sistema de cache dinâmico para garantir alta taxa de quadros (FPS). Quando um modelo é adicionado à cena, o sistema verifica se sua geometria já existe no mapa `modelosCarregados`. Caso exista, os buffers e o Vertex Array Object (VAO) na GPU são totalmente reaproveitados. Isso cria um loop eficiente que evita duplicar malhas idênticas na memória de vídeo, gerando apenas instâncias leves com dados individuais de transformação.
* **Seleção por Mouse (*Color Picking*):** Para evitar cálculos geométricos pesados de colisão por raios (*raycasting*), a seleção de objetos ocorre via hardware. Ao clicar no canvas, a cena é desenhada em um buffer oculto com o parâmetro `u_drawPicking` ativo, onde cada monstro recebe uma cor sólida única (ID Cromático). A função nativa `gl.readPixels` lê a cor exata sob o cursor e identifica instantaneamente a instância selecionada.
* **Estúdio Fotográfico Oculto (*Offscreen Rendering*):** As miniaturas em 3D exibidas no catálogo lateral direito não pesam na renderização principal. O arquivo `thumb-generator.js` inicializa um contexto WebGL2 em um canvas isolado de $128 \times 128$ pixels na memória RAM, renderiza os objetos em ângulo isométrico fixo uma única vez durante o carregamento da página e exporta os pixels como uma string de imagem PNG (*Data URL* Base64) aplicada diretamente nas tags `<img>` do HTML.
* **Mapeamento de Textura via Atlas (Coordenadas UV):** A aplicação otimiza o uso de memória carregando um único arquivo `atlas.png`. Os inputs numéricos de deslocamento (*Offset*) e repetição (*Repeat*) manipulam diretamente uma matriz de textura 2D (`textureMatrix`) nos Shaders, deslocando as coordenadas UV para remapear o envelopamento de imagem da malha em tempo real.
* **Animação por LERP com Easing Senoidal:** O movimento de vaivém configurável utiliza a técnica de **Interpolação Linear (LERP)** balizada pelo relógio interno do navegador. O tempo do sistema alimenta uma função `Math.sin`, gerando um fator elástico normalizado estritamente entre `0.0` (Origem) e `1.0` (Destino), garantindo uma aceleração e desaceleração biológica e fluida nas extremidades da trajetória.
* **Histórico de Estados (Pilha / Padrão Memento):** O sistema de "Desfazer" (Ctrl + Z) opera sob uma estrutura de dados de **Pilha (Stack)** regida pela lógica LIFO (*Last In, First Out*). Toda vez que um objeto sofre mutação, a lista de instâncias é serializada em texto estável via `JSON.stringify` e guardada na pilha, permitindo o resgate idêntico do cenário passado ao desempilhar com `.pop()`.

---

## 📂 Estrutura de Arquivos Principais

* **`app.js`**: O núcleo e cérebro da aplicação. Gerencia o contexto gráfico, o loop contínuo de renderização a 60 FPS (`requestAnimationFrame`), escuta eventos de periféricos (mouse/teclado), controla o Grafo de Cena e centraliza os arrays de estados.
* **`shaders.js`**: Define os códigos em linguagem **GLSL ES 3.0** executados diretamente nos núcleos da GPU. O *Vertex Shader* cuida das transformações de coordenadas e o *Fragment Shader* computa a iluminação difusa Lambertiana, amostragem de texturas e renderizações sólidas de picking.
* **`ui-manager.js`**: Gerencia o acoplamento de mão dupla entre a interface e o motor. Garante que os sliders HTML atualizem as variáveis em tempo real e vice-versa sem gerar concorrência na memória ativa.
* **`thumb-generator.js`**: Dita as regras do pipeline isolado para a fotografia tridimensional em segundo plano das miniaturas.
* **`obj-parser.js`**: Interpretador responsável por ler arquivos de texto puros no formato Wavefront `.obj` e estruturar vetores numéricos de posições, normais e UVs prontos para os buffers do WebGL2.
* **`geometry-utils.js`**: Utilitário matemático focado na modelagem algorítmica do grid do solo.

---

## 🚀 Como Rodar o Programa

1. Certifique-se de ter o editor **VS Code** instalado.
2. Instale a extensão **Live Server** (desenvolviva por Ritwick Dey) através do menu de Extensões (`Ctrl+Shift+X`).
3. Abra a pasta do seu projeto completo no VS Code.
4. No canto inferior direito da barra de status do VS Code, clique no botão **"Go Live"** (ou clique com o botão direito sobre o arquivo `index.html` e escolha *Open with Live Server*).
5. O seu navegador padrão abrirá automaticamente o link `http://127.0.0.1:5500/index.html` com o projeto rodando perfeitamente.
