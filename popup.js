'use strict';
const c={style:document.getElementById('style-enabled'),frontend:document.getElementById('frontend-enabled'),fenbi:document.getElementById('fenbi-enabled'),comments:document.getElementById('comments-enabled'),video:document.getElementById('hide-video-enabled'),monochrome:document.getElementById('monochrome-enabled'),csdn:document.getElementById('csdn-enabled'),csdnBeautify:document.getElementById('csdn-beautify-enabled'),csdnMonochrome:document.getElementById('csdn-monochrome-enabled'),csdnPosition:document.getElementById('csdn-position'),zhihu:document.getElementById('zhihu-enabled'),zhihuComments:document.getElementById('zhihu-comments-enabled'),zhihuMonochrome:document.getElementById('zhihu-monochrome-enabled'),common:document.getElementById('common-enabled'),commonMonochrome:document.getElementById('common-monochrome-enabled'),json:document.getElementById('json-enabled')};
const second=[...document.querySelectorAll('.feature--second')],third=[...document.querySelectorAll('.feature--third')],tops=[...document.querySelectorAll('.feature--top')];
const defaults={styleEnabled:true,frontendEnabled:true,fenbiEnabled:true,commentsEnabled:true,hideVideo:false,monochrome:false,csdnEnabled:true,csdnBeautify:true,csdnMonochrome:false,csdnPosition:'center',zhihuEnabled:true,zhihuComments:true,zhihuMonochrome:false,commonEnabled:true,commonMonochrome:false,jsonEnabled:false,collapsedGroups:{style:true,frontend:true,fenbi:true,csdn:true,zhihu:true,common:true}};
function isCollapsed(s,key){return (s.collapsedGroups||{})[key]!==false}
function setToggle(section,collapsed){const b=section.querySelector('[data-collapse]');if(!b)return;b.textContent=collapsed?'＋':'−';b.setAttribute('aria-expanded',String(!collapsed));}
function setHidden(items,hidden){for(const item of items)item.hidden=hidden}
function render(s){
  for(const key of Object.keys(c)){if(c[key]&&key!=='csdnPosition')c[key].checked=Boolean(s[`${key}Enabled`]??s[key])}
  c.csdnPosition.value=['left','center','right'].includes(s.csdnPosition)?s.csdnPosition:'center';
  const styleOn=s.styleEnabled!==false, frontendOn=s.frontendEnabled!==false;
  const styleCollapsed=isCollapsed(s,'style'), frontendCollapsed=isCollapsed(s,'frontend');
  for(const top of tops){const key=top.dataset.group;setToggle(top,key==='style'?styleCollapsed:frontendCollapsed)}
  for(const section of second){
    const key=section.dataset.group,parent=section.dataset.parent;
    const parentCollapsed=parent==='style'?styleCollapsed:frontendCollapsed;
    const ownCollapsed=section.querySelector('[data-collapse]')?isCollapsed(s,key):false;
    setToggle(section,ownCollapsed);
    section.hidden=parentCollapsed;
    const input=section.querySelector('input,select');
    if(input)input.disabled=!(parent==='style'?styleOn:frontendOn);
  }
  for(const section of third){
    const parent=section.dataset.parent,parentSection=second.find(x=>x.dataset.group===parent);
    const parentOn=parent==='fenbi'?styleOn&&s.fenbiEnabled:parent==='csdn'?styleOn&&s.csdnEnabled:parent==='zhihu'?styleOn&&s.zhihuEnabled:styleOn&&s.commonEnabled;
    section.hidden=Boolean(parentSection?.hidden||isCollapsed(s,parent));
    const input=section.querySelector('input,select');if(input)input.disabled=!parentOn;
  }
}
function save(k,v){chrome.storage.sync.set({[k]:v})}
function updateCollapse(key,collapsed){chrome.storage.sync.get({collapsedGroups:{}},r=>chrome.storage.sync.set({collapsedGroups:{...(r.collapsedGroups||{}),[key]:collapsed}}))}
function descendants(key){return [...document.querySelectorAll(`[data-parent="${key}"]`)]}
chrome.storage.sync.get(defaults,render);
for(const key of Object.keys(c)){if(c[key]&&key!=='style'&&key!=='frontend'&&key!=='json'&&key!=='csdnPosition')c[key].addEventListener('change',()=>save(`${key}Enabled`,c[key].checked))}
c.style.addEventListener('change',()=>save('styleEnabled',c.style.checked));c.frontend.addEventListener('change',()=>save('frontendEnabled',c.frontend.checked));c.csdnPosition.addEventListener('change',()=>save('csdnPosition',c.csdnPosition.value));
c.json.addEventListener('change',()=>{save('jsonEnabled',c.json.checked);if(c.json.checked)chrome.tabs.create({url:chrome.runtime.getURL('json.html')})});
for(const top of tops){const b=top.querySelector('[data-collapse]');b.addEventListener('click',()=>{const key=top.dataset.group,hide=b.getAttribute('aria-expanded')==='true';setToggle(top,hide);setHidden(second.filter(x=>x.dataset.parent===key),hide);updateCollapse(key,hide)})}
for(const section of second){const b=section.querySelector('[data-collapse]');if(!b)continue;b.addEventListener('click',()=>{const key=section.dataset.group,hide=b.getAttribute('aria-expanded')==='true';setToggle(section,hide);setHidden(third.filter(x=>x.dataset.parent===key),hide);updateCollapse(key,hide)})}
chrome.storage.onChanged.addListener((_,area)=>{if(area==='sync')chrome.storage.sync.get(defaults,render)})
