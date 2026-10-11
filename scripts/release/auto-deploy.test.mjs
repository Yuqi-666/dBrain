import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

function fixture() {
 const root=mkdtempSync(join(tmpdir(),'dbrain-auto-test-'));
 const repo=join(root,'repo'),deploy=join(root,'deploy'),state=join(root,'state'),bin=join(root,'bin'),log=join(root,'docker.log');
 for(const dir of [repo,deploy,bin]) mkdirSync(dir);
 const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();
 git('init','-b','main');git('config','user.email','test@example.test');git('config','user.name','Test');
 for(const file of ['deploy/pocketbase/Dockerfile','apps/server/Dockerfile','apps/web/Dockerfile']) {mkdirSync(join(repo,file,'..'),{recursive:true});writeFileSync(join(repo,file),'FROM scratch\n');}
 writeFileSync(join(repo,'docker-compose.yml'),'services: {}\n');writeFileSync(join(repo,'marker'),'old');
 git('add','.');git('commit','-qm','old');const old=git('rev-parse','HEAD');
 execFileSync('bash',['-c','git -C "$1" archive HEAD | tar -xf - -C "$2"','test',repo,deploy]);
 writeFileSync(join(deploy,'compose.host.yml'),'old host config\n');writeFileSync(join(deploy,'DEPLOYED_COMMIT'),old+'\n');writeFileSync(join(deploy,'DEPLOYMENT_IMAGES.txt'),'old images\n');
 writeFileSync(join(repo,'marker'),'new');git('add','.');git('commit','-qm','new');const latest=git('rev-parse','HEAD');
 writeFileSync(join(bin,'sudo'),'#!/bin/bash\nshift\nexec "$@"\n',{mode:0o755});
 writeFileSync(join(bin,'curl'),'#!/bin/bash\nexit 0\n',{mode:0o755});
 writeFileSync(join(bin,'sleep'),'#!/bin/bash\nexit 0\n',{mode:0o755});
 writeFileSync(join(bin,'docker'),`#!/bin/bash
printf '%s\\n' "$*" >> "$DOCKER_LOG"
case "$1" in
 build) [[ "$FAIL_PHASE" != build ]] ;;
 inspect) case "$*" in *Mounts*) echo test_volume ;; *'.Image}}'*) echo old_image ;; *) echo healthy ;; esac ;;
 cp) [[ "$2" == -a ]] && shift; mkdir -p "$3"; echo snapshot > "$3/data.db" ;;
 compose) if [[ "$FAIL_PHASE" == switch && "$*" == *'up -d'*'pocketbase server web'* ]]; then exit 1; fi ;;
 exec) if [[ "$FAIL_PHASE" == preflight && "$2" == dbrain-preflight-* ]]; then exit 1; fi ;;
 run) if [[ "$*" == *'/restore'* ]]; then echo restored >> "$DOCKER_LOG"; fi ;;
 esac
`,{mode:0o755});
 const config=join(root,'config');writeFileSync(config,`DEPLOY_ROOT='${deploy}'\nSTATE_ROOT='${state}'\nREPOSITORY='${repo}'\nPUBLIC_ORIGIN='https://example.test'\n`);
 const run=(phase='')=>spawnSync('bash',[resolve('scripts/operations/auto-deploy.sh')],{encoding:'utf8',env:{...process.env,DBRAIN_AUTO_DEPLOY_CONFIG:config,DOCKER_LOG:log,FAIL_PHASE:phase,PATH:bin+':'+process.env.PATH}});
 return {root,old,latest,deploy,log,run,close:()=>rmSync(root,{recursive:true,force:true})};
}

test('auto deployment updates source and metadata, then skips unchanged main',()=>{
 const f=fixture();try {const r=f.run();assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(readFileSync(join(f.deploy,'marker'),'utf8'),'new');assert.equal(statSync(join(f.deploy,'marker')).mode & 0o777,0o644);assert.equal(readFileSync(join(f.deploy,'DEPLOYED_COMMIT'),'utf8').trim(),f.latest);const before=readFileSync(f.log,'utf8');assert.match(before,/tar --numeric-owner -cpf/);const unchanged=f.run();assert.equal(unchanged.status,0,unchanged.stderr);assert.match(unchanged.stdout,/UNCHANGED/);assert.equal(readFileSync(f.log,'utf8'),before);}finally{f.close();}
});
test('failed build never stops production services or retries the same broken commit',()=>{
 const f=fixture();try {const r=f.run('build');assert.notEqual(r.status,0);assert.equal(readFileSync(join(f.deploy,'DEPLOYED_COMMIT'),'utf8').trim(),f.old);const before=readFileSync(f.log,'utf8');assert.doesNotMatch(before,/compose .* stop/);const retry=f.run();assert.equal(retry.status,0,retry.stderr);assert.match(retry.stdout,/BLOCKED/);assert.equal(readFileSync(f.log,'utf8'),before);}finally{f.close();}
});
test('failed service switch restores the snapshot, source and old configuration',()=>{
 const f=fixture();try {const r=f.run('switch');assert.notEqual(r.status,0);assert.match(r.stdout,/ROLLBACK_COMPLETE/);assert.equal(readFileSync(join(f.deploy,'marker'),'utf8'),'old');assert.equal(readFileSync(join(f.deploy,'compose.host.yml'),'utf8'),'old host config\n');assert.equal(readFileSync(join(f.deploy,'DEPLOYED_COMMIT'),'utf8').trim(),f.old);assert.match(readFileSync(f.log,'utf8'),/restored/);}finally{f.close();}
});
test('failed real-entrypoint preflight never stops production services',()=>{
 const f=fixture();try {const r=f.run('preflight');assert.notEqual(r.status,0);assert.match(r.stderr,/preflight failed before production stop/);assert.equal(readFileSync(join(f.deploy,'DEPLOYED_COMMIT'),'utf8').trim(),f.old);assert.doesNotMatch(readFileSync(f.log,'utf8'),/compose .* stop/);}finally{f.close();}
});
