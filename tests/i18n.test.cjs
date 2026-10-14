const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=path.join(__dirname,'../i18n.js');
function runtime(extra={}){
 assert.ok(fs.existsSync(source),'a local locale runtime is required');
 const context={URL,console,navigator:{languages:['de-DE','en-US']},location:{href:'https://example.test/?keep=1#draft'},...extra};
 context.globalThis=context;
 vm.runInNewContext(fs.readFileSync(source,'utf8'),context);
 return context.I18n;
}
test('locale priority and unsupported languages',()=>{
 const i=runtime();
 assert.equal(i.resolveLocale({query:'ru',saved:'en',languages:['en-US']}),'ru');
 assert.equal(i.resolveLocale({query:'xx',saved:'ru',languages:['en-US']}),'ru');
 assert.equal(i.resolveLocale({languages:['fr','ru-RU','en-US']}),'ru');
 assert.equal(i.resolveLocale({languages:['de']}),'en');
});
test('dictionary and interpolation parity',()=>{
 const i=runtime();
 assert.ok(Object.keys(i.messages.en).length>20);
 assert.deepEqual(Object.keys(i.messages.en).sort(),Object.keys(i.messages.ru).sort());
 for(const key of Object.keys(i.messages.ru)){
  const tokens=s=>[...s.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort();
  assert.deepEqual(tokens(i.messages.ru[key]),tokens(i.messages.en[key]),key);
 }
});
test('blocked persistence and history still allow in-place switching',()=>{
 const i=runtime({localStorage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}},history:{replaceState(){throw Error('blocked')}}});
 let calls=0;i.subscribe(()=>calls++);
 assert.doesNotThrow(()=>i.setLocale('ru'));
 assert.equal(i.locale,'ru');assert.equal(calls,1);
 assert.doesNotThrow(()=>i.setLocale('en'));
 assert.equal(i.locale,'en');assert.equal(calls,2);
});
test('manual switch preserves unrelated query and hash',()=>{
 let actual;
 const i=runtime({history:{replaceState(_s,_t,url){actual=String(url)}}});
 i.setLocale('ru');
 const url=new URL(actual);assert.equal(url.searchParams.get('keep'),'1');assert.equal(url.searchParams.get('lang'),'ru');assert.equal(url.hash,'#draft');
});
test('archive counts use Russian and English plural forms',()=>{
 const i=runtime();assert.equal(typeof i.count,'function');i.setLocale('ru');assert.equal(i.count('archive.files',1),'в архиве 1 текстовый файл.');assert.equal(i.count('archive.files',2),'в архиве 2 текстовых файла.');assert.equal(i.count('archive.files',5),'в архиве 5 текстовых файлов.');i.setLocale('en');assert.equal(i.count('archive.files',1),'the archive contains 1 text file.');assert.equal(i.count('archive.files',2),'the archive contains 2 text files.');
});

test('choosing the current locale persists the link without rerendering state',()=>{
 let url;const i=runtime({history:{replaceState(_s,_t,value){url=String(value)}}});let calls=0;i.subscribe(()=>calls++);i.setLocale(i.locale);assert.equal(calls,0);assert.equal(new URL(url).searchParams.get('lang'),'en');
});
