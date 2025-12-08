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

export function useCrmData(sheetNameOverride = null) {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [rows, setRows] = useState([]);

  const [metaFatCrmMensal, setMetaFatCrmMensal] = useState(0);
  const [siteMonthlyRevenue, setSiteMonthlyRevenue] = useState(0);

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

      const fromEnv = (import.meta.env.VITE_CRM_SHEET_NAME || '').trim();
      const sheetName =
        (sheetNameOverride && sheetNameOverride.trim()) ||
        fromEnv ||
        getDefaultCrmSheetName();

      const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName,
      )}`;

        const [respPedidos, respMeta, respResumo] = await Promise.all([
          fetch(`${baseUrl}&range=A:G`),
          fetch(`${baseUrl}&range=S33:S33`).catch(() => null),
          fetch(`${baseUrl}&range=Q14:S18`).catch(() => null),
        ]);

        // --- Pedidos A:G (se falhar aqui, mostramos erro) -------------------
        if (!respPedidos.ok) {
          throw new Error(
            `Erro HTTP ${respPedidos.status} ao buscar pedidos CRM`,
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
          .filter(Boolean)
          .sort((a, b) => a.date - b.date);

        let meta = 0;
        if (respMeta && respMeta.ok) {
          try {
            const textMeta = await respMeta.text();
            const jsonMeta = parseGvizResponse(textMeta);
            const rowsMeta = jsonMeta.table?.rows || [];
            const cell = rowsMeta[0]?.c?.[0] || null; // S33:S33 -> 1 célula
            meta = parseNumberCell(cell) || 0;
          } catch (e) {
            console.warn('Erro ao interpretar meta CRM S33:', e);
          }
        }

        let siteRevenue = 0;
        if (respResumo && respResumo.ok) {
          try {
            const textResumo = await respResumo.text();
            const jsonResumo = parseGvizResponse(textResumo);
            const rowsResumo = jsonResumo.table?.rows || [];

            // Procura linha onde Q = "SITE" e pega S (faturamento site)
            for (const r of rowsResumo) {
              const c = r.c || [];
              const label =
                (c[0]?.v ?? c[0]?.f ?? '')
                  .toString()
                  .trim()
                  .toUpperCase();
              if (label === 'SITE') {
                siteRevenue = parseNumberCell(c[2]) || 0; // coluna S = índice 2 nesse range
              }
            }
          } catch (e) {
            console.warn(
              'Erro ao interpretar resumo SITE Q14:S18 (CRM):',
              e,
            );
          }
        }

        if (!cancelado) {
          setRows(pedidos);
          setMetaFatCrmMensal(meta);
          setSiteMonthlyRevenue(siteRevenue);
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
          setMetaFatCrmMensal(0);
          setSiteMonthlyRevenue(0);
          setLoading(false);
        }
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [sheetNameOverride]);

  // Range de datas disponível
  const { minDate, maxDate } = useMemo(() => {
    if (!rows.length) return { minDate: null, maxDate: null };
    return {
      minDate: rows[0].date,
      maxDate: rows[rows.length - 1].date,
    };
  }, [rows]);

  // Faturamento e pedidos do mês da aba (ignora dias de outro mês)
  const { monthlyCrmRevenue, monthlyCrmOrders } = useMemo(() => {
    if (!rows.length) {
      return { monthlyCrmRevenue: 0, monthlyCrmOrders: 0 };
    }

    const baseMonth = rows[0].date.getMonth();
    const baseYear = rows[0].date.getFullYear();

    let revenue = 0;
    const pedidosSet = new Set();

    for (const r of rows) {
      if (
        r.date.getMonth() === baseMonth &&
        r.date.getFullYear() === baseYear
      ) {
        revenue += r.valorTotal;
        pedidosSet.add(r.pedido);
      }
    }

    return {
      monthlyCrmRevenue: revenue,
      monthlyCrmOrders: pedidosSet.size,
    };
  }, [rows]);

  return {
    loading,
    erro,
    rows,
    minDate,
    maxDate,
    metaFatCrmMensal,
    monthlyCrmRevenue,
    monthlyCrmOrders,
    siteMonthlyRevenue,
  };
}
