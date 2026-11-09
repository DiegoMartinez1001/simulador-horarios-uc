// Analizador local del horario individual: no envía ni almacena datos personales.
(function(){
  'use strict';

  const DAYS=[
    {id:'LU',name:'Lunes',short:'Lun'},
    {id:'MA',name:'Martes',short:'Mar'},
    {id:'MI',name:'Miércoles',short:'Mié'},
    {id:'JU',name:'Jueves',short:'Jue'},
    {id:'VI',name:'Viernes',short:'Vie'},
    {id:'SA',name:'Sábado',short:'Sáb'},
    {id:'DO',name:'Domingo',short:'Dom'}
  ];
  const DAY_MAP=new Map(DAYS.map(day=>[day.id,day]));
  const byId=id=>document.getElementById(id);
  let observer=null;
  let compareObserver=null;
  let scheduled=false;

  const style=document.createElement('style');
  style.textContent=[
    '.schedule-analysis{margin:14px 0 16px;padding:15px 16px;border:1px solid #dbe3ed;border-radius:12px;background:#f8fafd;color:#26364c}',
    '.schedule-analysis-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}',
    '.schedule-analysis-title{margin:0;font-size:13px;font-weight:900;color:#263f61}',
    '.schedule-analysis-subtitle{margin:4px 0 0;color:#718096;font-size:10px;line-height:1.5}',
    '.schedule-analysis-badge{flex:0 0 auto;padding:5px 9px;border-radius:99px;background:#eaf2ff;color:#245b9b;font-size:9px;font-weight:850}',
    '.schedule-analysis-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}',
    '.schedule-analysis-stat{min-width:0;padding:10px;border:1px solid #e2e8f0;border-radius:9px;background:#fff}',
    '.schedule-analysis-stat strong{display:block;color:#29486f;font-size:19px;line-height:1.15;font-weight:900;font-variant-numeric:tabular-nums}',
    '.schedule-analysis-stat span{display:block;margin-top:4px;color:#718096;font-size:9px;line-height:1.35}',
    '.schedule-analysis-columns{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(220px,.9fr);gap:12px}',
    '.schedule-analysis-box{padding:12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;min-width:0}',
    '.schedule-analysis-box h5{margin:0 0 10px;color:#3c526e;font-size:10px;font-weight:900}',
    '.schedule-analysis-day{display:grid;grid-template-columns:42px minmax(45px,1fr) 42px minmax(95px,1.2fr);align-items:center;gap:7px;margin:8px 0}',
    '.schedule-analysis-day-name{color:#52627a;font-size:9px;font-weight:850}',
    '.schedule-analysis-track{height:7px;border-radius:99px;background:#edf1f6;overflow:hidden}',
    '.schedule-analysis-fill{height:100%;border-radius:99px;background:#5484bd;min-width:0}',
    '.schedule-analysis-day-hours{color:#29486f;font-size:9px;font-weight:850;text-align:right;font-variant-numeric:tabular-nums}',
    '.schedule-analysis-day-range{color:#718096;font-size:9px;text-align:right;white-space:nowrap}',
    '.schedule-analysis-insights{display:grid;gap:8px}',
    '.schedule-analysis-insight{display:flex;gap:8px;align-items:flex-start;color:#53657d;font-size:10px;line-height:1.45}',
    '.schedule-analysis-dot{flex:0 0 7px;width:7px;height:7px;margin-top:4px;border-radius:50%;background:#5484bd}',
    '.schedule-analysis-dot.warn{background:#d18a32}.schedule-analysis-dot.good{background:#32936b}',
    '.schedule-analysis-score{display:flex;align-items:center;gap:10px;margin-top:11px;padding-top:10px;border-top:1px solid #edf1f6}',
    '.schedule-analysis-score strong{font-size:24px;color:#29486f;font-weight:900;font-variant-numeric:tabular-nums}',
    '.schedule-analysis-score span{display:block;color:#53657d;font-size:9px;line-height:1.4}',
    '.schedule-analysis-score small{display:block;color:#8996a8;font-size:8px;margin-top:2px}',
    '.schedule-analysis-empty{padding:14px;border:1px dashed #cbd6e4;border-radius:9px;background:#fff;color:#718096;text-align:center;font-size:10px;line-height:1.5}',
    '.schedule-analysis-foot{margin:10px 0 0;color:#8996a8;font-size:9px;line-height:1.5}',
    'body[data-theme="dark"] .schedule-analysis{background:#111f32;border-color:#34465e;color:#e6edf6}',
    'body[data-theme="dark"] .schedule-analysis-title,body[data-theme="dark"] .schedule-analysis-stat strong,body[data-theme="dark"] .schedule-analysis-score strong{color:#e6efff}',
    'body[data-theme="dark"] .schedule-analysis-subtitle,body[data-theme="dark"] .schedule-analysis-day-name,body[data-theme="dark"] .schedule-analysis-day-range,body[data-theme="dark"] .schedule-analysis-stat span,body[data-theme="dark"] .schedule-analysis-insight,body[data-theme="dark"] .schedule-analysis-score span,body[data-theme="dark"] .schedule-analysis-foot{color:#9cadc2}',
    'body[data-theme="dark"] .schedule-analysis-stat,body[data-theme="dark"] .schedule-analysis-box,body[data-theme="dark"] .schedule-analysis-empty{background:#18283d;border-color:#3a4d66}',
    'body[data-theme="dark"] .schedule-analysis-box h5,body[data-theme="dark"] .schedule-analysis-day-hours{color:#e0eafa}',
    'body[data-theme="dark"] .schedule-analysis-track{background:#2a3e57}',
    'body[data-theme="dark"] .schedule-analysis-score{border-color:#354961}',
    '@media(max-width:760px){.schedule-analysis-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.schedule-analysis-columns{grid-template-columns:1fr}}',
    '@media(max-width:430px){.schedule-analysis{padding:12px}.schedule-analysis-day{grid-template-columns:34px minmax(35px,1fr) 37px minmax(76px,1.15fr);gap:5px}.schedule-analysis-day-range{font-size:8px}}',
    '.schedule-compare-analysis{margin:0 0 20px;padding:15px 16px;border:1px solid #dbe3ed;border-radius:12px;background:#f8fafd;color:#26364c}',
    '.schedule-compare-analysis h4{margin:0;color:#263f61;font-size:13px;font-weight:900}',
    '.schedule-compare-analysis-intro{margin:4px 0 12px;color:#718096;font-size:10px;line-height:1.5}',
    '.schedule-compare-analysis-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}',
    '.schedule-compare-analysis-card{min-width:0;padding:11px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}',
    '.schedule-compare-analysis-card.best{border-color:#6ca58a;box-shadow:inset 0 0 0 1px #6ca58a}',
    '.schedule-compare-analysis-card strong{display:block;color:#29486f;font-size:10px}',
    '.schedule-compare-analysis-score{margin:6px 0;color:#29486f;font-size:23px;font-weight:900;font-variant-numeric:tabular-nums}',
    '.schedule-compare-analysis-card p{margin:3px 0;color:#718096;font-size:9px;line-height:1.45}',
    '.schedule-compare-analysis-note{margin:10px 0 0;color:#8996a8;font-size:9px;line-height:1.5}',
    'body[data-theme="dark"] .schedule-compare-analysis{background:#111f32;border-color:#34465e;color:#e6edf6}',
    'body[data-theme="dark"] .schedule-compare-analysis h4,body[data-theme="dark"] .schedule-compare-analysis-card strong,body[data-theme="dark"] .schedule-compare-analysis-score{color:#e6efff}',
    'body[data-theme="dark"] .schedule-compare-analysis-intro,body[data-theme="dark"] .schedule-compare-analysis-card p,body[data-theme="dark"] .schedule-compare-analysis-note{color:#9cadc2}',
    'body[data-theme="dark"] .schedule-compare-analysis-card{background:#18283d;border-color:#3a4d66}',
    '@media(max-width:760px){.schedule-compare-analysis-grid{grid-template-columns:1fr}}',
    '.schedule-table .class-block.schedule-conflict-block{position:relative;outline:2px solid #b42318;outline-offset:-2px;padding-right:15px;box-shadow:0 0 0 2px rgba(180,35,24,.12)}',
    '.schedule-table .class-block.schedule-conflict-block:after{content:"!";position:absolute;top:2px;right:3px;display:grid;place-items:center;width:12px;height:12px;border-radius:50%;background:#b42318;color:#fff;font-size:9px;font-weight:950;line-height:1}',
    '.conflict-recommendations{margin-top:12px;padding:13px;border:1px solid #edc6c2;border-radius:11px;background:#fffafa;color:#6f2b26}',
    '.conflict-recommendations[hidden]{display:none!important}',
    '.conflict-recommendations h4{margin:0;color:#8e2f28;font-size:12px;font-weight:900}',
    '.conflict-recommendations-intro{margin:5px 0 10px;color:#8a514c;font-size:10px;line-height:1.5}',
    '.conflict-recommendation-list{display:grid;gap:9px}',
    '.conflict-recommendation-card{padding:10px;border:1px solid #f0d2ce;border-radius:9px;background:#fff}',
    '.conflict-recommendation-card h5{margin:0 0 4px;color:#7f302b;font-size:10px;font-weight:900}',
    '.conflict-recommendation-card p{margin:3px 0;color:#7c5a57;font-size:9px;line-height:1.45}',
    '.conflict-alternative{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:7px;padding:8px;border:1px solid #e6eaf0;border-radius:8px;background:#fbfcfe}',
    '.conflict-alternative-main{min-width:0}.conflict-alternative-main strong{display:block;color:#304a6b;font-size:10px}',
    '.conflict-alternative-main small{display:block;margin-top:3px;color:#718096;font-size:9px;line-height:1.45}',
    '.conflict-fix-btn{flex:0 0 auto;padding:7px 9px;border:1px solid #315f9d;border-radius:7px;background:#315f9d;color:#fff;font-size:9px;font-weight:850;cursor:pointer}',
    '.conflict-fix-btn:hover{background:#274f86}.conflict-fix-btn:focus-visible{outline:3px solid #93b4e4;outline-offset:2px}',
    '.conflict-no-alternative{padding:9px;border:1px dashed #dfb9b5;border-radius:8px;color:#88504b;font-size:9px;line-height:1.5;background:#fff}',
    '.conflict-recommendations-ok{margin-top:10px;padding:9px;border-radius:8px;background:#f0faf4;border:1px solid #d7efdf;color:#276448;font-size:10px;line-height:1.5}',
    'body[data-theme="dark"] .schedule-table .class-block.schedule-conflict-block{outline-color:#ff7770;box-shadow:0 0 0 2px rgba(255,119,112,.18)}',
    'body[data-theme="dark"] .schedule-table .class-block.schedule-conflict-block:after{background:#d83e39;color:#fff}',
    'body[data-theme="dark"] .conflict-recommendations{background:#311e25;border-color:#69404a;color:#f5d6d5}',
    'body[data-theme="dark"] .conflict-recommendations h4{color:#ffd0cd}',
    'body[data-theme="dark"] .conflict-recommendations-intro{color:#d7a8a6}',
    'body[data-theme="dark"] .conflict-recommendation-card{background:#39242c;border-color:#69404a}',
    'body[data-theme="dark"] .conflict-recommendation-card h5{color:#ffd0cd}',
    'body[data-theme="dark"] .conflict-recommendation-card p{color:#d7b6b5}',
    'body[data-theme="dark"] .conflict-alternative{background:#1a2c43;border-color:#435772}',
    'body[data-theme="dark"] .conflict-alternative-main strong{color:#e4edf9}',
    'body[data-theme="dark"] .conflict-alternative-main small{color:#b6c6da}',
    'body[data-theme="dark"] .conflict-no-alternative{background:#38272e;border-color:#69404a;color:#e8bdbb}',
    'body[data-theme="dark"] .conflict-recommendations-ok{background:#19372b;border-color:#315b48;color:#b9e8cd}',
    '@media(max-width:520px){.conflict-recommendations{padding:10px}.conflict-alternative{align-items:flex-start;flex-direction:column}.conflict-fix-btn{width:100%}}',
    '.option-conflict-recommendations{margin:0 10px 10px;padding:10px;border:1px solid #edc6c2;border-radius:9px;background:#fffafa;color:#6f2b26}',
    '.option-conflict-recommendations[hidden]{display:none!important}',
    '.option-conflict-title{display:flex;align-items:center;gap:6px;margin:0 0 7px;color:#8e2f28;font-size:10px;font-weight:900}',
    '.option-conflict-item{padding:8px 0;border-top:1px solid #f0d2ce}',
    '.option-conflict-item:first-of-type{border-top:0}',
    '.option-conflict-summary{margin:0 0 6px;color:#7c3934;font-size:9px;line-height:1.45}',
    '.option-conflict-alternative{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:5px;padding:7px;border:1px solid #eadbd9;border-radius:7px;background:#fff}',
    '.option-conflict-alternative strong{display:block;color:#304a6b;font-size:9px}',
    '.option-conflict-alternative small{display:block;margin-top:2px;color:#718096;font-size:8px;line-height:1.4}',
    '.option-conflict-empty{padding:7px;border:1px dashed #dfb9b5;border-radius:7px;color:#88504b;font-size:9px;line-height:1.45;background:#fff}',
    '.option-conflict-apply{flex:0 0 auto;padding:6px 8px;border:1px solid #315f9d;border-radius:7px;background:#315f9d;color:#fff;font-size:8px;font-weight:850;cursor:pointer}',
    'body[data-theme="dark"] .option-conflict-recommendations{background:#311e25;border-color:#69404a;color:#f5d6d5}',
    'body[data-theme="dark"] .option-conflict-title{color:#ffd0cd}',
    'body[data-theme="dark"] .option-conflict-item{border-color:#69404a}',
    'body[data-theme="dark"] .option-conflict-summary{color:#d7b6b5}',
    'body[data-theme="dark"] .option-conflict-alternative{background:#1a2c43;border-color:#435772}',
    'body[data-theme="dark"] .option-conflict-alternative strong{color:#e4edf9}',
    'body[data-theme="dark"] .option-conflict-alternative small{color:#b6c6da}',
    'body[data-theme="dark"] .option-conflict-empty{background:#38272e;border-color:#69404a;color:#e8bdbb}',
    '@media(max-width:520px){.option-conflict-alternative{align-items:flex-start;flex-direction:column}.option-conflict-apply{width:100%}}'
  ].join('\n');
  document.head.appendChild(style);

  function selectedCourses(){
    try{
      if(typeof selected!=='undefined'&&selected&&typeof selected.values==='function'){
        return Array.from(selected.values());
      }
    }catch(error){}
    return [];
  }
  function parseStart(value){
    const raw=String(value??'').trim();
    if(/^\d{1,2}:\d{2}$/.test(raw)){
      const [hour,minute]=raw.split(':').map(Number);
      return hour*60+minute;
    }
    if(/^\d{3,4}$/.test(raw)){
      const padded=raw.padStart(4,'0');
      return Number(padded.slice(0,2))*60+Number(padded.slice(2));
    }
    return NaN;
  }
  function classDuration(){
    const value=typeof DUR!=='undefined'?Number(DUR):50;
    return Number.isFinite(value)&&value>0&&value<=240?value:50;
  }
  function clock(minutes){
    if(!Number.isFinite(minutes))return '—';
    const h=Math.floor(minutes/60),m=minutes%60;
    return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
  }
  function formatHours(minutes){
    const hours=minutes/60;
    return (Math.round(hours*10)/10).toLocaleString('es-VE',{maximumFractionDigits:1})+' h';
  }
  function analyze(courses){
    const byDay=new Map(DAYS.map(day=>[day.id,[]]));
    let invalid=0,totalBlocks=0;
    for(const course of courses){
      for(const slot of course.slots||[]){
        const day=byDay.get(String(slot.day||'').toUpperCase());
        const start=parseStart(slot.start);
        if(!day||!Number.isFinite(start)||start<0||start>=1440){invalid++;continue;}
        day.push({
          start,
          end:Math.min(1440,start+classDuration()),
          code:String(course.code||'Materia')
        });
        totalBlocks++;
      }
    }

    let conflicts=0,totalOccupied=0,totalGaps=0,maxDaily=0;
    let earliest=Infinity,latest=-Infinity,longestGap=0;
    const daysWithClasses=[];
    const daily=[];
    for(const day of DAYS){
      const blocks=byDay.get(day.id).sort((a,b)=>a.start-b.start||a.end-b.end);
      if(!blocks.length){
        daily.push({...day,minutes:0,gaps:0,first:null,last:null,blocks:0});
        continue;
      }
      daysWithClasses.push(day.id);
      earliest=Math.min(earliest,blocks[0].start);
      latest=Math.max(latest,...blocks.map(block=>block.end));

      for(let i=0;i<blocks.length;i++){
        for(let j=i+1;j<blocks.length&&blocks[j].start<blocks[i].end;j++){
          if(Math.max(blocks[i].start,blocks[j].start)<Math.min(blocks[i].end,blocks[j].end))conflicts++;
        }
      }

      let occupied=0,gaps=0,mergedStart=blocks[0].start,mergedEnd=blocks[0].end;
      for(let i=1;i<blocks.length;i++){
        const block=blocks[i];
        if(block.start>mergedEnd){
          occupied+=mergedEnd-mergedStart;
          const gap=block.start-mergedEnd;
          if(gap>=15){gaps+=gap;longestGap=Math.max(longestGap,gap);}
          mergedStart=block.start;
          mergedEnd=block.end;
        }else{
          mergedEnd=Math.max(mergedEnd,block.end);
        }
      }
      occupied+=mergedEnd-mergedStart;
      totalOccupied+=occupied;
      totalGaps+=gaps;
      maxDaily=Math.max(maxDaily,occupied);
      daily.push({...day,minutes:occupied,gaps,first:blocks[0].start,last:Math.max(...blocks.map(block=>block.end)),blocks:blocks.length});
    }
    const activeDays=daysWithClasses.length;
    const scheduledDays=DAYS.filter(day=>day.id!=='DO');
    const freeDays=scheduledDays.filter(day=>!byDay.get(day.id).length).map(day=>day.name);
    const gapPenalty=Math.min(25,(totalGaps/60)*5);
    const conflictPenalty=Math.min(45,conflicts*15);
    const longDayPenalty=Math.min(20,Math.max(0,maxDaily/60-6)*5);
    const score=Math.max(0,Math.round(100-gapPenalty-conflictPenalty-longDayPenalty));
    const label=score>=85?'Muy organizado':score>=70?'Organizado':score>=50?'Con espacios mejorables':'Conviene revisar la distribución';
    return {
      totalOccupied,totalGaps,maxDaily,conflicts,invalid,totalBlocks,activeDays,freeDays,
      earliest:Number.isFinite(earliest)?earliest:null,
      latest:Number.isFinite(latest)?latest:null,
      longestGap,score,label,daily
    };
  }
  function node(tag,className,text){
    const element=document.createElement(tag);
    if(className)element.className=className;
    if(text!==undefined)element.textContent=String(text);
    return element;
  }
  function addStat(parent,value,label){
    const card=node('div','schedule-analysis-stat');
    card.append(node('strong','',value),node('span','',label));
    parent.appendChild(card);
  }
  function addInsight(parent,text,kind){
    const row=node('div','schedule-analysis-insight');
    row.appendChild(node('span','schedule-analysis-dot'+(kind?' '+kind:'')));
    row.appendChild(node('span','',text));
    parent.appendChild(row);
  }
  function renderEmpty(root){
    root.replaceChildren();
    const head=node('div','schedule-analysis-head');
    head.append(node('div','',undefined));
    head.firstChild.append(node('h4','schedule-analysis-title','Análisis inteligente del horario'),node('p','schedule-analysis-subtitle','Evalúa la distribución semanal de las materias que has seleccionado.'));
    head.appendChild(node('span','schedule-analysis-badge','Análisis local'));
    root.append(head,node('div','schedule-analysis-empty','Agrega materias al horario individual para ver las horas de clase, los días libres, los espacios entre bloques y la distribución de tu semana.'));
    root.appendChild(node('p','schedule-analysis-foot','El análisis se realiza en este dispositivo. No solicita ni transmite datos personales.'));
  }
  function detectConflicts(courses){
    const conflicts=[];
    const duration=classDuration();
    for(let i=0;i<courses.length;i++){
      const a=courses[i];
      for(let j=i+1;j<courses.length;j++){
        const b=courses[j];
        for(const left of a.slots||[]){
          const leftStart=parseStart(left.start);
          if(!Number.isFinite(leftStart))continue;
          for(const right of b.slots||[]){
            if(left.day!==right.day)continue;
            const rightStart=parseStart(right.start);
            if(!Number.isFinite(rightStart))continue;
            const start=Math.max(leftStart,rightStart);
            const end=Math.min(leftStart+duration,rightStart+duration);
            if(start<end)conflicts.push({a,b,day:left.day,start,end});
          }
        }
      }
    }
    return conflicts;
  }
  function currentConflicts(){
    return detectConflicts(selectedCourses());
  }
  function slotOverlaps(a,b){
    for(const left of a.slots||[]){
      const leftStart=parseStart(left.start);
      if(!Number.isFinite(leftStart))continue;
      for(const right of b.slots||[]){
        if(left.day!==right.day)continue;
        const rightStart=parseStart(right.start);
        if(!Number.isFinite(rightStart))continue;
        if(Math.max(leftStart,rightStart)<Math.min(leftStart+classDuration(),rightStart+classDuration()))return true;
      }
    }
    return false;
  }
  function markConflictBlocks(conflicts){
    const tbody=byId('scheduleBody');
    if(!tbody)return;
    tbody.querySelectorAll('.class-block.schedule-conflict-block').forEach(block=>{
      block.classList.remove('schedule-conflict-block');
      block.removeAttribute('aria-label');
      block.removeAttribute('data-conflict');
      block.removeAttribute('title');
    });
    if(!conflicts.length)return;
    const rows=Array.from(tbody.querySelectorAll('tr'));
    const timeRows=typeof TIMES!=='undefined'&&Array.isArray(TIMES)?TIMES:[];
    for(const conflict of conflicts){
      for(const course of [conflict.a,conflict.b]){
        for(const slot of course.slots||[]){
          if(slot.day!==conflict.day)continue;
          const start=parseStart(slot.start);
          if(!Number.isFinite(start)||Math.max(start,conflict.start)>=Math.min(start+classDuration(),conflict.end))continue;
          const rowIndex=timeRows.findIndex(value=>parseStart(value)===start);
          const colIndex=DAYS.findIndex(day=>day.id===slot.day)+1;
          const cell=rows[rowIndex]?.children[colIndex];
          if(!cell)continue;
          const block=Array.from(cell.querySelectorAll('.class-block')).find(node=>{
            const code=node.querySelector('strong')?.textContent?.trim()||'';
            const section=node.querySelector('small')?.textContent||'';
            return code===String(course.code||'')&&section.includes('Sec. '+String(course.section||''));
          });
          if(!block)continue;
          const other=String(course.id)===String(conflict.a.id)?conflict.b:conflict.a;
          block.classList.add('schedule-conflict-block');
          block.dataset.conflict='true';
          block.setAttribute('aria-label','Cruce: '+course.code+' sección '+course.section+' coincide con '+other.code+' sección '+other.section+' el '+(DAY_MAP.get(conflict.day)?.name||conflict.day)+' de '+clock(conflict.start)+' a '+clock(conflict.end)+'.');
          block.title='⚠ Cruce con '+other.code+' sección '+other.section+' · '+(DAY_MAP.get(conflict.day)?.name||conflict.day)+' '+clock(conflict.start)+'–'+clock(conflict.end);
        }
      }
    }
  }
  function candidateSummary(candidate){
    return (candidate.slots||[]).map(slot=>{
      const day=DAY_MAP.get(slot.day)?.short||slot.day;
      const start=parseStart(slot.start);
      return day+' '+clock(start)+'–'+clock(start+classDuration());
    }).join(' · ');
  }
  function replacementCandidates(course,courses){
    const others=courses.filter(item=>String(item.id)!==String(course.id));
    const pool=(typeof COURSES!=='undefined'?COURSES:[]).filter(candidate=>
      candidate&&String(candidate.code)===String(course.code)&&
      String(candidate.id)!==String(course.id)&&
      candidate.status!=='CERRADA'&&Array.isArray(candidate.slots)&&candidate.slots.length>0&&
      (!course.curriculum||String(candidate.curriculum||'')===String(course.curriculum))
    );
    return pool.filter(candidate=>!others.some(other=>slotOverlaps(candidate,other)))
      .map(candidate=>({candidate,metrics:analyze([...others,candidate])}))
      .sort((a,b)=>b.metrics.score-a.metrics.score||a.metrics.totalGaps-b.metrics.totalGaps)
      .slice(0,3);
  }
  function renderConflictRecommendations(conflicts,courses){
    const root=byId('conflictRecommendations');
    if(!root)return;
    root.replaceChildren();
    if(!conflicts.length){root.hidden=true;return;}
    root.hidden=false;
    root.appendChild(node('h4','','Cómo resolver los cruces'));
    root.appendChild(node('p','conflict-recommendations-intro','Se buscaron otras secciones activas de las materias involucradas. Las recomendaciones de abajo no coinciden con ninguna de las otras materias que ya tienes seleccionadas.'));
    const involved=new Map();
    conflicts.forEach(conflict=>{
      [conflict.a,conflict.b].forEach(course=>involved.set(String(course.id),course));
    });
    const list=node('div','conflict-recommendation-list');
    let foundAny=false;
    for(const course of involved.values()){
      const alternatives=replacementCandidates(course,courses);
      const card=node('article','conflict-recommendation-card');
      card.appendChild(node('h5','',course.code+' · Sección actual '+course.section));
      card.appendChild(node('p','','Busca una sección distinta que elimine los cruces de esta materia con el resto de tu horario.'));
      if(!alternatives.length){
        card.appendChild(node('div','conflict-no-alternative','No se encontró otra sección activa con horario publicado que encaje con todas las materias que mantienes seleccionadas. Prueba cambiar la otra materia involucrada o quitar temporalmente una asignatura para explorar otras combinaciones.'));
      }else{
        foundAny=true;
        alternatives.forEach(({candidate,metrics},index)=>{
          const option=node('div','conflict-alternative');
          const info=node('div','conflict-alternative-main');
          info.appendChild(node('strong','',(index===0?'Mejor ajuste · ':'')+'Sección '+candidate.section));
          const details=[candidate.professor?'Profesor: '+candidate.professor:'Profesor no indicado',candidateSummary(candidate), 'Índice resultante: '+metrics.score+'/100'];
          info.appendChild(node('small','',details.join(' · ')));
          const button=node('button','conflict-fix-btn','Cambiar a esta sección');
          button.type='button';
          button.addEventListener('click',()=>{
            if(!window.confirm('Se reemplazará '+course.code+' sección '+course.section+' por la sección '+candidate.section+'. ¿Deseas continuar?'))return;
            try{
              selected.delete(course.id);
              selected.set(candidate.id,candidate);
              persist();
              renderAll();
              const panel=byId('schedulePanel');
              if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});
            }catch(error){
              window.alert('No fue posible aplicar el cambio. Inténtalo nuevamente.');
            }
          });
          option.append(info,button);
          card.appendChild(option);
        });
      }
      list.appendChild(card);
    }
    root.appendChild(list);
    if(foundAny){
      root.appendChild(node('p','schedule-analysis-foot','Al elegir una alternativa, el horario se actualizará inmediatamente y se volverán a comprobar todos los cruces. No se modifica la inscripción oficial.'));
    }else{
      root.appendChild(node('div','conflict-recommendations-ok','No hay una sección alternativa compatible dentro del catálogo actual. Puedes probar cambiando las secciones de las otras materias para encontrar una combinación válida.'));
    }
  }
  function buildConflictRecommendations(){
    if(byId('conflictRecommendations'))return true;
    const list=byId('conflictList');
    const panel=list?.closest('.conflict-panel');
    if(!list||!panel)return false;
    const root=node('section','conflict-recommendations');
    root.id='conflictRecommendations';
    root.hidden=true;
    root.setAttribute('aria-label','Recomendaciones para resolver cruces de horario');
    list.insertAdjacentElement('afterend',root);
    return true;
  }

  function render(){
    const root=byId('scheduleAnalysis');
    if(!root)return;
    const courses=selectedCourses();
    const conflicts=currentConflicts();
    markConflictBlocks(conflicts);
    renderConflictRecommendations(conflicts,courses);
    if(!courses.length){renderEmpty(root);return;}
    const m=analyze(courses);
    root.replaceChildren();

    const head=node('div','schedule-analysis-head');
    const title=node('div','');
    title.append(node('h4','schedule-analysis-title','Análisis inteligente del horario'),node('p','schedule-analysis-subtitle','Resumen de la carga semanal del horario individual.'));
    head.append(title,node('span','schedule-analysis-badge','Análisis local'));
    root.appendChild(head);

    const stats=node('div','schedule-analysis-stats');
    addStat(stats,formatHours(m.totalOccupied),'Horas ocupadas por semana');
    addStat(stats,String(m.freeDays.length),'Días libres · lunes a sábado');
    addStat(stats,formatHours(m.totalGaps),'Tiempo de espera entre clases');
    addStat(stats,String(m.conflicts),'Cruces detectados');
    root.appendChild(stats);

    const columns=node('div','schedule-analysis-columns');
    const loadBox=node('section','schedule-analysis-box');
    loadBox.appendChild(node('h5','','Distribución diaria'));
    const peak=Math.max(60,...m.daily.map(day=>day.minutes));
    m.daily.forEach(day=>{
      if(day.id==='DO'&&!day.blocks)return;
      const row=node('div','schedule-analysis-day');
      row.appendChild(node('span','schedule-analysis-day-name',day.short));
      const track=node('div','schedule-analysis-track');
      const fill=node('div','schedule-analysis-fill');
      fill.style.width=(day.minutes/peak*100)+'%';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(node('span','schedule-analysis-day-hours',day.blocks?formatHours(day.minutes):'Libre'));
      row.appendChild(node('span','schedule-analysis-day-range',day.blocks?clock(day.first)+'–'+clock(day.last):'—'));
      loadBox.appendChild(row);
    });
    columns.appendChild(loadBox);

    const infoBox=node('section','schedule-analysis-box');
    infoBox.appendChild(node('h5','','Lectura del horario'));
    const insights=node('div','schedule-analysis-insights');
    if(m.conflicts){
      addInsight(insights,'Se detectaron '+m.conflicts+' cruce(s) entre bloques. Revisa las materias que coinciden en el mismo día y hora.','warn');
    }else{
      addInsight(insights,'No se detectan cruces entre los bloques seleccionados.','good');
    }
    const busiest=m.daily.filter(day=>day.minutes===m.maxDaily&&day.blocks);
    if(busiest.length){
      addInsight(insights,'Día(s) con mayor carga: '+busiest.map(day=>day.name).join(', ')+' ('+formatHours(m.maxDaily)+').');
    }
    if(m.longestGap>=15){
      addInsight(insights,'El espacio más largo entre clases es de '+formatHours(m.longestGap)+'.');
    }else{
      addInsight(insights,'No hay esperas de 15 minutos o más entre clases.');
    }
    if(m.earliest!==null&&m.latest!==null){
      addInsight(insights,'Primera entrada: '+clock(m.earliest)+' · Última salida: '+clock(m.latest)+'.');
    }
    if(m.invalid){
      addInsight(insights,m.invalid+' bloque(s) no pudieron analizarse por tener día u hora no reconocidos.','warn');
    }
    infoBox.appendChild(insights);

    const score=node('div','schedule-analysis-score');
    score.appendChild(node('strong','',String(m.score)+'/100'));
    const scoreText=node('div','');
    scoreText.append(node('span','',m.label),node('small','','Índice orientativo: considera cruces, tiempos de espera y jornadas superiores a 6 horas.'));
    score.appendChild(scoreText);
    infoBox.appendChild(score);
    columns.appendChild(infoBox);
    root.appendChild(columns);
    root.appendChild(node('p','schedule-analysis-foot','Estimación basada en los bloques publicados y la duración configurada por el simulador. Los espacios menores de 15 minutos no se contabilizan como espera. Este índice es orientativo y no sustituye la revisión del horario oficial.'));
  }

  function comparisonCourses(optionIndex){
    try{
      if(typeof compareSubjects==='undefined'||!compareSubjects||typeof compareSubjects.values!=='function'||typeof COURSES==='undefined')return [];
      return Array.from(compareSubjects.values()).map(entry=>{
        const id=entry?.choices?.[optionIndex];
        return COURSES.find(course=>String(course.id)===String(id));
      }).filter(Boolean);
    }catch(error){return [];}
  }
  function applyComparisonAlternative(course,candidate,optionIndex){
    if(typeof compareSubjects==='undefined'||!compareSubjects)return;
    const entry=compareSubjects.get(course.code);
    if(!entry||!Array.isArray(entry.choices))return;
    const updated={...entry,choices:entry.choices.slice()};
    updated.choices[optionIndex]=candidate.id;
    compareSubjects.set(course.code,updated);
    if(typeof persistCompare==='function')persistCompare();
    if(typeof renderCompareAll==='function')renderCompareAll();
    if(typeof renderCompareSearch==='function')renderCompareSearch();
    renderCompare();
    scheduleRender();
  }
  function renderOptionConflicts(optionIndex){
    const root=byId('optionConflictRecommendations'+(optionIndex+1));
    if(!root)return;
    const courses=comparisonCourses(optionIndex);
    const conflicts=detectConflicts(courses);
    root.replaceChildren();
    root.hidden=!conflicts.length;
    if(!conflicts.length)return;
    root.appendChild(node('h5','option-conflict-title','⚠ '+conflicts.length+' cruce(s) · Recomendaciones para esta opción'));
    const pairs=new Map();
    conflicts.forEach(conflict=>{
      const key=[String(conflict.a.id),String(conflict.b.id),conflict.day,conflict.start,conflict.end].join('|');
      pairs.set(key,conflict);
    });
    [...pairs.values()].forEach(conflict=>{
      const item=node('article','option-conflict-item');
      item.appendChild(node('p','option-conflict-summary',
        (DAY_MAP.get(conflict.day)?.name||conflict.day)+' · '+clock(conflict.start)+'–'+clock(conflict.end)+': '+
        conflict.a.code+' Sec. '+conflict.a.section+' coincide con '+conflict.b.code+' Sec. '+conflict.b.section+'.'));
      [conflict.a,conflict.b].forEach(course=>{
        const alternatives=replacementCandidates(course,courses);
        if(!alternatives.length)return;
        const best=alternatives[0];
        const alternative=node('div','option-conflict-alternative');
        const details=node('div','');
        details.appendChild(node('strong','',course.code+' · cambiar a sección '+best.candidate.section));
        details.appendChild(node('small','',candidateSummary(best.candidate)+' · '+(best.candidate.professor||'Profesor no indicado')));
        const button=node('button','option-conflict-apply','Cambiar en opción '+(optionIndex+1));
        button.type='button';
        button.addEventListener('click',()=>{
          if(!window.confirm('Se cambiará '+course.code+' sección '+course.section+' por la sección '+best.candidate.section+' únicamente en la opción '+(optionIndex+1)+'. ¿Continuar?'))return;
          applyComparisonAlternative(course,best.candidate,optionIndex);
        });
        alternative.append(details,button);
        item.appendChild(alternative);
      });
      if(!item.querySelector('.option-conflict-alternative')){
        item.appendChild(node('div','option-conflict-empty','No hay otra sección activa que encaje con las demás materias de esta opción. Prueba cambiar la sección de la otra asignatura involucrada.'));
      }
      root.appendChild(item);
    });
    root.appendChild(node('p','option-conflict-summary','Las alternativas se calculan contra las demás materias de esta opción y solo modifican esta columna del comparador.'));
  }
  function buildOptionConflictPanels(){
    [1,2,3].forEach(number=>{
      if(byId('optionConflictRecommendations'+number))return;
      const card=byId('optionCard'+number);
      const status=byId('optionStatus'+number);
      if(!card||!status)return;
      const root=node('section','option-conflict-recommendations');
      root.id='optionConflictRecommendations'+number;
      root.hidden=true;
      root.setAttribute('aria-label','Recomendaciones para resolver cruces de opción '+number);
      status.insertAdjacentElement('afterend',root);
    });
  }
  function renderAllOptionConflicts(){
    buildOptionConflictPanels();
    [0,1,2].forEach(renderOptionConflicts);
  }
  function renderCompare(){
    renderAllOptionConflicts();
    const root=byId('scheduleCompareAnalysis');
    if(!root)return;
    let size=0;
    try{size=typeof compareSubjects!=='undefined'&&compareSubjects?compareSubjects.size:0;}catch(error){}
    if(!size){root.hidden=true;root.replaceChildren();return;}
    root.hidden=false;
    root.replaceChildren();
    root.append(node('h4','','Análisis de las tres alternativas'));
    root.append(node('p','schedule-compare-analysis-intro','Compara la carga semanal, los espacios entre materias y los cruces de cada opción. El índice es orientativo, no una recomendación académica oficial.'));
    const results=[0,1,2].map(index=>{
      const courses=comparisonCourses(index);
      return {index,courses,metrics:analyze(courses)};
    });
    const comparable=results.filter(result=>result.courses.length);
    const maxScore=comparable.length?Math.max(...comparable.map(result=>result.metrics.score)):-1;
    const grid=node('div','schedule-compare-analysis-grid');
    results.forEach(result=>{
      const m=result.metrics;
      const card=node('article','schedule-compare-analysis-card'+(result.courses.length&&m.score===maxScore?' best':''));
      card.appendChild(node('strong','','Opción '+(result.index+1)));
      card.appendChild(node('div','schedule-compare-analysis-score',result.courses.length?m.score+'/100':'—'));
      if(!result.courses.length){
        card.appendChild(node('p','','Agrega materias y selecciona secciones para analizar esta opción.'));
      }else{
        card.appendChild(node('p','',formatHours(m.totalOccupied)+' ocupadas · '+m.freeDays.length+' días libres'));
        card.appendChild(node('p','',formatHours(m.totalGaps)+' de espera · '+m.conflicts+' cruces'));
        card.appendChild(node('p','',m.label));
        const busiest=m.daily.filter(day=>day.minutes===m.maxDaily&&day.blocks);
        if(busiest.length)card.appendChild(node('p','', 'Día de mayor carga: '+busiest.map(day=>day.short).join(', ')+' ('+formatHours(m.maxDaily)+')'));
      }
      grid.appendChild(card);
    });
    root.appendChild(grid);
    root.appendChild(node('p','schedule-compare-analysis-note','El índice descuenta puntos por cruces, esperas de 15 minutos o más y jornadas que superan las 6 horas. Toda la evaluación se realiza en este dispositivo.'));
  }
  function buildCompare(){
    buildOptionConflictPanels();
    if(byId('scheduleCompareAnalysis'))return true;
    const panel=byId('comparePanel');
    const schedules=byId('optionSchedules');
    if(!panel||!schedules)return false;
    const root=node('section','schedule-compare-analysis');
    root.id='scheduleCompareAnalysis';
    root.hidden=true;
    root.setAttribute('aria-label','Análisis de las tres alternativas');
    schedules.insertAdjacentElement('afterend',root);
    renderCompare();
    compareObserver=new MutationObserver(scheduleRender);
    ['optionBody1','optionBody2','optionBody3','compareRows'].forEach(id=>{
      const target=byId(id);
      if(target)compareObserver.observe(target,{childList:true,subtree:true,characterData:true});
    });
    return true;
  }

  function scheduleRender(){
    if(scheduled)return;
    scheduled=true;
    window.setTimeout(()=>{scheduled=false;render();renderCompare();},40);
  }
  function build(){
    if(byId('scheduleAnalysis')){buildConflictRecommendations();return true;}
    const tbody=byId('scheduleBody');
    const table=tbody?.closest('table');
    const panel=byId('schedulePanel')||table?.closest('.panel');
    if(!tbody||!panel)return false;
    const root=node('section','schedule-analysis');
    root.id='scheduleAnalysis';
    root.setAttribute('aria-label','Análisis inteligente del horario');
    const library=byId('scheduleLibrary');
    if(library&&library.parentNode===panel)library.insertAdjacentElement('afterend',root);
    else if(table)table.insertAdjacentElement('beforebegin',root);
    else panel.appendChild(root);
    buildConflictRecommendations();
    render();
    observer=new MutationObserver(scheduleRender);
    observer.observe(tbody,{childList:true,subtree:true,characterData:true});
    return true;
  }
  window.UCScheduleAnalyzer=Object.freeze({analyze,formatHours});

  function initialize(){
    const ready=build()&&buildCompare();
    if(ready)return;
    const wait=new MutationObserver(()=>{if(build()&&buildCompare())wait.disconnect();});
    wait.observe(document.body,{childList:true,subtree:true});
    window.setTimeout(()=>wait.disconnect(),20000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();