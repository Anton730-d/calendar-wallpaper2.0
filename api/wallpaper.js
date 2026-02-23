// api/wallpaper.js — Vercel Edge Function
// api/wallpaper.js — Vercel Edge Function (PNG via @vercel/og)
import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const MODELS = {
  iphone_16_pro: { w:1206, h:2622 }, iphone_16: { w:1179, h:2556 },
  iphone_15_pro: { w:1179, h:2556 }, iphone_15: { w:1179, h:2556 },
  iphone_14_pro: { w:1179, h:2556 }, iphone_14: { w:1170, h:2532 },
  iphone_13_pro: { w:1170, h:2532 }, iphone_13: { w:1170, h:2532 },
  iphone_se:     { w:750,  h:1334 },
};

const THEMES = {
  graphite_orange: { bg:'#111111', accent:'#ff8c42', past:'#ff8c42', future:'#2d2d2d', text:'#ffffff' },
  graphite_yellow: { bg:'#111111', accent:'#e8ff47', past:'#e8ff47', future:'#2d2d2d', text:'#ffffff' },
  graphite_green:  { bg:'#111111', accent:'#4fffb0', past:'#4fffb0', future:'#2d2d2d', text:'#ffffff' },
  graphite_blue:   { bg:'#111111', accent:'#47b8ff', past:'#47b8ff', future:'#2d2d2d', text:'#ffffff' },
  graphite_red:    { bg:'#111111', accent:'#ff4747', past:'#ff4747', future:'#2d2d2d', text:'#ffffff' },
  graphite_pink:   { bg:'#111111', accent:'#ff47c8', past:'#ff47c8', future:'#2d2d2d', text:'#ffffff' },
  white_orange:    { bg:'#f0f0f0', accent:'#ff8c42', past:'#ff8c42', future:'#d0d0d0', text:'#111111' },
  white_yellow:    { bg:'#f0f0f0', accent:'#c8a800', past:'#c8a800', future:'#d0d0d0', text:'#111111' },
  white_blue:      { bg:'#f0f0f0', accent:'#3b82f6', past:'#3b82f6', future:'#d0d0d0', text:'#111111' },
  white_green:     { bg:'#f0f0f0', accent:'#22c55e', past:'#22c55e', future:'#d0d0d0', text:'#111111' },
  black_white:     { bg:'#000000', accent:'#ffffff', past:'#ffffff', future:'#2d2d2d', text:'#ffffff' },
};

const MONTHS = {
  uk: ['СІЧ','ЛЮТ','БЕР','КВІ','ТРА','ЧЕР','ЛИП','СЕР','ВЕР','ЖОВ','ЛИС','ГРУ'],
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
  const model   = sp.get('model')         || 'iphone_15_pro';
  const style   = sp.get('style')         || 'dots';
  const calSize = sp.get('calendar_size') || 'standard';
  const wkMode  = sp.get('weekend_mode')  || 'weekends_only';
  const opacity = parseInt(sp.get('opacity')||'0');
  const tName   = sp.get('theme')         || 'graphite_orange';
  const lang    = sp.get('lang')          || 'uk';
  const tz      = parseFloat(sp.get('timezone')||'2');
  const footer  = sp.get('footer')        || 'days_left_percent_left';

  const { w, h } = MODELS[model] || MODELS['iphone_15_pro'];
  const T  = THEMES[tName] || THEMES['graphite_orange'];
  const MN = MONTHS[lang]  || MONTHS['uk'];

  const now      = getDateInTimezone(tz);
  const year     = now.getFullYear();
  const curM     = now.getMonth();
  const curD     = now.getDate();
  const doy      = getDayOfYear(now);
  const diy      = getDaysInYear(year);
  const dLeft    = diy - doy;
  const pctLeft  = Math.round((dLeft/diy)*100);
  const pctPassed= 100-pctLeft;

  const scl = calSize==='small'?0.75 : calSize==='large'?1.2 : 1.0;
  const COLS=3, ROWS=4;

  const pxL = w*0.055, pxR = w*0.055;
  const pyT = h*0.09,  pyB = h*0.06;
  const gX  = w*0.025, gY  = h*0.018;

  const bW = (w - pxL - pxR - gX*(COLS-1)) / COLS;
  const bH = (h - pyT - pyB - gY*(ROWS-1)) / ROWS;

  const cs  = Math.floor(Math.min(bW/7.8, bH/9.5) * scl);
  const cg  = Math.max(1, Math.round(cs*0.2));
  const mLH = Math.round(cs*1.4);
  const mFS = Math.max(8, Math.round(cs*0.6));

  const wd = lang==='uk'?'днів':lang==='ru'?'дней':'days';
  let ftText = '';
  if (footer==='days_left')                   ftText=`${dLeft} ${wd} залишилось`;
  else if (footer==='days_passed')            ftText=`${doy} ${wd} пройдено`;
  else if (footer==='percent_left')           ftText=`${pctLeft}%`;
  else if (footer==='percent_passed')         ftText=`${pctPassed}%`;
  else if (footer==='days_left_percent_left') ftText=`${dLeft} ${wd} · ${pctLeft}%`;

  // Build month blocks as React elements for @vercel/og
  const monthBlocks = [];

  for (let m=0; m<12; m++) {
    const col = m%COLS, row = Math.floor(m/COLS);
    const bX = pxL + col*(bW+gX);
    const bY = pyT + row*(bH+gY);

    const isCur = m===curM;
    const mColor = isCur ? T.accent : T.text;
    const mOpa   = isCur ? '1' : '0.3';

    const dim  = new Date(year, m+1, 0).getDate();
    const fDow = (new Date(year, m, 1).getDay()+6)%7;

    // Build rows of dots/cells
    const cells = [];
    let cx = fDow;
    let rowCells = [];

    // push empty cells
    for (let e=0; e<fDow; e++) rowCells.push(null);

    for (let d=1; d<=dim; d++) {
      rowCells.push(d);
      if (rowCells.length===7 || d===dim) {
        while (rowCells.length<7) rowCells.push(null);
        cells.push([...rowCells]);
        rowCells=[];
      }
    }

    const rowEls = cells.map((row, ri) => {
      const cellEls = row.map((d, ci) => {
        if (d===null) return (
          <div key={ci} style={{width:cs, height:cs, flexShrink:0}} />
        );

        let state = 'future';
        if (m < curM) state='past';
        else if (m===curM && d<curD) state='past';
        else if (m===curM && d===curD) state='today';

        const wkend = (wkMode==='weekends_only'||wkMode==='all') && isWeekend(year,m,d);

        let fill, opa;
        if (state==='today')      { fill=T.accent; opa=1; }
        else if (state==='past')  { fill=T.past;   opa=wkend?0.75:0.45; }
        else                      { fill=T.future;  opa=wkend&&wkMode==='all'?0.85:0.65; }

        const boost = state==='today'?1.2:1;
        const sz = Math.round(cs*boost);
        const off = Math.round((sz-cs)/2);

        if (style==='dots'||style==='dots_mini') {
          const dotSz = Math.round((style==='dots_mini'?cs*0.6:cs*0.82)*boost);
          return (
            <div key={ci} style={{width:cs,height:cs,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:dotSz,height:dotSz,borderRadius:'50%',background:fill,opacity:opa}} />
            </div>
          );
        }
        if (style==='squares'||style==='squares_rounded') {
          const rx = style==='squares_rounded'?Math.round(sz*0.28):1;
          return (
            <div key={ci} style={{width:cs,height:cs,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:sz,height:sz,borderRadius:rx,background:fill,opacity:opa}} />
            </div>
          );
        }
        if (style==='lines') {
          const lw=Math.max(2,Math.round(cs*0.2)), lh=Math.round(cs*(state==='today'?1.3:1));
          return (
            <div key={ci} style={{width:cs,height:cs,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:lw,height:lh,borderRadius:1,background:fill,opacity:opa}} />
            </div>
          );
        }
        if (style==='bars') {
          const bh=Math.max(3,Math.round(cs*0.42));
          return (
            <div key={ci} style={{width:cs,height:cs,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:sz,height:bh,borderRadius:1,background:fill,opacity:opa}} />
            </div>
          );
        }
        // numbers
        const fw = style==='numbers_bold'?'700':'400';
        const dFS = Math.max(7,Math.round(cs*0.55));
        return (
          <div key={ci} style={{width:cs,height:cs,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
            {state==='today' && <div style={{position:'absolute',width:sz,height:sz,borderRadius:'50%',background:T.accent,opacity:0.18}} />}
            <span style={{fontSize:dFS,fontWeight:fw,color:fill,opacity:opa}}>{d}</span>
          </div>
        );
      });

      return (
        <div key={ri} style={{display:'flex',flexDirection:'row',gap:cg,marginBottom:cg}}>
          {cellEls}
        </div>
      );
    });

    monthBlocks.push(
      <div key={m} style={{
        position:'absolute',
        left:bX,
        top:bY,
        display:'flex',
        flexDirection:'column',
      }}>
        <div style={{
          fontSize:mFS,
          fontWeight:'700',
          color:mColor,
          opacity:mOpa,
          marginBottom:Math.round(mLH-mFS),
          letterSpacing:1,
          fontFamily:'sans-serif',
        }}>{MN[m]}</div>
        <div style={{display:'flex',flexDirection:'column'}}>
          {rowEls}
        </div>
      </div>
    );
  }

  const yFS = Math.round(w*0.065);
  const ftFS = Math.round(w*0.026);
  const bgOpa = 1-(opacity/100);

  const image = (
    <div style={{
      position:'relative',
      width:w,
      height:h,
      background:T.bg,
      display:'flex',
      overflow:'hidden',
    }}>
      {/* year watermark */}
      <div style={{
        position:'absolute',
        top:pyT*0.3,
        left:0,
        right:0,
        textAlign:'center',
        fontSize:yFS,
        fontWeight:'700',
        color:T.text,
        opacity:0.06,
        fontFamily:'sans-serif',
        letterSpacing:yFS*0.1,
      }}>{year}</div>

      {monthBlocks}

      {/* footer */}
      {footer!=='none' && ftText && (
        <div style={{
          position:'absolute',
          bottom:pyB*0.3,
          left:0,
          right:0,
          textAlign:'center',
          fontSize:ftFS,
          color:T.text,
          opacity:0.38,
          fontFamily:'sans-serif',
          letterSpacing:1,
        }}>{ftText}</div>
      )}
    </div>
  );

  return new ImageResponse(image, {
    width: w,
    height: h,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
