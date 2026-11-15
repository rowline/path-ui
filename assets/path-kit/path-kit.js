// path-kit.js：复刻 Path 交互效果的参考实现（原生 JS + Web Animations API，零依赖）。
// 每个数字的出处见 ../../references/motion-spec.md，改数字先改那张表，再改这里的 motion。
// 每个工厂函数都返回 { destroy }，React 里在 useEffect 的清理函数里调用。

// ---------------------------------------------------------------------------
// 动效常量：唯一出处。注释里的 [码] 来自开源复刻代码，[测] 来自录屏逐帧实测，[估] 是估计。
// ---------------------------------------------------------------------------
export const motion = {
  ease: {
    in: 'cubic-bezier(.42,0,1,1)', // [码] CAMediaTimingFunction EaseIn
    out: 'cubic-bezier(0,0,.58,1)',
    inOut: 'cubic-bezier(.42,0,.58,1)', // [码] UIView 默认曲线
    fall: 'cubic-bezier(.55,0,1,.45)', // [估] 摔出去：越落越快
    land: 'cubic-bezier(.2,.9,.3,1)', // [估] 掉进来：快到慢
  },
  menu: {
    // Path 2：加号在左下角，图标沿四分之一圆弹出。[码] AwesomeMenu
    // 路径：far 冲过头、near 回落（在 openAt 两个时刻）；spin × spinAt 是边飞边转。收回时先往外退 closeFar（在 closeAt），再回到加号。
    corner: {
      arc: [0, 90], radius: 120, near: -10, far: 20, closeFar: 20,
      openAt: [1 / 3, 2 / 3], spin: 180, spinAt: [[0, 1], [0.3, 1], [0.4, 0], [1, 0]],
      closeAt: 0.5, closeSpin: 360, closeSpinAt: [[0, 0], [0.4, 1], [0.5, 0], [1, 0]],
      openMs: 500, closeMs: 500, staggerMs: 36, easing: 'cubic-bezier(.42,0,1,1)',
      buttonTurn: -45, buttonMs: 300, buttonBackMs: 300, buttonBackDelay: 0,
      scrim: 0, scrimInMs: 0, scrimOutMs: 0, // 素材里没看到 Path 2 菜单压暗
      pickMs: 500, pickScale: 3, restScale: 0.01, restMs: 500,
    },
    // Path 4：加号在底栏正中，图标沿 120° 的上半弧弹出。[测] 张角、间隔、压暗；[码] DCPathButton 其余
    // spacing：相邻两个图标隔 30°；图标少于 5 个时往正中收，多于 5 个时在 120° 里摊开并加大半径 [估]
    center: {
      arc: [-60, 60], spacing: 30, radius: 120, near: -5, far: 10, closeFar: 5,
      // 码里自转是 0→-360°，同向但改成落在 0，强度 <1 时才不会停歪
      openAt: [0.5, 0.7], spin: 360, spinAt: [[0, 1], [0.3, 0.5], [0.6, 0.25], [1, 0]],
      closeAt: 0.75, closeSpin: 360, closeSpinAt: [[0, 0], [0.5, 0.5], [1, 1]],
      openMs: 300, closeMs: 350, staggerMs: 0, easing: 'linear',
      buttonTurn: -135, buttonMs: 157, buttonBackMs: 185, buttonBackDelay: 124,
      scrim: 0.6, scrimInMs: 185, scrimOutMs: 100,
      pickMs: 309, pickScale: 3, restScale: 0, restMs: 124,
    },
  },
  clock: { showMs: 200, hideDelayMs: 1000, hideMs: 300, handsMs: 300, pad: 6 }, // [码] TimeScroller
  reaction: { inMs: 200, fromScale: 0.92, faceMs: 250, faceStaggerMs: 30, overshoot: 0.15, outMs: 150 }, // [测] 200ms 淡入；其余 [估]
  modal: { inMs: 360, outMs: 300, scrim: 0.72, scrimMs: 250, swing: [-4, 3, -1, 0], fallTilt: 8 }, // [测]
  star: { onMs: 320, offMs: 220, overshoot: 0.35 }, // [估]
  loader: { stepMs: 170 }, // [测]
  cover: { parallax: 0.5, fadeEnd: 0.6, compactFrom: 0.7 }, // [估]
  pull: { resistance: 0.8, threshold: 64, max: 150, backMs: 300 }, // [估] 手指拖约 150px 过阈值
};

// ---------------------------------------------------------------------------
// 强度与「减少动效」
// ---------------------------------------------------------------------------
let intensity = 1;
/**
 * 1 = 照 Path 原样；0.4 左右 = 克制；0 = 只剩位移和淡入淡出。
 * 强度缩放的是「幅度」：冲过头、自转、摆动、摔出时的歪斜、选中时的放大、冒出来的弹跳。
 * 不缩放时长、位移距离和加号转成叉的角度：这些决定东西从哪来、到哪去，减了就看不懂了。
 * 压暗深浅不归强度管，用各组件的 scrim 参数单独调。
 */
export function setIntensity(k) { intensity = Math.max(0, Math.min(1, Number(k) || 0)); }
export function getIntensity() { return reduced() ? 0 : intensity; }
function reduced() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
const dur = (ms) => (reduced() ? Math.min(ms, 120) : ms);
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

// 把几条按时间点给的数值轨道合成 WAAPI 关键帧（轨道之间线性插值，偏移取并集）。
function sample(track, t) {
  if (t <= track[0][0]) return track[0][1];
  for (let i = 1; i < track.length; i++) {
    const [t1, v1] = track[i];
    if (t <= t1) {
      const [t0, v0] = track[i - 1];
      return t1 === t0 ? v1 : v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return track[track.length - 1][1];
}
function frames(tracks, toFrame) {
  const offsets = [...new Set(Object.values(tracks).flatMap((tr) => tr.map((p) => p[0])))].sort((a, b) => a - b);
  return offsets.map((offset) => {
    const v = {};
    for (const k in tracks) v[k] = sample(tracks[k], offset);
    return { offset, ...toFrame(v) };
  });
}
function cancelAll(el) { el.getAnimations().forEach((a) => a.cancel()); }
const finished = (anims) => Promise.all(anims.map((a) => a.finished.catch(() => {})));
const centerOf = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
// 此刻的位移和角度（从 computed transform 里拆，动画跑到一半也读得到）
function shiftOf(el) {
  const tf = getComputedStyle(el).transform;
  if (!tf || tf === 'none') return { x: 0, y: 0, rot: 0 };
  const m = new DOMMatrixReadOnly(tf);
  return { x: m.e, y: m.f, rot: (Math.atan2(m.b, m.a) * 180) / Math.PI };
}

// ---------------------------------------------------------------------------
// 0. 零件：下面的组件都由这几种动作拼成，Path 没有的东西也用它们拼。
//    该用哪一种，见 references/essence.md 的「规则」和「动作分五级」。
//    幅度参数（over、back、windup、spin、peak、dip、swing、tilt）自动乘强度；遇到「减少动效」时长压到 120ms 以内。
//    都返回 Animation（掉落和摔出返回位移那一段），要等它结束就 await anim.finished。
// ---------------------------------------------------------------------------
/**
 * 沿直线飞。from、to 是相对元素自身位置的偏移（px），[0, 0] 就是它本来该在的地方。
 * 路上可以先往反方向退一下（windup，在 windupAt 时刻），冲过终点（over，在 at[0]）再回落（back，在 at[1]），
 * 边飞边转（spin 度 × spinAt 曲线；rotFrom 是起始角，线性归零）。发布菜单的图标就是它。
 */
export function fly(el, opts = {}) {
  const o = {
    from: [0, 0], to: [0, 0], over: 0, back: 0, at: [0.5, 0.7], windup: 0, windupAt: 0.75,
    spin: 0, spinAt: [[0, 1], [1, 0]], rotFrom: 0, scale: [1, 1], fade: null,
    ms: 300, delay: 0, easing: 'linear', fill: 'both', ...opts,
  };
  const k = getIntensity();
  const [fx, fy] = o.from;
  const dx = o.to[0] - fx;
  const dy = o.to[1] - fy;
  const D = Math.hypot(dx, dy);
  const ux = D ? dx / D : 0;
  const uy = D ? dy / D : 0;
  const s = [[0, 0], [1, D]];
  if (o.windup) s.push([o.windupAt, -o.windup * k]);
  if (o.over) s.push([o.at[0], D + o.over * k]);
  if (o.back) s.push([o.at[1], D - o.back * k]);
  s.sort((a, b) => a[0] - b[0]);
  const tracks = { s, rot: o.spinAt.map(([t, f]) => [t, f * o.spin * k]), sc: [[0, o.scale[0]], [1, o.scale[1]]] };
  if (o.rotFrom) tracks.r0 = [[0, o.rotFrom], [1, 0]];
  if (o.fade) tracks.op = o.fade;
  return el.animate(frames(tracks, (v) => ({
    transform: `translate(${(fx + ux * v.s).toFixed(2)}px, ${(fy + uy * v.s).toFixed(2)}px) rotate(${(v.rot + (v.r0 || 0)).toFixed(1)}deg) scale(${+v.sc.toFixed(3)})`,
    ...(o.fade ? { opacity: +v.op.toFixed(3) } : {}),
  })), { duration: dur(o.ms), delay: dur(o.delay), easing: o.easing, fill: o.fill });
}

/** 新东西从 source（叫出它的按钮）飞到自己的位置：先把元素放进页面再调用。默认冲过一点、不转，节奏同 Path 4 菜单。 */
export function flyFrom(el, source, opts = {}) {
  cancelAll(el);
  const [sx, sy] = centerOf(source);
  const [ex, ey] = centerOf(el);
  return fly(el, { over: 6, back: 3, scale: [0.4, 1], fade: [[0, 0], [0.2, 1], [1, 1]], ...opts, from: [sx - ex, sy - ey], to: [0, 0] });
}

/** 东西飞向 target（它要去的地方，如「已归档」），先往反方向退一下再加速过去，越飞越小、最后淡掉。结束后由调用方移除元素。 */
export function flyTo(el, target, opts = {}) {
  const now = shiftOf(el); // 从此刻的位置出发（比如手指拖到一半）
  const [tx, ty] = centerOf(target);
  const [cx, cy] = centerOf(el);
  const home = [cx - now.x, cy - now.y];
  cancelAll(el);
  return fly(el, {
    windup: 8, windupAt: 0.25, scale: [1, 0.3], fade: [[0, 1], [0.6, 1], [1, 0]], ms: 320, easing: motion.ease.in, fill: 'forwards',
    ...opts, from: [now.x, now.y], to: [tx - home[0], ty - home[1]], rotFrom: now.rot,
  });
}

/** 从 anchor（叫出它的按钮）那边长出来：淡入，从 fromScale 放大到 1，放大原点对准 anchor 中心。anchor 传 null 就用元素自己的 transform-origin。 */
export function growFrom(el, anchor, opts = {}) {
  const o = { fromScale: 0.92, ms: 200, delay: 0, easing: motion.ease.out, ...opts };
  if (anchor) aimAt(el, anchor);
  return el.animate([{ opacity: 0, transform: `scale(${o.fromScale})` }, { opacity: 1, transform: 'scale(1)' }], { duration: dur(o.ms), delay: dur(o.delay), easing: o.easing, fill: 'both' });
}

/** 收回去：从此刻的样子接着淡出、缩小（打开到一半就关也不跳）。anchor 同 growFrom，已经对准过就不用再传。 */
export function shrinkTo(el, anchor, opts = {}) {
  const o = { toScale: 0.96, ms: 150, easing: motion.ease.in, ...opts };
  if (anchor && !el.style.transformOrigin) aimAt(el, anchor);
  const cs = getComputedStyle(el);
  const from = { opacity: cs.opacity, transform: cs.transform === 'none' ? 'scale(1)' : cs.transform };
  cancelAll(el);
  return el.animate([from, { opacity: 0, transform: `scale(${o.toScale})` }], { duration: dur(o.ms), easing: o.easing, fill: 'forwards' });
}
function aimAt(el, anchor) {
  const r = el.getBoundingClientRect();
  const [ax, ay] = centerOf(anchor);
  el.style.transformOrigin = `${(ax - r.left).toFixed(1)}px ${(ay - r.top).toFixed(1)}px`;
}

/**
 * 冒一下。from = 0：从无到有（新出现的小东西，默认带淡入）；from = 1：已经在的东西鼓一下（状态变了）。
 * peak 冲大多少（0.2 = 冲到 1.2 倍），dip 回缩多少（星标点亮时 0.1），at 冲到最大的时刻。
 */
export function pop(el, opts = {}) {
  const o = { from: 0, peak: 0.2, dip: 0, at: null, ms: 250, delay: 0, easing: motion.ease.out, fill: 'both', ...opts };
  const fade = opts.fade ?? o.from === 0;
  const k = getIntensity();
  const at = o.at ?? (o.from >= 1 ? 0.35 : o.dip ? 0.45 : 0.6);
  const pts = [[0, o.from], [at, 1 + o.peak * k]];
  if (o.dip) pts.push([0.75, 1 - o.dip * k]);
  pts.push([1, 1]);
  return el.animate(pts.map(([offset, sc]) => ({ offset, transform: `scale(${+sc.toFixed(3)})`, ...(fade ? { opacity: offset === 0 ? 0 : 1 } : {}) })), {
    duration: dur(o.ms), delay: dur(o.delay), easing: o.easing, fill: o.fill,
  });
}

/** 淡入，可带一点位移（from: [dx, dy]，从那里滑回原位）。从此刻的透明度接着走；本来就看得见时不再滑。 */
export function fadeIn(el, opts = {}) {
  const o = { from: [0, 0], ms: 200, delay: 0, easing: motion.ease.out, fill: 'forwards', ...opts };
  const op = parseFloat(getComputedStyle(el).opacity);
  cancelAll(el);
  const [x, y] = o.from;
  const slide = (x || y) && op < 0.05;
  return el.animate(
    [{ opacity: op, ...(slide ? { transform: `translate(${x}px, ${y}px)` } : {}) }, { opacity: 1, ...(slide ? { transform: 'translate(0px, 0px)' } : {}) }],
    { duration: dur(o.ms), delay: dur(o.delay), easing: o.easing, fill: o.fill },
  );
}

/** 淡出，从此刻的透明度接着走。 */
export function fadeOut(el, opts = {}) {
  const o = { ms: 300, delay: 0, easing: motion.ease.inOut, fill: 'forwards', ...opts };
  const op = parseFloat(getComputedStyle(el).opacity);
  cancelAll(el);
  return el.animate([{ opacity: op }, { opacity: 0 }], { duration: dur(o.ms), delay: dur(o.delay), easing: o.easing, fill: o.fill });
}

/**
 * 从上方掉进来，像钟摆一样晃几下停住（Path 的弹窗）。
 * inner：负责摆动的内层元素（推荐：位移和摆动各用各的曲线）；不给就在同一个元素上叠加摆动。
 * height：从多高掉下来，默认刚好藏在屏幕上沿以外。
 */
export function dropIn(el, opts = {}) {
  const o = { inner: null, height: null, swing: motion.modal.swing, ms: motion.modal.inMs, ...opts };
  const k = getIntensity();
  const h = o.height ?? el.getBoundingClientRect().bottom + 8;
  cancelAll(el);
  if (o.inner) cancelAll(o.inner);
  const fall = el.animate([{ transform: `translateY(${-h}px)` }, { transform: 'translateY(0)' }], { duration: dur(o.ms), easing: motion.ease.land, fill: 'both' });
  const [r0, r1, r2, r3] = o.swing.map((d) => d * k);
  (o.inner || el).animate(
    [{ transform: `rotate(${r0}deg)`, offset: 0 }, { transform: `rotate(${r0}deg)`, offset: 0.25 }, { transform: `rotate(${r1}deg)`, offset: 0.55 }, { transform: `rotate(${r2}deg)`, offset: 0.8 }, { transform: `rotate(${r3}deg)`, offset: 1 }],
    { duration: dur(o.ms), easing: motion.ease.inOut, fill: 'both', composite: o.inner ? 'replace' : 'add' },
  );
  return fall;
}

/** 歪着摔出去，越落越快。从此刻的位置和角度接着走：还没落稳就被关掉，也不会先跳回原位。参数同 dropIn，tilt 是歪多少度。 */
export function fallOut(el, opts = {}) {
  const o = { inner: null, height: null, tilt: motion.modal.fallTilt, ms: motion.modal.outMs, ...opts };
  const k = getIntensity();
  const h = o.height ?? innerHeight - el.getBoundingClientRect().top + 8;
  const tilt = o.tilt * k;
  if (o.inner) {
    const cur = getComputedStyle(o.inner).transform;
    const curFall = getComputedStyle(el).transform;
    cancelAll(o.inner);
    cancelAll(el);
    o.inner.animate([{ transform: cur === 'none' ? 'rotate(0deg)' : cur }, { transform: `rotate(${tilt}deg)` }], { duration: dur(o.ms), easing: motion.ease.in, fill: 'forwards' });
    return el.animate([{ transform: curFall === 'none' ? 'translateY(0)' : curFall }, { transform: `translateY(${h}px)` }], { duration: dur(o.ms), easing: motion.ease.fall, fill: 'forwards' });
  }
  const cur = getComputedStyle(el).transform;
  cancelAll(el);
  return el.animate([{ transform: cur === 'none' ? 'translateY(0px) rotate(0deg)' : cur }, { transform: `translateY(${h}px) rotate(${tilt}deg)` }], { duration: dur(o.ms), easing: motion.ease.fall, fill: 'forwards' });
}

/** 转到 deg 度。from 不给就从此刻的角度接着转（转到一半又反向也不跳）。加号转成叉、时钟指针都是它。 */
export function turnTo(el, deg, opts = {}) {
  const o = { from: null, ms: 300, delay: 0, easing: motion.ease.inOut, fill: 'both', ...opts };
  const cur = o.from == null ? getComputedStyle(el).transform : `rotate(${o.from}deg)`;
  cancelAll(el);
  // fill: 'both'：带延迟时，等待期间也停在「此刻」的角度，不会先跳回去
  return el.animate([{ transform: cur === 'none' ? 'rotate(0deg)' : cur }, { transform: `rotate(${deg}deg)` }], { duration: dur(o.ms), delay: dur(o.delay), easing: o.easing, fill: o.fill });
}

/** 阻尼：手指拖了 d px，东西实际走多远。越拖越沉，最多走到 max。下拉刷新、滑动归档都用它。 */
export function rubber(d, { max = motion.pull.max, resistance = motion.pull.resistance } = {}) {
  const a = Math.abs(d);
  return Math.sign(d) * max * (1 - 1 / ((a * resistance) / max + 1));
}

// ---------------------------------------------------------------------------
// 1. 发布按钮（Chooser）：一个加号，图标沿弧线冲出去、弹回来、转着落位
// ---------------------------------------------------------------------------
/**
 * @param {HTMLElement} root 放加号的位置（自身 position: relative/absolute，大小随意）
 * @param {object} opts
 *   variant: 'center' | 'corner'
 *   items: [{ id, label, icon: '<svg…>', color }]，几个都行，间隔和半径会自己算
 *   side: 角落版加号在哪边：'auto'（默认，按加号在 host 的左半还是右半判断）| 'left' | 'right'
 *         左下角往右上方弹（0° → 90°），右下角镜像成往左上方弹（0° → -90°）
 *   host: 压暗层铺在哪个元素里（默认 document.body，用 fixed）
 *   config: 覆盖 motion.menu[variant] 里的任意字段，如 { arc: [-90, 0], scrim: 0.3 }
 *   onSelect(item): 被选中的图标放大消散后调用
 */
export function radialMenu(root, opts = {}) {
  const o = { variant: 'center', items: [], label: '发一条', host: document.body, side: 'auto', onSelect: () => {}, ...opts };
  const cfg = { ...motion.menu[o.variant], ...(o.config || {}) };
  const n = o.items.length;
  let angles = [];
  let R = cfg.radius;

  // 角度约定：0° 正上方，顺时针为正。每次展开时重算，加号挪了位置也对。
  function layout() {
    let [a0, a1] = cfg.arc;
    if (cfg.spacing && n > 1) {
      const span = Math.min(a1 - a0, cfg.spacing * (n - 1));
      const mid = (a0 + a1) / 2;
      a0 = mid - span / 2;
      a1 = mid + span / 2;
    }
    angles = o.items.map((_, i) => (n === 1 ? (a0 + a1) / 2 : a0 + ((a1 - a0) * i) / (n - 1)));
    if (o.variant === 'corner' && mirrored()) angles = angles.map((a) => -a);
    // 相邻两个圆心至少隔「直径 + 4px」，免得 44px 的点击区叠在一起点错；图标多了就把半径撑大。
    // Path 2 原版 6 个图标比 44px 小，半径 120 不叠；按 44px 算要撑到约 154。
    const size = parseFloat(getComputedStyle(root).getPropertyValue('--pk-item')) || 44;
    const gap = n > 1 ? Math.abs(angles[1] - angles[0]) : 180;
    R = Math.max(cfg.radius, Math.ceil((size + 4) / (2 * Math.sin((gap * Math.PI) / 360))));
  }
  function mirrored() {
    if (o.side !== 'auto') return o.side === 'right';
    const r = root.getBoundingClientRect();
    const h = o.host === document.body ? { left: 0, width: innerWidth } : o.host.getBoundingClientRect();
    return r.left + r.width / 2 > h.left + h.width / 2;
  }

  root.classList.add('pk-menu');
  root.dataset.variant = o.variant;
  const list = document.createElement('div');
  list.className = 'pk-menu-items';
  list.setAttribute('role', 'menu');
  list.setAttribute('aria-label', o.label);
  const itemEls = o.items.map((it) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pk-menu-item';
    b.setAttribute('role', 'menuitem');
    b.setAttribute('aria-label', it.label);
    b.title = it.label;
    b.tabIndex = -1;
    b.hidden = true;
    if (it.color) b.style.setProperty('--pk-item-color', it.color);
    b.innerHTML = it.icon || '';
    list.appendChild(b);
    return b;
  });
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'pk-menu-toggle';
  toggle.setAttribute('aria-haspopup', 'menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', o.label);
  toggle.innerHTML = '<span class="pk-plus" aria-hidden="true"></span>';
  root.append(list, toggle);

  const scrim = document.createElement('div');
  scrim.className = 'pk-scrim pk-menu-scrim';
  scrim.hidden = true;
  if (o.host === document.body) scrim.style.position = 'fixed';
  o.host.appendChild(scrim);

  let state = 'closed'; // closed | opening | open | closing
  const at = (a, r) => { const rad = (a * Math.PI) / 180; return [Math.sin(rad) * r, -Math.cos(rad) * r]; };
  const tf = (a, r, rot, s = 1) => { const [x, y] = at(a, r); return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(1)}deg) scale(${s})`; };

  // 收回时加号要等一会儿再转：turnTo 用 fill 'both'，等待期间停在「此刻」的角度，不会先跳回 + 再跳成 × 再转
  const turnButton = (deg, ms, delay = 0, easing = motion.ease.inOut) => turnTo(toggle.firstElementChild, deg, { ms, delay, easing });
  function fadeScrim(on) {
    if (!cfg.scrim) return null;
    scrim.hidden = false;
    const from = parseFloat(getComputedStyle(scrim).opacity); // 展开到一半就收，从当前深浅接着淡
    cancelAll(scrim);
    const a = scrim.animate(
      [{ opacity: from }, { opacity: on ? cfg.scrim : 0 }],
      { duration: dur(on ? cfg.scrimInMs : cfg.scrimOutMs), delay: on ? 0 : dur(cfg.closeMs), easing: 'linear', fill: 'both' },
    );
    if (!on) a.finished.then(() => { scrim.hidden = true; }).catch(() => {});
    return a;
  }

  async function open() {
    if (state !== 'closed') return;
    state = 'opening';
    layout();
    root.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    // 点外面（有压暗就是点压暗）和 Esc 都能收回；角落版没有压暗，也靠这个
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onKey);
    fadeScrim(true);
    turnButton(cfg.buttonTurn, cfg.buttonMs);
    const anims = itemEls.map((el, i) => {
      el.hidden = false;
      el.tabIndex = 0;
      cancelAll(el);
      return fly(el, {
        from: [0, 0], to: at(angles[i], R), over: cfg.far, back: -cfg.near, at: cfg.openAt, spin: cfg.spin, spinAt: cfg.spinAt,
        ms: cfg.openMs, delay: i * cfg.staggerMs, easing: cfg.easing,
      });
    });
    itemEls[0]?.focus({ preventScroll: true });
    await finished(anims);
    if (state === 'opening') state = 'open';
  }

  async function close(picked = -1) {
    if (state !== 'open' && state !== 'opening') return;
    state = 'closing';
    const k = getIntensity();
    document.removeEventListener('pointerdown', onOutside, true);
    document.removeEventListener('keydown', onKey);
    toggle.setAttribute('aria-expanded', 'false');
    turnButton(0, cfg.buttonBackMs, dur(picked >= 0 ? cfg.restMs : cfg.buttonBackDelay), motion.ease.in);
    fadeScrim(false);
    const anims = itemEls.map((el, i) => {
      el.tabIndex = -1;
      // 从此刻的位置和角度出发：展开到一半就收，或者还在飞的时候就点了，都不会先跳到终点
      const now = shiftOf(el);
      cancelAll(el);
      if (picked >= 0) {
        const chosen = i === picked;
        const grow = 1 + (cfg.pickScale - 1) * k;
        // 起点写成和终点同样的 translate/rotate/scale：缩到 0 的矩阵拆不开，用 matrix() 当起点会在一半时硬跳
        const from = `translate(${now.x.toFixed(2)}px, ${now.y.toFixed(2)}px) rotate(${now.rot.toFixed(1)}deg) scale(1)`;
        return el.animate(
          [{ transform: from, opacity: 1 }, { transform: tf(angles[i], R, 0, chosen ? grow : cfg.restScale), opacity: 0 }],
          { duration: dur(chosen ? cfg.pickMs : cfg.restMs), easing: motion.ease.out, fill: 'forwards' },
        );
      }
      const order = n - 1 - i; // 收回时倒着来
      return fly(el, {
        from: [now.x, now.y], to: [0, 0], rotFrom: now.rot, windup: cfg.closeFar, windupAt: cfg.closeAt, spin: cfg.closeSpin, spinAt: cfg.closeSpinAt,
        ms: cfg.closeMs, delay: order * cfg.staggerMs, easing: cfg.easing,
      });
    });
    await finished(anims);
    if (destroyed) return; // 收到一半被卸载：不再抢焦点，也不再回调 onSelect
    itemEls.forEach((el) => { el.hidden = true; cancelAll(el); });
    root.classList.remove('is-open');
    state = 'closed';
    // 焦点还在菜单里（或随图标隐藏掉回了 body）就交回加号；用户已经点到别处就不抢
    const f = document.activeElement;
    if (!f || f === document.body || root.contains(f)) toggle.focus({ preventScroll: true });
    if (picked >= 0) o.onSelect(o.items[picked]);
  }

  const onToggle = () => (state === 'closed' ? open() : close());
  const onItem = (e) => {
    const i = itemEls.indexOf(e.target.closest('.pk-menu-item'));
    if (i >= 0 && state !== 'closing') close(i);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    // ← → 按屏幕上从左到右的顺序走，Home / End 到两头；镜像以后也不会反
    const i = itemEls.indexOf(document.activeElement);
    if (i < 0 || state !== 'open') return;
    const order = angles.map((a, j) => [a, j]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
    const at = order.indexOf(i);
    const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    itemEls[order[(to + n) % n]].focus();
  };
  const onOutside = (e) => { if (!root.contains(e.target)) close(); };
  toggle.addEventListener('click', onToggle);
  list.addEventListener('click', onItem);
  let destroyed = false;

  return {
    open, close: () => close(), toggle: onToggle,
    destroy() {
      destroyed = true;
      toggle.removeEventListener('click', onToggle);
      list.removeEventListener('click', onItem);
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onKey);
      [list, toggle, scrim].forEach((el) => { el.getAnimations({ subtree: true }).forEach((a) => a.cancel()); el.remove(); });
      root.classList.remove('pk-menu', 'is-open');
    },
  };
}

// ---------------------------------------------------------------------------
// 2. 滚动时钟：贴着滚动条的黑色标签，指针转到正下方那条的时间
// ---------------------------------------------------------------------------
/**
 * @param {HTMLElement} scrollEl 会滚动的那个元素
 * @param {object} opts
 *   host: 标签放在哪（默认 scrollEl.parentElement，须 position: relative）
 *   itemSelector: 每条记录的选择器，元素上带 data-time（ISO 字符串）
 *   locale / hour12 / now(): 时间格式
 *   thumb: true（默认）= 画一根细滑块，能拖，鼠标移到滚动区最右 16px（整条高度都算）会露出来；kit 会藏起原生滚动条。
 *          false = 用原生滚动条，标签贴在它左边。桌面网页、用鼠标的场景选 false 更稳。
 */
export function timeScroller(scrollEl, opts = {}) {
  const o = { host: scrollEl.parentElement, itemSelector: '[data-time]', locale: 'zh-CN', hour12: false, now: () => new Date(), thumb: true, ...opts };
  const cfg = motion.clock;
  // div 做的滚动容器默认拿不到焦点，键盘就滚不动；没设 tabindex 就补一个
  const addedTab = !scrollEl.hasAttribute('tabindex') && scrollEl !== document.scrollingElement;
  if (addedTab) scrollEl.tabIndex = 0;
  // 原生滚动条由这里管：自画滑块时藏起来，thumb: false 时留着。页面自己别再写隐藏规则，否则切回原生也看不到
  scrollEl.classList.toggle('pk-scroll-hidebar', !!o.thumb);
  const tag = document.createElement('div');
  tag.className = 'pk-clock';
  tag.setAttribute('aria-hidden', 'true');
  tag.innerHTML = '<span class="pk-clock-face"><i class="pk-clock-h"></i><i class="pk-clock-m"></i></span><span class="pk-clock-text"><b class="pk-clock-time"></b><span class="pk-clock-date"></span></span>';
  const thumb = document.createElement('div');
  thumb.className = 'pk-clock-thumb';
  thumb.setAttribute('aria-hidden', 'true');
  o.host.append(tag);
  if (o.thumb) o.host.append(thumb);
  const hourEl = tag.querySelector('.pk-clock-h');
  const minEl = tag.querySelector('.pk-clock-m');
  const timeEl = tag.querySelector('.pk-clock-time');
  const dateEl = tag.querySelector('.pk-clock-date');

  let items = [];
  let dirty = true; // 记录增删、图片加载撑高以后要重新量位置
  const measure = () => {
    const top = scrollEl.getBoundingClientRect().top - scrollEl.scrollTop;
    items = [...scrollEl.querySelectorAll(o.itemSelector)].map((el) => ({ y: el.getBoundingClientRect().top - top, t: new Date(el.dataset.time) }));
    dirty = false;
  };
  const hands = { h: { el: hourEl, deg: 0, from: 0, anim: null }, m: { el: minEl, deg: 0, from: 0, anim: null } };
  let lastTime = null;
  let visible = false;
  let hideTimer = 0;

  const fmtTime = (d) => d.toLocaleTimeString(o.locale, { hour: o.hour12 ? 'numeric' : '2-digit', minute: '2-digit', hour12: o.hour12 });
  const fmtDate = (d) => {
    const now = o.now();
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((day(now) - day(d)) / 864e5);
    if (diff === 0) return '';
    if (diff > 0 && diff < 7) return d.toLocaleDateString(o.locale, { weekday: 'long' });
    if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString(o.locale, { month: 'long', day: 'numeric' });
    return d.toLocaleDateString(o.locale, { year: 'numeric', month: 'long', day: 'numeric' });
  };
  function current(h) {
    if (!h.anim || h.anim.playState !== 'running') return h.deg;
    const p = h.anim.effect.getComputedTiming().progress ?? 1;
    return h.from + (h.deg - h.from) * p;
  }
  function turn(h, target, forward) {
    const cur = current(h);
    const c = ((cur % 360) + 360) % 360;
    let d = target - c;
    if (forward && d < 0) d += 360;
    if (!forward && d > 0) d -= 360;
    h.from = cur;
    h.deg = cur + d;
    h.anim = turnTo(h.el, h.deg, { from: h.from, ms: cfg.handsMs, fill: 'forwards' });
  }
  function setTime(t, animate) {
    if (lastTime && t.getTime() === lastTime.getTime()) return;
    const forward = !lastTime || t > lastTime;
    const hDeg = ((t.getHours() % 12) * 60 + t.getMinutes()) * 0.5;
    const mDeg = t.getMinutes() * 6;
    if (animate && lastTime) { turn(hands.h, hDeg, forward); turn(hands.m, mDeg, forward); }
    else {
      for (const [h, deg] of [[hands.h, hDeg], [hands.m, mDeg]]) { h.deg = h.from = deg; cancelAll(h.el); h.el.style.transform = `rotate(${deg}deg)`; }
    }
    lastTime = t;
    timeEl.textContent = fmtTime(t);
    const label = fmtDate(t);
    dateEl.textContent = label;
    tag.classList.toggle('has-date', !!label);
  }
  function show() {
    if (visible) return;
    visible = true;
    // 从此刻的透明度接着淡入：正在淡出时又滚动，不会先闪没再出来
    fadeIn(tag, { from: [8, 0], ms: cfg.showMs });
    if (o.thumb) fadeIn(thumb, { ms: cfg.showMs, easing: 'linear' });
  }
  function hide() {
    if (drag) return; // 拖着滑块的时候不收
    visible = false;
    fadeOut(tag, { ms: cfg.hideMs });
    if (o.thumb) fadeOut(thumb, { ms: cfg.hideMs, easing: 'linear' });
  }
  // 滑块几何：自画的滑块上下留 pad；原生滚动条按整条轨道估（各系统略有出入，差几像素）
  function geometry() {
    const view = scrollEl.clientHeight;
    const max = scrollEl.scrollHeight - view;
    const pad = o.thumb ? cfg.pad : 0;
    const thumbH = Math.max(o.thumb ? 28 : 18, (view * view) / scrollEl.scrollHeight);
    return { view, max, pad, thumbH, track: Math.max(1, view - thumbH - 2 * pad) };
  }
  function place() {
    const sr = scrollEl.getBoundingClientRect();
    const hr = o.host.getBoundingClientRect();
    const { view, max, pad, thumbH, track } = geometry();
    const ratio = max > 0 ? clamp(scrollEl.scrollTop / max) : 0;
    const thumbTop = pad + ratio * track;
    const tagH = tag.offsetHeight || 30;
    const tagTop = clamp(thumbTop + thumbH / 2 - tagH / 2, cfg.pad, view - tagH - cfg.pad);
    const right = hr.right - sr.right;
    const cs = getComputedStyle(scrollEl);
    const bar = o.thumb ? 0 : Math.max(0, scrollEl.offsetWidth - scrollEl.clientWidth - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth));
    tag.style.top = `${sr.top - hr.top + tagTop}px`;
    tag.style.right = `${right + bar + (o.thumb ? 10 : 8)}px`; // 尖角 7px，停在滚动条外沿
    thumb.hidden = max <= 0;
    thumb.style.top = `${sr.top - hr.top + thumbTop}px`;
    thumb.style.height = `${thumbH}px`;
    thumb.style.right = `${right + 3}px`;
    const y = scrollEl.scrollTop + tagTop + tagH / 2;
    let lo = 0, hi = items.length - 1, hit = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (items[mid].y <= y) { hit = mid; lo = mid + 1; } else hi = mid - 1; }
    const it = items[Math.max(0, hit)];
    if (it && !Number.isNaN(it.t.getTime())) setTime(it.t, visible);
  }
  const onScroll = () => {
    if (dirty || !items.length) measure();
    place();
    show();
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, cfg.hideDelayMs);
  };

  // 自画的滑块要能拖：Path 在手机上靠手指滑，网页上用鼠标的人会去抓滚动条
  let drag = null;
  const onThumbDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    thumb.setPointerCapture(e.pointerId);
    drag = { y: e.clientY, top: scrollEl.scrollTop };
    thumb.classList.add('is-dragging');
    onScroll();
  };
  const onThumbMove = (e) => {
    if (!drag) return;
    const { max, track } = geometry();
    scrollEl.scrollTop = drag.top + ((e.clientY - drag.y) * max) / track;
  };
  const onThumbUp = () => {
    if (!drag) return;
    drag = null;
    thumb.classList.remove('is-dragging');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, cfg.hideDelayMs);
  };
  // 鼠标移到滚动区右边缘（最右 16px，整条高度都算）就露出滑块和标签，好让人找到它
  const onThumbHover = () => { if (!drag) onScroll(); };
  const onEdgeMove = (e) => {
    if (drag || e.pointerType !== 'mouse') return;
    if (e.clientX >= scrollEl.getBoundingClientRect().right - 16) onScroll();
  };
  if (o.thumb) {
    thumb.addEventListener('pointerdown', onThumbDown);
    thumb.addEventListener('pointermove', onThumbMove);
    thumb.addEventListener('pointerup', onThumbUp);
    thumb.addEventListener('pointercancel', onThumbUp);
    thumb.addEventListener('pointerenter', onThumbHover);
    scrollEl.addEventListener('pointermove', onEdgeMove);
  }

  const ro = new ResizeObserver(() => { dirty = true; });
  const watch = () => {
    ro.disconnect();
    ro.observe(scrollEl);
    scrollEl.querySelectorAll(o.itemSelector).forEach((el) => ro.observe(el));
  };
  const mo = new MutationObserver(() => { dirty = true; watch(); });
  mo.observe(scrollEl, { childList: true, subtree: true });
  watch();
  scrollEl.addEventListener('scroll', onScroll, { passive: true });
  tag.style.opacity = '0';
  thumb.style.opacity = '0';
  measure();
  place();

  return {
    refresh() { measure(); place(); },
    destroy() {
      clearTimeout(hideTimer);
      ro.disconnect(); mo.disconnect();
      scrollEl.removeEventListener('scroll', onScroll);
      scrollEl.removeEventListener('pointermove', onEdgeMove);
      tag.remove(); thumb.remove();
      if (addedTab) scrollEl.removeAttribute('tabindex');
      scrollEl.classList.remove('pk-scroll-hidebar');
    },
  };
}

// ---------------------------------------------------------------------------
// 字形：一套原创的实心剪影，按 references/essence.md 规则 13 画（不是 Path 的原图标）。
// 24 网格，实心、圆头、不描边；细节（针眼、镜头、钥匙孔）是镂空，放在白底和彩底上都成立。
// 同一个字形用在发布菜单、时间线小圆、筛选块、压印加载、空状态里，只换尺寸和颜色。
// 光芒、雪花这类没法做成实心的，才用圆头粗线（2.2）。
// ---------------------------------------------------------------------------
const GLYPH_PATHS = {
  photo: '<path fill-rule="evenodd" d="M7.2 7l1.4-2.5h6.8L16.8 7h2.7A2.5 2.5 0 0 1 22 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5v-8A2.5 2.5 0 0 1 4.5 7zM12 8.8a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2zm0 2.4a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z"/>',
  place: '<path fill-rule="evenodd" d="M12 2.5c-3.9 0-7 3-7 6.9 0 4.6 5.6 10.6 6.3 11.3a1 1 0 0 0 1.4 0c.7-.7 6.3-6.7 6.3-11.3 0-3.9-3.1-6.9-7-6.9zm0 4.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z"/>',
  music: '<path d="M8 6.6 20 4v3.2L8 9.8zM8 6.6h2v11H8zM18 4.2h2v11.3h-2z"/><circle cx="7.2" cy="17.6" r="2.8"/><circle cx="17.2" cy="15.5" r="2.8"/>',
  thought: '<path d="M3.8 14.4c0-4.3 2.1-7.4 5.8-8.6l.9 1.7c-2.1 1-3.3 2.6-3.6 4.6zM13.4 14.4c0-4.3 2.1-7.4 5.8-8.6l.9 1.7c-2.1 1-3.3 2.6-3.6 4.6z"/><circle cx="7.2" cy="14.6" r="3.4"/><circle cx="16.8" cy="14.6" r="3.4"/>',
  sleep: '<path d="M15.5 3.2A8.8 8.8 0 1 0 20.8 15 7 7 0 0 1 15.5 3.2z"/>',
  people: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 19.4c.5-3.9 3-6 6.2-6s5.7 2.1 6.2 6a.8.8 0 0 1-.8.9H3.6a.8.8 0 0 1-.8-.9z"/><circle cx="16.6" cy="9" r="2.8"/><path d="M15.7 13.8c3-.4 5.3 1.5 5.8 5.2a.8.8 0 0 1-.8.9h-4c0-2.5-.4-4.4-1-6.1z"/>',
  food: '<path d="M5 3h1.4v5h1.4V3h1.4v5h1.4V3H12v6.2a2.5 2.5 0 0 1-2.5 2.5V21h-2v-9.3A2.5 2.5 0 0 1 5 9.2zM15 3c2.6.6 4 3.3 4 7.2V13h-1.5v8H15z"/>',
  calendar: '<path fill-rule="evenodd" d="M7 2.5h2V4h6V2.5h2V4h.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11A2.5 2.5 0 0 1 6.5 4H7zM6 9v8.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V9z"/><path d="M7.5 10.5H10V13H7.5zM10.8 10.5h2.4V13h-2.4zM14 10.5h2.5V13H14zM7.5 14H10v2.5H7.5zM10.8 14h2.4v2.5h-2.4z"/>',
  home: '<path d="M12 3.2 2.8 10.8a.8.8 0 0 0 .5 1.4H5V19a1.5 1.5 0 0 0 1.5 1.5H10V15h4v5.5h3.5A1.5 1.5 0 0 0 19 19v-6.8h1.7a.8.8 0 0 0 .5-1.4z"/>',
  star: '<path d="M12 3.1l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.8 1.1-6.1-4.5-4.2 6.1-.8z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>',
  lock: '<path fill-rule="evenodd" d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5h.5A2 2 0 0 1 19 12.5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2zm2.3 0h4.4V8a2.2 2.2 0 0 0-4.4 0zM12 13.5a1.6 1.6 0 0 0-.9 2.9v1.8h1.8v-1.8a1.6 1.6 0 0 0-.9-2.9z"/>',
  heart: '<path d="M12 20.3s-8-4.9-8-10.6A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.7c0 5.7-8 10.6-8 10.6z"/>',
  check: '<path d="M9.6 16.2 5.4 12l-1.8 1.8 6 6L20.4 9l-1.8-1.8z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  leaf: '<path fill-rule="evenodd" d="M20 4C10.5 4 4.5 8.5 4.5 15.5c0 1.4.3 2.6.8 3.6l-1.7 1.7 1.1 1.1 1.7-1.7c1 .5 2.2.8 3.6.8C17 21 20 13.5 20 4zM7.6 17.2l7.9-7.9.7.7-7.9 7.9z"/>',
  flower: '<circle cx="12" cy="6.6" r="3.4"/><circle cx="17.1" cy="10.3" r="3.4"/><circle cx="15.2" cy="16.4" r="3.4"/><circle cx="8.8" cy="16.4" r="3.4"/><circle cx="6.9" cy="10.3" r="3.4"/><circle cx="12" cy="12" r="2.6"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.6 4.6 12 7l2.4-2.4M9.6 19.4 12 17l2.4 2.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
};
/** 字形表：id 和中文名。类型、状态、季节各几种，够拼一般的家庭类产品；缺的照规则 13 自己补。 */
export const GLYPHS = [
  { id: 'photo', label: '照片' }, { id: 'place', label: '地点' }, { id: 'music', label: '音乐' },
  { id: 'thought', label: '想法' }, { id: 'sleep', label: '睡眠' }, { id: 'people', label: '和谁在一起' },
  { id: 'food', label: '吃饭' }, { id: 'calendar', label: '日期' }, { id: 'home', label: '家' },
  { id: 'star', label: '星标' }, { id: 'lock', label: '私密' }, { id: 'heart', label: '喜欢' },
  { id: 'check', label: '完成' }, { id: 'sun', label: '夏' }, { id: 'leaf', label: '秋' },
  { id: 'flower', label: '春' }, { id: 'snow', label: '冬' },
];
/**
 * 字形 SVG 字符串，颜色跟着 currentColor 走。默认 aria-hidden；给 label 就当成有名字的图（role="img"）。
 * 白底彩字形：外层设 color: var(--pk-type-xxx)；彩底白字形：外层 background 用类型色、color: #fff。
 */
export function glyphSvg(id, { label = '' } = {}) {
  const inner = GLYPH_PATHS[id] || '';
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
  return `<svg class="pk-glyph" viewBox="0 0 24 24" fill="currentColor" ${a11y}>${inner}</svg>`;
}

// ---------------------------------------------------------------------------
// 3. 情绪回应：点心形，就地冒出一块深色浮层，五张脸一个个弹出来
// ---------------------------------------------------------------------------
export const FACES = [
  { id: 'smile', label: '开心' },
  { id: 'laugh', label: '大笑' },
  { id: 'gasp', label: '惊讶' },
  { id: 'frown', label: '难过' },
  { id: 'love', label: '爱' },
];
/** 原创的简笔脸，不是 Path 的贴纸。 */
export function faceSvg(id) {
  const eyes = '<circle cx="12" cy="13" r="1.6" fill="#5b3a1a"/><circle cx="20" cy="13" r="1.6" fill="#5b3a1a"/>';
  const mouth = {
    smile: '<path d="M10.5 18.5q5.5 5 11 0" fill="none" stroke="#5b3a1a" stroke-width="1.8" stroke-linecap="round"/>',
    laugh: '<path d="M9.5 17.5h13q-1 6-6.5 6t-6.5-6z" fill="#5b3a1a"/><path d="M11.5 12.5l2-1.5M20.5 12.5l-2-1.5" stroke="#5b3a1a" stroke-width="1.6" stroke-linecap="round"/>',
    gasp: '<ellipse cx="16" cy="20.5" rx="2.6" ry="3.2" fill="#5b3a1a"/>',
    frown: '<path d="M11 22.5q5-4.5 10 0" fill="none" stroke="#5b3a1a" stroke-width="1.8" stroke-linecap="round"/>',
  };
  if (id === 'love') {
    return '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="var(--pk-love, #e8453c)"/><path d="M16 23.5s-7-4.3-7-9.2a3.9 3.9 0 0 1 7-2.3 3.9 3.9 0 0 1 7 2.3c0 4.9-7 9.2-7 9.2z" fill="#fff"/></svg>';
  }
  const lids = id === 'laugh' ? '' : eyes;
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="var(--pk-face, #ffd23f)" stroke="#e0a800" stroke-width="1"/>${lids}${mouth[id] || ''}</svg>`;
}

/**
 * @param {HTMLElement} anchor 触发的按钮（心形）
 * @param {object} opts host / seen: {count, total} / onPick(faceId)
 */
export function reactionPicker(anchor, opts = {}) {
  const o = { host: document.body, faces: FACES, seen: null, onPick: () => {}, ...opts };
  const cfg = motion.reaction;
  let panel = null;
  let closing = false;
  let destroyed = false;
  let outsideTimer = 0;

  function build() {
    const el = document.createElement('div');
    el.className = 'pk-react';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '选一个表情');
    if (o.host === document.body) el.style.position = 'fixed';
    const faces = o.faces.map((f) => `<button type="button" class="pk-react-face" data-face="${f.id}" aria-label="${f.label}" title="${f.label}">${faceSvg(f.id)}</button>`).join('');
    const seen = o.seen ? `<div class="pk-react-seen"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 7V5a3 3 0 0 1 6 0v2h.5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm1.5 0h3V5a1.5 1.5 0 0 0-3 0z" fill="currentColor"/></svg>${o.seen.count}/${o.seen.total} 位家人看过</div>` : '';
    el.innerHTML = `<div class="pk-react-faces">${faces}</div>${seen}`;
    return el;
  }
  function position(el) {
    const hr = o.host === document.body ? { left: 0, top: 0, right: innerWidth } : o.host.getBoundingClientRect();
    const ar = anchor.getBoundingClientRect();
    const w = el.offsetWidth;
    let left = ar.left - hr.left - w - 10;
    let side = 'left';
    if (left < 8) { left = Math.max(8, ar.right - hr.left - w); side = 'below'; }
    const top = side === 'left' ? ar.top - hr.top - 6 : ar.bottom - hr.top + 10;
    el.dataset.side = side;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    // 尖角对准按钮中心：浮层被挤到边上时，尖角也跟着挪
    el.style.setProperty('--pk-tip-x', `${(ar.left + ar.width / 2 - hr.left - left).toFixed(1)}px`);
    el.style.setProperty('--pk-tip-y', `${(ar.top + ar.height / 2 - hr.top - top).toFixed(1)}px`);
  }
  function open() {
    if (panel) return;
    closing = false;
    panel = build();
    o.host.appendChild(panel);
    position(panel);
    anchor.setAttribute('aria-expanded', 'true');
    // 放大原点由 CSS 对准尖角（--pk-tip-x / --pk-tip-y），所以 anchor 传 null
    growFrom(panel, null, { fromScale: cfg.fromScale, ms: cfg.inMs });
    panel.querySelectorAll('.pk-react-face').forEach((b, i) => {
      pop(b, { peak: cfg.overshoot, ms: cfg.faceMs, delay: 80 + i * cfg.faceStaggerMs, fade: false });
    });
    panel.addEventListener('click', onPick);
    // 晚一拍再听「点外面」，免得打开它的这次点击把它又关上；句柄留着，开了马上关或卸载时要取消
    outsideTimer = setTimeout(() => document.addEventListener('pointerdown', onOutside, true), 0);
    document.addEventListener('keydown', onKey);
    // 浮层是按按钮位置摆的，页面一滚就对不上了，干脆收起
    document.addEventListener('scroll', onScrollAway, true);
    window.addEventListener('resize', onScrollAway);
    panel.querySelector('.pk-react-face')?.focus({ preventScroll: true });
  }
  async function close(chosen) {
    if (!panel || closing) return;
    closing = true;
    const el = panel;
    clearTimeout(outsideTimer);
    document.removeEventListener('pointerdown', onOutside, true);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('scroll', onScrollAway, true);
    window.removeEventListener('resize', onScrollAway);
    anchor.setAttribute('aria-expanded', 'false');
    const k = getIntensity();
    if (chosen) {
      await chosen.animate([{ transform: 'scale(1)' }, { transform: `scale(${1 + 0.3 * k})` }], { duration: dur(120), easing: motion.ease.out, fill: 'forwards' }).finished.catch(() => {});
    }
    // 每次等完都看一眼：收到一半被卸载（React 卡片被删掉）就停手，不再给已移除的浮层起新动画，也不再回调
    if (destroyed) return false;
    await shrinkTo(el, null, { ms: cfg.outMs }).finished.catch(() => {});
    if (destroyed) return false;
    const hadFocus = el.contains(document.activeElement);
    el.remove();
    if (panel === el) panel = null;
    if (hadFocus || document.activeElement === document.body) anchor.focus({ preventScroll: true });
    return true;
  }
  const onPick = (e) => {
    const b = e.target.closest('.pk-react-face');
    if (!b) return;
    close(b).then((done) => { if (done) o.onPick(b.dataset.face); });
  };
  const onOutside = (e) => { if (panel && !panel.contains(e.target) && !anchor.contains(e.target)) close(); };
  const onScrollAway = (e) => { if (panel && !(e?.target instanceof Node && panel.contains(e.target))) close(); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    const faces = [...panel.querySelectorAll('.pk-react-face')];
    const i = faces.indexOf(document.activeElement);
    if (i < 0) return;
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: faces.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    faces[(to + faces.length) % faces.length].focus();
  };
  const onAnchor = () => (panel ? close() : open());
  anchor.setAttribute('aria-haspopup', 'dialog');
  anchor.setAttribute('aria-expanded', 'false');
  anchor.addEventListener('click', onAnchor);
  return {
    open, close: () => close(),
    destroy() {
      destroyed = true;
      clearTimeout(outsideTimer);
      anchor.removeEventListener('click', onAnchor);
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', onScrollAway, true);
      window.removeEventListener('resize', onScrollAway);
      panel?.getAnimations({ subtree: true }).forEach((a) => a.cancel()); // 卸载时还在跑的动画一并停掉
      panel?.remove();
      panel = null;
    },
  };
}

/** 新出现的小东西（回应、星标、筛选块）用这一下「冒出来」：pop 的默认值，0 → 1.2 → 1，250ms。 */
export function popIn(el, { delay = 0 } = {}) {
  return pop(el, { delay });
}

// ---------------------------------------------------------------------------
// 4. 掉落弹窗：从上面掉下来晃两下停住，关的时候歪着摔下去
// ---------------------------------------------------------------------------
/**
 * @param {object} opts
 *   host / content (Node) / label（读屏念的名字）/ dismissible（Esc、点背景能关）/ onClose
 *   role: 'dialog'（默认）| 'alertdialog'（删除之类要确认的）
 *   scrim: 压暗深浅，默认 motion.modal.scrim（0.72，Path 是压在橘红上的）；浅底页面、克制场景用 0.3–0.45
 * @returns {{ open(): Promise, close(): Promise, el }}
 */
export function dropModal(opts = {}) {
  const o = { host: document.body, content: null, label: '', dismissible: true, role: 'dialog', scrim: motion.modal.scrim, onClose: () => {}, ...opts };
  const cfg = motion.modal;
  const fixed = o.host === document.body;
  const scrim = document.createElement('div');
  scrim.className = 'pk-scrim pk-drop-scrim';
  const stage = document.createElement('div');
  stage.className = 'pk-drop';
  const fall = document.createElement('div');
  fall.className = 'pk-drop-fall';
  const swing = document.createElement('div');
  swing.className = 'pk-drop-card';
  swing.setAttribute('role', o.role);
  swing.setAttribute('aria-modal', 'true');
  swing.tabIndex = -1; // 卡片里没有可聚焦的东西时，焦点落在卡片上
  if (o.label) swing.setAttribute('aria-label', o.label);
  if (o.content) swing.appendChild(o.content);
  fall.appendChild(swing);
  stage.appendChild(fall);
  if (fixed) { scrim.style.position = 'fixed'; stage.style.position = 'fixed'; }
  let lastFocus = null;
  let isOpen = false;
  let overflow = '';

  const hostH = () => (fixed ? innerHeight : o.host.clientHeight);
  function open() {
    if (isOpen) return Promise.resolve();
    isOpen = true;
    lastFocus = document.activeElement;
    o.host.append(scrim, stage);
    if (fixed) { overflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden'; } // 背后的页面别跟着滚
    scrim.animate([{ opacity: 0 }, { opacity: o.scrim }], { duration: dur(cfg.scrimMs), easing: 'linear', fill: 'forwards' });
    const a = dropIn(fall, { inner: swing, height: hostH() });
    document.addEventListener('keydown', onKey);
    if (o.dismissible) scrim.addEventListener('click', onScrim);
    const first = swing.querySelector('input,button,textarea,select,a[href],[tabindex]:not([tabindex="-1"])');
    (first || swing).focus({ preventScroll: true });
    return a.finished.catch(() => {});
  }
  async function close() {
    if (!isOpen) return;
    isOpen = false;
    document.removeEventListener('keydown', onKey);
    scrim.removeEventListener('click', onScrim);
    // 从「此刻」的位置、角度、压暗接着走：还没落稳就被关掉时，不会先跳回正中再摔
    const curScrim = getComputedStyle(scrim).opacity;
    cancelAll(scrim);
    scrim.animate([{ opacity: curScrim }, { opacity: 0 }], { duration: dur(cfg.outMs), easing: 'linear', fill: 'forwards' });
    await fallOut(fall, { inner: swing, height: hostH() }).finished.catch(() => {});
    scrim.remove(); stage.remove();
    if (fixed) document.documentElement.style.overflow = overflow;
    cancelAll(scrim); cancelAll(fall); cancelAll(swing);
    lastFocus?.focus?.({ preventScroll: true });
    o.onClose();
  }
  const onScrim = () => close();
  const onKey = (e) => {
    if (e.key === 'Escape' && o.dismissible) { e.stopPropagation(); close(); }
    if (e.key === 'Tab') {
      const f = [...swing.querySelectorAll('input,button,textarea,select,a[href],[tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  };
  return { open, close, el: swing };
}

/** 引导卡片的横向分页圆点（卡片本身用 CSS scroll-snap）。 */
export function pagerDots(scroller, dots) {
  const n = scroller.children.length;
  dots.innerHTML = Array.from({ length: n }, () => '<i></i>').join('');
  const mark = () => {
    const i = Math.round(scroller.scrollLeft / Math.max(1, scroller.clientWidth));
    [...dots.children].forEach((d, j) => d.classList.toggle('is-on', i === j));
  };
  scroller.addEventListener('scroll', mark, { passive: true });
  mark();
  return { destroy() { scroller.removeEventListener('scroll', mark); } };
}

// ---------------------------------------------------------------------------
// 5. 封面头部：往上滚，头像和名字淡掉，封面剩一条当顶栏；往下拉，封面放大
// ---------------------------------------------------------------------------
/**
 * 封面元素本身用 CSS 粘住（.pk-cover：position: sticky; top: 顶栏高 - 封面高），
 * 这里只负责视差、淡出和下拉放大。
 * @param {HTMLElement} scrollEl
 * @param {object} parts { cover, img, fade: [头像、名字…], compact: 顶栏小标题 }
 */
export function coverHeader(scrollEl, parts) {
  const cfg = motion.cover;
  let pull = 0;
  const render = () => {
    const coverH = parts.cover.offsetHeight;
    const barH = parseFloat(getComputedStyle(parts.cover).getPropertyValue('--pk-strip')) || parseFloat(getComputedStyle(parts.cover).getPropertyValue('--pk-bar-h')) || 56;
    const range = Math.max(1, coverH - barH);
    const y = Math.max(0, scrollEl.scrollTop);
    const p = clamp(y / range);
    const k = getIntensity() > 0 ? 1 : 0;
    if (parts.img) parts.img.style.transform = `translateY(${(Math.min(y, range) * cfg.parallax * k).toFixed(1)}px) scale(${(1 + pull / coverH).toFixed(3)})`;
    const fade = 1 - clamp(p / cfg.fadeEnd);
    (parts.fade || []).forEach((el) => { el.style.opacity = fade.toFixed(3); });
    if (parts.compact) parts.compact.style.opacity = clamp((p - cfg.compactFrom) / (1 - cfg.compactFrom)).toFixed(3);
  };
  scrollEl.addEventListener('scroll', render, { passive: true });
  render();
  return {
    setPull(d) { pull = Math.max(0, d); render(); },
    destroy() { scrollEl.removeEventListener('scroll', render); },
  };
}

// ---------------------------------------------------------------------------
// 6. 下拉刷新：时间轴的线头被拉成一滴水，拉过头「啪」地断开，变成一个跳动的点
// ---------------------------------------------------------------------------
/**
 * @param {HTMLElement} scrollEl
 * @param {object} opts
 *   content: 被拉下来的那块（列表），用 transform 往下移
 *   head: 线头元素（放在 content 里、时间轴竖线的顶端）
 *   onPull(d): 每次拉动回调，可接 coverHeader().setPull
 *   onRefresh(): 返回 Promise
 */
export function pullToRefresh(scrollEl, opts = {}) {
  const o = { onPull: () => {}, onRefresh: () => Promise.resolve(), ...opts };
  const cfg = motion.pull;
  const head = o.head;
  head.classList.add('pk-pull-head');
  head.innerHTML = '<svg class="pk-pull-drop" aria-hidden="true"><path/></svg><i class="pk-pull-dot"></i>';
  const svg = head.querySelector('svg');
  const path = head.querySelector('path');
  let startY = null;
  let d = 0;
  let armed = false;
  let busy = false;

  function drawDrop(len) {
    // 上端细，下端是一颗圆珠；长度随拉动变化
    const r = 4.5;
    const L = Math.max(0, len);
    const top = Math.max(0.6, 1.6 - L / 120);
    svg.setAttribute('width', '16');
    svg.setAttribute('height', String(Math.max(1, L + r)));
    svg.style.top = `${-L}px`;
    path.setAttribute('d', L < 2 ? '' : `M${8 - top},0 L${8 + top},0 C${8 + top},${L * 0.55} ${8 + r},${L - r * 1.4} ${8 + r},${L} A${r},${r} 0 1 1 ${8 - r},${L} C${8 - r},${L - r * 1.4} ${8 - top},${L * 0.55} ${8 - top},0 Z`);
  }
  function render(dist) {
    d = dist;
    o.content.style.transform = d ? `translateY(${d}px)` : '';
    o.onPull(d);
    if (!armed) drawDrop(d);
    if (!armed && d >= cfg.threshold) snap();
  }
  function snap() {
    armed = true;
    drawDrop(0);
    head.classList.add('is-armed');
    // 过了门槛，水滴断开缩成一个点：0.4 → 1.6 → 1
    pop(head.querySelector('.pk-pull-dot'), { from: 0.4, peak: 0.6, at: 0.5, ms: 260, fade: false, fill: 'none' });
  }
  async function release() {
    if (startY == null) return;
    startY = null;
    const from = d;
    const back = (to) => {
      const a = o.content.animate([{ transform: `translateY(${from}px)` }, { transform: `translateY(${to}px)` }], { duration: dur(cfg.backMs), easing: motion.ease.out });
      const t0 = performance.now();
      const tick = (now) => {
        const p = clamp((now - t0) / dur(cfg.backMs));
        const e = 1 - (1 - p) * (1 - p);
        o.onPull(from + (to - from) * e);
        if (!armed) drawDrop(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      o.content.style.transform = to ? `translateY(${to}px)` : '';
      d = to;
      return a.finished.catch(() => {});
    };
    if (!armed) { await back(0); return; }
    busy = true;
    head.classList.add('is-loading');
    await back(0);
    try { await o.onRefresh(); } finally {
      const dot = head.querySelector('.pk-pull-dot');
      await dot.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.8)', opacity: 0 }], { duration: dur(220), easing: motion.ease.out }).finished.catch(() => {});
      head.classList.remove('is-armed', 'is-loading');
      armed = false;
      busy = false;
      drawDrop(0);
    }
  }
  const down = (y) => { if (!busy && scrollEl.scrollTop <= 0) { startY = y; } };
  const move = (y, e) => {
    if (startY == null) return;
    const dy = y - startY;
    if (dy <= 0 && d === 0) { if (dy < -4) startY = null; return; }
    if (e.cancelable) e.preventDefault();
    render(rubber(Math.max(0, dy)));
  };
  const onTouchStart = (e) => down(e.touches[0].clientY);
  const onTouchMove = (e) => move(e.touches[0].clientY, e);
  const onMouseDown = (e) => { if (e.button === 0) down(e.clientY); };
  const onMouseMove = (e) => move(e.clientY, e);
  scrollEl.addEventListener('touchstart', onTouchStart, { passive: true });
  scrollEl.addEventListener('touchmove', onTouchMove, { passive: false });
  scrollEl.addEventListener('touchend', release);
  scrollEl.addEventListener('touchcancel', release);
  scrollEl.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', release);
  drawDrop(0);
  return {
    destroy() {
      scrollEl.removeEventListener('touchstart', onTouchStart);
      scrollEl.removeEventListener('touchmove', onTouchMove);
      scrollEl.removeEventListener('touchend', release);
      scrollEl.removeEventListener('touchcancel', release);
      scrollEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', release);
      head.innerHTML = '';
    },
  };
}

// ---------------------------------------------------------------------------
// 7. 星标：点亮时弹进来，取消时鼓一下再收
// ---------------------------------------------------------------------------
export function popToggle(btn, opts = {}) {
  const o = { on: btn.getAttribute('aria-pressed') === 'true', onChange: () => {}, ...opts };
  const cfg = motion.star;
  let on = o.on;
  btn.setAttribute('aria-pressed', String(on));
  const icon = btn.querySelector('.pk-star') || btn;
  const onClick = () => {
    on = !on;
    btn.setAttribute('aria-pressed', String(on));
    cancelAll(icon);
    // 点亮：0 → 1.35 → 0.9 → 1；取消：鼓一下 1 → 1.2 → 1
    if (on) pop(icon, { peak: cfg.overshoot, dip: 0.1, ms: cfg.onMs, fade: false, fill: 'none' });
    else pop(icon, { from: 1, peak: 0.2, ms: cfg.offMs, fill: 'none' });
    o.onChange(on);
  };
  btn.addEventListener('click', onClick);
  return { destroy() { btn.removeEventListener('click', onClick); } };
}

// ---------------------------------------------------------------------------
// 8. 压印加载：一排浅浅压在纸上的类型图标，轮流变深
// ---------------------------------------------------------------------------
export function relayLoader(el, glyphs = []) {
  el.classList.add('pk-relay');
  el.setAttribute('role', 'status');
  if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', '正在加载');
  if (glyphs.length) el.innerHTML = glyphs.map((g) => `<span aria-hidden="true">${g}</span>`).join('');
  const kids = [...el.children];
  el.style.setProperty('--pk-relay-n', String(kids.length));
  el.style.setProperty('--pk-relay-step', `${motion.loader.stepMs}ms`);
  kids.forEach((c, i) => c.style.setProperty('--pk-relay-i', String(i)));
  return { destroy() { el.classList.remove('pk-relay'); } };
}
