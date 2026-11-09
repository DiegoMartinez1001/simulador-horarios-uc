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
    '@media(max-width:760px){.schedule-compare-analysis-grid{grid-template-columns:1fr}}'
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
  function render(){
    const root=byId('scheduleAnalysis');
    if(!root)return;
    const courses=selectedCourses();
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
  function renderCompare(){
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
    if(byId('scheduleAnalysis'))return true;
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
    render();
    observer=new MutationObserver(scheduleRender);
    observer.observe(tbody,{childList:true,subtree:true,characterData:true});
    return true;
  }
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