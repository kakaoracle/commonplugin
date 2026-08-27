'use strict';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'FCP_FETCH_JSON' || typeof message.url !== 'string') return false;

  (async () => {
    try {
      const target = new URL(message.url);
      const allowedHosts = new Set(['tiku.fenbi.com','ke.fenbi.com','keapi.fenbi.com']);
      if (target.protocol !== 'https:' || !allowedHosts.has(target.hostname)) {
        sendResponse({ ok: false, error: '不允许请求该接口地址' });
        return;
      }
      const response = await fetch(message.url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json, text/plain, */*' },
      });
      const text = await response.text();
      if (!response.ok) {
        sendResponse({ ok: false, error: `后台 HTTP ${response.status}（${target.hostname}${target.pathname}）` });
        return;
      }
      try {
        sendResponse({ ok: true, data: JSON.parse(text) });
      } catch {
        sendResponse({ ok: false, error: '接口返回的不是有效 JSON' });
      }
    } catch (error) {
      sendResponse({ ok: false, error: error?.message || '网络请求失败' });
    }
  })();

  return true;
});
