// api/wallpaper.js — Vercel Edge Function
export const config = { runtime: 'edge' };

const MODELS = {
  iphone_16_pro: { w:1206, h:2622 }, iphone_16: { w:1179, h:2556 },
  iphone_15_pro: { w:1179, h:2556 }, iphone_15: { w:1179, h:2556 },
  iphone_14_pro: { w:1179, h:2556 }, iphone_14: { w:1170, h:2532 },
  iphone_13_pro: { w:1170, h:2532 }, iphone_13: { w:1170, h:2532 },
  iphone_se:     { w:750,  h:1334 },
};

const THEMES = {
  graphite_orange: { bg:'#111111', accent:'#ff8c42', dot_past:'#ff8c42', dot_future:'#2d2d2d', text:'#ffffff' },
  graphite_yellow: { bg:'#111111', accent:'#e8ff47', dot_past:'#e8ff47', dot_future:'#2d2d2d', text:'#ffffff' },
  graphite_green:  { bg:'#111111', accent:'#4fffb0', dot_past:'#4fffb0', dot_future:'#2d2d2d', text:'#ffffff' },
  graphite_blue:   { bg:'#111111', accent:'#47b8ff', dot_past:'#47b8ff', dot_future:'#2d2d2d', text:'#ffffff' },
  graphite_red:    { bg:'#111111', accent:'#ff4747', dot_past:'#ff4747', dot_future:'#2d2d2d', text:'#ffffff' },
  graphite_pink:   { bg:'#111111', accent:'#ff47c8', dot_past:'#ff47c8', dot_future:'#2d2d2d', text:'#ffffff' },
  white_orange:    { bg:'#f0f0f0', accent:'#ff8c42', dot_past:'#ff8c42', dot_future:'#d8d8d8', text:'#111111' },
  white_yellow:    { bg:'#f0f0f0', accent:'#c8a800', dot_past:'#c8a800', dot_future:'#d8d8d8', text:'#111111' },
  white_blue:      { bg:'#f0f0f0', accent:'#3b82f6', dot_past:'#3b82f6', dot_future:'#d8d8d8', text:'#111111' },
  white_green:     { bg:'#f0f0f0', accent:'#22c55e', dot_past:'#22c55e', dot_future:'#d8d8d8', text:'#111111' },
  black_white:     { bg:'#000000', accent:'#ffffff', dot_past:'#ffffff', dot_future:'#2d2d2d', text:'#ffffff' },
};

const MONTHS = {
  uk: ['СIЧ','ЛЮТ','БЕР','КВI','ТРА','ЧЕР','ЛИП','СЕР','ВЕР','ЖОВ','ЛИС','ГРУ'],
  ru: ['ЯНВ','ФЕВ','МАР','АПР','МАЙ','ИЮН','ИЮЛ','АВГ','СЕН','ОКТ','НОЯ','ДЕК'],
  en: ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],
  pl: ['STY','LUT','MAR','KWI','MAJ','CZE','LIP','SIE','WRZ','PAZ','LIS','GRU'],
  de: ['JAN','FEB','MAR','APR','MAI','JUN','JUL','AUG','SEP','OKT','NOV','DEZ'],
};

function getDateInTimezone(tz) {
  const now = new Date();
  return new Date(now.getTime() + now.getTimezoneOffset()*60000 + tz*3600000);
}
function getDayOfYear(d) {
  return Math.floor((d - new Date(d.getFullYear(),0,0)) / 86400000);
}
function getDaysInYear(y) {
  return ((y%4===0&&y%100!==0)||y%400===0) ? 366 : 365;
}
function isWeekend(y,m,d) {
  const dow = new Date(y,m,d).getDay();
  return dow===0||dow===6;
}

export default async function handler(req) {
  const sp = new URL(req.url).searchParams;
  const model    = sp.get('model')         || 'iphone_15_pro';
  const style    = sp.get('style')         || 'dots';
  const calSize  = sp.get('calendar_size') || 'standard';
  const wkMode   = sp.get('weekend_mode')  || 'weekends_only';
  const opacity  = parseInt(sp.get('opacity')||'0');
  const tName    = sp.get('theme')         || 'graphite_orange';
  const lang     = sp.get('lang')          || 'uk';
  const tz       = parseFloat(sp.get('timezone')||'2');
  const footer   = sp.get('footer')        || 'days_left_percent_left';

  const { w, h } = MODELS[model] || MODELS['iphone_15_pro'];
  const T = THEMES[tName] || THEMES['graphite_orange'];
  const MN = MONTHS[lang] || MONTHS['uk'];

  const now      = getDateInTimezone(tz);
  const year     = now.getFullYear();
  const curM     = now.getMonth();
  const curD     = now.getDate();
  const doy      = getDayOfYear(now);
  const diy      = getDaysInYear(year);
  const dLeft    = diy - doy;
  const pctLeft  = Math.round((dLeft/diy)*100);
  const pctPassed= 100-pctLeft;

  const scl = calSize==='small'?0.75 : calSize==='large'?1.25 : 1.0;

  // Grid layout
  const COLS=3, ROWS=4;
  const pxL = w*0.055, pxR = w*0.055;
  const pyT = h*0.10,  pyB = h*0.06;
  const gX  = w*0.025, gY  = h*0.02;

  const bW  = (w - pxL - pxR - gX*(COLS-1)) / COLS;
  const bH  = (h - pyT - pyB - gY*(ROWS-1)) / ROWS;

  const cs  = Math.floor(Math.min(bW/7.5, bH/9) * scl);  // cell size
  const cg  = Math.max(1, Math.round(cs*0.22));            // cell gap
  const mLH = Math.round(cs*1.3);                          // month label height
  const mFS = Math.max(9, Math.round(cs*0.62));            // month font size
  const dFS = Math.max(7, Math.round(cs*0.52));            // day font size

  // Footer text
  const wd = lang==='uk'?'днiв':lang==='ru'?'дней':'days';
  let ftText = '';
  if (footer==='days_left')              ftText=`${dLeft} ${wd} залишилось`;
  else if (footer==='days_passed')       ftText=`${doy} ${wd} пройдено`;
  else if (footer==='percent_left')      ftText=`${pctLeft}%`;
  else if (footer==='percent_passed')    ftText=`${pctPassed}%`;
  else if (footer==='days_left_percent_left') ftText=`${dLeft} ${wd} · ${pctLeft}%`;

  let svg = '';

  // Background
  const bgA = 1-(opacity/100);
  svg += `<rect width="${w}" height="${h}" fill="${T.bg}" opacity="${bgA}"/>`;

  // Year label
  const yFS = Math.round(w*0.065);
  svg += `<text x="${w/2}" y="${pyT*0.6}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${yFS}" font-weight="700" fill="${T.text}" opacity="0.07">${year}</text>`;

  // Months
  for (let m=0; m<12; m++) {
    const col = m%COLS, row = Math.floor(m/COLS);
    const bX = pxL + col*(bW+gX);
    const bY = pyT + row*(bH+gY);

    const isCur = m===curM;
    const mCol  = isCur ? T.accent : T.text;
    const mOpa  = isCur ? 1 : 0.3;

    // Month name
    svg += `<text x="${bX}" y="${bY+mFS}" font-family="system-ui,sans-serif" font-size="${mFS}" font-weight="700" fill="${mCol}" opacity="${mOpa}" letter-spacing="1">${MN[m]}</text>`;

    // Days grid
    const gY0    = bY + mLH;
    const dim    = new Date(year, m+1, 0).getDate();
    const fDow   = (new Date(year, m, 1).getDay()+6)%7; // Mon=0
    let cx = fDow, cy = 0;

    for (let d=1; d<=dim; d++) {
      const px = bX + cx*(cs+cg);
      const py = gY0 + cy*(cs+cg);
      const cx2= px + cs/2, cy2 = py + cs/2;

      // State
      let state = 'future';
      if (m < curM) state='past';
      else if (m===curM && d<curD) state='past';
      else if (m===curM && d===curD) state='today';

      const wkend = (wkMode==='weekends_only'||wkMode==='all') && isWeekend(year,m,d);

      // Colors per state
      let fill, fillOpa;
      if (state==='today') {
        fill=T.accent; fillOpa=1;
      } else if (state==='past') {
        fill=T.dot_past; fillOpa=wkend?0.75:0.45;
      } else {
        // future — always visible dot_future color
        fill=T.dot_future; fillOpa=wkend&&wkMode==='all'?0.85:0.7;
      }

      const todayBoost = state==='today' ? 1.25 : 1;
      const r = cs/2 * todayBoost;

      if (style==='dots'||style==='dots_mini') {
        const dotR = (style==='dots_mini'?cs*0.32:cs*0.42)*todayBoost;
        svg += `<circle cx="${cx2}" cy="${cy2}" r="${dotR}" fill="${fill}" opacity="${fillOpa}"/>`;

      } else if (style==='squares'||style==='squares_rounded') {
        const rx2 = style==='squares_rounded' ? cs*0.28 : 1;
        const s2  = cs*todayBoost;
        const ox  = (s2-cs)/2;
        svg += `<rect x="${px-ox}" y="${py-ox}" width="${s2}" height="${s2}" rx="${rx2}" fill="${fill}" opacity="${fillOpa}"/>`;

      } else if (style==='lines') {
        const lw = Math.max(2, cs*0.2);
        const lh = cs*(state==='today'?1.35:1);
        svg += `<rect x="${cx2-lw/2}" y="${py}" width="${lw}" height="${lh}" rx="1" fill="${fill}" opacity="${fillOpa}"/>`;

      } else if (style==='bars') {
        const bh2 = Math.max(3, cs*0.42);
        svg += `<rect x="${px}" y="${cy2-bh2/2}" width="${cs}" height="${bh2}" rx="1" fill="${fill}" opacity="${fillOpa}"/>`;

      } else {
        // numbers / numbers_bold
        const fw = style==='numbers_bold'?'700':'400';
        if (state==='today') svg += `<circle cx="${cx2}" cy="${cy2}" r="${cs*0.58}" fill="${T.accent}" opacity="0.18"/>`;
        svg += `<text x="${cx2}" y="${cy2+dFS*0.36}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${dFS}" font-weight="${fw}" fill="${fill}" opacity="${fillOpa}">${d}</text>`;
      }

      cx++;
      if (cx>=7) { cx=0; cy++; }
    }
  }

  // Footer
  if (footer!=='none' && ftText) {
    const ftFS = Math.round(w*0.026);
    svg += `<text x="${w/2}" y="${h-pyB*0.35}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${ftFS}" fill="${T.text}" opacity="0.38" letter-spacing="1">${ftText}</text>`;
  }

  const out = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svg}</svg>`;

  return new Response(out, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
