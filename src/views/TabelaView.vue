<script setup lang="ts">
import Tabela, { ReferenciaCelula, type APITabela, type Coluna } from '@/components/Tabela.vue';
import { reactive, ref, watch } from 'vue';
import dados from '@/assets/dados.json';

const colunas: Coluna[] = [
	{
		Nome: "identificacao",
		Descricao: "Identificação",
		Tipo: "number",
		Conversao: (valor: any, converterPara?: string): any => {
			switch (converterPara) {
				case "string":
					switch (valor) {
						case 1:
							return "Um";
						case 2:
							return "Dois";
						case 3:
							return "Três";
						default:
							return (valor ?? "").toString();
					}
				case "boolean":
					switch (valor) {
						case 2:
							return true;
						default:
							return false;
					}
				default:
					switch (typeof valor) {
						case "string":
							switch (valor) {
								case "Um":
									return 1;
								case "Dois":
									return 2;
								case "Três":
									return 3;
								default:
									return (valor !== undefined && valor !== null && valor !== "" && !isNaN(Number(valor))) ? Number(valor) : null;
							}
						case "boolean":
							switch (valor) {
								case false:
									return 1;
								case true:
									return 2;
								default:
									return null;
							}
						default:
							return (valor !== undefined && valor !== null && valor !== "" && !isNaN(Number(valor))) ? Number(valor) : null;
					}
			}
		}
	},
	{
		Nome: "nome",
		Descricao: "Nome",
		Tipo: "string"
	},
	{
		Nome: "email",
		Descricao: "E-mail",
		Tipo: "string"
	},
	{
		Nome: "telefone",
		Descricao: "Telefone",
		Tipo: "string",
		Validacao: (valor: string): string | boolean => {
			if (/^\(\d{2}\) \d{5}-\d{4}$/.test(valor)) {
				return valor;
			} else {
				return false;
			}
		}
	},
	{
		Nome: "ativo",
		Descricao: "Ativo",
		Tipo: "boolean",
		AtributosCabecalho: {
			style: "text-align: center"
		},
		AtributosCelula: {
			style: { 'display': 'flex', 'justify-content': 'center', 'align-items': 'center' }
		},
		Conversao: (valor: any, converterPara?: string): any => {
			switch (converterPara) {
				case "string":
					switch (valor) {
						case true:
							return "Sim";
						default:
							return "";
					}
				case "number":
					switch (valor) {
						case true:
							return 1;
						default:
							return null;
					}
				default:
					switch (typeof valor) {
						case "string":
							switch (valor) {
								case "Sim":
									return true;
								default:
									return false;
							}
						case "number":
							switch (valor) {
								case 2:
									return true;
								default:
									return false;
							}
						default:
							break;
					}
					break;
			}
		}
	}
];

let linhas: Record<string, any>[] = reactive(dados);

let celulaAtual = reactive(new ReferenciaCelula(0, 0));
let inicioSelecao = reactive(new ReferenciaCelula(0, 0));

const estado = reactive({ estilo: "" });

const linhaDiferente = (linha: Record<string, any>, numeroLinha: number): Record<string, any> | undefined => {
	if (linha.identificacao === 4) {
		return { class: "linha-diferente", style: { "background-color": "#00c", color: "#fff", "text-align": "right" } };
	}
}

const celulaDiferente = (linha: Record<string, any>, numeroLinha: number, numeroColuna: number): Record<string, any> | undefined => {
	if (linha.identificacao === 4 && numeroColuna === 2) {
		return { class: "celula-diferente", style: "background-color: #c00; text-align: center;" };
	}
}

let tabela: APITabela;
</script>

<template>
	<div class="container">
		<p>Nesse exemplo, a tabela é acrescida de algumas informações extras.</p>
		<ul>
			<li>Células da coluna <strong>E-mail</strong> possuem validação de e-mail, através de personalização do slot <strong>edicao-celula-string</strong> (&lt;input type="email" /&gt;)</li>
			<li>Células da coluna <strong>Telefone</strong> possuem validação de telefone, através de função de validação na definição da coluna</li>
			<li>Linhas com a coluna <strong>Identificação</strong> 4 possuem formatação diferente (através da propriedade <strong>atributos-linha</strong>)</li>
			<li>Células da coluna <strong>E-mail</strong> de linhas com a coluna <strong>Identificação</strong> 4 possuem formatação diferente</li>
			<li>Ao colar células da coluna <strong>Identificação</strong> na coluna <strong>Nome</strong>, há conversão dos valores <em>1</em>, <em>2</em> e <em>3</em> (experimente para ver o que acontece)</li>
			<li>Ao colar células da coluna <strong>Ativo</strong> na coluna <strong>Nome</strong>, há conversão dos valores <em>true</em> e <em>false</em> (experimente para ver o que acontece)</li>
			<li>É possível selecionar um estilo de tabela através do seletor abaixo</li>
			<li>Caso esteja acessando de um celular:
				<ul>
					<li>Toque e arraste com um dedo para selecionar células</li>
					<li>Arraste com dois dedos para rolar a página</li>
				</ul>
			</li>
		</ul>
		<p style="margin: 10px 0">Acesse a documentação de uso <a href="https://github.com/tdcosta100/tabela-editavel-vue#intera%C3%A7%C3%B5es-poss%C3%ADveis-e-atalhos" target="_blank">aqui</a>.</p>
		<p>Acesse o código-fonte desta página <a href="https://github.com/tdcosta100/tabela-editavel-vue/blob/master/src/views/TabelaView.vue" target="_blank">aqui</a>.</p>
		<select style="margin: 10px 0" @change="event => estado.estilo = (event.target as HTMLSelectElement).value">
			<option value="">Sem tema</option>
			<option value="claro-1">Claro 1</option>
			<option value="claro-2">Claro 2</option>
			<option value="claro-3">Claro 3</option>
			<option value="claro-4">Claro 4</option>
			<option value="claro-5">Claro 5</option>
			<option value="claro-6">Claro 6</option>
			<option value="claro-7">Claro 7</option>
			<option value="claro-8">Claro 8</option>
			<option value="claro-9">Claro 9</option>
			<option value="claro-10">Claro 10</option>
			<option value="claro-11">Claro 11</option>
			<option value="claro-12">Claro 12</option>
			<option value="claro-13">Claro 13</option>
			<option value="claro-14">Claro 14</option>
			<option value="claro-15">Claro 15</option>
			<option value="claro-16">Claro 16</option>
			<option value="claro-17">Claro 17</option>
			<option value="claro-18">Claro 18</option>
			<option value="claro-19">Claro 19</option>
			<option value="claro-20">Claro 20</option>
			<option value="claro-21">Claro 21</option>
			<option value="medio-1">Médio 1</option>
			<option value="medio-2">Médio 2</option>
			<option value="medio-3">Médio 3</option>
			<option value="medio-4">Médio 4</option>
			<option value="medio-5">Médio 5</option>
			<option value="medio-6">Médio 6</option>
			<option value="medio-7">Médio 7</option>
			<option value="medio-8">Médio 8</option>
			<option value="medio-9">Médio 9</option>
			<option value="medio-10">Médio 10</option>
			<option value="medio-11">Médio 11</option>
			<option value="medio-12">Médio 12</option>
			<option value="medio-13">Médio 13</option>
			<option value="medio-14">Médio 14</option>
			<option value="medio-15">Médio 15</option>
			<option value="medio-16">Médio 16</option>
			<option value="medio-17">Médio 17</option>
			<option value="medio-18">Médio 18</option>
			<option value="medio-19">Médio 19</option>
			<option value="medio-20">Médio 20</option>
			<option value="medio-21">Médio 21</option>
			<option value="medio-22">Médio 22</option>
			<option value="medio-23">Médio 23</option>
			<option value="medio-24">Médio 24</option>
			<option value="medio-25">Médio 25</option>
			<option value="medio-26">Médio 26</option>
			<option value="medio-27">Médio 27</option>
			<option value="medio-28">Médio 28</option>
			<option value="escuro-1">Escuro 1</option>
			<option value="escuro-2">Escuro 2</option>
			<option value="escuro-3">Escuro 3</option>
			<option value="escuro-4">Escuro 4</option>
			<option value="escuro-5">Escuro 5</option>
			<option value="escuro-6">Escuro 6</option>
			<option value="escuro-7">Escuro 7</option>
			<option value="escuro-8">Escuro 8</option>
			<option value="escuro-9">Escuro 9</option>
			<option value="escuro-10">Escuro 10</option>
			<option value="escuro-11">Escuro 11</option>
		</select>
		<div style="display: flex; gap: 10px; margin-bottom: 10px;">
			<button @click="tabela.recortarCelulas()">Recortar células selecionadas</button>
			<button @click="tabela.copiarCelulas()">Copiar células selecionadas</button>
			<button @click="tabela.colar()">Colar</button>
			<button @click="tabela.cancelarAreaTransferencia()">Cancelar recortar/copiar</button>
		</div>
		<Tabela :ref="element => tabela = (element as unknown) as APITabela" :class="estado.estilo" :colunas="colunas" :linhas="linhas" :celula-atual="celulaAtual" :inicio-selecao="inicioSelecao" :somente-leitura="false" :atributos-linha="linhaDiferente" :atributos-celula="celulaDiferente">
			<template #edicao-celula-string="{ linha, coluna, nomeColuna, dados, finalizarEdicaoCelula, atualizarValorCelula }">
				<div v-if="nomeColuna === 'email'" style="position: absolute; top: 0; left: 0; bottom: 0; right: 0;">
					<input type="email" :value="dados[nomeColuna]" @change="(event) => (event.target as HTMLInputElement).validity.valid && atualizarValorCelula((event.target as HTMLInputElement).value)" @blur="finalizarEdicaoCelula()" @input="(event) => $parent?.$emit('update:celula', event, (event.target as HTMLInputElement).value, linha, coluna)" />
				</div>
				<div v-else style="position: absolute; top: 0; left: 0; bottom: 0; right: 0;">
					<input type="text" :value="dados[nomeColuna]" @change="(event) => atualizarValorCelula((event.target as HTMLInputElement).value)" @blur="finalizarEdicaoCelula()" @input="(event) => $parent?.$emit('update:celula', event, (event.target as HTMLInputElement).value, linha, coluna)" />
				</div>
			</template>
		</Tabela>
	</div>
</template>

<style scoped>
@import "@/assets/estilos-tabela.css";

ul {
	padding-left: 1.2em;
}

strong {
	font-weight: bold;
}

.container {
	display: inline-block;
}

.tabela {
	font-family: Calibri;
	font-size: 11pt;
	color: #000;
	grid-template-columns: auto repeat(3, 1fr) 0.25fr;
}

.tabela:deep(.celula:not(.cabecalho)) {
	white-space: nowrap;
}

.tabela:deep(.celula input[type="text"]),
.tabela:deep(.celula input[type="number"]),
.tabela:deep(.celula input[type="email"]) {
	display: block;
	width: 100%;
	height: 100%;
	margin: 0;
	padding: 5px;
	border: 0 none transparent;
	background: transparent;
	font-family: inherit;
	font-size: inherit;
	color: inherit;
    outline: none;
    border-radius: 0;
    box-shadow: none;
	box-sizing: border-box;
}

.tabela:deep(.celula.linha-diferente input[type="text"]),
.tabela:deep(.celula.linha-diferente input[type="number"]),
.tabela:deep(.celula.linha-diferente input[type="email"]) {
	color: #fff!important;
	text-align: right;
}

.tabela:deep(.celula.celula-diferente input[type="text"]),
.tabela:deep(.celula.celula-diferente input[type="number"]),
.tabela:deep(.celula.celula-diferente input[type="email"]) {
	text-align: center;
}

.tabela:deep(.celula:nth-child(5n + 5) input[type="text"]),
.tabela:deep(.celula:nth-child(5n + 5) input[type="number"]),
.tabela:deep(.celula:nth-child(5n + 5) input[type="email"]) {
	text-align: center;
}
</style>