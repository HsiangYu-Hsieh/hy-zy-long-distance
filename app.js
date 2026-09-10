const CONFIG = {
  people: {
    hsiangYu: { name: "Hsiang‑Yu", short: "Hsiang‑Yu", emoji: "🇺🇸" },
    ziYi: { name: "Zi‑Yi Guo", short: "Zi‑Yi", emoji: "🇹🇼" }
  },
  zones: {
    taiwan: "Asia/Taipei",
    sanAntonio: "America/Chicago",
    losAngeles: "America/Los_Angeles"
  },
  // Absolute instants based on the booked itinerary.
  // Hsiang-Yu arrives in San Antonio on 2026-10-01 17:46 local.
  sanAntonioArrivalUtc: "2026-10-01T22:46:00Z",
  // Arrival in Los Angeles is 2026-12-30 23:23 local.
  losAngelesArrivalUtc: "2026-12-31T07:23:00Z",
  // Return flight leaves Los Angeles on 2027-01-14 20:05 local.
  returnFlightUtc: "2027-01-15T04:05:00Z",
  // Arrival in Taiwan on 2027-01-16 05:45 local.
  taiwanReturnUtc: "2027-01-15T21:45:00Z",
  girlfriendWork: {
    weekdays: [1,2,3,4,5], // Mon-Fri in Taiwan
    startMinutes: 8 * 60,
    endMinutes: 17 * 60
  },
  calls: {
    sanAntonio: {
      weekday: { days:[1,2,3,4,5], start: 21*60+30, end:22*60, label:"平日短通話" },
      weekend: { days:[6], start:9*60+30, end:11*60, label:"週末遠距約會" }
    },
    losAngeles: {
      weekday: { days:[1,2,3,4,5], start:7*60, end:7*60+30, label:"平日短通話" },
      weekend: { days:[6], start:9*60+30, end:11*60, label:"週末遠距約會" }
    }
  }
};

const $ = (id) => document.getElementById(id);
const state = {
  viewer: localStorage.getItem("ld-viewer") || "hsiang-yu",
  showSeconds: localStorage.getItem("ld-seconds") !== "false"
};

function partsInZone(date, timeZone){
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year:"numeric", month:"2-digit", day:"2-digit",
    weekday:"short", hour:"2-digit", minute:"2-digit", second:"2-digit",
    hourCycle:"h23"
  }).formatToParts(date);
  const out = {};
  for (const p of parts) if (p.type !== "literal") out[p.type] = p.value;
  const weekdayMap = {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
  return {
    year:+out.year, month:+out.month, day:+out.day,
    weekday:weekdayMap[out.weekday],
    hour:+out.hour, minute:+out.minute, second:+out.second
  };
}

function formatTime(date, timeZone){
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone,
    hour:"2-digit",
    minute:"2-digit",
    second: state.showSeconds ? "2-digit" : undefined,
    hourCycle:"h23"
  }).format(date);
}

function formatDate(date, timeZone){
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone,
    month:"long", day:"numeric", weekday:"long"
  }).format(date);
}

function getTripPhase(now){
  const t = now.getTime();
  const a = new Date(CONFIG.sanAntonioArrivalUtc).getTime();
  const la = new Date(CONFIG.losAngelesArrivalUtc).getTime();
  const dep = new Date(CONFIG.returnFlightUtc).getTime();
  const tw = new Date(CONFIG.taiwanReturnUtc).getTime();

  if (t < a) return {key:"taiwan-before", label:"台灣｜出發前", zone:CONFIG.zones.taiwan, place:"Taiwan", callPhase:"sanAntonio"};
  if (t < la) return {key:"san-antonio", label:"San Antonio", zone:CONFIG.zones.sanAntonio, place:"San Antonio", callPhase:"sanAntonio"};
  if (t < dep) return {key:"los-angeles", label:"Los Angeles", zone:CONFIG.zones.losAngeles, place:"Los Angeles", callPhase:"losAngeles"};
  if (t < tw) return {key:"returning", label:"返台航程", zone:CONFIG.zones.losAngeles, place:"In transit", callPhase:null};
  return {key:"taiwan-after", label:"台灣｜已返台", zone:CONFIG.zones.taiwan, place:"Taiwan", callPhase:null};
}

function taiwanDateToUtc(year, month, day, hour, minute){
  // Taiwan is UTC+8 year-round.
  return new Date(Date.UTC(year, month-1, day, hour-8, minute, 0, 0));
}

function dateOnlyPlusDays(parts, n){
  const d = new Date(Date.UTC(parts.year, parts.month-1, parts.day+n, 12, 0, 0));
  return {year:d.getUTCFullYear(), month:d.getUTCMonth()+1, day:d.getUTCDate()};
}

function weekdayOfTaiwanDate(year, month, day){
  // UTC calendar weekday works because we're evaluating only the civil date itself.
  return new Date(Date.UTC(year, month-1, day, 12)).getUTCDay();
}

function activeCall(now, phase){
  if (!phase.callPhase) return null;
  const tw = partsInZone(now, CONFIG.zones.taiwan);
  const m = tw.hour*60 + tw.minute;
  const rules = CONFIG.calls[phase.callPhase];
  for (const rule of [rules.weekday, rules.weekend]){
    if (rule.days.includes(tw.weekday) && m >= rule.start && m < rule.end){
      return {rule, tw};
    }
  }
  return null;
}

function isZiYiWorking(now){
  const tw = partsInZone(now, CONFIG.zones.taiwan);
  const m = tw.hour*60 + tw.minute;
  return CONFIG.girlfriendWork.weekdays.includes(tw.weekday) &&
         m >= CONFIG.girlfriendWork.startMinutes &&
         m < CONFIG.girlfriendWork.endMinutes;
}

function nextCall(now, phase){
  if (!phase.callPhase) return null;
  const rules = CONFIG.calls[phase.callPhase];
  const tw = partsInZone(now, CONFIG.zones.taiwan);
  const candidates = [];

  for (let delta=0; delta<14; delta++){
    const date = dateOnlyPlusDays(tw, delta);
    const wd = weekdayOfTaiwanDate(date.year, date.month, date.day);
    for (const rule of [rules.weekday, rules.weekend]){
      if (!rule.days.includes(wd)) continue;
      const h = Math.floor(rule.start/60);
      const min = rule.start%60;
      const dt = taiwanDateToUtc(date.year, date.month, date.day, h, min);
      if (dt.getTime() > now.getTime()){
        candidates.push({date:dt, rule});
      }
    }
  }
  candidates.sort((a,b)=>a.date-b.date);
  return candidates[0] || null;
}

function formatCallForZone(rule, targetZone, refDate){
  // Convert the Taiwan rule's start/end on a representative Taiwan civil date.
  const twRef = partsInZone(refDate, CONFIG.zones.taiwan);
  const date = {year:twRef.year, month:twRef.month, day:twRef.day};

  // Move to next valid day for the rule.
  for(let i=0;i<8;i++){
    const d = dateOnlyPlusDays(date,i);
    const wd = weekdayOfTaiwanDate(d.year,d.month,d.day);
    if(rule.days.includes(wd)){
      const sh=Math.floor(rule.start/60), sm=rule.start%60;
      const eh=Math.floor(rule.end/60), em=rule.end%60;
      const s=taiwanDateToUtc(d.year,d.month,d.day,sh,sm);
      const e=taiwanDateToUtc(d.year,d.month,d.day,eh,em);
      const fmt = (x)=>new Intl.DateTimeFormat("zh-TW",{timeZone:targetZone,weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(x);
      return `${fmt(s)}–${new Intl.DateTimeFormat("zh-TW",{timeZone:targetZone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(e)}`;
    }
  }
  return "—";
}

function formatTaiwanRule(rule){
  const fmt=(m)=>`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
  return `${fmt(rule.start)}–${fmt(rule.end)}`;
}

function updateSchedule(phase, now){
  if (!phase.callPhase){
    $("weekdayTw").textContent = "目前沒有固定排程";
    $("weekdayUs").textContent = "遠距行程已結束／移動中";
    $("weekendUs").textContent = "—";
    $("phasePill").textContent = phase.label;
    return;
  }

  const rules = CONFIG.calls[phase.callPhase];
  $("weekdayTw").textContent = `台灣 ${formatTaiwanRule(rules.weekday)}`;
  $("weekendTw").textContent = `台灣 ${formatTaiwanRule(rules.weekend)}`;

  const zone = phase.callPhase === "sanAntonio" ? CONFIG.zones.sanAntonio : CONFIG.zones.losAngeles;
  const place = phase.callPhase === "sanAntonio" ? "San Antonio" : "Los Angeles";
  $("weekdayUs").textContent = `${place} ${formatCallForZone(rules.weekday, zone, now)}`;
  $("weekendUs").textContent = `${place} ${formatCallForZone(rules.weekend, zone, now)}`;
  $("phasePill").textContent = phase.label;
}

function updateTripProgress(phase){
  const order=["taiwan-before","san-antonio","los-angeles","returning","taiwan-after"];
  const current=order.indexOf(phase.key);
  document.querySelectorAll(".trip-step").forEach((el)=>{
    const idx=order.indexOf(el.dataset.phase);
    el.classList.toggle("active",idx===current);
    el.classList.toggle("done",idx<current);
  });
}

function updateTimeline(now, phase){
  const tw=partsInZone(now, CONFIG.zones.taiwan);
  const minute=tw.hour*60+tw.minute+tw.second/60;
  $("nowMarker").style.left=`${Math.max(0,Math.min(100,minute/1440*100))}%`;

  const work = isZiYiWorking(now);
  $("taiwanWorkSummary").textContent = work ? "💼 Zi‑Yi 現在上班中（08:00–17:00）" : "🌿 Zi‑Yi 現在非上班時間";

  if (phase.callPhase){
    const rules=CONFIG.calls[phase.callPhase];
    const todaysRule=[rules.weekday,rules.weekend].find(r=>r.days.includes(tw.weekday));
    if(todaysRule){
      $("todayCallSummary").textContent=`💗 今日固定通話：${formatTaiwanRule(todaysRule)}`;
      const seg=$("weekdayCallSegment");
      seg.style.display="block";
      seg.style.left=`${todaysRule.start/1440*100}%`;
      seg.style.width=`${(todaysRule.end-todaysRule.start)/1440*100}%`;
    }else{
      $("todayCallSummary").textContent="💗 今天沒有固定通話";
      $("weekdayCallSegment").style.display="none";
    }
  } else {
    $("todayCallSummary").textContent="💗 遠距固定排程暫停";
    $("weekdayCallSegment").style.display="none";
  }
}

function updateViewerLabels(phase){
  const hyMode = state.viewer==="hsiang-yu";
  $("viewerSelect").value=state.viewer;
  $("viewerIcon").textContent=hyMode ? "🇺🇸" : "🇹🇼";
  $("viewerText").textContent=hyMode ? "Hsiang‑Yu 模式" : "Zi‑Yi 模式";

  if(hyMode){
    $("meChip").textContent="Hsiang‑Yu";
    $("partnerChip").textContent="Zi‑Yi";
    $("heroSubtitle").textContent="把時差變簡單，把想念留給彼此。";
  }else{
    $("meChip").textContent="Zi‑Yi";
    $("partnerChip").textContent="Hsiang‑Yu";
    $("heroSubtitle").textContent="台灣這一端，也能一眼看到 Hsiang‑Yu 現在幾點。";
  }
}

function updateClocks(now, phase){
  const hyMode=state.viewer==="hsiang-yu";
  const hyZone=phase.zone;
  const ziZone=CONFIG.zones.taiwan;

  const meZone=hyMode ? hyZone : ziZone;
  const partnerZone=hyMode ? ziZone : hyZone;
  const mePlace=hyMode ? phase.place : "Taiwan";
  const partnerPlace=hyMode ? "Taiwan" : phase.place;

  $("meClock").textContent=formatTime(now,meZone);
  $("meDate").textContent=formatDate(now,meZone);
  $("mePlace").textContent=mePlace;
  $("partnerClock").textContent=formatTime(now,partnerZone);
  $("partnerDate").textContent=formatDate(now,partnerZone);
  $("partnerPlace").textContent=partnerPlace;

  const work=isZiYiWorking(now);
  if(hyMode){
    $("meMiniStatus").textContent=`📍 ${phase.label}`;
    $("partnerMiniStatus").textContent=work ? "💼 Zi‑Yi 上班中" : "🌿 Zi‑Yi 非上班時間";
  }else{
    $("meMiniStatus").textContent=work ? "💼 我現在上班中" : "🌿 我現在非上班時間";
    $("partnerMiniStatus").textContent=`📍 Hsiang‑Yu：${phase.label}`;
  }
}

function updateStatus(now,phase){
  const banner=$("statusBanner");
  const current=activeCall(now,phase);
  const work=isZiYiWorking(now);

  banner.classList.remove("call-now","work-now");

  if(current){
    banner.classList.add("call-now");
    $("statusIcon").textContent="💗";
    $("statusLabel").textContent="CALL TIME";
    $("statusTitle").textContent="現在就是你們的通話時間";
    $("statusDetail").textContent=`台灣 ${formatTaiwanRule(current.rule)} · ${current.rule.label}`;
    return;
  }

  if(work){
    banner.classList.add("work-now");
    $("statusIcon").textContent="💼";
    $("statusLabel").textContent="ZI‑YI STATUS";
    $("statusTitle").textContent="Zi‑Yi 現在上班中";
    $("statusDetail").textContent="台灣平日 08:00–17:00，非急事可以晚點再打。";
    return;
  }

  const next=nextCall(now,phase);
  $("statusIcon").textContent=next ? "💗" : "🏠";
  $("statusLabel").textContent=next ? "NEXT CALL" : "STATUS";
  $("statusTitle").textContent=next ? "現在不是固定通話時間" : "目前沒有遠距固定排程";
  $("statusDetail").textContent=next ? "可以自由傳訊息；固定通話倒數在下方。" : "移動中或已返台。";
}

function updateCountdown(now,phase){
  const next=nextCall(now,phase);
  if(!next){
    $("nextCallLabel").textContent="固定通話排程";
    $("nextCallTime").textContent="目前暫停";
    ["cdDays","cdHours","cdMinutes","cdSeconds"].forEach((id,i)=>$(id).textContent=i===0?"0":"00");
    return;
  }

  const diff=Math.max(0,next.date-now);
  const sec=Math.floor(diff/1000);
  const days=Math.floor(sec/86400);
  const hours=Math.floor(sec%86400/3600);
  const mins=Math.floor(sec%3600/60);
  const secs=sec%60;

  $("cdDays").textContent=days;
  $("cdHours").textContent=String(hours).padStart(2,"0");
  $("cdMinutes").textContent=String(mins).padStart(2,"0");
  $("cdSeconds").textContent=String(secs).padStart(2,"0");

  const twText=new Intl.DateTimeFormat("zh-TW",{
    timeZone:CONFIG.zones.taiwan,month:"numeric",day:"numeric",weekday:"short",
    hour:"2-digit",minute:"2-digit",hourCycle:"h23"
  }).format(next.date);

  const localZone=phase.callPhase==="sanAntonio" ? CONFIG.zones.sanAntonio : CONFIG.zones.losAngeles;
  const usText=new Intl.DateTimeFormat("zh-TW",{
    timeZone:localZone,month:"numeric",day:"numeric",weekday:"short",
    hour:"2-digit",minute:"2-digit",hourCycle:"h23"
  }).format(next.date);

  $("nextCallLabel").textContent=next.rule.label;
  $("nextCallTime").textContent=`🇹🇼 ${twText}　↔　🇺🇸 ${usText}`;
}

function render(){
  const now=new Date();
  const phase=getTripPhase(now);
  updateViewerLabels(phase);
  updateClocks(now,phase);
  updateStatus(now,phase);
  updateCountdown(now,phase);
  updateTimeline(now,phase);
  updateSchedule(phase,now);
  updateTripProgress(phase);
}

$("viewerToggle").addEventListener("click",()=>{
  state.viewer=state.viewer==="hsiang-yu" ? "zi-yi" : "hsiang-yu";
  localStorage.setItem("ld-viewer",state.viewer);
  render();
});
$("viewerSelect").addEventListener("change",(e)=>{
  state.viewer=e.target.value;
  localStorage.setItem("ld-viewer",state.viewer);
  render();
});
$("showSeconds").checked=state.showSeconds;
$("showSeconds").addEventListener("change",(e)=>{
  state.showSeconds=e.target.checked;
  localStorage.setItem("ld-seconds",String(state.showSeconds));
  render();
});

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  });
}

render();
setInterval(render,1000);
