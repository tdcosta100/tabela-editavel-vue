<script lang="ts">
export class ReferenciaCelula {
	Linha: number;
	Coluna: number;

	constructor (linha = 0, coluna = 0) {
		this.Linha = linha;
		this.Coluna = coluna;
	}

	set (...args: any[]) {
		if (args.length === 1 && args[0] instanceof ReferenciaCelula) {
			const referencia = args[0] as ReferenciaCelula;
			this.Linha = referencia.Linha;
			this.Coluna = referencia.Coluna;
		}

		if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
			const linha:number = args[0];
			const coluna:number = args[1];

			this.Linha = linha;
			this.Coluna = coluna;
		}
	}

	static equals (obj1: ReferenciaCelula, obj2: ReferenciaCelula): boolean {
		return obj1.Linha === obj2.Linha && obj1.Coluna === obj2.Coluna;
	}

	equals (other: ReferenciaCelula): boolean {
		return ReferenciaCelula.equals(this, other);
	}

	static min (...obj: ReferenciaCelula[]): ReferenciaCelula {
		return new ReferenciaCelula(Math.min(...obj.map(r => r.Linha)), Math.min(...obj.map(r => r.Coluna)));
	}

	static max (...obj: ReferenciaCelula[]): ReferenciaCelula {
		return new ReferenciaCelula(Math.max(...obj.map(r => r.Linha)), Math.max(...obj.map(r => r.Coluna)));
	}

	inRange (obj1: ReferenciaCelula, obj2: ReferenciaCelula): boolean {
		const min = ReferenciaCelula.min(obj1, obj2);
		const max = ReferenciaCelula.max(obj1, obj2);

		return (
			min.Linha <= this.Linha && this.Linha <= max.Linha
			&&
			min.Coluna <= this.Coluna && this.Coluna <= max.Coluna
		);
	}
}

export type TipoDadosColuna = "string" | "number" | "boolean";

export type Coluna = {
	Nome: string;
	Descricao?: string;
	Tipo: TipoDadosColuna;
	AtributosCabecalho?: Record<string, any>;
	AtributosCelula?: Record<string, any>;
	Validacao?: (valor: any) => any | false;
	Conversao?: (valor: any, converterPara?: TipoDadosColuna) => any;
}

export interface APITabela {
	recortarCelulas: () => void;
	copiarCelulas: () => void;
	colar: () => void;
	cancelarAreaTransferencia: () => void;
	inserirLinha: () => void;
	limparCelulasSelecionadas: () => void;
	excluirLinhasSelecionadas: () => void;
};
</script>

<script setup lang="ts">
import { computed } from '@vue/reactivity';
import { nextTick, onBeforeMount, onBeforeUpdate, onMounted, reactive, watch } from 'vue';

interface Props {
	colunas: Coluna[];
	atributosCabecalho?: (coluna: Coluna, numeroColuna: number) => Record<string, any> | undefined;
	atributosLinha?: (linha: Record<string, any>, numeroLinha: number) => Record<string, any> | undefined;
	atributosCelula?: (linha: Record<string, any>, numeroLinha: number, numeroColuna: number) => Record<string, any> | undefined;
	linhas: Record<string, any>[];
	celulaAtual?: ReferenciaCelula;
	inicioSelecao?: ReferenciaCelula;
	somenteLeitura?: boolean;
	confirmacaoExclusaoLinhas?: (celulaAtual: ReferenciaCelula, inicioSelecao: ReferenciaCelula) => Promise<void>;
	confirmacaoExclusaoConteudo?: (celulaAtual: ReferenciaCelula, inicioSelecao: ReferenciaCelula) => Promise<void>;
	colarCelulas?: (destino: ReferenciaCelula, dados: string[][] | null, origemInicial: ReferenciaCelula, origemFinal: ReferenciaCelula, removerOrigem: boolean) => void | false;
	propriedadesEstiloCopiar?: string[]
};

const props = withDefaults(defineProps<Props>(), {
	celulaAtual: () => reactive(new ReferenciaCelula(0, 0)),
	inicioSelecao: () => reactive(new ReferenciaCelula(0, 0)),
	somenteLeitura: false,
	confirmacaoExclusaoLinhas: (celulaAtual: ReferenciaCelula, inicioSelecao: ReferenciaCelula): Promise<void> => {
		return new Promise<void>((resolve, reject) => {
			if (confirm("Deseja realmente excluir as linhas selecionadas? Essa operação não poderá ser desfeita.")) {
				resolve();
			} else {
				reject(new Error("Ação cancelada"));
			}
		});
	},
	confirmacaoExclusaoConteudo: (celulaAtual: ReferenciaCelula, inicioSelecao: ReferenciaCelula): Promise<void> => {
		return new Promise<void>((resolve, reject) => {
			if (
				!celulaAtual.equals(inicioSelecao)
				&&
				!confirm("Deseja realmente excluir o conteúdo das células selecionadas? Essa operação não poderá ser desfeita.")
			) {
				reject(new Error("Ação cancelada"));
				return;
			}

			resolve();
		});
	},
	propriedadesEstiloCopiar: () => ["background-color", "font-weight", "text-align"]
});

const emits = defineEmits<{
	(event: "update:linhas", linhas: Record<string, any>[]): void,
	(event: "update:celulaAtual", celulaAtual: ReferenciaCelula): void,
	(event: "update:inicioSelecao", inicioSelecao: ReferenciaCelula): void,
	(event: "update:celula", evento: Event, valor: string, numeroLinha: number, numeroColuna: number): void
}>();

const estado = reactive({
	indiceLinhas: 0,
	identificadoresLinhas: new Map<Record<string, any>, number>(),
	tabela: null as HTMLElement | null,
	celulas: {} as Record<string, HTMLElement>,
	celulaAtual: new ReferenciaCelula(props.celulaAtual.Linha, props.celulaAtual.Coluna),
	inicioSelecao: new ReferenciaCelula(props.inicioSelecao.Linha, props.inicioSelecao.Coluna),
	editando: false,
	cancelarEdicao: false,
	areaTransferenciaInicio: new ReferenciaCelula(-1, -1),
	areaTransferenciaFim: new ReferenciaCelula(-1, -1),
	areaTransferenciaRecortar: false,
	selecaoMultiplaMouse: false,
	selecaoMultiplaTeclado: false,
	eventoToque: false,
	multiploToque: false
});

const computadas = reactive({
	linhas: computed(() => props.linhas),
	selecaoMultipla: computed(() => estado.selecaoMultiplaMouse || estado.selecaoMultiplaTeclado),
	linhaMaxima: computed(() => Math.max(props.linhas.length - 1, 0)),
	colunaMaxima: computed(() => props.colunas.length - 1),
	celulaMinima: computed(() => new ReferenciaCelula(0, 0)),
	celulaMaxima: computed(() => new ReferenciaCelula(Math.max(props.linhas.length - 1, 0), props.colunas.length - 1))
});

const navigationKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageDown", "PageUp"];
const continueEditingKeys = ["ArrowLeft", "ArrowRight", "Home", "End"];
const stopEditingKeys = ["Enter", "Escape", "Tab", "ArrowUp", "ArrowDown", "PageDown", "PageUp"];

const metodos = {
	attributeMerge: (...attributeCollections: (Record<string, any> | undefined)[]): Record<string, any> | undefined => {
		let result = undefined as Record<string, any> | undefined;

		for (const attributeCollection of attributeCollections) {
			for (const attributeName in attributeCollection) {
				if (Object.prototype.hasOwnProperty.call(attributeCollection, attributeName)) {
					let attributeValue = attributeCollection[attributeName];

					if (result === undefined) {
						result = {} as Record<string, any>;
					}
					
					switch (attributeName) {
						case "class":
						case "style":
							attributeValue = [].concat(attributeValue);
							break;
						default:
							break;
					}

					if (Object.prototype.hasOwnProperty.call(result, attributeName)) {
						switch (attributeName) {
							case "class":
							case "style":
								result[attributeName] = result[attributeName].concat(attributeValue);
								break;
							default:
								result[attributeName] = attributeValue;
								break;
						}
					} else {
						result[attributeName] = attributeValue;
					}
				}
			}
		}

		return result;
	},
	atributosCabecalho: (coluna: Coluna, numeroColuna: number): Record<string, any> | undefined => {
		if (props.atributosCabecalho) {
			return props.atributosCabecalho(coluna, numeroColuna);
		} else {
			return coluna.AtributosCabecalho;
		}
	},
	atributosLinha: (linha: Record<string, any>, numeroLinha: number): Record<string, any> | undefined => {
		if (props.atributosLinha) {
			return props.atributosLinha(linha, numeroLinha);
		}
	},
	atributosCelula: (linha: Record<string, any>, numeroLinha: number, numeroColuna: number): Record<string, any> | undefined => {
		if (props.atributosCelula) {
			return props.atributosCelula(linha, numeroLinha, numeroColuna);
		}
	},
	linhaVazia: (): Record<string, any> => {
		const resultado = {} as Record<string, any>;

		for (let coluna = 0; coluna < props.colunas.length; coluna++) {
			if (props.colunas[coluna].Tipo === "string") {
				resultado[props.colunas[coluna].Nome] = "";
			} else if (props.colunas[coluna].Tipo === "number") {
				resultado[props.colunas[coluna].Nome] = null;
			} else if (props.colunas[coluna].Tipo === "boolean") {
				resultado[props.colunas[coluna].Nome] = false;
			}
		}

		return resultado;
	},
	gerarIdentificadoresLinhas: () => {
		const identificadoresLinhas = new Map();

		computadas.linhas.forEach((linha) => {
			if (!estado.identificadoresLinhas.has(linha)) {
				identificadoresLinhas.set(linha, estado.indiceLinhas++);
			} else {
				identificadoresLinhas.set(linha, estado.identificadoresLinhas.get(linha));
			}
			
			estado.identificadoresLinhas = identificadoresLinhas;
		});
	},
	enderecoSelecao: (): string => {
		let inicio = ReferenciaCelula.min(estado.celulaAtual, estado.inicioSelecao);
		let fim = ReferenciaCelula.max(estado.celulaAtual, estado.inicioSelecao);
		
		return `${inicio.Linha + 2} / ${inicio.Coluna + 1} / ${fim.Linha + 3} / ${fim.Coluna + 2}`;
	},
	enderecoAreaTransferencia: (): string => {
		let inicio = ReferenciaCelula.min(estado.areaTransferenciaInicio, estado.areaTransferenciaFim);
		let fim = ReferenciaCelula.max(estado.areaTransferenciaInicio, estado.areaTransferenciaFim);
		
		return `${inicio.Linha + 2} / ${inicio.Coluna + 1} / ${fim.Linha + 3} / ${fim.Coluna + 2}`;
	},
	elementoCelula: (referencia: ReferenciaCelula): HTMLElement => {
		return estado.celulas[`${referencia.Linha}_${referencia.Coluna}`];
	},
	elementoCelulaDeCoordenadas: (x: number, y: number): HTMLElement | null => {
		const elementoCelula = document.elementsFromPoint(x, y).filter(elemento => elemento.classList.contains("celula") && !elemento.classList.contains("cabecalho"));

		if (elementoCelula.length) {
			return elementoCelula[0] as HTMLElement;
		}

		return null;
	},
	referenciaCeluladeElementoCelula: (elemento: HTMLElement | null): ReferenciaCelula | null => {
		let classeLinha = null as string | null;
		let classeColuna = null as string | null;

		if (elemento === undefined || elemento === null) {
			return null;
		}

		elemento.classList.forEach(classe => {
			if (/^linha-\d+$/.test(classe)) {
				classeLinha = classe;
			} else if (/^coluna-\d+$/.test(classe)) {
				classeColuna = classe;
			}
		});

		if (classeLinha !== null && classeColuna !== null) {
			return new ReferenciaCelula(parseInt(classeLinha.replace("linha-", "")) - 1, parseInt(classeColuna.replace("coluna-", "")) - 1);
		}

		return null;
	},
	finalizarEdicaoCelula: () => {
		estado.editando = false;

		nextTick().then(() => setTimeout(() => estado.tabela?.focus(), 0));
	},
	atualizarValorCelula: (dados: Record<string, any>, coluna: number) => {
		return (valor: any) => {
			if (estado.cancelarEdicao) {
				return;
			}

			if (props.colunas[coluna].Validacao) {
				const valorValidacao = props.colunas[coluna].Validacao!(valor);

				if (valorValidacao !== false) {
					valor = valorValidacao;
				} else {
					valor = dados[props.colunas[coluna].Nome];
				}
			}

			switch (props.colunas[coluna].Tipo) {
				case "string":
					dados[props.colunas[coluna].Nome] = valor;
					break;
				case "number":
					dados[props.colunas[coluna].Nome] = (valor !== undefined && valor !== null && valor !== "" && !isNaN(Number(valor))) ? Number(valor) : null;
					break;
				default:
					break;
			}
		};
	},
	copiarCelulas: () => {
		if (estado.areaTransferenciaInicio.inRange(computadas.celulaMinima, computadas.celulaMaxima) && estado.areaTransferenciaFim.inRange(computadas.celulaMinima, computadas.celulaMaxima)) {
			const texto = computadas.linhas
				.slice(estado.areaTransferenciaInicio.Linha, estado.areaTransferenciaFim.Linha + 1)
				.reduce(
					(texto, linha) => {
						return props.colunas
							.slice(estado.areaTransferenciaInicio.Coluna, estado.areaTransferenciaFim.Coluna + 1)
							.reduce(
								(textoColuna, coluna, indiceColuna) => {
									let valorColuna = linha[coluna.Nome];

									if (coluna.Conversao) {
										valorColuna = coluna.Conversao(valorColuna, "string");
									}

									return textoColuna + (indiceColuna > 0 ? "\t" : "") + valorColuna;
								},
								texto
							) + "\n";
					},
					""
				);

			const html = `<table><tbody>${computadas.linhas
				.slice(estado.areaTransferenciaInicio.Linha, estado.areaTransferenciaFim.Linha + 1)
				.reduce(
					(texto, linha, indiceLinha) => {
						return `${texto}<tr>${props.colunas
							.slice(estado.areaTransferenciaInicio.Coluna, estado.areaTransferenciaFim.Coluna + 1)
							.reduce(
								(textoColuna, coluna, indiceColuna) => {
									let valorColuna = linha[coluna.Nome];

									if (coluna.Conversao) {
										valorColuna = coluna.Conversao(valorColuna, "string");
									}

									const elemento = metodos.elementoCelula(new ReferenciaCelula(estado.areaTransferenciaInicio.Linha + indiceLinha, estado.areaTransferenciaInicio.Coluna + indiceColuna));

									const estilo = window.getComputedStyle(elemento, null);
									const propriedadesEstilo = props.propriedadesEstiloCopiar.reduce((resultado, propriedade) => `${resultado}${propriedade}: ${estilo.getPropertyValue(propriedade)};`, "");

									return `${textoColuna}<td style="${propriedadesEstilo}">${valorColuna}</td>`;
								},
								""
							)}</tr>`;
					},
					""
				)}</tbody></table>`;

			const clipboardData = {
				"text/plain": new Blob([texto], { type: "text/plain" }),
				"text/html": new Blob([html], { type: "text/html" })
			};

			if (navigator.clipboard.write !== undefined) {
				navigator.clipboard.write([new ClipboardItem(clipboardData)]);
			}
		}
	},
	colarCelulas: (destino: ReferenciaCelula, dados: string[][] | null, origemInicial = new ReferenciaCelula(-1, -1), origemFinal = new ReferenciaCelula(-1, -1), removerOrigem = false): void | false => {
		if (props.somenteLeitura) {
			return;
		}

		if (props.colarCelulas) {
			props.colarCelulas(destino, dados, origemInicial, origemFinal, removerOrigem);
			return;
		}

		if (!(dados && dados.length && dados[0].length && dados[0][0].length) && !(origemInicial.inRange(computadas.celulaMinima, computadas.celulaMaxima) && origemFinal.inRange(computadas.celulaMinima, computadas.celulaMaxima))) {
			return;
		}

		if (dados && dados.length && dados[0].length) {
			const destinoInicial = new ReferenciaCelula();
			const destinoFinal = new ReferenciaCelula();

			destinoInicial.set(destino);
			destinoFinal.set(destinoInicial.Linha + dados.length - 1, Math.min(destinoInicial.Coluna + dados[0].length - 1, computadas.colunaMaxima));

			const dadosMaximo = new ReferenciaCelula(dados.length - 1, destinoFinal.Coluna - destinoInicial.Coluna);

			dados.forEach((linha, indiceLinha) => {
				linha.slice(0, dadosMaximo.Coluna + 1).forEach((valorColuna: any, indiceColuna) => {
					if (destino.Linha + indiceLinha > computadas.celulaMaxima.Linha) {
						computadas.linhas.push(metodos.linhaVazia());
					}

					if (props.colunas[destino.Coluna + indiceColuna].Conversao) {
						valorColuna = props.colunas[destino.Coluna + indiceColuna].Conversao!(valorColuna);
					} else if (props.colunas[destino.Coluna + indiceColuna].Tipo === "number") {
						valorColuna = (valorColuna !== undefined && valorColuna !== null && valorColuna !== "" && !isNaN(Number(valorColuna))) ? Number(valorColuna) : null;
					} else if (props.colunas[destino.Coluna + indiceColuna].Tipo === "boolean") {
						if (valorColuna?.toString()?.toLowerCase() === "false" || valorColuna?.toString()?.toLowerCase() === "0") {
							valorColuna = "";
						}

						computadas.linhas[destino.Linha + indiceLinha][props.colunas[destino.Coluna + indiceColuna].Nome] = !!valorColuna;
					}

					if (props.colunas[destino.Coluna + indiceColuna].Validacao) {
						valorColuna = props.colunas[destino.Coluna + indiceColuna].Validacao!(valorColuna);

						if (valorColuna === false) {
							valorColuna = computadas.linhas[destino.Linha + indiceLinha][props.colunas[destino.Coluna + indiceColuna].Nome];
						}
					}

					computadas.linhas[destino.Linha + indiceLinha][props.colunas[destino.Coluna + indiceColuna].Nome] = valorColuna;
				});
			});

			nextTick()
				.then(() => {
					estado.inicioSelecao.set(destinoInicial);
					estado.celulaAtual.set(destinoFinal);
				});
		} else if (origemInicial.inRange(computadas.celulaMinima, computadas.celulaMaxima) && origemFinal.inRange(computadas.celulaMinima, computadas.celulaMaxima)) {
			const destinoInicial = new ReferenciaCelula();
			const destinoFinal = new ReferenciaCelula();

			destinoInicial.set(destino);
			destinoFinal.set(destinoInicial.Linha + origemFinal.Linha - origemInicial.Linha, Math.min(destinoInicial.Coluna + origemFinal.Coluna - origemInicial.Coluna, computadas.colunaMaxima));

			computadas.linhas
				.slice(origemInicial.Linha, origemFinal.Linha + 1)
				.map(
					linha => props.colunas
						.slice(origemInicial.Coluna, origemInicial.Coluna + destinoFinal.Coluna - destinoInicial.Coluna + 1)
						.map(coluna => linha[coluna.Nome])
				)
				.forEach((linha, indiceLinha) => {
					if (destinoInicial.Linha + indiceLinha > computadas.linhaMaxima) {
						computadas.linhas.push(metodos.linhaVazia());
					}

					linha.forEach((valorColuna, indiceColuna) => {
						if (destinoInicial.Coluna + indiceColuna > destinoFinal.Coluna) {
							return;
						}

						let novoValorColuna = valorColuna as any;

						if (props.colunas[destinoInicial.Coluna + indiceColuna].Tipo !== props.colunas[origemInicial.Coluna + indiceColuna].Tipo) {
							if (props.colunas[origemInicial.Coluna + indiceColuna].Conversao) {
								novoValorColuna = props.colunas[origemInicial.Coluna + indiceColuna].Conversao!(novoValorColuna, props.colunas[destinoInicial.Coluna + indiceColuna].Tipo);
							} else if (props.colunas[destinoInicial.Coluna + indiceColuna].Conversao) {
								novoValorColuna = props.colunas[destinoInicial.Coluna + indiceColuna].Conversao!(novoValorColuna);
							} else {
								switch (props.colunas[destinoInicial.Coluna + indiceColuna].Tipo) {
									case "string":
										novoValorColuna = (valorColuna || "").toString();
										break;
									case "number":
										novoValorColuna = (valorColuna !== undefined && valorColuna !== null && valorColuna !== "" && !isNaN(Number(valorColuna))) ? Number(valorColuna) : null;
										break;
									case "boolean":
										if ((novoValorColuna || "").toString().toLowerCase() === "false") {
											novoValorColuna = "";
										}

										novoValorColuna = !!novoValorColuna;
										break;
									default:
										break;
								}
							}
						}

						if (props.colunas[destinoInicial.Coluna + indiceColuna].Validacao) {
							novoValorColuna = props.colunas[destinoInicial.Coluna + indiceColuna].Validacao!(novoValorColuna);

							if (novoValorColuna === false) {
								novoValorColuna = computadas.linhas[destinoInicial.Linha + indiceLinha][props.colunas[destinoInicial.Coluna + indiceColuna].Nome];
							}
						}

						computadas.linhas[destinoInicial.Linha + indiceLinha][props.colunas[destinoInicial.Coluna + indiceColuna].Nome] = novoValorColuna;
					});
				});

			if (removerOrigem) {
				computadas.linhas
					.slice(origemInicial.Linha, origemFinal.Linha + 1)
					.forEach((linha, indiceLinha) => {
						props.colunas
							.slice(origemInicial.Coluna, origemFinal.Coluna + 1)
							.forEach((coluna, indiceColuna) => {
								if (!(new ReferenciaCelula(origemInicial.Linha + indiceLinha, origemInicial.Coluna + indiceColuna)).inRange(destinoInicial, destinoFinal)) {
									switch (coluna.Tipo) {
										case "string":
											linha[coluna.Nome] = "";
											break;
										case "number":
											linha[coluna.Nome] = null;
											break;
										case "boolean":
											linha[coluna.Nome] = false;
											break;
										default:
											break;
									}
								}
							});
					});
			}

			nextTick()
				.then(() => {
					estado.inicioSelecao.set(destinoInicial);
					estado.celulaAtual.set(destinoFinal);
				});
		}
	},
	mouseCelula: (linha: number, coluna: number, event: MouseEvent) => {
		const referencia = new ReferenciaCelula(linha, coluna);

		if (estado.eventoToque) {
			return;
		}

		if (event.type === "mousedown") {
			if (!computadas.selecaoMultipla) {
				estado.inicioSelecao.set(referencia);
			}

			estado.selecaoMultiplaMouse = true;

			if (!referencia.equals(estado.celulaAtual)) {
				estado.celulaAtual.set(referencia);
			}
		} else if (event.type === "mouseup") {
			estado.selecaoMultiplaMouse = false;
		} else if (event.type === "mouseenter" && estado.selecaoMultiplaMouse) {
			estado.celulaAtual.set(referencia);
		} else if (event.type === "dblclick" && !props.somenteLeitura && !estado.editando && ["string", "number"].includes(props.colunas[estado.celulaAtual.Coluna].Tipo)) {
			estado.editando = true;

			nextTick()
				.then(() => {
					const inputElement = document.elementsFromPoint(event.x, event.y).filter(element => element instanceof HTMLInputElement);

					if (inputElement.length) {
						(inputElement[0] as HTMLInputElement).focus();
					}
				});
		}
	},
	toqueTabela: (event: TouchEvent) => {
		if (event.touches.length === 1 && !estado.multiploToque) {
			const referenciaCelula = metodos.referenciaCeluladeElementoCelula(metodos.elementoCelulaDeCoordenadas(event.touches[0].clientX, event.touches[0].clientY));

			if (referenciaCelula === null) {
				return;
			}

			if (event.type === "touchstart") {
				estado.eventoToque = true;
			} else if (event.type === "touchmove") {
				if (!computadas.selecaoMultipla) {
					estado.inicioSelecao.set(referenciaCelula);
				}

				estado.selecaoMultiplaMouse = true;

				if (!referenciaCelula.equals(estado.celulaAtual)) {
					estado.celulaAtual.set(referenciaCelula);
				}

				estado.celulaAtual.set(referenciaCelula);

				event.preventDefault();
			}
		} else if (event.touches.length > 1 && !estado.multiploToque) {
			estado.multiploToque = true;
		} else if (event.type === "touchend" && event.touches.length === 0) {
			estado.eventoToque = false;
			estado.multiploToque = false;
			estado.selecaoMultiplaMouse = false;
		}
	},
	digitacaoTabela: (event: KeyboardEvent) => {
		estado.selecaoMultiplaTeclado = event.shiftKey && event.key !== "Tab";

		if (event.type === "keydown") {
			if (!estado.editando) {
				if (navigationKeys.includes(event.key)) {
					let celulaAtualLocal = new ReferenciaCelula();
					let topPosition = 0;
					let bottomPosition = 0;

					celulaAtualLocal.set(estado.celulaAtual);

					let elemento = metodos.elementoCelula(estado.celulaAtual);

					switch (event.key) {
						case "ArrowUp":
							celulaAtualLocal.Linha--;
							break;
						case "ArrowDown":
							celulaAtualLocal.Linha++;
							break;
						case "ArrowLeft":
							celulaAtualLocal.Coluna--;
							break;
						case "ArrowRight":
							celulaAtualLocal.Coluna++;
							break;
						case "Home":
							celulaAtualLocal.Coluna = 0;

							if (event.ctrlKey) {
								celulaAtualLocal.Linha = 0;
							}
							break;
						case "End":
							celulaAtualLocal.Coluna = computadas.colunaMaxima;

							if (event.ctrlKey) {
								celulaAtualLocal.Linha = computadas.linhaMaxima;
							}
							break;
						case "PageUp":
							if (celulaAtualLocal.Linha > 0) {
								elemento = metodos.elementoCelula(new ReferenciaCelula(celulaAtualLocal.Linha - 1, 0));
								topPosition = elemento.getBoundingClientRect().height * 1.5 + parseInt(window.getComputedStyle(elemento, null).getPropertyValue("scroll-margin-top"));

								if (celulaAtualLocal.Linha > 0 && elemento.getBoundingClientRect().top < topPosition) {
									topPosition -= document.documentElement.clientHeight - elemento.getBoundingClientRect().height * 1.5 - parseInt(window.getComputedStyle(elemento, null).getPropertyValue("scroll-margin-top"));
								}

								while (celulaAtualLocal.Linha > 0 && elemento.getBoundingClientRect().top > topPosition) {
									celulaAtualLocal.Linha--;
									elemento = metodos.elementoCelula(new ReferenciaCelula(celulaAtualLocal.Linha, 0));
								}
							}

							break;
						case "PageDown":
							if (celulaAtualLocal.Linha < computadas.linhaMaxima) {
								elemento = metodos.elementoCelula(new ReferenciaCelula(celulaAtualLocal.Linha + 1, 0));
								bottomPosition = document.documentElement.clientHeight - elemento.getBoundingClientRect().height * 0.5 - parseInt(window.getComputedStyle(elemento, null).getPropertyValue("scroll-margin-bottom"));

								if (celulaAtualLocal.Linha < computadas.linhaMaxima && elemento.getBoundingClientRect().bottom > bottomPosition) {
									bottomPosition += document.documentElement.clientHeight - elemento.getBoundingClientRect().height * 1.5 - parseInt(window.getComputedStyle(elemento, null).getPropertyValue("scroll-margin-top")) - parseInt(window.getComputedStyle(elemento, null).getPropertyValue("scroll-margin-bottom"));
								}

								while (celulaAtualLocal.Linha < computadas.linhaMaxima && elemento.getBoundingClientRect().bottom < bottomPosition) {
									celulaAtualLocal.Linha++;
									elemento = metodos.elementoCelula(new ReferenciaCelula(celulaAtualLocal.Linha, 0));
								}
							}

							break;
						default:
							break;
					}

					celulaAtualLocal = ReferenciaCelula.min(ReferenciaCelula.max(celulaAtualLocal, computadas.celulaMinima), computadas.celulaMaxima);

					if (!celulaAtualLocal.equals(estado.celulaAtual)) {
						if (!computadas.selecaoMultipla) {
							estado.inicioSelecao.set(celulaAtualLocal);
						}

						estado.celulaAtual.set(celulaAtualLocal);
					}

					event.preventDefault();

					nextTick().then(() => metodos.elementoCelula(estado.celulaAtual).scrollIntoView({ block: "nearest" }));
				} else if (event.code === "Tab") {
					const novaCelulaAtual = new ReferenciaCelula(estado.celulaAtual.Linha, estado.celulaAtual.Coluna + (event.shiftKey ? -1 : 1));

					if (novaCelulaAtual.Coluna < 0) {
						novaCelulaAtual.Linha--;
						novaCelulaAtual.Coluna = computadas.colunaMaxima;
					} else if (novaCelulaAtual.Coluna > computadas.colunaMaxima) {
						novaCelulaAtual.Linha++;
						novaCelulaAtual.Coluna = 0;
					}

					if (novaCelulaAtual.inRange(computadas.celulaMinima, computadas.celulaMaxima)) {
						estado.celulaAtual.set(novaCelulaAtual);
						estado.inicioSelecao.set(novaCelulaAtual);
					}
					
					event.preventDefault();
				} else if (event.ctrlKey && event.code === "KeyA") {
					estado.inicioSelecao.set(computadas.celulaMinima);
					estado.celulaAtual.set(computadas.celulaMaxima);

					event.preventDefault();
				} else if (event.ctrlKey && (event.code === "KeyC" || event.code === "KeyX")) {
					estado.areaTransferenciaInicio.set(ReferenciaCelula.min(estado.celulaAtual, estado.inicioSelecao));
					estado.areaTransferenciaFim.set(ReferenciaCelula.max(estado.celulaAtual, estado.inicioSelecao));

					if (event.code === "KeyX") {
						estado.areaTransferenciaRecortar = true;
					}

					event.preventDefault();
				} else if (event.ctrlKey && event.code === "KeyV") {
					// não precisa fazer nada
				} else if (event.ctrlKey && event.shiftKey && event.key === "+") {
					if (props.somenteLeitura) {
						return;
					}

					computadas.linhas.splice(estado.celulaAtual.Linha, 0, metodos.linhaVazia());

					event.preventDefault();
				} else if (event.key === "Escape" && estado.areaTransferenciaInicio.inRange(computadas.celulaMinima, computadas.celulaMaxima) && estado.areaTransferenciaFim.inRange(computadas.celulaMinima, computadas.celulaMaxima)) {
					estado.areaTransferenciaInicio.set(-1, -1);
					estado.areaTransferenciaFim.set(-1, -1);
				} else if (event.key === "Delete") {
					if (props.somenteLeitura) {
						return;
					}

					if (event.shiftKey) {
						props.confirmacaoExclusaoLinhas(estado.celulaAtual, estado.inicioSelecao)
							.then(() => {
								estado.selecaoMultiplaTeclado = false;

								const celulaMinimaLocal = ReferenciaCelula.min(estado.celulaAtual, estado.inicioSelecao);
								let celulaMaximaLocal = ReferenciaCelula.max(estado.celulaAtual, estado.inicioSelecao);

								computadas.linhas.splice(celulaMinimaLocal.Linha, celulaMaximaLocal.Linha - celulaMinimaLocal.Linha + 1);

								celulaMaximaLocal = ReferenciaCelula.min(estado.celulaAtual, computadas.celulaMaxima);

								estado.inicioSelecao.set(celulaMaximaLocal);
								estado.celulaAtual.set(celulaMaximaLocal);
							})
							.catch(() => {
								// nenhuma ação necessária
							})
							.finally(() => {
								nextTick().then(() => estado.tabela?.focus());
							});
					} else {
						props.confirmacaoExclusaoConteudo(estado.celulaAtual, estado.inicioSelecao)
							.then(() => {
								estado.selecaoMultiplaTeclado = false;

								const celulaMinimaLocal = ReferenciaCelula.min(estado.celulaAtual, estado.inicioSelecao);
								const celulaMaximaLocal = ReferenciaCelula.max(estado.celulaAtual, estado.inicioSelecao);

								for (let linha = celulaMinimaLocal.Linha; linha <= celulaMaximaLocal.Linha; linha++) {
									for (let coluna = celulaMinimaLocal.Coluna; coluna <= celulaMaximaLocal.Coluna; coluna++) {
										switch (props.colunas[coluna].Tipo) {
											case "string":
												computadas.linhas[linha][props.colunas[coluna].Nome] = "";
												break;
											case "number":
												computadas.linhas[linha][props.colunas[coluna].Nome] = null;
												break;
											case "boolean":
												computadas.linhas[linha][props.colunas[coluna].Nome] = false;
												break;
											default:
												break;
										}
									}
								}
							})
							.catch(() => {
								// nenhuma ação necessária
							})
							.finally(() => {
								nextTick().then(() => estado.tabela?.focus());
							});
					}

					event.preventDefault();
				} else if (
					!props.somenteLeitura
					&&
					estado.celulaAtual.Coluna === estado.inicioSelecao.Coluna
					&&
					props.colunas[estado.celulaAtual.Coluna].Tipo === "boolean"
					&&
					event.code === "Space"
				) {
					const celulaMinimaLocal = ReferenciaCelula.min(estado.celulaAtual, estado.inicioSelecao);
					const celulaMaximaLocal = ReferenciaCelula.max(estado.celulaAtual, estado.inicioSelecao);
					const valor = !computadas.linhas[estado.celulaAtual.Linha][props.colunas[estado.celulaAtual.Coluna].Nome];

					for (let linha = celulaMinimaLocal.Linha; linha <= celulaMaximaLocal.Linha; linha++) {
						computadas.linhas[linha][props.colunas[estado.celulaAtual.Coluna].Nome] = valor;
					}

					event.preventDefault();
				} else if (
					!props.somenteLeitura
					&&
					estado.celulaAtual.Coluna === estado.inicioSelecao.Coluna
					&&
					["string", "number"].includes(props.colunas[estado.celulaAtual.Coluna].Tipo)
					&&
					(event.key === "F2" || event.key === "Backspace" || event.key.length === 1)
					&&
					!event.ctrlKey
					&&
					!event.altKey
				) {
					estado.editando = true;

					nextTick()
						.then(() => {
							const input = metodos.elementoCelula(estado.celulaAtual).querySelector("input") as HTMLInputElement;

							if (event.key.length === 1) {
								input.value = "";
							}

							input.focus();

							const newEvent = new KeyboardEvent("keydown", event);

							input.dispatchEvent(newEvent);
						});
				}
			} else {
				if (continueEditingKeys.includes(event.key) || (props.colunas[estado.celulaAtual.Coluna].Tipo === "number" && ["ArrowUp", "ArrowDown"].includes(event.key))) {
					event.stopPropagation();
				} else if (stopEditingKeys.includes(event.key)) {
					estado.cancelarEdicao = false;

					switch (event.key) {
						case "Escape":
							estado.cancelarEdicao = true;
							break;
						case "Tab":
							estado.celulaAtual.Coluna = Math.min(estado.celulaAtual.Coluna + (event.shiftKey ? -1 : 1), computadas.colunaMaxima);
							estado.inicioSelecao.set(estado.celulaAtual);
							event.preventDefault();
							break;
						default:
							break;
					}

					if (["ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(event.key)) {
						event.preventDefault();
					}

					estado.editando = false;

					nextTick()
						.then(() => {
							estado.tabela?.focus();

							if (["ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(event.key)) {
								const newEvent = new KeyboardEvent("keydown", event);

								estado.tabela?.dispatchEvent(newEvent);
							}
						});
				}
			}
		}
	}
};

watch(props.linhas, () => {
	metodos.gerarIdentificadoresLinhas();
});

watch(props.celulaAtual, (valorNovo) => {
	if (!valorNovo.equals(estado.celulaAtual)) {
		estado.celulaAtual.set(valorNovo);
	}
});

watch(props.inicioSelecao, (valorNovo) => {
	if (!valorNovo.equals(estado.inicioSelecao)) {
		estado.inicioSelecao.set(valorNovo);
	}
});

watch(computadas.linhas, (valorNovo) => {
	if (!valorNovo.length) {
		valorNovo.push(metodos.linhaVazia());
		return;
	}

	emits("update:linhas", valorNovo);
});

watch(estado.celulaAtual, (valorNovo) => {
	if (!valorNovo.equals(props.celulaAtual)) {
		emits("update:celulaAtual", valorNovo);
	}
});

watch(estado.inicioSelecao, (valorNovo) => {
	if (!valorNovo.equals(props.inicioSelecao)) {
		emits("update:inicioSelecao", valorNovo);
	}
});

watch(estado.areaTransferenciaFim, () => {
	metodos.copiarCelulas();
});

onBeforeMount(() => {
	document.addEventListener("mouseup", () => { estado.selecaoMultiplaMouse = false; });

	document.addEventListener("paste", event => {
		if (!((event.target as HTMLElement) === (document.body as HTMLElement) || estado.tabela?.contains(event.target as Element))) {
			return;
		}

		if (event.clipboardData) {
			if (estado.areaTransferenciaInicio.inRange(computadas.celulaMinima, computadas.celulaMaxima) && estado.areaTransferenciaFim.inRange(computadas.celulaMinima, computadas.celulaMaxima)) {
				if (metodos.colarCelulas(estado.celulaAtual, null, estado.areaTransferenciaInicio, estado.areaTransferenciaFim, estado.areaTransferenciaRecortar) === false) {
					return;
				}

				estado.areaTransferenciaInicio.set(-1, -1);
				estado.areaTransferenciaFim.set(-1, -1);
				estado.areaTransferenciaRecortar = false;
			} else {
				const dados = event.clipboardData.getData("text").replace(/\r|\n$/g, "").split("\n").map(linha => linha.split("\t"));

				if (metodos.colarCelulas(estado.celulaAtual, dados) === false) {
					return;
				}
			}

			event.clipboardData.clearData();
			navigator.clipboard.writeText("");
		}
	});
});

onMounted(() => {
	if (!computadas.linhas.length) {
		computadas.linhas.push(metodos.linhaVazia());

		nextTick().then(() => setTimeout(() => estado.tabela?.focus(), 0));
	} else {
		estado.tabela?.focus();
	}
});

onBeforeUpdate(() => {
	estado.celulas = {};
});

defineExpose<APITabela>({
	recortarCelulas: () => {
		estado.areaTransferenciaInicio.set(ReferenciaCelula.min(estado.celulaAtual, estado.inicioSelecao));
		estado.areaTransferenciaFim.set(ReferenciaCelula.max(estado.celulaAtual, estado.inicioSelecao));
		estado.areaTransferenciaRecortar = true;
	},
	copiarCelulas: () => {
		estado.areaTransferenciaInicio.set(ReferenciaCelula.min(estado.celulaAtual, estado.inicioSelecao));
		estado.areaTransferenciaFim.set(ReferenciaCelula.max(estado.celulaAtual, estado.inicioSelecao));
	},
	colar: async () => {
		if (estado.areaTransferenciaInicio.inRange(computadas.celulaMinima, computadas.celulaMaxima) && estado.areaTransferenciaFim.inRange(computadas.celulaMinima, computadas.celulaMaxima)) {
			if (metodos.colarCelulas(estado.celulaAtual, null, estado.areaTransferenciaInicio, estado.areaTransferenciaFim, estado.areaTransferenciaRecortar) === false) {
				return;
			}

			estado.areaTransferenciaInicio.set(-1, -1);
			estado.areaTransferenciaFim.set(-1, -1);
			estado.areaTransferenciaRecortar = false;
		} else {
			const dados = ((await navigator.clipboard.readText()) ?? "").replace(/\r|\n$/g, "").split("\n").map(linha => linha.split("\t"));

			if (metodos.colarCelulas(estado.celulaAtual, dados) === false) {
				return;
			}
			
		}

		navigator.clipboard.writeText("");
	},
	cancelarAreaTransferencia: () => {
		estado.areaTransferenciaInicio.set(-1, -1);
		estado.areaTransferenciaFim.set(-1, -1);
		estado.areaTransferenciaRecortar = false;
		navigator.clipboard.writeText("");
	},
	inserirLinha: () => {
		if (props.somenteLeitura) {
			return;
		}

		computadas.linhas.splice(estado.celulaAtual.Linha, 0, metodos.linhaVazia());
	},
	limparCelulasSelecionadas: () => {
		const event = new KeyboardEvent("keydown", { key: "Delete" });

		estado.tabela?.dispatchEvent(event);
	},
	excluirLinhasSelecionadas: () => {
		const event = new KeyboardEvent("keydown", { key: "Delete", shiftKey: true });

		estado.tabela?.dispatchEvent(event);
	}
});

metodos.gerarIdentificadoresLinhas();
</script>


<template>
	<div
		tabindex="0"
		:class="{ tabela: true, editando: estado.editando }"
		:ref="(element) => estado.tabela = element as HTMLElement"
		@keydown="metodos.digitacaoTabela"
		@keyup="metodos.digitacaoTabela"
		@touchstart="(event) => metodos.toqueTabela(event)"
		@touchend="(event) => metodos.toqueTabela(event)"
		@touchmove="(event) => metodos.toqueTabela(event)"
		@touchcancel="(event) => metodos.toqueTabela(event)"
		>
		<slot name="cabecalho" v-bind="{ colunas: props.colunas }">
			<template v-for="(coluna, numeroColuna) in props.colunas" :key="`cabecalho_${numeroColuna}`">
					<div v-if="coluna.Descricao" :class="{ celula: true, cabecalho: true, [`coluna-${numeroColuna + 1}`]: true, 'primeira-coluna': numeroColuna === 0, 'ultima-coluna': numeroColuna === computadas.colunaMaxima }" :style="{ 'grid-row': 1, 'grid-column': numeroColuna + 1 }" v-bind="metodos.atributosCabecalho(coluna, numeroColuna)">{{ coluna.Descricao }}</div>
			</template>
		</slot>
		<template v-for="(linha, numeroLinha) in computadas.linhas" :key="estado.identificadoresLinhas.get(linha)">
			<div
				v-for="(coluna, numeroColuna) in props.colunas"
				:key="`${estado.identificadoresLinhas.get(linha)}_${numeroColuna}`"
				:ref="(element) => estado.celulas[`${numeroLinha}_${numeroColuna}`] = element as HTMLElement"
				:class="{
					celula: true,
					editando: estado.editando && estado.celulaAtual.Coluna === numeroColuna && estado.celulaAtual.Linha === numeroLinha,
					[`coluna-${numeroColuna + 1}`]: true,
					[`linha-${numeroLinha + 1}`]: true,
					'primeira-coluna': numeroColuna === 0,
					'ultima-coluna': numeroColuna === computadas.colunaMaxima,
					'primeira-linha': numeroLinha === 0,
					'ultima-linha': numeroLinha === computadas.linhaMaxima,
					'linha-impar': numeroLinha % 2 === 0,
					'linha-par': numeroLinha % 2 === 1
				}"
				:style="{ 'grid-row': numeroLinha + 2, 'grid-column': numeroColuna + 1 }"
				v-bind="metodos.attributeMerge(props.colunas[numeroColuna].AtributosCelula, metodos.atributosLinha(linha, numeroLinha), metodos.atributosCelula(linha, numeroLinha, numeroColuna))"
				@mousedown="(event) => metodos.mouseCelula(numeroLinha, numeroColuna, event)"
				@mouseup="(event) => metodos.mouseCelula(numeroLinha, numeroColuna, event)"
				@mouseenter="(event) => metodos.mouseCelula(numeroLinha, numeroColuna, event)"
				@dblclick="(event) => metodos.mouseCelula(numeroLinha, numeroColuna, event)"
				>
				<template v-if="['string', 'number'].includes(props.colunas[numeroColuna].Tipo)">
					<div :style="{ visibility: (estado.editando && (estado.celulaAtual.Linha === numeroLinha && estado.celulaAtual.Coluna === numeroColuna)) ? 'hidden' : 'visible' }">{{linha[props.colunas[numeroColuna].Nome]}}</div>
				</template>
				<template v-if="props.colunas[numeroColuna].Tipo === 'string' && estado.editando && (estado.celulaAtual.Linha === numeroLinha && estado.celulaAtual.Coluna === numeroColuna)">
					<slot name="edicao-celula-string" v-bind="{ linha: numeroLinha, coluna: numeroColuna, nomeColuna: coluna.Nome, dados: linha, finalizarEdicaoCelula: metodos.finalizarEdicaoCelula, atualizarValorCelula: metodos.atualizarValorCelula(linha, numeroColuna) }">
						<div style="position: absolute; top: 0; left: 0; bottom: 0; right: 0;">
							<input type="text" :value="linha[props.colunas[numeroColuna].Nome]" @change="(event) => metodos.atualizarValorCelula(linha, numeroColuna)((event.target as HTMLInputElement).value)" @blur="metodos.finalizarEdicaoCelula()" @input="(event) => emits('update:celula', event, (event.target as HTMLInputElement).value, numeroLinha, numeroColuna)" />
						</div>
					</slot>
				</template>
				<template v-if="props.colunas[numeroColuna].Tipo === 'number' && estado.editando && (estado.celulaAtual.Linha === numeroLinha && estado.celulaAtual.Coluna === numeroColuna)">
					<slot name="edicao-celula-number" v-bind="{ linha: numeroLinha, coluna: numeroColuna, nomeColuna: coluna.Nome, dados: linha, finalizarEdicaoCelula: metodos.finalizarEdicaoCelula, atualizarValorCelula: metodos.atualizarValorCelula(linha, numeroColuna) }">
						<div style="position: absolute; top: 0; left: 0; bottom: 0; right: 0;">
							<input type="number" :value="linha[props.colunas[numeroColuna].Nome]" @blur="(event) => { metodos.atualizarValorCelula(linha, numeroColuna)((event.target as HTMLInputElement).value); metodos.finalizarEdicaoCelula() }" @input="(event) => emits('update:celula', event, (event.target as HTMLInputElement).value, numeroLinha, numeroColuna)" />
						</div>
					</slot>
				</template>
				<template v-if="props.colunas[numeroColuna].Tipo === 'boolean'">
					<slot name="edicao-celula-boolean" v-bind="{ linha: numeroLinha, coluna: numeroColuna, nomeColuna: coluna.Nome, dados: linha, somenteLeitura: props.somenteLeitura, atualizarValorCelula: metodos.atualizarValorCelula(linha, numeroColuna) }">
						<input type="checkbox" v-model.lazy="linha[props.colunas[numeroColuna].Nome]" :checked="linha[props.colunas[numeroColuna].Nome]" tabindex="-1" :disabled="props.somenteLeitura" />
					</slot>
				</template>
			</div>
		</template>
		<div
			:class="{
				'selecao': true,
				[`inicio-coluna-${estado.inicioSelecao.Coluna}`]: true,
				[`fim-coluna-${estado.celulaAtual.Coluna}`]: true,
				'inicio-primeira-coluna': estado.inicioSelecao.Coluna === 0,
				'inicio-ultima-coluna': estado.inicioSelecao.Coluna === computadas.colunaMaxima,
				'inicio-primeira-linha': estado.inicioSelecao.Linha === 0,
				'inicio-ultima-linha': estado.inicioSelecao.Linha === computadas.linhaMaxima,
				'fim-primeira-coluna': estado.celulaAtual.Coluna === 0,
				'fim-ultima-coluna': estado.celulaAtual.Coluna === computadas.colunaMaxima,
				'fim-primeira-linha': estado.celulaAtual.Linha === 0,
				'fim-ultima-linha': estado.celulaAtual.Linha === computadas.linhaMaxima
			}"
			:style="{ 'grid-area': metodos.enderecoSelecao() }">
		</div>
		<div
			v-if="estado.areaTransferenciaInicio.inRange(computadas.celulaMinima, computadas.celulaMaxima) && estado.areaTransferenciaFim.inRange(computadas.celulaMinima, computadas.celulaMaxima)"
			:class="{
				'area-transferencia': true,
				'inicio-primeira-coluna': estado.areaTransferenciaInicio.Coluna === 0,
				'inicio-ultima-coluna': estado.areaTransferenciaInicio.Coluna === computadas.colunaMaxima,
				'inicio-primeira-linha': estado.areaTransferenciaInicio.Linha === 0,
				'inicio-ultima-linha': estado.areaTransferenciaInicio.Linha === computadas.linhaMaxima,
				'fim-primeira-coluna': estado.areaTransferenciaFim.Coluna === 0,
				'fim-ultima-coluna': estado.areaTransferenciaFim.Coluna === computadas.colunaMaxima,
				'fim-primeira-linha': estado.areaTransferenciaFim.Linha === 0,
				'fim-ultima-linha': estado.areaTransferenciaFim.Linha === computadas.linhaMaxima
			}"
			:style="{ 'grid-area': metodos.enderecoAreaTransferencia() }">
		</div>
		<div
			:class="{
				'celula-atual': true,
				[`coluna-${estado.celulaAtual.Coluna + 1}`]: true,
				[`linha-${estado.celulaAtual.Linha + 1}`]: true,
				'primeira-coluna': estado.celulaAtual.Coluna === 0,
				'ultima-coluna': estado.celulaAtual.Coluna === computadas.colunaMaxima,
				'primeira-linha': estado.celulaAtual.Linha === 0,
				'ultima-linha': estado.celulaAtual.Linha === computadas.linhaMaxima
			}"
			:style="{ 'grid-row': estado.celulaAtual.Linha + 2, 'grid-column': estado.celulaAtual.Coluna + 1 }">
		</div>
	</div>
</template>



<style scoped>
.tabela {
	display: grid;
	grid-gap: 0;
	outline: none;
}

.tabela .celula {
	border: 1px solid #000;
	margin: 0 -1px -1px 0;
	height: 30px;
	padding: 5px;
	line-height: 18px;
	white-space: pre;
	user-select: none;
}

.celula.ultima-coluna {
	margin-right: 0;
}

.celula.ultima-linha {
	margin-bottom: 0;
}

.tabela .celula.cabecalho {
	font-weight: bold;
}

.tabela .selecao {
	background-color: rgba(0, 0, 0, 0.1);
	margin: 1px 0 0 1px;
	pointer-events: none;
}

.tabela .selecao.inicio-ultima-coluna,
.tabela .selecao.fim-ultima-coluna {
	margin-right: 1px;
}

.tabela .selecao.inicio-ultima-linha,
.tabela .selecao.fim-ultima-linha {
	margin-bottom: 1px;
}

.tabela .area-transferencia {
	margin: 0 -1px -1px 0;
	border: 2px dashed #000;
	pointer-events: none;
}

.tabela .area-transferencia.fim-ultima-coluna {
	margin-right: 1px;
}

.tabela .area-transferencia.fim-ultima-linha {
	margin-bottom: 1px;
}

.tabela .celula-atual {
	margin: -1px -2px -2px -1px;
	border: 2px solid #000;
	pointer-events: none;
}

.tabela .celula-atual.ultima-coluna {
	margin-right: -1px;
}

.tabela .celula-atual.ultima-linha {
	margin-bottom: -1px;
}

.tabela .celula input[type="text"],
.tabela .celula input[type="number"] {
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
</style>
