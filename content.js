'use strict';

const PANEL_ATTR = 'data-fcp-comments';
const PAGE_SIZE = 30;
const MAX_PAGES = 2;
const questionIdMapCache = new Map();
let settings = { fenbiEnabled:true, commentsEnabled:true, hideVideo:false, monochrome:false, csdnEnabled:true, csdnBeautify:true, csdnMonochrome:false, csdnPosition:'center', zhihuEnabled:true, zhihuComments:true, zhihuMonochrome:false, commonEnabled:true, commonMonochrome:false };

function isCsdnPage() {
  return location.hostname === 'blog.csdn.net';
}

function isFenbiPage() {
  return location.hostname === 'spa.fenbi.com' || location.hostname === 'www.fenbi.com';
}

function isFenbiSolutionPage() {
  return location.hostname === 'spa.fenbi.com' && /^\/ti\/exam\/solution\//.test(location.pathname);
}

function isCommentEnhancementPage() {
  // 粉笔绝大多数页面已有原生评论，扩展绝不干预。
  // 只有解析页存在被隐藏的评论入口，才由“显示评论”开关注入面板。
  return isFenbiSolutionPage();
}

function isZhihuPage() {
  return location.hostname === 'www.zhihu.com';
}

function isGenericTarget() {
  return /^https?:$/.test(location.protocol) && !isFenbiPage() && !isCsdnPage() && !isZhihuPage();
}

function requestJsonFromBackground(url) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'FCP_FETCH_JSON', url }, (response) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response?.ok) return reject(new Error(response?.error || '网络请求失败'));
      resolve(response.data);
    });
  });
}

async function requestJsonDirect(url) {
  const response = await fetch(url,{method:'GET',credentials:'include',headers:{Accept:'application/json, text/plain, */*'}});
  if (!response.ok) throw new Error(`页面 HTTP ${response.status}（${new URL(url).hostname}${new URL(url).pathname}）`);
  try { return await response.json(); } catch { throw new Error('页面请求返回的不是有效 JSON'); }
}

async function requestJson(url) {
  const errors=[];
  try { return await requestJsonDirect(url); } catch (error) { errors.push(error.message); }
  try { return await requestJsonFromBackground(url); } catch (error) { errors.push(error.message); }
  throw new Error([...new Set(errors)].join('；'));
}

function currentExerciseParams() {
  const match = location.pathname.match(/^\/ti\/exam\/solution\/([^/]+)/);
  if (!match) return null;
  const query = new URLSearchParams(location.search);
  return {
    key:decodeURIComponent(match[1]),
    routecs:query.get('routecs')||'xingce',
    examcatid:query.get('examcatid')||'',
  };
}

function pageQuestionKeys() {
  return [...document.querySelectorAll('app-ti[data-question-key]')]
    .map(item=>item.getAttribute('data-question-key')).filter(Boolean);
}

function validateQuestionMap(result) {
  const keys=pageQuestionKeys();
  if (!keys.length) throw new Error('页面尚未渲染题目');
  const missing=keys.filter(key=>!result.has(key));
  if (missing.length) throw new Error(`只映射到 ${keys.length-missing.length}/${keys.length} 道题`);
  return result;
}

function collectLegacyQuestionIds(exercise,report) {
  const byIndex=new Map();
  for (const answer of Object.values(exercise?.userAnswers??{})) {
    const index=Number(answer?.questionIndex);
    const id=Number(answer?.questionId);
    if (Number.isInteger(index) && Number.isSafeInteger(id) && id>0) byIndex.set(index,id);
  }
  for (const [fallbackIndex,answer] of (report?.answers??[]).entries()) {
    const index=Number.isInteger(Number(answer?.questionIndex)) ? Number(answer.questionIndex) : fallbackIndex;
    const id=Number(answer?.questionId);
    if (!byIndex.has(index) && Number.isSafeInteger(id) && id>0) byIndex.set(index,id);
  }
  return [...byIndex.entries()].sort((a,b)=>a[0]-b[0]).map(([,id])=>id);
}

async function mapFromLegacyReport(solution,params) {
  const ancientId=Number(solution?.ancientExerciseId?.id??solution?.ancientExerciseId);
  if (!Number.isSafeInteger(ancientId) || ancientId<=0) throw new Error('getSolution 未返回 ancientExerciseId');
  const base=`https://tiku.fenbi.com/api/${encodeURIComponent(params.routecs)}/exercises/${ancientId}`;
  const [exercisePayload,reportPayload]=await Promise.all([requestJson(base),requestJson(`${base}/report/v2`)]);
  const exercise=exercisePayload?.data??exercisePayload;
  const report=reportPayload?.data??reportPayload;
  const ids=collectLegacyQuestionIds(exercise,report);
  const keys=pageQuestionKeys();
  if (ids.length<keys.length) throw new Error(`旧版报告只有 ${ids.length}/${keys.length} 个题目 ID`);
  const result=new Map(keys.map((key,index)=>[key,ids[index]]));
  return validateQuestionMap(result);
}

async function loadQuestionIdMap() {
  const params = currentExerciseParams();
  if (!params) throw new Error('当前页面不是练习解析页');
  const cacheKey = `${params.routecs}:${params.key}:${params.examcatid}`;
  if (questionIdMapCache.has(cacheKey)) return questionIdMapCache.get(cacheKey);
  const loading = (async()=>{
    const url = new URL('https://tiku.fenbi.com/combine/exercise/getSolution');
    for (const [key,value] of Object.entries({format:'html',key:params.key,routecs:params.routecs,kav:'125',av:'127',hav:'125',app:'web',apcid:'0',gav:'2'})) url.searchParams.set(key,value);
    if (params.examcatid) url.searchParams.set('examcatid',params.examcatid);
    const deviceId = localStorage.getItem('deviceSid');
    if (deviceId) url.searchParams.set('deviceId',deviceId);
    const solutionPayload = await requestJson(url.href);
    const solution = solutionPayload?.data ?? solutionPayload;
    return {map:await mapFromLegacyReport(solution,params),strategy:'fenbi-helper-report'};
  })();
  questionIdMapCache.set(cacheKey,loading);
  try { return await loading; } catch (error) { questionIdMapCache.delete(cacheKey); throw error; }
}

async function resolveQuestionId(questionKey) {
  const resolved=await loadQuestionIdMap();
  return {id:resolved.map.get(questionKey)??null,strategy:resolved.strategy};
}

function findEpisodeId(value,seen=new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) { const id=findEpisodeId(item,seen); if (id) return id; }
    return null;
  }
  if ((typeof value.id === 'number' || typeof value.id === 'string') && value.id) return value.id;
  for (const child of Object.values(value)) { const id=findEpisodeId(child,seen); if (id) return id; }
  return null;
}

async function getEpisodeId(questionId) {
  const url = new URL('https://ke.fenbi.com/api/gwy/v3/episodes/tiku_episodes_with_multi_type');
  for (const [key,value] of Object.entries({tiku_ids:String(questionId),tiku_prefix:'xingce',tiku_type:'5'})) url.searchParams.set(key,value);
  const payload = await requestJson(url.href);
  return findEpisodeId(payload?.data?.[questionId] ?? payload?.data?.[String(questionId)]);
}

async function getComments(episodeId) {
  const requests = Array.from({length:MAX_PAGES},(_,index)=>{
    const url = new URL(`https://ke.fenbi.com/ipad/gwy/v3/comments/episodes/${episodeId}`);
    for (const [key,value] of Object.entries({system:'12.4.7',inhouse:'0',app:'gwy',ua:'iPad',av:'44',version:'6.11.3',len:String(PAGE_SIZE),start:String(index*PAGE_SIZE)})) url.searchParams.set(key,value);
    url.searchParams.append('kav','22'); url.searchParams.append('kav','1');
    return requestJson(url.href);
  });
  const settled = await Promise.allSettled(requests);
  const payloads = settled.filter(item=>item.status==='fulfilled').map(item=>item.value);
  if (!payloads.length) throw settled[0]?.reason ?? new Error('评论请求失败');
  const byId = new Map();
  for (const payload of payloads) {
    const comments = payload?.datas ?? payload?.data?.datas ?? payload?.data ?? [];
    if (!Array.isArray(comments)) continue;
    for (const comment of comments) byId.set(comment.id ?? `${comment.createdTime??''}:${comment.comment??''}`,comment);
  }
  return [...byId.values()].sort((a,b)=>(b.likeCount??0)-(a.likeCount??0));
}

function formatTime(value) {
  if (!value) return '';
  const normalized = typeof value==='number' && value<1e12 ? value*1000 : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN',{hour12:false});
}

function renderComments(panel,comments) {
  const status=panel.querySelector('.fcp-comments__status'), list=panel.querySelector('.fcp-comments__list'), count=panel.querySelector('.fcp-comments__count');
  list.replaceChildren(); count.textContent=comments.length?`（${comments.length} 条）`:'';
  if (!comments.length) { status.hidden=false; status.textContent='暂时没有获取到题友评论。'; return; }
  status.hidden=true;
  for (const item of comments) {
    const row=document.createElement('li'); row.className='fcp-comment';
    const text=document.createElement('p'); text.className='fcp-comment__text'; text.textContent=item.comment||item.content||'（空评论）'; row.appendChild(text);
    const values=[
      {value:item.user?.nickname||item.userInfo?.nickname||item.nickname||''},
      {value:item.likeCount!==undefined?`赞 ${item.likeCount}`:''},
      {value:item.fiveGradeScore?`评分 ${item.fiveGradeScore}`:'',className:'fcp-comment__rating'},
      {value:formatTime(item.createdTime)},
    ].filter(item=>item.value);
    if (values.length) { const meta=document.createElement('div'); meta.className='fcp-comment__meta'; for (const item of values) { const span=document.createElement('span'); span.textContent=item.value; if(item.className) span.className=item.className; meta.appendChild(span); } row.appendChild(meta); }
    list.appendChild(row);
  }
}

async function loadPanel(panel,questionKey) {
  if (panel.dataset.loading==='true') return;
  panel.dataset.loading='true';
  const status=panel.querySelector('.fcp-comments__status'), retry=panel.querySelector('.fcp-comments__action');
  retry.hidden=true; status.hidden=false; status.textContent='正在加载题友评论…';
  try {
    const resolved=await resolveQuestionId(questionKey);
    panel.dataset.fcpStrategy=resolved.strategy;
    if (!resolved.id) throw new Error('练习数据中找不到当前题目的数字 ID');
    const episodeId=await getEpisodeId(resolved.id);
    if (!episodeId) throw new Error('该题暂未关联评论数据');
    renderComments(panel,await getComments(episodeId));
  } catch (error) {
    status.hidden=false;
    status.textContent=`评论加载失败：${error.message}`;
    retry.hidden=false;
    const body=panel.querySelector('.fcp-comments__body');
    const toggle=panel.querySelector('.fcp-comments__toggle');
    body.hidden=false;
    toggle.textContent='收起';
  }
  finally { panel.dataset.loading='false'; }
}

function createPanel(questionKey) {
  const panel=document.createElement('section'); panel.className='fcp-comments'; panel.setAttribute(PANEL_ATTR,questionKey); panel.dataset.fcpSource='chrome-extension';
  const heading=document.createElement('div'); heading.className='fcp-comments__heading';
  const title=document.createElement('span'); title.className='fcp-comments__title'; title.append('题友评论'); const count=document.createElement('span'); count.className='fcp-comments__count'; title.appendChild(count);
  const actions=document.createElement('div'); actions.className='fcp-comments__actions';
  const toggle=document.createElement('button'); toggle.type='button'; toggle.className='fcp-comments__action fcp-comments__toggle'; toggle.textContent='收起';
  const retry=document.createElement('button'); retry.type='button'; retry.className='fcp-comments__action'; retry.textContent='重试'; retry.hidden=true; retry.addEventListener('click',()=>loadPanel(panel,questionKey));
  actions.append(retry,toggle); heading.append(title,actions);
  const body=document.createElement('div'); body.className='fcp-comments__body'; body.hidden=false;
  const status=document.createElement('div'); status.className='fcp-comments__status'; status.textContent='正在加载题友评论…'; const list=document.createElement('ol'); list.className='fcp-comments__list'; body.append(status,list); panel.append(heading,body);
  toggle.addEventListener('click',()=>{ body.hidden=!body.hidden; toggle.textContent=body.hidden?'展开':'收起'; });
  return panel;
}

function enhanceQuestions() {
  if (!isCommentEnhancementPage() || !settings.fenbiEnabled || !settings.commentsEnabled) return;
  for (const question of document.querySelectorAll('app-ti[data-question-key]')) {
    const questionKey=question.getAttribute('data-question-key');
    if (!questionKey || question.querySelector(`[${PANEL_ATTR}]`)) continue;
    const panel=createPanel(questionKey); const anchor=question.querySelector('[id^="section-note-"]')||question.querySelector('[id^="section-source-"]')||question.lastElementChild;
    if (anchor) anchor.insertAdjacentElement('afterend',panel); else question.appendChild(panel); loadPanel(panel,questionKey);
  }
}

function applyVideoVisibility() {
  if (!isFenbiPage()) return;
  document.querySelectorAll('[id^="section-video-"], .solution-video-container, .video-container').forEach(element=>element.classList.toggle('fcp-hide-video',settings.fenbiEnabled && settings.hideVideo));
}

function applyMonochrome() {
  const active = Boolean(isFenbiPage() && settings.fenbiEnabled && settings.monochrome);
  const root = document.documentElement;

  // 第一层：粉笔全站共享黑白基线。
  root.classList.toggle('kakaoracle-monochrome', active);

  // 第二层：粉笔不同 SPA 路由的局部补丁。新增路由时只在这里登记，
  // 不改变共享开关，也不影响其他网站。
  root.classList.toggle(
    'kakaoracle-fenbi-guide-monochrome',
    active && location.pathname.startsWith('/spa/tiku/guide/')
  );
  root.dataset.kakaoracleMonochrome = active ? 'on' : 'off';
}

function applyCsdnBeautify() {
  document.documentElement.classList.toggle('kakaoracle-csdn-beautify', Boolean(isCsdnPage() && settings.csdnEnabled && settings.csdnBeautify));
  document.documentElement.classList.toggle('kakaoracle-csdn-monochrome', Boolean(isCsdnPage() && settings.csdnEnabled && settings.csdnMonochrome));
  if (isCsdnPage()) document.documentElement.dataset.csdnPosition=['left','center','right'].includes(settings.csdnPosition)?settings.csdnPosition:'center';
}

function applyZhihuSettings() {
  const active=isZhihuPage() && settings.zhihuEnabled;
  document.documentElement.classList.toggle('kakaoracle-zhihu-comments-only', Boolean(active && settings.zhihuComments));
  document.documentElement.classList.toggle('kakaoracle-zhihu-monochrome', Boolean(active && settings.zhihuMonochrome));
}

function applyCommonMonochrome() {
  document.documentElement.classList.toggle('kakaoracle-common-monochrome', Boolean(isGenericTarget() && settings.commonEnabled && settings.commonMonochrome));
}

function applyAllFeatures() {
  // 无视觉副作用的运行标记：用于确认内容脚本已在粉笔页面执行。
  document.documentElement.dataset.kakaoracleFenbiRuntime = isFenbiPage() ? 'ready' : '';
  applyVideoVisibility();
  applyMonochrome();
  applyCsdnBeautify();
  applyZhihuSettings();
  applyCommonMonochrome();
}

let scheduled=false;
new MutationObserver(()=>{
  if (scheduled) return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    enhanceQuestions();
    // Angular 会在首屏之后异步插入解析视频，不能只在初始化时处理一次。
    applyAllFeatures();
  });
}).observe(document.body,{childList:true,subtree:true});

function removePanels() {
  document.querySelectorAll('.fcp-comments[data-fcp-source="chrome-extension"]').forEach(panel=>panel.remove());
}

chrome.storage.sync.get(settings,result=>{
  settings={...settings,...result};
  if (settings.fenbiEnabled && settings.commentsEnabled) enhanceQuestions();
  applyAllFeatures();
});

chrome.storage.onChanged.addListener((changes,areaName)=>{
  if (areaName!=='sync') return;
  for (const key of ['fenbiEnabled','commentsEnabled','hideVideo','monochrome','csdnEnabled','csdnBeautify','csdnMonochrome','csdnPosition','zhihuEnabled','zhihuComments','zhihuMonochrome','commonEnabled','commonMonochrome']) {
    if (changes[key]) settings[key]=changes[key].newValue;
  }
  if (!settings.fenbiEnabled || !settings.commentsEnabled) removePanels(); else enhanceQuestions();
  applyAllFeatures();
});
