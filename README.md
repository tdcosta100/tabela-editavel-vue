# Tabela Editável

Cansado de procurar por aí e precisando entregar uma aplicação que emulasse o máximo possível de funcionalidade que o Microsoft Excel tem (dentro do que era utilizado pelos usuários, nada muito complexo), desenvolvi um componente de tabela utilizando Vue 3, que cumpriu bem seu objetivo.

Te interessou? Veja [aqui](https://tdcosta100.github.io/tabela-editavel-vue/) um exemplo.

Você pode também navegar pelo [código-fonte do componente](src/components/Tabela.vue).

## Interações possíveis e atalhos

### Atalhos de teclado

* <kbd>&#8592;</kbd> <kbd>&#8593;</kbd> <kbd>&#8594;</kbd> <kbd>&#8595;</kbd> <kbd>PgUp</kbd> <kbd>PgDown</kbd>: navega entre as células
* <kbd>Tab</kbd>: navega para a próxima célula. Se estiver no modo de edição, salva as alterações e sai do modo de edição
* <kbd>Shift</kbd> + <kbd>Tab</kbd>: navega para a célula anterior. Se estiver no modo de edição, salva as alterações e sai do modo de edição
* <kbd>Home</kbd>: navega para o início da linha
* <kbd>End</kbd>: navega para o final da linha
* <kbd>Ctrl</kbd> + <kbd>Home</kbd>: navega para a célula da primeira linha e primeira coluna
* <kbd>Ctrl</kbd> + <kbd>End</kbd>: navega para a célula da última linha e última coluna
* <kbd>Shift</kbd> + <kbd>&#8592;</kbd> <kbd>&#8593;</kbd> <kbd>&#8594;</kbd> <kbd>&#8595;</kbd>: seleciona as células enquanto navega
* <kbd>Shift</kbd> + <kbd>Home</kbd>: seleciona da célula atual até o início da linha
* <kbd>Shift</kbd> + <kbd>End</kbd>: seleciona da célula atual até o fim da linha
* <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Home</kbd>: seleciona da célula atual até a célula da primeira linha e primeira coluna
* <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>End</kbd>: seleciona da célula atual até a célula da última linha e última coluna
* <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>+</kbd>: insere uma nova linha
* <kbd>Ctrl</kbd> + <kbd>A</kbd>: seleciona todas as células da tabela, exceto cabeçalho
* <kbd>Ctrl</kbd> + <kbd>X</kbd>: recorta as células selecionadas
* <kbd>Ctrl</kbd> + <kbd>C</kbd>: copia as células selecionadas
* <kbd>Ctrl</kbd> + <kbd>V</kbd>: cola da área de transferência, ou da área marcada na tabela
* <kbd>F2</kbd>: ativa a edição da célula sem apagar o conteúdo existente
* Comece a digitar: ativa a edição da célula limpando o conteúdo existente
* <kbd>Enter</kbd>: salva as alterações e sai do modo de edição
* <kbd>Esc</kbd>: cancela a edição da célula, ou a seleção da área de transferência
* <kbd>Delete</kbd>: exclui o conteúdo das células selecionadas
* <kbd>Shift</kbd> + <kbd>Delete</kbd>: exclui as linhas selecionadas
* <kbd>Espaço</kbd> em uma coluna do tipo boolean (com checkboxes): marca/desmarca todas as checkboxes das células selecionadas

### Atalhos de mouse

* **Clique**: seleciona a célula sob o mouse. Se outra célula estiver no modo de edição, salva as alterações e sai do modo de edição
* <kbd>Shift</kbd> + **clique**: seleciona um intervalo de células
* **Clique duplo**: inicia o modo de edição da célula sob o mouse

## Como utilizar

Para funcionar minimamente, o componente exige que duas propriedades estejam especificadas: `colunas` e `linhas`. Os exemplos aqui demonstrados utilizarão TypeScript e a [Composition API](https://vuejs.org/api/composition-api-setup.html).

```html
<script setup lang="ts">
import Tabela, { type Coluna } from '@/components/Tabela.vue';
import { reactive } from 'vue';

let colunas: Coluna[] = [
    {
        Nome: "coluna1",
        Descricao: "Coluna 1",
        Tipo: "string"
    }
];

let linhas: Record<string, any>[] = reactive([
    {
        coluna1: "Olá, mundo!"
    }
]);
</script>

<template>
    <Tabela :colunas="colunas" :linhas="linhas" />
</template>
```

## Tipo Coluna

O exemplo acima irá renderizar uma tabela com apenas uma linha e uma coluna. É um bom começo, mas podemos fazer melhor que isso, certo?

Vamos começar analisando o tipo `Coluna` que define as colunas que iremos passar para nosso componente:

```typescript
type Coluna = {
    Nome: string;
    Descricao?: string;
    Tipo: "string" | "number" | "boolean";
    AtributosCabecalho?: Record<string, any>;
    AtributosCelula?: Record<string, any>;
    Validacao?: (valor: any) => any | false;
    Conversao?: (valor: any, converterPara?: string) => any;
}
```

### Campos obrigatórios

* **Nome**: nome da propriedade em cada objeto da coleção `linhas` que aparecerá nessa coluna
* **Tipo**: tipo da coluna. Cada tipo possui seu comportamento específico:
    * **string**: tipo padrão. Não faz nenhuma validação de dados, e no modo de edição utiliza um `<input type="text" />`.
    * **number**: tipo número. A princípio os dados não são convertidos para números válidos, mas após qualquer alteração é utilizada a conversão de valor utilizando-se `Number()` (por exemplo, `Number("42")`). Caso essa conversão resulte em `NaN` (por exemplo, como resultado de `Number("abc")` ou `Number("")`), será atribuído o valor padrão `null`, que é o valor padrão para representar a ausência de valor numérico. No modo de edição, utiliza um `<input type="number" />`.
    * **boolean**: tipo booleano. É representado por um `<input type="checkbox" />`, estando checado caso o valor seja equivalente a `true` e em branco caso o valor seja equivalente a `false`. A princípio os dados não são convertidos para booleano, mas assim que há alguma alteração, é convertido para o equivalente booleano através de `!!` (por exemplo, `!!"Olá, mundo!"` é convertido para `true`, e `!!0` é convertido para `false`).

### Campos opcionais

* **Descricao**: valor a ser mostrado no cabeçalho da coluna. Caso seja omitido, a célula do cabeçalho não será renderizada. Caso ela deva ser renderizada sem nenhum conteúdo dentro, basta especificar uma string vazia (`""`).
* **AtributosCabecalho** e **AtributosCelula**: objeto cujas propriedades se tornarão atributos da célula do cabeçalho e da célula, respectivamente. Por exemplo:

    ```typescript
    let colunas: Coluna[] = [
        {
            Nome: "coluna1",
            Descricao: "Coluna 1",
            Tipo: "string",
            AtributosCabecalho: {
                class: [ "cabecalho", "coluna-1" ], // o Vue também aceita string e objeto, consulte a documentação para saber como utilizar
                style: "text-align: center", // o Vue também aceita array e objeto, consulte a documentação para saber como utilizar
                "aria-label": "Coluna 1"
            },
            AtributosCelula: {
                class: { celula: true, realce: tipoTabela === "realce" },
                style: { "text-align": "right", "background-color": "#c00" }
            }
        }
    ];
    ```
* **Validacao**: função de validação de dados. Será chamada sempre que o valor da célula estiver prestes a ser atualizado. Deverá retornar o valor recebido (poderá formatar esse valor caso necessário, ou `false` caso seja inválido. Se o valor retornado for `false`, não haverá atualização do valor da célula. Se ela estiver no modo de edição, a edição será cancelada.

* **Conversao**: função de conversão de dados. Será chamada sempre que for necessária conversão de dados (por exemplo, de `number` para `string`). Caso o parâmetro `converterPara` seja fornecido, deverá efetuar a conversão do parâmetro `valor` para o tipo especificado. Caso não seja fornecido, o parâmetro `valor` deverá ser convertido para tipo da coluna. É possível também criar associações de/para personalizada de dados. Por exemplo, de `number` para `string` sendo 1 => "Um", 2 => "Dois", etc, e vice-versa.

## Tipo ReferenciaCelula

O tipo `ReferenciaCelula` serve como auxiliar para representar uma referência de célula, com linha e coluna. É instanciado da seguinte forma:

```typescript
let celulaAtual = new ReferenciaCelula(3, 2);
```

No exemplo acima, `celulaAtual` contém uma instância de `ReferenciaCelula` representando a célula na quarta linha e terceira coluna. Isso porque tanto as linhas quanto as colunas iniciam a contagem em 0. Dessa forma, a célula do canto superior direito da tabela (desconsiderando-se o cabeçalho) pode ser referenciada por `new ReferenciaCelula(0, 0)`, ou seja, a célula da primeira linha e da primeira coluna.

Para acessar os dados de uma `ReferenciaCelula`, existem duas propriedades: `Linha` e `Coluna`. Elas podem ser alteradas como demonstrado no exemplo abaixo:

```typescript
let celulaAtual = new ReferenciaCelula(3, 2);

console.log(`Linha: ${celulaAtual.Linha}, Coluna: ${celulaAtual.Coluna}`); // Linha: 3, Coluna: 2

celulaAtual.Linha = 8;
celulaAtual.Coluna = 1;
```

Ela também possui alguns métodos úteis:

```typescript

let celula1 = new ReferenciaCelula(0, 0);
let celula2 = new ReferenciaCelula(2, 2);

// O método set atribui linha e coluna de acordo com o parâmetro passado
celula1.set(celula2); // celula1 agora tem a mesma linha e coluna que celula2

celula1.set(2, 2); // o método set também aceita dois parâmetros de linha e coluna, respectivamente

// O método equals verifica se ambas as referências apontam para a mesma célula
celula1.equals(celula2); // retorna true
celula1.set(0, 0);
celula1.equals(celula2); // retorna false
ReferenciaCelula.equals(celula1, celula2); // versão estática do método, aceita dois parâmetros

let celula3 = new ReferenciaCelula(3, 0);

// Os métodos min e max aceitam 1 ou mais parâmetros
let celulaMinima = ReferenciaCelula.min(celula1, celula2, celula3); // retorna uma ReferenciaCelula com Linha 2 e Coluna 0
let celulaMaxima = ReferenciaCelula.max(celula1, celula2, celula3); // retorna uma ReferenciaCelula com Linha 3 e Coluna 2

// O método inRange verifica se uma ReferenciaCelula está contida dentro do retângulo delimitado pelos parâmetros passados
console.log(celula2.inRange(celulaMinima, celulaMaxima)); // true
console.log(celula2.inRange(celula1, celula3)); // true, pois não importa em quais cantos do retângulo estão as células
```

## Atributos opcionais

Apesar de já termos muitas opções de controlar cada coluna da tabela, há atributos adicionais que podemos colocar no componente para personalizá-lo ainda mais:

Atributo | Tipo | Descrição
---------|------|----------
**atributos-cabecalho** | `(coluna: Coluna, numeroColuna: number) => Record<string, any> \| undefined` | Função que define os atributos do cabeçalho dinamicamente, de acordo com a coluna passada pelos parâmetros.
**atributos-linha** | `(linha: Record<string, any>, numeroLinha: number) => Record<string, any> \| undefined` | Função que define os atributos da linha, de acordo com a linha passada pelos parâmetros.
**atributos-celula** | `(linha: Record<string, any>, numeroLinha: number, numeroColuna: number) => Record<string, any> \| undefined` | Função que define os atributos da célula, de acordo com a linha e coluna passadas pelos parâmetros.
**celula-atual** | `ReferenciaCelula` | Para obter o valor da célula atual, ou controlá-lo, basta passar uma `ReferenciaCelula` nesse atributo.
**inicio-selecao** | `ReferenciaCelula` | Para obter o valor do início da seleção das células, ou controlá-lo, basta passar uma `ReferenciaCelula` nesse atributo.
**somente-leitura** | `boolean` | Caso seja `true`, impede alterações nos dados da tabela, mas não impede interações que não envolvam alteração de dados.
**confirmacao-exclusao-linhas** | `(celulaAtual: ReferenciaCelula, inicioSelecao: ReferenciaCelula) => Promise<void>` | Função que deve retornar uma promise que se resolvida confirma a exclusão das linhas selecionadas, e se rejeitada cancela a ação de exclusão. Pressupõe-se que ela exiba um diálogo com mensagem para o usuário, e através de sua interação ele escolha por continuar ou cancelar a ação.
**confirmacao-exclusao-conteudo** | `(celulaAtual: ReferenciaCelula, inicioSelecao: ReferenciaCelula) => Promise<void>` | Função que deve retornar uma promise que se resolvida confirma a exclusão do conteúdo das células selecionadas (ou seja, ficarão em branco), e se rejeitada cancela a ação de exclusão. Pressupõe-se que ela exiba um diálogo com mensagem para o usuário, e através de sua interação ele escolha por continuar ou cancelar a ação.
**colar-celulas** | `(destino: ReferenciaCelula, dados: string[][] \| null, origemInicial: ReferenciaCelula, origemFinal: ReferenciaCelula, removerOrigem: boolean) => void \| false` | Função que executa a ação de colar as células, de acordo com os parâmetros especificados. O parâmetro `dados` representa dados externos, e quando não é `null` significa que os parâmetros seguintes estão vazios. Caso o parâmetro `dados` esteja vazio, os parâmetros seguintes estão preenchidos e representam a localização dos dados dentro da própria tabela. Caso retorne false, o event de colar da área de transferência é cancelado.
**propriedades-estilo-copiar** | `string[]` | Define quais propriedades do estilo (por exemplo, fonte, cor das bordas, cor do fundo, etc) das células selecionadas deverão ser copiados para a área de transferência juntamente com os dados. Ao colar em um editor que aceite dados formatados como o Microsoft Excel, por exemplo, esses estilos vêm junto.

## Eventos

Evento | Assinatura do event handler | Descrição
-------|------------|----------
update:linhas | `(linhas: Record<string, any>[]) => void` | Disparado sempre que há alterações nos dados das linhas da tabela.
update:celulaAtual | `(celulaAtual: ReferenciaCelula) => void` | Disparado sempre que há alteração na referência da célula atual.
update:inicioSelecao | `(inicioSelecao: ReferenciaCelula) => void` | Disparado sempre que há alteração no início de seleção de células.
update:celula | `(evento: Event, valor: string, numeroLinha: number, numeroColuna: number) => void` | Disparado sempre que há um evento que altera o valor da célula enquando a mesma está no modo de edição. Por exemplo, em um `<input type="text" />`, equivale ao evento `input`.

## Slots

O compomente `Tabela` permite que você personalize algumas partes de seu template através de slots. São eles:

Slot | Descrição
-----|----------
cabecalho | Permite personalizar o cabeçalho da tabela.
edicao-celula-string | Mostrado no modo de edição de célula do tipo `string`.
edicao-celula-number | Mostrado no modo de edição de célula do tipo `number`.
edicao-celula-boolean | Mostrado no modo de edição de célula do tipo `boolean`.

A seguir, o funcionamento de cada slot:

* **cabecalho**: você pode definir sua própria lógica de renderização de células do cabeçalho. Para auxiliar nesse processo, é passado ao slot o seguinte objeto:
    ```typescript
    { colunas: Coluna[] }
    ```
    Dessa forma, é possível renderizar as colunas utilizando-se um `v-for`.

* **edicao-celula-string, edicao-celula-number e edicao-celula-boolean**: esses três slots funcionam da mesma maneira: são exibidos somente quando o modo de edição está ativado, somente na célula selecionada. Eles recebem o seguinte objeto:
    ```typescript
    {
        linha: number,
        coluna: number,
        nomeColuna: string,
        dados: Record<string, any>,
        finalizarEdicaoCelula: () => void,
        atualizarValorCelula: (valor: any) => void
    }
    ```

    A seguir, a descrição de cada propriedade:
    * **linha**: número da linha de dados (começando com 0)
    * **coluna**: número da coluna de dados (começando com 0)
    * **nomeColuna**: nome da propriedade do objeto `dados` que contém o valor da célula
    * **dados**: objeto que contém os dados da linha da célula
    * **finalizarEdicaoCelula**: método que deve ser chamado para sair do modo de edição. Por exemplo, em um `<input type="text" />` esse método seria chamado no evento `blur`.
    * **atualizarValorCelula**: método que deve ser chamado para alterar o valor da célula atual. Por exemplo, em um `<input type="text" />` esse método seria chamado no evento `change`.

## API da instância

A instância do componente tem uma API, definida através da seguinte interface:

```typescript
interface APITabela {
    recortarCelulas: () => void;
    copiarCelulas: () => void;
    colarCelulas: () => void;
    cancelarAreaTransferencia: () => void;
}
```

Método | Descrição
-------|----------
`recortarCelulas` | Recorta as células selecionadas.
`copiarCelulas` | Copia as células selecionadas.
`colar` | Cola as células selecionadas ou o conteúdo da área de transferência.
`cancelarAreaTransferencia` | Limpa a seleção de células recortadas/copiadas, e a área de transferência caso existam células recortadas/copiadas.

E como fazer para acessar essa interface? Considere o exemplo abaixo (usando a Composition API):

```html
<script setup lang="ts">
import Tabela, { type APITabela } from '@/components/Tabela.vue';

const tabela: APITabela;
</script>

<template>
    <button @click="tabela.recortarCelulas()">Recortar Células</button>
    <button @click="tabela.copiarCelulas()">Copiar Células</button>
    <button @click="tabela.colar()">Colar</button>
    <button @click="tabela.cancelarAreaTransferencia()">Limpar seleção</button>
    <Tabela :ref="element => tabela = (element as unknown) as APITabela" />
</template>
```

É relativamente simples, não tem muito segredo.

## Classes

O componente utiliza classes para identificar elementos e também indicar seu estado.

* **tabela**: referencia o elemento da tabela
* **editando**: colocada no elemento `.tabela` sempre que a tabela está no modo de edição. Também é colocada no elemento `.celula` que está sendo editado.
* **celula**: referencia todos os elementos que são células
* **cabecalho**: referencia todos os elementos `.celula` que fazem parte do cabeçalho da tabela
* **coluna-1, coluna-2, ..., coluna-N**: referencia todos os elementos `.celula` que fazem parte da coluna 1, 2, ..., N da tabela
* **linha-1, linha-2, ..., linha-N**: referencia todos os elementos `.celula` que fazem parte da linha 1, 2, ..., N da tabela
* **primeira-coluna**: referencia todos os elementos da primeira coluna da tabela
* **ultima-coluna**: referencia todos os elementos da última coluna da tabela
* **primeira-linha**: referencia todos os elementos da primeira linha da tabela
* **ultima-linha**: referencia todos os elementos da última linha da tabela
* **linha-impar**: referencia todas as linhas de dados ímpares da tabela
* **linha-par**: referencia todas as linhas de dados pares da tabela
* **celula-atual**: referencia o elemento que representa a célula atual. Também recebe as classes `coluna-1`, `coluna-2`, ..., `coluna-N` e `linha-1`, `linha-2`, ..., `linha-N` de acordo com o endereço da célula atual.
* **selecao**: referencia o elemento que representa a área das células selecionadas
* **area-transferencia**: referencia o elemento que representa a área das células copiadas ou recortadas
* **inicio-primeira-coluna**: colocada nos elementos `.selecao` e `.area-transferencia` quando começam na primeira coluna
* **inicio-ultima-coluna**: colocada nos elementos `.selecao` e `.area-transferencia` quando começam na última coluna
* **inicio-primeira-linha**: colocada nos elementos `.selecao` e `.area-transferencia` quando começam na primeira linha
* **inicio-ultima-linha**: colocada nos elementos `.selecao` e `.area-transferencia` quando começam na última linha
* **fim-primeira-coluna**: colocada nos elementos `.selecao` e `.area-transferencia` quando terminam na primeira coluna
* **fim-ultima-coluna**: colocada nos elementos `.selecao` e `.area-transferencia` quando terminam na última coluna
* **fim-primeira-linha**: colocada nos elementos `.selecao` e `.area-transferencia` quando terminam na primeira linha
* **fim-ultima-linha**: colocada nos elementos `.selecao` e `.area-transferencia` quando terminam na última linha
