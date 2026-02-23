// api/wallpaper.js
// Vercel Serverless Function — генерує PNG календар

export const config = { runtime: 'edge' };

const MODELS = {
  iphone_16_pro:  { w: 1206, h: 2622 },
  iphone_16:      { w: 1179, h: 2556 },
  iphone_15_pro:  { w: 1179, h: 2556 },
  iphone_15:      { w: 1179, h: 2556 },
  iphone_14_pro:  { w: 1179, h: 2556 },
  iphone_14:      { w: 1170, h: 2532 },
  iphone_13_pro:  { w: 1170, h: 2532 },
  iphone_13:      { w: 1170, h: 2532 },
  iphone_se:      { w: 750,  h: 1334 },
};

const THEMES = {
  graphite_orange: { bg:'#111111', past:'#ff8c42', today:'#ff8c42', future:'#2a2a2a', text:'#ffffff', pastOpacity:0.5 },
  graphite_yellow: { bg:'#111111', past:'#e8ff47', today:'#e8ff47', future:'#2a2a2a', text:'#ffffff', pastOpacity:0.5 },
  graphite_green:  { bg:'#111111', past:'#4fffb0', today:'#4fffb0', future:'#2a2a2a', text:'#ffffff', pastOpacity:0.5 },
  graphite_blue:   { bg:'#111111', past:'#47b8ff', today:'#47b8ff', future:'#2a2a2a', text:'#ffffff', pastOpacity:0.5 },
  graphite_red:    { bg:'#111111', past:'#ff4747', today:'#ff4747', future:'#2a2a2a', text:'#ffffff', pastOpacity:0.5 },
  graphite_pink:   { bg:'#111111', past:'#ff47c8', today:'#ff47c8', future:'#2a2a2a', text:'#ffffff', pastOpacity:0.5 },
  white_orange:    { bg:'#f5f5f5', past:'#ff8c42', today:'#ff8c42', future:'#e0e0e0', text:'#111111', pastOpacity:0.5 },
  white_yellow:    { bg:'#f5f5f5', past:'#c8a800', today:'#c8a800', future:'#e0e0e0', text:'#111111', pastOpacity:0.5 },
  white_blue:      { bg:'#f5f5f5', past:'#3b82f6', today:'#3b82f6', future:'#e0e0e0', text:'#111111', pastOpacity:0.5 },
  white_green:     { bg:'#f5f5f5', past:'#22c55e', today:'#22c55e', future:'#e0e0e0', text:'#111111', pastOpacity:0.5 },
  black_white:     { bg:'#000000', past:'#ffffff', today:'#ffffff', future:'#333333', text:'#ffffff', pastOpacity:0.5 },
};

const MONTHS = {
  uk: ['Сiч','Лют','Бер','Квi','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'],
  ru: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'],
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  pl: ['Sty','Lut','Mar','Kwi','Maj','Cze','Lip','Sie','Wrz','Paz','Lis','Gru'],
  de: ['Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
};

function hexToRgb(hex, alpha = 1) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getDateInTimezone(tzOffset) {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + tzOffset * 3600000);
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function getDaysInYear(year) {
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
}

function isWeekend(year, month, day) {
  const dow = new Date(year, month, day).getDay();
  return dow === 0 || dow === 6;
}

// Draw SVG calendar and return as Response
export default async function handler(req) {
  const { searchParams } = new URL(req.url);

  const model       = searchParams.get('model') || 'iphone_15_pro';
  const style       = searchParams.get('style') || 'dots';
  const calSize     = searchParams.get('calendar_size') || 'standard';
  const weekendMode = searchParams.get('weekend_mode') || 'weekends_only';
  const opacity     = parseInt(searchParams.get('opacity') || '0');
  const themeName   = searchParams.get('theme') || 'graphite_orange';
  const lang        = searchParams.get('lang') || 'uk';
  const tz          = parseFloat(searchParams.get('timezone') || '2');
  const footer      = searchParams.get('footer') || 'days_left_percent_left';

  const { w, h } = MODELS[model] || MODELS['iphone_15_pro'];
  const theme = THEMES[themeName] || THEMES['graphite_orange'];
  const months = MONTHS[lang] || MONTHS['uk'];

  const now = getDateInTimezone(tz);
  const year = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();
  const dayOfYear = getDayOfYear(now);
  const daysInYear = getDaysInYear(year);
  const daysLeft = daysInYear - dayOfYear;
  const percentLeft = Math.round((daysLeft / daysInYear) * 100);
  const percentPassed = 100 - percentLeft;

  // Scale factor
  const sizeScale = calSize === 'small' ? 0.75 : calSize === 'large' ? 1.25 : 1.0;

  // Layout: 3 columns x 4 rows of month blocks
  const cols = 3;
  const rows = 4;
  const padX = w * 0.06;
  const padY = h * 0.12;
  const gapX = w * 0.03;
  const gapY = h * 0.025;

  const blockW = (w - padX * 2 - gapX * (cols - 1)) / cols;
  const blockH = (h - padY * 2 - gapY * (rows - 1)) / rows;

  // Cell sizes based on block size and scale
  const cellSize = Math.round(Math.min(blockW / 7, blockH / 8) * sizeScale);
  const cellGap = Math.max(2, Math.round(cellSize * 0.25));
  const monthLabelH = Math.round(cellSize * 1.2);
  const fontSize = Math.max(8, Math.round(cellSize * 0.55));
  const monthFontSize = Math.max(10, Math.round(cellSize * 0.65));

  // Footer text
  let footerText = '';
  if (footer === 'days_left') footerText = `${daysLeft} ${lang === 'uk' ? 'днiв залишилось' : lang === 'ru' ? 'дней осталось' : 'days left'}`;
  else if (footer === 'days_passed') footerText = `${dayOfYear} ${lang === 'uk' ? 'днiв пройдено' : lang === 'ru' ? 'дней прошло' : 'days passed'}`;
  else if (footer === 'percent_left') footerText = `${percentLeft}%`;
  else if (footer === 'percent_passed') footerText = `${percentPassed}%`;
  else if (footer === 'days_left_percent_left') footerText = `${daysLeft} ${lang === 'uk' ? 'днiв' : lang === 'ru' ? 'дней' : 'days'} · ${percentLeft}%`;

  // Build SVG elements
  let svgContent = '';

  // Background
  const bgOpacity = 1 - (opacity / 100);
  svgContent += `<rect width="${w}" height="${h}" fill="${theme.bg}" opacity="${bgOpacity}"/>`;

  // Year watermark
  const yearFontSize = Math.round(w * 0.07);
  svgContent += `<text x="${w/2}" y="${padY * 0.55}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${yearFontSize}" font-weight="700" fill="${theme.text}" opacity="0.08" letter-spacing="${yearFontSize * 0.1}">${year}</text>`;

  // Draw each month
  for (let m = 0; m < 12; m++) {
    const col = m % cols;
    const row = Math.floor(m / cols);

    const blockX = padX + col * (blockW + gapX);
    const blockY = padY + row * (blockH + gapY);

    const isCurrentMonth = m === todayMonth;
    const monthColor = isCurrentMonth ? theme.today : theme.text;
    const monthOpacity = isCurrentMonth ? 1 : 0.35;

    // Month label
    svgContent += `<text x="${blockX}" y="${blockY + monthFontSize}" font-family="system-ui, -apple-system, sans-serif" font-size="${monthFontSize}" font-weight="600" fill="${monthColor}" opacity="${monthOpacity}" letter-spacing="1">${months[m].toUpperCase()}</text>`;

    // Calendar grid
    const gridY = blockY + monthLabelH + 4;
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const firstDow = new Date(year, m, 1).getDay();
    const offset = (firstDow + 6) % 7; // Mon=0

    let cellX = 0;
    let cellY = 0;

    // Empty cells before first day
    cellX = offset;

    for (let d = 1; d <= daysInMonth; d++) {
      const x = blockX + cellX * (cellSize + cellGap);
      const y = gridY + cellY * (cellSize + cellGap);

      // State
      let state = 'future';
      if (m < todayMonth) state = 'past';
      else if (m === todayMonth && d < todayDay) state = 'past';
      else if (m === todayMonth && d === todayDay) state = 'today';

      // Weekend highlight
      const weekend = (weekendMode === 'weekends_only' || weekendMode === 'all') && isWeekend(year, m, d);

      // Color
      let fillColor, fillOpacity;
      if (state === 'today') {
        fillColor = theme.today;
        fillOpacity = 1;
      } else if (state === 'past') {
        fillColor = theme.past;
        fillOpacity = weekend ? 0.7 : theme.pastOpacity;
      } else {
        fillColor = theme.future;
        fillOpacity = weekend && weekendMode === 'all' ? 0.6 : 0.4;
      }

      const todayScale = state === 'today' ? 1.2 : 1;
      const adjSize = cellSize * todayScale;
      const adjX = x - (adjSize - cellSize) / 2;
      const adjY = y - (adjSize - cellSize) / 2;

      if (style === 'dots' || style === 'dots_mini') {
        const r = (style === 'dots_mini' ? adjSize * 0.35 : adjSize * 0.45);
        svgContent += `<circle cx="${adjX + adjSize/2}" cy="${adjY + adjSize/2}" r="${r}" fill="${state === 'future' ? 'none' : fillColor}" opacity="${fillOpacity}" stroke="${state === 'future' ? theme.future : 'none'}" stroke-width="1" stroke-opacity="0.5"/>`;

      } else if (style === 'squares' || style === 'squares_rounded') {
        const rx = style === 'squares_rounded' ? adjSize * 0.25 : 1;
        svgContent += `<rect x="${adjX}" y="${adjY}" width="${adjSize}" height="${adjSize}" rx="${rx}" fill="${state === 'future' ? 'none' : fillColor}" opacity="${fillOpacity}" stroke="${state === 'future' ? theme.future : 'none'}" stroke-width="1" stroke-opacity="0.4"/>`;

      } else if (style === 'lines') {
        const lw = Math.max(2, adjSize * 0.22);
        const lh = adjSize * (state === 'today' ? 1.3 : 1);
        svgContent += `<rect x="${adjX + adjSize/2 - lw/2}" y="${adjY}" width="${lw}" height="${lh}" rx="1" fill="${state === 'future' ? theme.future : fillColor}" opacity="${state === 'future' ? 0.3 : fillOpacity}"/>`;

      } else if (style === 'bars') {
        const bh = Math.max(3, adjSize * 0.45);
        svgContent += `<rect x="${adjX}" y="${adjY + adjSize/2 - bh/2}" width="${adjSize}" height="${bh}" rx="1" fill="${state === 'future' ? theme.future : fillColor}" opacity="${state === 'future' ? 0.3 : fillOpacity}"/>`;

      } else if (style === 'numbers' || style === 'numbers_bold') {
        const fw = style === 'numbers_bold' ? '700' : '400';
        if (state === 'today') {
          svgContent += `<circle cx="${x + cellSize/2}" cy="${y + cellSize/2}" r="${cellSize * 0.55}" fill="${theme.today}" opacity="0.2"/>`;
        }
        svgContent += `<text x="${x + cellSize/2}" y="${y + cellSize/2 + fontSize * 0.35}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="${fw}" fill="${state === 'future' ? theme.future : fillColor}" opacity="${state === 'future' ? 0.4 : fillOpacity}">${d}</text>`;
      }

      cellX++;
      if (cellX >= 7) { cellX = 0; cellY++; }
    }
  }

  // Footer
  if (footer !== 'none' && footerText) {
    const footerFontSize = Math.round(w * 0.028);
    svgContent += `<text x="${w/2}" y="${h - padY * 0.4}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${footerFontSize}" fill="${theme.text}" opacity="0.4" letter-spacing="1">${footerText}</text>`;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${svgContent}
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
