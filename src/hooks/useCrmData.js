// src/hooks/useCrmData.js
import { useEffect, useMemo, useState } from 'react';

// Meses BR para gerar "Novembro-2025" quando não tiver sheet no .env
const PT_MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function getDefaultCrmSheetName() {
  const today = new Date();
  const monthName = PT_MONTHS[today.getMonth()];
  const year = today.getFullYear();
  return `${monthName}-${year}`;
}

/**
 * Converte resposta GViz em JSON (funciona com out:json ou setResponse).
 */
function parseGvizResponse(text) {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('Resposta do Google Sheets em formato inesperado.');
  }
  const jsonStr = text.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonStr);
}

function parseNumberCell(cell) {
  if (!cell) return 0;

  if (typeof cell.v === 'number') return cell.v;

  const raw = cell.v ?? cell.f;
  if (raw == null) return 0;

  if (typeof raw === 'string') {
    const cleaned = raw
      .replace(/[^0-9,\.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  return 0;
}

function parseDateCell(cell) {
  if (!cell) return null;

  const v = cell.v;
  const f = cell.f;

  // Formato Date(2025,10,1,0,0,0)
  if (typeof v === 'string' && v.startsWith('Date(')) {
    const inside = v.slice(5, -1);
    const [y, m, d, hh = 0, mm = 0, ss = 0] = inside
      .split(',')
      .map((n) => Number(n.trim()));
    const dt = new Date(y, m, d, hh, mm, ss);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : v;
  }

  // Serial numérico (caso apareça)
  if (typeof v === 'number') {
    const base = new Date(Date.UTC(1899, 11, 30));
    const ms = v * 24 * 60 * 60 * 1000;
    const dt = new Date(base.getTime() + ms);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // "01/11/2025 00:22:39"
  if (typeof f === 'string') {
    const [dateStr] = f.split(' ');
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts.map(Number);
      if (dd && mm && yyyy) {
        const dt = new Date(yyyy, mm - 1, dd);
        if (!Number.isNaN(dt.getTime())) return dt;
      }
    }
  }

  // fallback
  if (typeof v === 'string') {
    const dt = new Date(v);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  return null;
}

// remove acento e coloca em maiúsculo pra comparar textos
function normalizeText(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Tenta inferir o mês/ano a partir do nome da aba, ex: "Novembro-2025" -> "2025-11"
 */
function parseSheetNameToMonthKey(sheetName) {
  if (!sheetName) return null;
  const [maybeMonth, maybeYear] = sheetName.split('-').map((s) => s.trim());
  if (!maybeMonth || !maybeYear) return null;

  const idx = PT_MONTHS.findIndex(
    (m) => m.toUpperCase() === maybeMonth.toUpperCase(),
  );
  if (idx === -1) return null;

  const yearNum = Number(maybeYear);
  if (!Number.isFinite(yearNum)) return null;

  const monthNum = idx + 1;
  return `${yearNum}-${String(monthNum).padStart(2, '0')}`;
}

/**
 * Lê o bloco de resumo por ação sem cupom nas colunas
 * N (Ação), O (Pedidos), P (Faturamento Total).
 *
 * Range usado: N:P da aba de CRM (colunas inteiras).
 *
 * Detectamos diretamente a linha de cabeçalho
 * "Ação / Pedidos / Faturamento" em N, O e P.
 */
function parseAcoesSemCupomFromNP(json) {
  if (!json || !json.table) return [];

  const rows = json.table.rows || [];
  if (!rows.length) return [];

  // 1) Acha a linha de cabeçalho: Ação | Pedidos | Faturamento
  let headerRowIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const c = r.c || [];

    const h0 = normalizeText((c[0]?.v ?? c[0]?.f ?? '').toString());
    const h1 = normalizeText((c[1]?.v ?? c[1]?.f ?? '').toString());
    const h2 = normalizeText((c[2]?.v ?? c[2]?.f ?? '').toString());

    if (!h0 && !h1 && !h2) continue;

    const isHeader =
      (h0.includes('ACAO') || h0.includes('AÇÃO')) &&
      h1.includes('PEDIDO') &&
      (h2.includes('FATURAMENTO') ||
        h2.includes('RECEITA') ||
        h2.includes('TOTAL'));

    if (isHeader) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    // Não achou nenhum cabeçalho AÇÃO / PEDIDOS / FATURAMENTO
    return [];
  }

  const dataStartIndex = headerRowIndex + 1;
  const result = [];

  // 2) Lê as linhas de dados abaixo do cabeçalho
  for (let i = dataStartIndex; i < rows.length; i++) {
    const r = rows[i];
    const c = r.c || [];

    const acaoRaw = (c[0]?.v ?? c[0]?.f ?? '').toString().trim();
    const acaoNorm = normalizeText(acaoRaw);

    // Fim da tabela: linha vazia
    if (!acaoRaw) break;

    // Nova seção / divisória
    if (acaoRaw.startsWith('---') || acaoNorm.startsWith('---')) break;

    // Linha TOTAL não é ação
    if (acaoNorm === 'TOTAL' || acaoNorm.startsWith('TOTAL ')) {
      continue;
    }

    const pedidos = parseNumberCell(c[1]);
    const receita = parseNumberCell(c[2]);

    // Linha sem nenhum número -> ignora
    if (!Number.isFinite(pedidos) && !Number.isFinite(receita)) continue;

    result.push({
      acao: acaoRaw,
      pedidos: Number.isFinite(pedidos) ? pedidos : 0,
      receita: Number.isFinite(receita) ? receita : 0,
    });
  }

  return result;
}

export function useCrmData(sheetNameOverride = null) {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [rows, setRows] = useState([]);

  // Metas
  const [metaFatCrmMensal, setMetaFatCrmMensal] = useState(0);
  const [metaByMonth, setMetaByMonth] = useState({});

  // KPIs globais (somando tudo que foi carregado)
  const [monthlyCrmRevenue, setMonthlyCrmRevenue] = useState(0);
  const [monthlyCrmOrders, setMonthlyCrmOrders] = useState(0);

  // Representatividade (mantido por compatibilidade)
  const [siteMonthlyRevenue, setSiteMonthlyRevenue] = useState(0);
  const [siteRevenueByMonth, setSiteRevenueByMonth] = useState({});

  // Resumo por ação sem cupom (somando todas as abas carregadas)
  const [acoesSemCupomResumo, setAcoesSemCupomResumo] = useState([]);
  // Totais das ações sem cupom por mês (YYYY-MM) -> { pedidos, receita }
  const [acoesSemCupomByMonth, setAcoesSemCupomByMonth] = useState({});

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        setLoading(true);
        setErro(null);

        const sheetId = import.meta.env.VITE_CRM_SHEET_ID;
        if (!sheetId) {
          setErro(
            'VITE_CRM_SHEET_ID não configurado. Defina o ID da planilha de CRM no .env.local.',
          );
          setLoading(false);
          return;
        }

        const metasSheetName =
          import.meta.env.VITE_CRM_META_SHEET_NAME || 'Metas_CRM';

        const fromEnv = (import.meta.env.VITE_CRM_SHEET_NAME || '').trim();
        const listFromEnv = (import.meta.env.VITE_CRM_SHEETS || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        // Decide quais abas de pedidos vamos carregar:
        let sheetNames = [];

        if (Array.isArray(sheetNameOverride) && sheetNameOverride.length > 0) {
          sheetNames = sheetNameOverride
            .map((name) => (name || '').trim())
            .filter(Boolean);
        } else if (
          typeof sheetNameOverride === 'string' &&
          sheetNameOverride.trim()
        ) {
          sheetNames = [sheetNameOverride.trim()];
        } else if (listFromEnv.length > 0) {
          sheetNames = listFromEnv;
        } else if (fromEnv) {
          sheetNames = [fromEnv];
        } else {
          sheetNames = [getDefaultCrmSheetName()];
        }

        // --- 1) Carrega a aba de metas (Metas_CRM) ---------------------------
        const metasUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
          metasSheetName,
        )}&range=A:D`;

        const respMetas = await fetch(metasUrl);
        const metasMap = new Map(); // 'YYYY-MM' -> meta

        if (respMetas.ok) {
          try {
            const textMetas = await respMetas.text();
            const jsonMetas = parseGvizResponse(textMetas);
            const rowsMetas = jsonMetas.table?.rows || [];

            for (const r of rowsMetas) {
              const c = r.c || [];
              const ano = c[0]?.v ?? c[0]?.f;
              const mes = c[1]?.v ?? c[1]?.f;
              const metaCell = c[3];

              if (ano == null || mes == null || metaCell == null) continue;

              const yearNum = Number(ano);
              const monthNum = Number(mes);
              if (!Number.isFinite(yearNum) || !Number.isFinite(monthNum)) {
                continue;
              }

              const key = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
              const metaValue = parseNumberCell(metaCell);
              if (!Number.isFinite(metaValue) || metaValue <= 0) continue;

              metasMap.set(key, metaValue);
            }
          } catch (e) {
            console.error('Erro ao interpretar aba Metas_CRM:', e);
          }
        } else {
          console.warn(
            `Não foi possível carregar a aba de metas (${metasSheetName}). HTTP ${respMetas.status}`,
          );
        }

        // --- 2) Carrega as abas de CRM (detalhe + resumo ações sem cupom) ---
        let allRows = [];
        const acoesMap = new Map(); // chave = nome da ação normalizada
        const acoesByMonthMap = new Map(); // chave = YYYY-MM -> { pedidos, receita }

        for (const sheetName of sheetNames) {
          const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
            sheetName,
          )}`;

          const [respPedidos, respAcoes] = await Promise.all([
            fetch(`${baseUrl}&range=A:G`), // tabela de pedidos
            fetch(`${baseUrl}&range=N:P`).catch(() => null), // resumo ações sem cupom (colunas inteiras)
          ]);

          // --- Pedidos A:G (linhas detalhadas) -------------------------------
          if (!respPedidos.ok) {
            throw new Error(
              `Erro HTTP ${respPedidos.status} ao buscar pedidos CRM (aba ${sheetName})`,
            );
          }

          const textPedidos = await respPedidos.text();
          const jsonPedidos = parseGvizResponse(textPedidos);
          const gRows = jsonPedidos.table?.rows || [];

          const pedidos = gRows
            .map((r) => {
              const c = r.c || [];
              const date = parseDateCell(c[0]);
              const pedido = c[1]?.v || c[1]?.f || '';
              const email = c[2]?.v || '';
              const cupom = c[3]?.v || '';
              const valorDesconto = parseNumberCell(c[4]);
              const valorTotal = parseNumberCell(c[5]);
              const canal = c[6]?.v || 'Outro';

              if (!date || !pedido || !Number.isFinite(valorTotal)) {
                return null;
              }

              return {
                date,
                pedido,
                email,
                cupom,
                valorDesconto,
                valorTotal,
                canal,
              };
            })
            .filter(Boolean);

          allRows = allRows.concat(pedidos);

          // Descobre os meses presentes nessa aba (via pedidos)
          const monthKeysSet = new Set();
          for (const p of pedidos) {
            const d = p.date;
            if (!(d instanceof Date) || Number.isNaN(d.getTime())) continue;
            const key = `${d.getFullYear()}-${String(
              d.getMonth() + 1,
            ).padStart(2, '0')}`;
            monthKeysSet.add(key);
          }

          // Fallback: se não tiver nenhum pedido, tenta inferir pelo nome da aba
          if (monthKeysSet.size === 0) {
            const inferred = parseSheetNameToMonthKey(sheetName);
            if (inferred) {
              monthKeysSet.add(inferred);
            }
          }

          // --- Resumo por ação sem cupom (colunas N, O, P) -------------------
          if (respAcoes && respAcoes.ok) {
            try {
              const textAcoes = await respAcoes.text();
              const jsonAcoes = parseGvizResponse(textAcoes);
              const acoesDaAba = parseAcoesSemCupomFromNP(jsonAcoes);

              if (acoesDaAba.length) {
                for (const item of acoesDaAba) {
                  // 2.1) Acumulado por ação (independente do mês)
                  const norm = normalizeText(item.acao);
                  const prevAcao =
                    acoesMap.get(norm) || {
                      acao: item.acao,
                      pedidos: 0,
                      receita: 0,
                    };
                  prevAcao.pedidos += item.pedidos;
                  prevAcao.receita += item.receita;
                  acoesMap.set(norm, prevAcao);

                  // 2.2) Acumulado por mês (para jogar nos cards por período)
                  for (const monthKey of monthKeysSet) {
                    const prevMonth =
                      acoesByMonthMap.get(monthKey) || {
                        pedidos: 0,
                        receita: 0,
                      };
                    prevMonth.pedidos += item.pedidos;
                    prevMonth.receita += item.receita;
                    acoesByMonthMap.set(monthKey, prevMonth);
                  }
                }
              }
            } catch (e) {
              console.warn(
                `Erro ao interpretar resumo por ação sem cupom (aba ${sheetName}):`,
                e,
              );
            }
          }
        }

        // Ordena todas as linhas de CRM por data
        allRows.sort((a, b) => a.date - b.date);

        // Monta metaByMonth e metaFatCrmMensal
        const metaByMonthObj = {};
        let totalMeta = 0;
        for (const [monthKey, value] of metasMap.entries()) {
          if (!Number.isFinite(value) || value <= 0) continue;
          metaByMonthObj[monthKey] = value;
          totalMeta += value;
        }

        // Faturamento e pedidos de CRM (somando tudo)
        let revenue = 0;
        const pedidosSet = new Set();
        for (const r of allRows) {
          revenue += r.valorTotal;
          pedidosSet.add(r.pedido);
        }

        const monthlyCrmRevenueCalc = revenue;
        const monthlyCrmOrdersCalc = pedidosSet.size;

        // Monta array final de ações sem cupom (ordenado por receita desc)
        const acoesSemCupomArr = Array.from(acoesMap.values()).sort(
          (a, b) => b.receita - a.receita,
        );

        // Mapa por mês -> objeto simples
        const acoesByMonthObj = {};
        for (const [monthKey, agg] of acoesByMonthMap.entries()) {
          acoesByMonthObj[monthKey] = agg;
        }

        if (!cancelado) {
          setRows(allRows);
          setMetaByMonth(metaByMonthObj);
          setMetaFatCrmMensal(totalMeta);
          setMonthlyCrmRevenue(monthlyCrmRevenueCalc);
          setMonthlyCrmOrders(monthlyCrmOrdersCalc);
          setAcoesSemCupomResumo(acoesSemCupomArr);
          setAcoesSemCupomByMonth(acoesByMonthObj);

          // compatibilidade
          setSiteMonthlyRevenue(0);
          setSiteRevenueByMonth({});

          setLoading(false);
        }
      } catch (err) {
        console.error('Erro ao carregar dados de CRM', err);
        if (!cancelado) {
          setErro(
            err.message ||
              'Erro ao carregar dados de CRM. Verifique a planilha e o .env.',
          );
          setRows([]);
          setMetaByMonth({});
          setMetaFatCrmMensal(0);
          setMonthlyCrmRevenue(0);
          setMonthlyCrmOrders(0);
          setAcoesSemCupomResumo([]);
          setAcoesSemCupomByMonth({});
          setSiteMonthlyRevenue(0);
          setSiteRevenueByMonth({});
          setLoading(false);
        }
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [sheetNameOverride]);

  // Range de datas disponível (considerando todas as abas carregadas)
  const { minDate, maxDate } = useMemo(() => {
    if (!rows.length) return { minDate: null, maxDate: null };
    return {
      minDate: rows[0].date,
      maxDate: rows[rows.length - 1].date,
    };
  }, [rows]);

  return {
    loading,
    erro,
    rows,
    minDate,
    maxDate,
    metaFatCrmMensal,
    metaByMonth,
    monthlyCrmRevenue,
    monthlyCrmOrders,
    siteMonthlyRevenue,
    siteRevenueByMonth,
    acoesSemCupomResumo,
    acoesSemCupomByMonth,
  };
}
