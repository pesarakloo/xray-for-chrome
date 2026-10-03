import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBypassDomains, normalizeDomain, readRouting, chromeProxyConfig, LOCAL_BYPASS } from '../extension/modules/traffic-routing.js';
import { parseLinkList } from '../extension/modules/parser.js';

test('direct-site input normalizes URLs, Unicode, case, ports, IPs and duplicates', () => {
  assert.deepEqual(parseBypassDomains(' HTTPS://Example.COM:8443/account?q=1\n*.example.com\nexample.com.\n\nhttps://مثال.ایران/page\n192.168.1.1\nhttps://[2001:db8::1]:443/'), ['example.com', normalizeDomain('مثال.ایران'), '192.168.1.1', '[2001:db8::1]']);
});
test('unsafe rules are rejected atomically with a line number', () => {
  for (const value of ['*', '*.com', '<local>', '<-loopback>', '*.example.*', 'https://user:secret@example.com', 'file:///tmp/a', 'ftp://example.com', 'javascript:alert(1)', 'https://example.com\\evil', 'bad domain.com', '-x.example', '.example.com', 'example..com', 'https://example.com:70000']) {
    assert.throws(() => parseBypassDomains('valid.example\n'+value), /خط 2/);
  }
  assert.throws(() => parseBypassDomains(Array.from({length:201},(_,i)=>`site${i}.example`).join('\n')), /۲۰۰/);
  assert.throws(() => parseBypassDomains({}), /طولانی/);
  assert.deepEqual(readRouting({enabled:true,domains:['*']}), {enabled:false,domains:[]});
});
test('proxy exceptions match the exact domain and subdomains without suffix lookalikes', () => {
  const config=chromeProxyConfig(10808,{enabled:true,domains:['example.com','192.168.1.1','[2001:db8::1]']});
  assert.deepEqual(config.rules.singleProxy,{scheme:'socks5',host:'127.0.0.1',port:10808});
  assert.deepEqual(config.rules.bypassList,[...LOCAL_BYPASS,'example.com','*.example.com','192.168.1.1','[2001:db8::1]']);
  assert.ok(!config.rules.bypassList.includes('*example.com'));
  assert.deepEqual(chromeProxyConfig(10808,{enabled:false,domains:['example.com']}).rules.bypassList,LOCAL_BYPASS);
});

test('worker saves offline, applies while connected, rolls back failures, serializes changes and restores saved rules', async () => {
  const oldChrome=globalThis.chrome;
  let handler,startup,failProxy=false,failSave=false,blocked=false;
  let proxyValue, nativeActions=[];
  const stored={profiles:parseLinkList('vless://11111111-1111-4111-8111-111111111111@server.example:443?security=tls#Test').profiles,uiLanguage:'fa'};
  globalThis.chrome={
    runtime:{onMessage:{addListener:fn=>handler=fn},onInstalled:{addListener(){}},onStartup:{addListener:fn=>startup=fn},sendNativeMessage:(_host,m,cb)=>{nativeActions.push(m.action);cb({ok:true,running:true});}},
    action:{setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}},
    storage:{local:{get:async()=>structuredClone(stored),set:async data=>{if(failSave&&data.routing){failSave=false;throw new Error('Disk full');}Object.assign(stored,structuredClone(data));},remove:async()=>{}}},
    proxy:{settings:{get:async()=>({levelOfControl:blocked?'controlled_by_other_extensions':'controlled_by_this_extension'}),set:async ({value})=>{if(failProxy)throw new Error('Proxy refused');proxyValue=structuredClone(value);},clear:async()=>{proxyValue=undefined;}}},
    privacy:{network:{webRTCIPHandlingPolicy:{set:async()=>{},clear:async()=>{}}}}
  };
  try {
    await import('../extension/service-worker.js?routing-test');
    const send=m=>new Promise(resolve=>handler(m,{},resolve));
    let res=await send({action:'state'});
    assert.deepEqual(res.data.routing,{enabled:false,domains:[]});
    res=await send({action:'saveRouting',enabled:true,text:'https://Example.com/path'});
    assert.equal(res.ok,true);assert.equal(proxyValue,undefined);assert.equal(stored.uiLanguage,'fa');
    assert.deepEqual(stored.routing,{enabled:true,domains:['example.com']});
    res=await send({action:'connect',profileId:stored.profiles[0].id});assert.equal(res.ok,true);
    assert.ok(proxyValue.rules.bypassList.includes('*.example.com'));
    const connection=structuredClone(stored.connection),startCount=nativeActions.filter(a=>a==='start').length;
    res=await send({action:'saveRouting',enabled:true,text:'direct.example'});assert.equal(res.ok,true);
    assert.ok(proxyValue.rules.bypassList.includes('direct.example'));
    assert.equal(nativeActions.filter(a=>a==='start').length,startCount);assert.deepEqual(stored.connection,connection);
    res=await send({action:'saveRouting',enabled:true,text:'*'});assert.equal(res.ok,false);
    assert.deepEqual(stored.routing.domains,['direct.example']);
    failProxy=true;
    res=await send({action:'saveRouting',enabled:true,text:'failed.example'});assert.equal(res.ok,false);
    assert.deepEqual(stored.routing.domains,['direct.example']);failProxy=false;
    failSave=true;
    res=await send({action:'saveRouting',enabled:true,text:'unsaved.example'});assert.equal(res.ok,false);
    assert.ok(proxyValue.rules.bypassList.includes('direct.example'));assert.ok(!proxyValue.rules.bypassList.includes('unsaved.example'));
    blocked=true;
    res=await send({action:'saveRouting',enabled:true,text:'blocked.example'});assert.equal(res.ok,false);blocked=false;
    assert.deepEqual(stored.routing.domains,['direct.example']);
    const updates=await Promise.all([send({action:'saveRouting',enabled:true,text:'queued.example'}),send({action:'disconnect'})]);
    assert.ok(updates.every(r=>r.ok));assert.equal(proxyValue,undefined);assert.equal(stored.connection.connected,false);
    await send({action:'connect',profileId:stored.profiles[0].id});
    await startup();assert.ok(proxyValue.rules.bypassList.includes('queued.example'));
    res=await send({action:'saveRouting',enabled:false,text:'queued.example'});assert.equal(res.ok,true);
    assert.deepEqual(proxyValue.rules.bypassList,LOCAL_BYPASS);assert.deepEqual(stored.routing.domains,['queued.example']);
  } finally {globalThis.chrome=oldChrome;}
});
