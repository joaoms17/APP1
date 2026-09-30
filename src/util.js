// Compatibilidade com a v1: os formatos vivem agora em format.js (spec §8).
// fmtMoney(n) sem opções continua a dar "520,00 €" como na v1.
export * from './format.js'

export const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
export const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
export const WEEKDAYS = ['S','T','Q','Q','S','S','D'] // semana começa à segunda
