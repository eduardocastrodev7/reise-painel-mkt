// src/hooks/useCrmData.js
import { useEffect, useMemo, useState } from 'react';

const CRM_DADOS_SHEET_NAME = 'CRM_DADOS';
const CRM_METAS_SHEET_NAME = 'CRM_METAS';
const CRM_ACOES_SHEET_NAME = 'CRM_ACOES_SEM_CUPOM';

const PT_MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function parseGvizResponse(text) {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('Resposta GViz em formato inesperado.');
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
      .replace(/[^0-9,\.\-]/g, '')
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

  if (typeof v === 'number') {
    const base = new Date(Date.UTC(1899, 11, 30));
    const ms = v * 24 * 60 * 60 * 1000;
    const dt = new Date(base.getTime() + ms);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  if (typeof f === 'string') {
    const [dateStr] = f.split(' ');
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let y, m, d;
      if (parts[0].length <= 2) {
        d = Number(parts[0]);
        m = Number(parts[1]) - 1;
        y = Number(parts[2]);
      } else {
        y = Number(parts[0]);
        m = Number(parts[1]) - 1;
        d = Number(parts[2]);
      }
      const dt = new Date(y, m, d);
      if (!Number.isNaN(dt.getTime())) return dt;
    }
  }

  if (typeof v === 'string') {
    const dt = new Date(v);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  return null;
}

// Normaliza MesAno para chave "YYYY-MM"
function normalizeMetaMonthKey(raw) {
  if (raw == null) return null;

  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    const y = raw.getFullYear();
    const m = raw.getMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  if (typeof raw === 'number') {
    const base = new Date(Date.UTC(1899, 11, 30));
    const ms = raw * 24 * 60 * 60 * 1000;
    const dt = new Date(base.getTime() + ms);
    if (!Number.isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = dt.getMonth() + 1;
      return `${y}-${String(m).padStart(2, '0')}`;
    }
  }

  const str = raw.toString().trim();
  if (!str) return null;

  let m = str.match(/^(\d{4})[-\/\.](\d{1,2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
    if (month < 1 || month > 12) return null;
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  m = str.match(/^(\d{1,2})[-\/\.](\d{4})$/);
  if (m) {
    const month = Number(m[1]);
    const year = Number(m[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
    if (month < 1 || month > 12) return null;
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  m = str.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})$/);
  if (m) {
    const d = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(d))
      return null;
    if (month < 1 || month > 12) return null;
    const dt = new Date(year, month - 1, d);
    if (Number.isNaN(dt.getTime())) return null;
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  const lower = str.toLowerCase();
  const yearMatch = lower.match(/(\d{4})/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    const monthName = lower.replace(/\d{4}/, '').replace(/[-\/]/g, '').trim();
    const idx = PT_MONTHS.findIndex((mm) => monthName.includes(mm));
    if (idx !== -1) {
      const month = idx + 1;
      return `${year}-${String(month).padStart(2, '0')}`;
    }
  }

  const dt = new Date(str);
  if (!Number.isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const month = dt.getMonth() + 1;
    return `${y}-${String(month).padStart(2, '0')}`;
  }

  return null;
}

export function useCrmData() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [rows, setRows] = useState([]);

  const [metaByMonth, setMetaByMonth] = useState({});
  const [acoesSemCupomDetalhes, setAcoesSemCupomDetalhes] = useState([]);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        setLoading(true);
        setErro(null);

        const sheetId = import.meta.env.VITE_CRM_SHEET_ID;
        if (!sheetId) {
          throw new Error(
            'VITE_CRM_SHEET_ID não configurado. Defina o ID da planilha de CRM no .env.local.',
          );
        }

        // === 1) CRM_DADOS ==========================================
        const dadosUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
          CRM_DADOS_SHEET_NAME,
        )}&range=A:I`;

        const respDados = await fetch(dadosUrl);
        if (!respDados.ok) {
          throw new Error(
            `Erro HTTP ${respDados.status} ao buscar CRM_DADOS (aba ${CRM_DADOS_SHEET_NAME}).`,
          );
        }

        const textDados = await respDados.text();
        const jsonDados = parseGvizResponse(textDados);
        const gRows = jsonDados.table?.rows || [];

        const pedidos = gRows
          .map((r) => {
            const c = r.c || [];
            const date = parseDateCell(c[0]);
            const pedido = c[1]?.v || c[1]?.f || '';
            const email = c[2]?.v || c[2]?.f || '';
            const cupom = c[3]?.v || c[3]?.f || '';
            const valorDesconto = parseNumberCell(c[4]);
            const valorTotal = parseNumberCell(c[5]);
            const canal = c[6]?.v || c[6]?.f || '';
            const id = c[7]?.v || c[7]?.f || '';
            const clienteNovo = (c[8]?.v || c[8]?.f || '').toString().trim();

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
              id,
              clienteNovo,
            };
          })
          .filter(Boolean);

        pedidos.sort((a, b) => a.date - b.date);

        // === 2) CRM_METAS (tenta CRM_METAS e Metas_CRM) ============
        const metasMap = {};
        const metasSheetCandidates = [CRM_METAS_SHEET_NAME, 'Metas_CRM'];

        for (const sheetName of metasSheetCandidates) {
          try {
            const metasUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
              sheetName,
            )}&range=A:D`;
            const respMetas = await fetch(metasUrl);
            if (!respMetas.ok) {
              continue;
            }

            const textMetas = await respMetas.text();
            const jsonMetas = parseGvizResponse(textMetas);
            const rowsMetas = jsonMetas.table?.rows || [];

            for (const r of rowsMetas) {
              const c = r.c || [];
              const mesAnoRaw = c[0]?.v ?? c[0]?.f;
              if (mesAnoRaw == null) continue;

              const key = normalizeMetaMonthKey(mesAnoRaw);
              if (!key) continue;

              const metaReceita = parseNumberCell(c[1]);
              const metaPedidos = parseNumberCell(c[2]);
              const metaPedidosDia = parseNumberCell(c[3]);

              metasMap[key] = {
                metaReceita: Number.isFinite(metaReceita) ? metaReceita : 0,
                metaPedidos: Number.isFinite(metaPedidos) ? metaPedidos : 0,
                metaPedidosDia: Number.isFinite(metaPedidosDia)
                  ? metaPedidosDia
                  : 0,
              };
            }

            // se deu certo em uma aba, não tenta outra
            break;
          } catch (e) {
            console.warn(`Erro lendo metas da aba ${sheetName}:`, e);
          }
        }

        console.log(
          '[CRM_METAS] sheetId:',
          import.meta.env.VITE_CRM_SHEET_ID,
          'keys:',
          Object.keys(metasMap),
          'values:',
          metasMap,
        );

        // === 3) CRM_ACOES_SEM_CUPOM ================================
        const acoesDetalhes = [];
        try {
          const acoesUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
            CRM_ACOES_SHEET_NAME,
          )}&range=A:D`;
          const respAcoes = await fetch(acoesUrl);
          if (respAcoes.ok) {
            const textAcoes = await respAcoes.text();
            const jsonAcoes = parseGvizResponse(textAcoes);
            const rowsAcoes = jsonAcoes.table?.rows || [];

            for (const r of rowsAcoes) {
              const c = r.c || [];
              const date = parseDateCell(c[0]);
              const acao = (c[1]?.v ?? c[1]?.f ?? '').toString().trim();
              const pedidosAcao = parseNumberCell(c[2]);
              const receitaAcao = parseNumberCell(c[3]);

              if (!acao || !Number.isFinite(receitaAcao)) continue;

              acoesDetalhes.push({
                date,
                acao,
                pedidos: pedidosAcao,
                receita: receitaAcao,
              });
            }
          }
        } catch (e) {
          console.warn('Não foi possível ler CRM_ACOES_SEM_CUPOM:', e);
        }

        if (!cancelado) {
          setRows(pedidos);
          setMetaByMonth(metasMap);
          setAcoesSemCupomDetalhes(acoesDetalhes);
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro ao carregar dados de CRM:', err);
        if (!cancelado) {
          setErro(
            err.message ||
              'Erro ao carregar dados de CRM. Verifique a planilha e o .env.',
          );
          setRows([]);
          setMetaByMonth({});
          setAcoesSemCupomDetalhes([]);
          setLoading(false);
        }
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, []);

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
    metaByMonth,
    acoesSemCupomDetalhes,
  };
}
