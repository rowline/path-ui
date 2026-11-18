// motion-probe.js：把刚触发的动画「定格」逐点取样，核对冲过头、回落、停稳的时刻和幅度。
// 用法：在内置浏览器的 javascript_tool（或 DevTools 控制台）里粘进本文件执行，然后：
//
//   const rows = await PathProbe.scrub('.pk-menu-item', () => document.querySelector('.pk-menu-toggle').click(),
//                                      { ms: 400, step: 20, origin: '.pk-menu-toggle' });
//   PathProbe.peaks(rows)   // 每个元素：最远半径和时刻、最终半径、冲过头多少、最大自转、停稳时刻
//
// 原理：记下触发前已有的动画，触发后把新出现的 Web Animations（element.animate、CSS 动画和过渡都算）
// 全部暂停，按时间点设 currentTime，读位置和样式，读完放行。不受页面是否在前台、帧率高低影响。
// 用 requestAnimationFrame 手写的动画暂停不了，scrub 会返回 error，改用 PathProbe.watch 按帧实时采样。
// 旋转从矩阵里拆，只能读出 -180°～180°：转了大半圈的会绕回来，看 maxRot 时记得这一点。
// 内置浏览器面板收起时页面时间轴不走：scrub 照样能用；要测「关上以后」先调 PathProbe.flush()。
// 拿到数字后对照 references/motion-spec.md 的表：时长、冲过头的距离、自转角度、错开间隔。
// 点击区：PathProbe.hitAreas() 列出实际能点到的范围不到 44px 的元素（含 ::before 撑大的部分）。
// 开和关都要量。peaks 里的 startJump 是「触发前一刻」和「动画第 0 帧」的差：不为 0 就是一开始先跳了一下
// （常见原因：带 delay 的动画用了 fill: 'forwards'，等待期间回到了原样；或者没从当前位置接着走）。
window.PathProbe = {
  // 2D 矩阵拆成旋转和缩放（只看 2D；3D 变换取 a b 分量近似）
  decompose(tf) {
    if (!tf || tf === 'none') return { rot: 0, scale: 1 };
    const v = tf.match(/matrix(?:3d)?\(([^)]+)\)/)[1].split(',').map(Number);
    const [a, b] = v;
    return { rot: +(Math.atan2(b, a) * 180 / Math.PI).toFixed(1), scale: +Math.hypot(a, b).toFixed(3) };
  },
  read(el, origin) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const out = { ...this.decompose(cs.transform), opacity: +(+cs.opacity).toFixed(2), visible: r.width > 0 && r.height > 0 };
    const o = origin ? origin.getBoundingClientRect() : null;
    const x = r.left + r.width / 2 - (o ? o.left + o.width / 2 : 0);
    const y = r.top + r.height / 2 - (o ? o.top + o.height / 2 : 0);
    // 角度和 motion-spec 一致：0° 正上方，顺时针为正
    return { ...out, x: +x.toFixed(1), y: +y.toFixed(1), r: +Math.hypot(x, y).toFixed(1), angle: +(Math.atan2(x, -y) * 180 / Math.PI).toFixed(1) };
  },
  async scrub(selector, trigger, { ms = 600, step = 16, origin = null } = {}) {
    const before = new Set(document.getAnimations());
    const els = [...document.querySelectorAll(selector)];
    const o = typeof origin === 'string' ? document.querySelector(origin) : origin;
    const prior = els.map((el) => this.read(el, o)); // 触发前一刻的样子，用来查第 0 帧有没有跳
    await trigger?.();
    const anims = document.getAnimations().filter((a) => !before.has(a));
    if (!anims.length) return { error: '触发后没有新的 Web Animations；如果是 requestAnimationFrame 写的，用 PathProbe.watch。' };
    anims.forEach((a) => a.pause());
    const rows = [];
    for (let t = 0; t <= ms; t += step) {
      anims.forEach((a) => { a.currentTime = t; });
      rows.push({ t, items: els.map((el) => this.read(el, o)) });
    }
    const longest = Math.max(...anims.map((a) => a.effect.getComputedTiming().endTime));
    // 读完直接跳到结尾：页面在后台时时间轴不走，放着不管 finished 永远不触发，组件状态会卡在「展开中」
    anims.forEach((a) => { try { a.finish(); } catch { a.play(); } });
    await new Promise((r) => setTimeout(r, 0));
    return Object.assign(rows, { animations: anims.length, endTime: longest, prior });
  },
  // 把页面上所有正在跑的动画跳到结尾（后台标签里测「关上以后」的状态时用）
  async flush() {
    document.getAnimations().forEach((a) => { try { a.finish(); } catch { /* 无限循环的动画没有结尾 */ } });
    await new Promise((r) => setTimeout(r, 0));
  },
  // 实时按帧采样（页面在后台时浏览器会降帧，数字只作参考）
  async watch(selector, trigger, { ms = 600, origin = null } = {}) {
    const els = [...document.querySelectorAll(selector)];
    const o = typeof origin === 'string' ? document.querySelector(origin) : origin;
    const rows = [];
    const t0 = performance.now();
    await trigger?.();
    await new Promise((done) => {
      const tick = (now) => {
        rows.push({ t: Math.round(now - t0), items: els.map((el) => this.read(el, o)) });
        if (now - t0 < ms) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
    return rows;
  },
  peaks(rows) {
    if (rows.error) return rows;
    const n = rows[0].items.length;
    return Array.from({ length: n }, (_, i) => {
      const s = rows.map((row) => ({ t: row.t, ...row.items[i] }));
      const end = s[s.length - 1];
      const far = s.reduce((m, p) => (p.r > m.r ? p : m), s[0]);
      const spin = s.reduce((m, p) => (Math.abs(p.rot) > Math.abs(m.rot) ? p : m), s[0]);
      const big = s.reduce((m, p) => (p.scale > m.scale ? p : m), s[0]);
      let settle = end.t;
      for (let j = s.length - 1; j >= 0; j--) {
        const p = s[j];
        if (Math.abs(p.r - end.r) > 1 || Math.abs(p.rot - end.rot) > 1 || Math.abs(p.scale - end.scale) > 0.01) break;
        settle = p.t;
      }
      // 触发前不可见（尺寸为 0）的元素是「冒出来」的，第 0 帧本来就和之前不一样，不算跳
      const p0 = rows.prior?.[i];
      const startJump = !p0 || !p0.visible ? null : {
        px: +Math.max(Math.abs(s[0].x - p0.x), Math.abs(s[0].y - p0.y)).toFixed(1),
        deg: +Math.abs(s[0].rot - p0.rot).toFixed(1),
        scale: +Math.abs(s[0].scale - p0.scale).toFixed(3),
        opacity: +Math.abs(s[0].opacity - p0.opacity).toFixed(2),
      };
      return {
        item: i, finalR: end.r, finalAngle: end.angle, farR: far.r, farAt: far.t, overshoot: +(far.r - end.r).toFixed(1),
        maxRot: spin.rot, maxRotAt: spin.t, maxScale: big.scale, finalRot: end.rot, settleAt: settle, startJump,
      };
    });
  },
  table(rows, field = 'r') {
    const t = rows.map((row) => Object.fromEntries([['t', row.t], ...row.items.map((it, i) => [`#${i}`, it[field]])]));
    console.table(t);
    return t;
  },
  // 量点击区（规则 14）：从每个可点元素的中心往四个方向一像素一像素地问「这里点下去会落到谁身上」，
  // 量出实际能点到的宽和高。::before 撑大的点击区也算在内，被别的东西盖住的部分不算。
  // 只量视口里看得见的元素；返回不到 min 的那些（按像素取样，留 1px 误差），以及中心就被盖住的（covered）。
  // covered 常见的是滚到固定底栏下面的那几行，那是正常的；一直被盖着、怎么滚都点不到的才是问题。
  hitAreas({ min = 44, root = document, selector = 'button, a[href], input, select, textarea, summary, [role="button"], [role="switch"], [role="checkbox"], [role="menuitem"], [role="tab"], [tabindex]:not([tabindex="-1"])' } = {}) {
    const name = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList.length ? '.' + [...el.classList].join('.') : ''} ${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}`.trim();
    const out = [];
    for (const el of root.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === 'hidden' || cs.pointerEvents === 'none' || el.disabled) continue;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;
      const hits = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === el || el.contains(h)); };
      if (!hits(cx, cy)) { out.push({ el: name(el), covered: true }); continue; }
      const reach = (dx, dy) => { let n = 0; while (n < 80 && hits(cx + dx * (n + 1), cy + dy * (n + 1))) n += 1; return n; };
      const w = reach(-1, 0) + reach(1, 0) + 1;
      const h = reach(0, -1) + reach(0, 1) + 1;
      if (w < min - 1 || h < min - 1) out.push({ el: name(el), hit: [w, h], visual: [Math.round(r.width), Math.round(r.height)] });
    }
    return out;
  },
};
