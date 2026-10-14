const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.REPO_TAMAGOTCHI_URL||'http://127.0.0.1:4173';
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const lang of ['ru','en']){
   const folder=path.resolve(__dirname,'../docs/screenshots',lang==='en'?'en':'');fs.mkdirSync(folder,{recursive:true});
   const context=await browser.newContext({locale:lang==='ru'?'ru-RU':'en-US',viewport:{width:1440,height:1000},timezoneId:'Europe/Moscow',reducedMotion:'reduce'});
   const page=await context.newPage();await page.clock.install({time:new Date('2026-10-14T07:15:00Z')});
   await page.goto(base+'/?lang='+lang);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(folder,'start.png'),fullPage:true});
   await page.locator('#try-example').click();await page.waitForSelector('#journal:not([hidden])');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(folder,'result.png'),fullPage:true});
   await page.locator('#reset').click();await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(folder,'mobile.png'),fullPage:true});
   await context.close();
  }
  console.log('captured ru/en start, result and mobile');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
