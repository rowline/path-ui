// frame-sheet.js：把 Path 拆解录屏的若干帧拼成一张网格，用来量动效。
// 用法：在内置浏览器里打开任意 https://web.archive.org/ 页面（同源，canvas 才读得了帧），
// 把本文件内容粘进去执行，然后：
//   await PathFrames.sheet('menu', 0, 0.4, 10, 5, 160, 0.55, 0.95)
// 参数：录屏名、起秒、止秒、帧数、列数、每帧宽(px)、上裁切比例、下裁切比例。
// 执行后页面换成网格图，截图即可；每帧左上角红字是时间。
window.PathFrames = {
  // Brian Lovin「App Dissection: Path」2016 的录屏（Cloudflare Stream id，经 Wayback 存档）
  ids: {
    login: 'c81296e9ee78119d7cc76bef93933517', // 登录弹窗
    onboard: 'e758b99041c3a46f98bbd5a65e7b33af', // 新手引导
    menu: '9790ed829908603dcdd591603765ae56', // 加号菜单
    walk: '80b165d66b6b486870e6645ad798291a', // 功能引导弹窗
    profile: 'ee6cb13ca87226b26cee6ccc7e55ce36', // 个人页滚动渐隐
    sticker: 'd3d2fbc65dcbb92bc5d37447fb1d6b4d', // 贴纸回应
    avatar: '79d504c94ad19f1a0fda94a9b1417e9e', // 点头像封面直接改
    buy: 'ca4a07f5129a153e84150a6cab5373f7', // 买贴纸
    map: '7524d3b9af3b61981e40eacb95986ae4', // 地图页指南针
    search: 'ad3a4d7157064ec154a5e8f40686003d', // 搜索
    loader: '97fe63da7c8a25d63338d798445f589c', // 加载指示
    star: '7ed2b833213d97a3f9f8813704ea858c', // 星标好友
    share: 'bedd32afc4b6573b60e3161df65dc08e', // 分享流程
    clock: 'a68b5778e48ef01859ed1adf9a1de024', // 滚动时钟
    end: '31865f07692a29fa5f28be139fc24cc7', // 信息流末尾
    pull: 'f5b8cc76ced63ae38d99e64a1b43c72a', // 下拉刷新
    site: '14ca15b47c1877ce80cdbd3968866e28', // 官网
  },
  // 2012 官网首页背景视频（Path 2，1920×1080，手机屏幕约在 x 745–1190、y 190–855）
  path2: '/web/20121222111150id_/https://s3.amazonaws.com/assets.path.com/v2_home/background.m4v',
  url(k) {
    if (k === 'path2') return location.origin + this.path2;
    return `${location.origin}/web/2022id_/https://videodelivery.net/${this.ids[k]}/downloads/default.mp4`;
  },
  async load(k) {
    const v = document.createElement('video');
    v.muted = true;
    v.preload = 'auto';
    v.src = this.url(k);
    await new Promise((ok, fail) => {
      v.onloadeddata = ok;
      v.onerror = () => fail(new Error(`加载失败：${k}`));
      setTimeout(() => fail(new Error(`超时：${k}`)), 25000);
    });
    return v;
  },
  async seek(v, t) {
    v.currentTime = t;
    await new Promise((ok) => { v.onseeked = ok; });
  },
  async sheet(k, t0, t1, n = 12, cols = 6, w = 120, cy0 = 0, cy1 = 1) {
    const v = await this.load(k);
    t1 = Math.min(t1, v.duration - 0.02);
    const W = v.videoWidth;
    const H = v.videoHeight;
    const sy = Math.round(H * cy0);
    const sh = Math.round(H * (cy1 - cy0));
    const fh = Math.round((sh * w) / W);
    const rows = Math.ceil(n / cols);
    const c = document.createElement('canvas');
    c.width = cols * w;
    c.height = rows * (fh + 14);
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.font = '11px sans-serif';
    for (let i = 0; i < n; i++) {
      const t = t0 + ((t1 - t0) * i) / Math.max(1, n - 1);
      await this.seek(v, t);
      const x = (i % cols) * w;
      const y = Math.floor(i / cols) * (fh + 14);
      g.drawImage(v, 0, sy, W, sh, x, y + 14, w, fh);
      g.fillStyle = '#c00';
      g.fillText(`${t.toFixed(3)}s`, x + 3, y + 11);
    }
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    const img = new Image();
    img.src = c.toDataURL('image/jpeg', 0.9);
    img.style.display = 'block';
    document.body.appendChild(img);
    return { duration: v.duration, size: [W, H], frame: [w, fh], rows };
  },
  // 取某一帧某一点附近最饱和的颜色，用来核对色值
  async color(k, t, x, y, r = 4) {
    const v = await this.load(k);
    await this.seek(v, t);
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(v, 0, 0);
    const d = g.getImageData(x - r, y - r, 2 * r + 1, 2 * r + 1).data;
    let best = [0, 0, 0];
    let bs = -1;
    for (let i = 0; i < d.length; i += 4) {
      const mx = Math.max(d[i], d[i + 1], d[i + 2]);
      const s = mx ? (mx - Math.min(d[i], d[i + 1], d[i + 2])) / mx : 0;
      if (s > bs) { bs = s; best = [d[i], d[i + 1], d[i + 2]]; }
    }
    return `#${best.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  },
};
