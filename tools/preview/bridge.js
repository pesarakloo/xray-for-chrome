import { parseLinkList } from '/extension/modules/parser.js';
// Deterministic, isolated fixtures: only used by tools/preview.mjs.
const scene = new URLSearchParams(location.search).get('scene') || 'empty';
const names = ['IR - Tehran','DE - Frankfurt','NL - Amsterdam','US - New York','SG - Singapore','UK - London'];
const profiles = ['vless','vmess','trojan','shadowsocks','vless','vmess'].map((protocol, i) => ({id:`demo-${i}`,name:names[i],protocol,transport:['tcp','ws','grpc','tcp','xhttp','tcp'][i],security:i%2?'tls':'reality',address:`node${i}.example.invalid`,port:443,uuid:'11111111-1111-4111-8111-111111111111',password:'preview-only'}));
const filled = scene !== 'empty';
const state = {profiles:filled?profiles:[],subscriptions:[],connection:{connected:scene==='connected',profileId:filled?'demo-0':null},latencies:{},ping:{running:false}};
if(scene==='long') state.profiles[0].name='کانفیگ آزمایشی با نام بسیار طولانی — Netherlands Amsterdam Production Profile <script>alert(1)</script>';
if(filled) profiles.forEach((p,i)=>state.latencies[p.id]={status:'ok',latencyMs:[32,86,142,118,205,820][i],checkedAt:new Date().toISOString()});
const storage = {uiLanguage:new URLSearchParams(location.search).get('lang') || localStorage.getItem('preview-language') || 'fa'};
window.addEventListener('load', () => {
  const selected = new URLSearchParams(location.search).get('tab');
  if (['connect','import','manage','guide','about'].includes(selected)) document.querySelector(`[data-tab="${selected}"]`)?.click();
});
let pingTick;
let fixtureSequence = 0;
const fixtureId = () => `preview-new-${++fixtureSequence}`;
async function handle(m) {
  if(m.action==='state')return structuredClone(state);
  if(m.action==='nativeStatus'){if(scene==='missing')throw new Error('Native host is not installed');return {running:state.connection.connected,version:'Xray 25.8.3 · Preview'};}
  if(m.action==='connect'){if(scene==='missing')throw new Error('برنامه همراه در دسترس نیست');state.connection={connected:true,profileId:m.profileId};return state.connection;}
  if(m.action==='disconnect'){state.connection.connected=false;return state.connection;}
  if(m.action==='logs')return {logs:'Preview: diagnostics are simulated. No native host was launched.'};
  if(m.action==='importManual') {const parsed=parseLinkList(m.text);state.profiles.push(...parsed.profiles);return {added:parsed.profiles.length,skipped:parsed.errors.length};}
  if(m.action==='deleteProfile'){state.profiles=state.profiles.filter(p=>p.id!==m.id);return {};}
  if(m.action==='addSubscription'){const id=fixtureId();state.subscriptions.push({id,name:m.name||'Preview subscription',url:m.url,count:2,updatedAt:new Date().toISOString()});state.profiles.push(...profiles.slice(1,3).map(p=>({...p,id:fixtureId(),sourceId:id})));return {added:2};}
  if(m.action==='refreshSubscription')return {added:2};
  if(m.action==='deleteSubscription'){state.subscriptions=state.subscriptions.filter(s=>s.id!==m.id);state.profiles=state.profiles.filter(p=>p.sourceId!==m.id);return {};}
  if(m.action==='pingProfiles'){
    const ids=state.profiles.filter(p=>(!m.profileId||p.id===m.profileId)&&(!m.missingOnly||!state.latencies[p.id])).map(p=>p.id);
    state.ping={running:ids.length>0,activeIds:ids.slice(0,2),pendingIds:ids.slice(2),total:ids.length,completed:0};
    clearInterval(pingTick);
    pingTick=setInterval(()=>{const id=ids.shift();if(id){state.latencies[id]={status:'ok',latencyMs:86,checkedAt:new Date().toISOString()};state.ping.completed++;}state.ping.activeIds=ids.slice(0,2);state.ping.pendingIds=ids.slice(2);if(!ids.length){state.ping.running=false;clearInterval(pingTick);}},700);
    return structuredClone(state.ping);
  }
  if(m.action==='pingState')return structuredClone({latencies:state.latencies,ping:state.ping});
  if(m.action==='cancelPings'){clearInterval(pingTick);state.ping={...state.ping,running:false,cancelled:true,activeIds:[],pendingIds:[]};return state.ping;}
  throw new Error('Unknown preview action: '+m.action);
}
window.chrome = {runtime:{id:'kcefgbldpcaoicjpdcmilahhlcbcflpj',getManifest:()=>({version:'0.7.3'}),sendMessage:(m,callback)=>{handle(m).then(data=>callback({ok:true,data})).catch(e=>callback({ok:false,error:e.message}));}},storage:{local:{get:async()=>storage,set:async values=>{Object.assign(storage,values);localStorage.setItem('preview-language',storage.uiLanguage);}}},permissions:{request:async()=>true}};
