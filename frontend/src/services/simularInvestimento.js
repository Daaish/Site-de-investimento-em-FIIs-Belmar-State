export const VALORES_INICIAIS = Object.freeze({ inicial: 1000, aporte: 100, anos: 10, taxaAnual: 6 })
export const LIMITES_SIMULADOR = Object.freeze({ valorMaximo: 1000000000, anosMaximos: 50, taxaMinima: -99.99, taxaMaxima: 100 })

// Taxa efetiva anual em porcentagem; aporte sempre depois dos juros do mês.
export function simularInvestimento({ inicial, aporte, anos, taxaAnual } = {}) {
  const { valorMaximo, anosMaximos, taxaMinima, taxaMaxima } = LIMITES_SIMULADOR
  if (![inicial, aporte, anos, taxaAnual].every(v => typeof v === 'number' && Number.isFinite(v))) throw Error('Preencha todos os campos com números válidos.')
  if (inicial < 0 || aporte < 0 || inicial > valorMaximo || aporte > valorMaximo) throw Error('Investimento inicial e aporte devem estar entre R$ 0 e R$ 1 bilhão.')
  if (!Number.isInteger(anos) || anos < 1 || anos > anosMaximos) throw Error('Informe um prazo inteiro entre 1 e 50 anos.')
  if (taxaAnual < taxaMinima || taxaAnual > taxaMaxima) throw Error('Informe uma taxa anual entre −99,99% e 100%.')
  const taxaMensal = Math.expm1(Math.log1p(taxaAnual / 100) / 12)
  let saldo = inicial
  const pontos = [{ mes: 0, patrimonio: inicial, aportado: inicial, rendimento: 0 }]
  for (let mes = 1; mes <= anos * 12; mes++) {
    saldo = taxaMensal === 0 ? inicial + aporte * mes : saldo * (1 + taxaMensal) + aporte
    const aportado = inicial + aporte * mes
    if (!Number.isFinite(saldo) || saldo > Number.MAX_SAFE_INTEGER) throw Error('A projeção excede o limite numérico. Reduza os valores, o prazo ou a taxa.')
    pontos.push({ mes, patrimonio: saldo, aportado, rendimento: saldo - aportado })
  }
  const ultimo = pontos.at(-1)
  return { taxaMensal, pontos, patrimonio: ultimo.patrimonio, totalAportado: ultimo.aportado, rendimento: ultimo.rendimento }
}
