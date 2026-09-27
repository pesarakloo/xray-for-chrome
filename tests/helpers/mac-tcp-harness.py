from pathlib import Path
import json, os, shutil, signal, socket, struct, subprocess, tempfile, time

root=Path(__file__).resolve().parents[2]
zsh=shutil.which('zsh')
if not zsh: raise SystemExit('This optional helper test requires zsh and Python 3.')
work=Path(tempfile.mkdtemp(prefix='xray-tcp-qa-'))
try:
    parser=work/'osascript-shim'
    parser.write_text('''#!/usr/bin/env python3
import json,sys
r=json.load(open(sys.argv[-1]))
print(r.get('timeoutMs',4000))
for t in r['targets']: print(str(t['id'])+'\\t'+t['address']+'\\t'+str(t['port']))
''')
    connector=work/'nc-shim'
    connector.write_text('''#!/usr/bin/env python3
import os,socket,sys,time
with open(os.environ['TCP_QA_PIDS'],'a') as f: f.write(str(os.getpid())+'\\n')
address,port=sys.argv[-2],int(sys.argv[-1])
if address=='timeout.test': time.sleep(10); sys.exit(1)
try:
 s=socket.create_connection((address,port),1)
 time.sleep(0.35)
 s.close()
except OSError: sys.exit(1)
''')
    parser.chmod(0o755);connector.chmod(0o755)
    script=work/'TcpProbe.command'
    script.write_text((root/'native-hosts/macos/TcpProbe.command').read_text().replace('/usr/bin/osascript',str(parser)).replace('/usr/bin/nc',str(connector)))
    def start(targets,timeout=1000):
        batch=Path(tempfile.mkdtemp(dir=work,prefix='batch-'))
        request=batch/'request.json';request.write_text(json.dumps({'targets':targets,'timeoutMs':timeout}))
        pidfile=work/('pids-'+batch.name)
        env={**os.environ,'TCP_QA_PIDS':str(pidfile)}
        return subprocess.Popen([zsh,str(script),str(request),str(batch)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env),batch,pidfile
    def frames(data):
        result=[]
        while data:
            assert len(data)>=4,'Incomplete message header'
            n=struct.unpack('<I',data[:4])[0]
            assert len(data)>=4+n,'Incomplete message body'
            result.append(json.loads(data[4:4+n]));data=data[4+n:]
        return result
    def gone(pidfile):
        for pid in map(int,pidfile.read_text().splitlines()):
            try: os.kill(pid,0)
            except ProcessLookupError: continue
            raise AssertionError('TCP child left running: '+str(pid))
    server=socket.socket();server.bind(('127.0.0.1',0));server.listen(100)
    openport=server.getsockname()[1]
    closed=socket.socket();closed.bind(('127.0.0.1',0));closedport=closed.getsockname()[1];closed.close()
    targets=[{'id':str(i),'address':'127.0.0.1','port':openport} for i in range(8)]
    started=time.monotonic();proc,batch,pids=start(targets,2000)
    out,err=proc.communicate(timeout=8);elapsed=time.monotonic()-started
    results=frames(out)
    assert proc.returncode==0,(proc.returncode,err.decode())
    assert len(results)==9,results
    assert all(r['status']=='ok' for r in results[:-1]),(results,err.decode())
    assert results[-1]['type']=='done'
    assert elapsed<2.6,('Expected concurrent execution; eight serial waits exceed 2.8 sec',elapsed)
    assert not batch.exists();gone(pids)
    print('PASS mac helper: 8 concurrent real loopback connects, framing, cleanup; %.2fs'%elapsed)
    proc,batch,pids=start([{'id':'0','address':'127.0.0.1','port':closedport},{'id':'1','address':'timeout.test','port':443}],500)
    out,err=proc.communicate(timeout=5);results=frames(out)
    assert proc.returncode==0,(proc.returncode,err.decode())
    assert {r['id']:r['status'] for r in results[:-1]}=={'0':'error','1':'timeout'},results
    assert results[-1]['type']=='done';assert not batch.exists();gone(pids)
    print('PASS mac helper: refused connection, bounded worker timeout, UTF-8 framing')
    proc,batch,pids=start([{'id':str(i),'address':'timeout.test','port':443} for i in range(4)],4000)
    deadline=time.monotonic()+4
    while time.monotonic()<deadline:
        if pids.exists() and len(pids.read_text().splitlines())==4:break
        time.sleep(.02)
    assert pids.exists() and len(pids.read_text().splitlines())==4
    proc.send_signal(signal.SIGTERM);proc.communicate(timeout=4)
    assert not batch.exists();gone(pids)
    print('PASS mac helper: cancellation reaps all child connectors and removes temporary files')
    server.close()
finally: shutil.rmtree(work,ignore_errors=True)
