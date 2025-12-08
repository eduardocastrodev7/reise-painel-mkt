// src/lib/sheets.js
import Papa from 'papaparse';
import {
  parseMoedaBR,
  parseNumeroBR,
  parsePercentualBR,
  parseDataBR,
} from './parsers';

// ID e range vêm do .env.local
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;
const SHEET_RANGE = import.meta.env.VITE_SHEET_RANGE || 'A3:AN33';

function buildCsvUrl(sheetName) {
  const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
  const params = new URLSearchParams({
    tqx: 'out:csv',
    sheet: sheetName,
    range: SHEET_RANGE,
  });
  return `${base}?${params.toString()}`;
}

/**
 * Lê todas as abas configuradas em MONTHS (config/months.js)
 * e devolve um array de linhas diárias normalizadas.
 */
export async function fetchAllDailyRows(months) {
  const allRows = [];

for (const month of months) {
  const url = buildCsvUrl(month.sheetName);

  console.log('URL fetch', month.label, url); // <--- ADD

  const resp = await fetch(url);
  if (!resp.ok) {
    console.error('Status fetch', month.label, resp.status, resp.statusText);
    throw new Error(`Erro ao baixar dados de ${month.label}`);
  }

    const csv = await resp.text();

    const parsed = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      console.error(parsed.errors);
      throw new Error(`Erro ao interpretar CSV de ${month.label}`);
    }

    let lastDateForMonth = null;

    parsed.data.forEach((row, idx) => {
      // 1) Lê os principais números da linha
      const receitaFaturada = parseMoedaBR(row['Receita Faturada']);
      const metaDia = parseMoedaBR(row['Meta/dia']);
      const sessoes = parseNumeroBR(row['Sessões']);
      const pedidosAprovados = parseNumeroBR(row['Pedidos Aprovados']);

      const investTotal = parseMoedaBR(
        row['Investimento total'] ||
          row['Investimento Total'] ||
          row['Investimento'],
      );

      const cacSheet = parseMoedaBR(row['CAC']);
      const ticketMedio = parseMoedaBR(row['Ticket Médio']);
      const taxaConversaoDia = parsePercentualBR(row['Taxa de conversão']);
      const cpsSheet = parseMoedaBR(
        row['CPS (Geral) '] || row['CPS (Geral)'] || row['CPS'],
      );
      const pctMkt = parsePercentualBR(row['% MKT']);

      // linha tem “movimento”?
      const hasActivity =
        receitaFaturada !== 0 ||
        sessoes !== 0 ||
        pedidosAprovados !== 0 ||
        investTotal !== 0;

      // 2) Data
      const rawData = row['Data'] || row['data'];
      let date = parseDataBR(rawData, month.id);

if (!date) {
  // Se não tem data escrita mas tem números, tenta usar a data anterior + 1 dia
  // MAS só se continuar no mesmo mês/ano. Se "pular" de mês (ex.: linha de total do mês),
  // ignoramos essa linha para não cair como um dia a mais no mês seguinte.
  if (!rawData && hasActivity && lastDateForMonth) {
    const next = new Date(lastDateForMonth.getTime());
    next.setDate(next.getDate() + 1);

    const sameMonth =
      next.getMonth() === lastDateForMonth.getMonth() &&
      next.getFullYear() === lastDateForMonth.getFullYear();

    if (!sameMonth) {
      // Ex.: linha de total do mês que não deve virar 01 do mês seguinte
      return;
    }

    date = next;
  } else {
    // cabeçalhos, totais, linhas vazias etc -> ignora
    return;
  }
}

lastDateForMonth = date;


      // 3) Clientes novos a partir do CAC (sua regra: investimento total / CAC)
      let clientesNovos = 0;
      if (cacSheet > 0 && investTotal > 0) {
        clientesNovos = Math.round(investTotal / cacSheet);
      }

      allRows.push({
        id: `${month.id}-${idx}`,
        monthId: month.id,
        monthLabel: month.label,
        date,
        dateStr: rawData,

        receitaFaturada,
        metaDia,

        sessoes,
        pedidosAprovados,

        investFacebook: investTotal,
        investWhatsApp: 0,
        investGoogle: 0,

        clientesNovos,

        ticketMedio,
        taxaConversaoDia,
        cpsSheet,
        pctMkt,
        cacSheet,
      });
    });
  }

  // Ordena por data pra garantir linha a linha (incluindo 17/11)
  allRows.sort((a, b) => a.date - b.date);
  return allRows;
}
