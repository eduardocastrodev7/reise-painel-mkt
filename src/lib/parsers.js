// src/lib/parsers.js

// -------------------- Moeda / números com vírgula --------------------

// Aceita: "60.464,77", "60464,77", "60464.77", "R$ 60.464,77", "152641,48"
export function parseMoedaBR(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;

  const raw = valor.toString().trim();
  if (!raw) return 0;

  // tira R$, espaços etc
  let s = raw.replace(/[R$\s]/g, '');

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasDot && hasComma) {
    // "60.464,77" -> "60464.77"
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    // "60464,77" -> "60464.77"
    s = s.replace(',', '.');
  } else if (hasDot && !hasComma) {
    // pt-BR: ponto quase sempre é milhar quando não tem vírgula
    // "197.306" -> "197306"
    s = s.replace(/\./g, '');
  }
  // se não tem ponto nem vírgula, deixa como está ("60464")

  const num = Number(s);
  return Number.isNaN(num) ? 0 : num;
}

// Quantidades inteiras (sessões, pedidos, clientes, etc.)
// Aqui podemos ser agressivos: só dígitos.
export function parseNumeroBR(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;

  let s = valor.toString().trim();
  if (!s) return 0;

  // remove tudo que não é dígito (ponto, vírgula, espaço, "un", etc.)
  s = s.replace(/[^\d-]/g, '');
  if (!s || s === '-' || s === '-0') return 0;

  const num = Number(s);
  return Number.isNaN(num) ? 0 : num;
}

// Percentual: "6,61%", "6,61", "6.61", "0,0661"
export function parsePercentualBR(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;

  let raw = valor.toString().trim();
  if (!raw) return 0;

  raw = raw.replace('%', '').replace(/\s/g, '');
  let s = raw;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasDot && hasComma) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    s = s.replace(',', '.');
  }
  // se só tem ponto, assume decimal "normal"

  const num = Number(s);
  if (Number.isNaN(num)) return 0;

  // devolvemos FRAÇÃO: 0.0121 = 1,21%
  return num > 1 ? num / 100 : num;
}

// -------------------- Datas --------------------

export function parseDataBR(valor, monthIdFallback) {
  if (valor === null || valor === undefined || valor === '') return null;
  const sRaw = valor.toString().trim();
  if (!sRaw) return null;

  const [fallbackYear = '2025', fallbackMonth = '01'] =
    (monthIdFallback || '').split('-');

  // dd/mm/aaaa ou dd/mm/aa
  const full = sRaw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (full) {
    const [, d, m, yRaw] = full;
    const y = yRaw.length === 2 ? fallbackYear : yRaw;
    return new Date(
      `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00`,
    );
  }

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(sRaw)) {
    return new Date(`${sRaw}T00:00:00`);
  }

  // só dia: "1", "17", "17.0", "17,0"
  const numMatch = sRaw.match(/^(\d{1,2})(?:[.,]\d+)?$/);
  if (numMatch) {
    const d = numMatch[1].padStart(2, '0');
    return new Date(
      `${fallbackYear}-${fallbackMonth}-${d}T00:00:00`,
    );
  }

  // última tentativa
  const dt = new Date(sRaw);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// -------------------- Helpers para <input type="date"> --------------------

export function toInputDateValue(date) {
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function fromInputDateValue(value) {
  if (!value) return null;
  const [yyyy, mm, dd] = value.split('-');
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
}

// -------------------- Formatações de exibição --------------------

export function formatDateShort(date) {
  if (!date) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}

export function formatCurrencyBR(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  });
}
