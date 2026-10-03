import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {setupCommand,STORE_EXTENSION_ID} from '../extension/modules/setup-guide.js';

test('all four setup routes use the right layout and the actual installed extension ID',()=>{
  const id=STORE_EXTENSION_ID;
  assert.equal(setupCommand('store','macos','install',id),`/bin/zsh ./install.command --extension-id ${id}`);
  assert.equal(setupCommand('github','macos','install',id),`/bin/zsh ./native-hosts/macos/install.command --extension-id ${id}`);
  for(const method of ['store','github']){
    assert.equal(setupCommand(method,'windows','install',id),`.\\install-windows.cmd -ExtensionId ${id}`);
    assert.match(setupCommand(method,'windows','local',id), /-XrayExe "C:\\Path\\To\\xray.exe" -ExtensionId/);
    assert.match(setupCommand(method,'macos','local',id), /--xray "\/path\/to\/xray" --extension-id/);
    assert.doesNotMatch(setupCommand(method,'macos','remove'), /extension-id/);
  }
  assert.throws(()=>setupCommand('store','macos','install','abc;echo unsafe'));
  assert.throws(()=>setupCommand('unknown','macos','install',id));
});

const resolver=await readFile(new URL('../native-hosts/macos/ResolveRelease.js',import.meta.url),'utf8');
function resolveRelease(data,name='Xray-macos-arm64-v8a.zip'){
 const context=vm.createContext({Ref:()=>({}),ObjC:{import(){},unwrap:v=>v},$:{NSUTF8StringEncoding:4,NSString:{stringWithContentsOfFileEncodingError:()=>JSON.stringify(data)}}});
 vm.runInContext(resolver,context);return context.run(['release.json',name,'v25.8.3']);
}
const release=(tag,name='Xray-macos-arm64-v8a.zip',digest)=>({tag_name:tag,assets:[{name,browser_download_url:`https://github.com/XTLS/Xray-core/releases/download/${tag}/${name}`,digest}]});
test('Mac metadata resolves only 25.8.3 for both architectures and keeps empty-digest TSV fields',()=>{
 for(const name of ['Xray-macos-arm64-v8a.zip','Xray-macos-64.zip']){
  assert.equal(resolveRelease(release('v25.8.3',name),name),`https://github.com/XTLS/Xray-core/releases/download/v25.8.3/${name}\t-\tv25.8.3`);
 }
 const digest='sha256:'+'a'.repeat(64);
 assert.ok(resolveRelease([release('v26.1.1'),release('v25.8.3','Xray-macos-arm64-v8a.zip',digest)]).includes(digest));
 assert.throws(()=>resolveRelease(release('v26.1.1')));
 assert.throws(()=>resolveRelease({message:'API rate limit exceeded'}));
 const malicious=release('v25.8.3');malicious.assets[0].browser_download_url='https://example.com/asset.zip';
 assert.throws(()=>resolveRelease(malicious));
 assert.throws(()=>resolveRelease(release('v25.8.3','Xray-macos-arm64-v8a.zip','invalid')));
});
