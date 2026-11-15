// path-kit.d.ts：path-kit.js 的类型声明，TypeScript 项目和 path-kit.js 放在一起即可直接 import。
// 行为说明见 path-kit.js 里各函数上方的注释，数字出处见 ../../references/motion-spec.md。

export interface Destroyable { destroy(): void }

type Track = [number, number][];

type MenuConfig = {
  arc: [number, number]; spacing?: number; radius: number; near: number; far: number; closeFar: number;
  /** 冲过头、回落的时刻；spin × spinAt 是展开时边飞边转。 */
  openAt: [number, number]; spin: number; spinAt: Track;
  /** 收回时先往外退 closeFar 的时刻，以及收回的自转。 */
  closeAt: number; closeSpin: number; closeSpinAt: Track;
  openMs: number; closeMs: number; staggerMs: number; easing: string;
  buttonTurn: number; buttonMs: number; buttonBackMs: number; buttonBackDelay: number;
  scrim: number; scrimInMs: number; scrimOutMs: number;
  pickMs: number; pickScale: number; restScale: number; restMs: number;
};

/** 动效常量，唯一出处。对象可改：页面里改字段（如 motion.clock.hideDelayMs = 1500）就能调，不用改 kit。 */
export const motion: {
  ease: { in: string; out: string; inOut: string; fall: string; land: string };
  menu: { corner: MenuConfig; center: MenuConfig };
  clock: { showMs: number; hideDelayMs: number; hideMs: number; handsMs: number; pad: number };
  reaction: { inMs: number; fromScale: number; faceMs: number; faceStaggerMs: number; overshoot: number; outMs: number };
  modal: { inMs: number; outMs: number; scrim: number; scrimMs: number; swing: [number, number, number, number]; fallTilt: number };
  star: { onMs: number; offMs: number; overshoot: number };
  loader: { stepMs: number };
  cover: { parallax: number; fadeEnd: number; compactFrom: number };
  pull: { resistance: number; threshold: number; max: number; backMs: number };
};

/** 1 = 原样，0.4 左右 = 克制，0 = 只剩位移和淡入淡出。只缩放幅度，不缩放时长。 */
export function setIntensity(k: number | string): void;
/** 当前强度；系统开了「减少动态效果」时恒为 0。 */
export function getIntensity(): number;

// ---- 零件：组件都由它们拼成，Path 没有的东西也用它们拼（references/essence.md「规则」「动作分五级」） ----
// 幅度参数（over、back、windup、spin、peak、dip、swing、tilt）自动乘强度。

export interface FlyOptions {
  /** 相对元素自身位置的偏移（px），[0, 0] 是它本来该在的地方。 */
  from?: [number, number]; to?: [number, number];
  /** 冲过终点多少 px（在 at[0]），回落到终点前多少 px（在 at[1]）。 */
  over?: number; back?: number; at?: [number, number];
  /** 先往反方向退多少 px，在 windupAt 时刻。 */
  windup?: number; windupAt?: number;
  /** 边飞边转：spin 度 × spinAt 曲线（[时刻, 比例]）；rotFrom 是起始角，线性归零。 */
  spin?: number; spinAt?: Track; rotFrom?: number;
  scale?: [number, number];
  /** 透明度曲线 [时刻, 透明度]，不给就不动透明度。 */
  fade?: Track | null;
  ms?: number; delay?: number; easing?: string; fill?: FillMode;
}
/** 沿直线飞，可冲过头、回落、边飞边转。发布菜单的图标就是它。 */
export function fly(el: Element, opts?: FlyOptions): Animation;
/** 从 source（叫出它的按钮）飞到自己的位置。先把元素放进页面再调用。 */
export function flyFrom(el: Element, source: Element, opts?: Omit<FlyOptions, 'from' | 'to'>): Animation;
/** 飞向 target（它要去的地方），越飞越小、最后淡掉；从此刻的位置出发。结束后由调用方移除元素。 */
export function flyTo(el: Element, target: Element, opts?: Omit<FlyOptions, 'from' | 'to'>): Animation;

/** 从 anchor 那边长出来（淡入 + 放大）；anchor 为 null 时用元素自己的 transform-origin。 */
export function growFrom(el: HTMLElement, anchor: Element | null, opts?: { fromScale?: number; ms?: number; delay?: number; easing?: string }): Animation;
/** 从此刻的样子接着淡出、缩小。 */
export function shrinkTo(el: HTMLElement, anchor: Element | null, opts?: { toScale?: number; ms?: number; easing?: string }): Animation;

/** 冒一下：from 0 = 从无到有（默认带淡入）；from 1 = 已经在的东西鼓一下。peak 冲大多少，dip 回缩多少。 */
export function pop(el: Element, opts?: { from?: number; peak?: number; dip?: number; at?: number; ms?: number; delay?: number; fade?: boolean; easing?: string; fill?: FillMode }): Animation;
/** 新出现的小东西冒出来：pop 的默认值。 */
export function popIn(el: Element, opts?: { delay?: number }): Animation;

/** 淡入，可从 from 偏移处滑回原位；从此刻的透明度接着走，本来就看得见时不再滑。 */
export function fadeIn(el: Element, opts?: { from?: [number, number]; ms?: number; delay?: number; easing?: string; fill?: FillMode }): Animation;
/** 淡出，从此刻的透明度接着走。 */
export function fadeOut(el: Element, opts?: { ms?: number; delay?: number; easing?: string; fill?: FillMode }): Animation;

export interface DropOptions {
  /** 负责摆动的内层元素（推荐）；不给就在同一个元素上叠加摆动。 */
  inner?: Element | null;
  /** 从多高掉下来 / 摔出多远（px），默认刚好出屏幕。 */
  height?: number | null;
  ms?: number;
}
/** 从上方掉进来，晃几下停住。返回位移那一段动画。 */
export function dropIn(el: Element, opts?: DropOptions & { swing?: [number, number, number, number] }): Animation;
/** 歪着摔出去，越落越快，从此刻的位置和角度接着走。返回位移那一段动画。 */
export function fallOut(el: Element, opts?: DropOptions & { tilt?: number }): Animation;

/** 转到 deg 度；from 不给就从此刻的角度接着转。 */
export function turnTo(el: Element, deg: number, opts?: { from?: number | null; ms?: number; delay?: number; easing?: string; fill?: FillMode }): Animation;

/** 阻尼：手指拖了 d px，东西实际走多远（越拖越沉，最多 max）。 */
export function rubber(d: number, opts?: { max?: number; resistance?: number }): number;

export interface MenuItem { id: string; label: string; icon?: string; color?: string }
export interface RadialMenuOptions<T extends MenuItem = MenuItem> {
  variant?: 'center' | 'corner';
  items: T[];
  /** 角落版加号在哪边，默认 'auto'（按加号在 host 左半还是右半判断）。 */
  side?: 'auto' | 'left' | 'right';
  host?: HTMLElement;
  label?: string;
  config?: Partial<MenuConfig>;
  onSelect?: (item: T) => void;
}
export function radialMenu<T extends MenuItem>(root: HTMLElement, opts: RadialMenuOptions<T>): Destroyable & {
  open(): Promise<void>; close(): Promise<void>; toggle(): void;
};

export interface TimeScrollerOptions {
  host?: HTMLElement;
  /** 每条记录的选择器，元素上要有 data-time（ISO 时间字符串）。 */
  itemSelector?: string;
  locale?: string;
  hour12?: boolean;
  now?: () => Date;
  /** true = 自画可拖的细滑块（kit 会藏起原生滚动条）；false = 用原生滚动条。页面自己别写隐藏滚动条的规则。 */
  thumb?: boolean;
}
export function timeScroller(scrollEl: HTMLElement, opts?: TimeScrollerOptions): Destroyable & { refresh(): void };

export type GlyphId =
  | 'photo' | 'place' | 'music' | 'thought' | 'sleep' | 'people' | 'food' | 'calendar' | 'home'
  | 'star' | 'lock' | 'heart' | 'check' | 'sun' | 'leaf' | 'flower' | 'snow';
/** 原创字形表（规则 13）：24 网格、实心、细节镂空。 */
export const GLYPHS: { id: GlyphId; label: string }[];
/** 字形 SVG 字符串，颜色跟 currentColor；给 label 时带 role="img" 和 aria-label，否则 aria-hidden。 */
export function glyphSvg(id: GlyphId | string, opts?: { label?: string }): string;

export type FaceId ='smile' | 'laugh' | 'gasp' | 'frown' | 'love';
export const FACES: { id: FaceId; label: string }[];
/** 原创的简笔脸 SVG 字符串。 */
export function faceSvg(id: FaceId | string): string;
export interface ReactionPickerOptions {
  host?: HTMLElement;
  faces?: { id: string; label: string }[];
  seen?: { count: number; total: number } | null;
  onPick?: (faceId: string) => void;
}
export function reactionPicker(anchor: HTMLElement, opts?: ReactionPickerOptions): Destroyable & {
  open(): void; close(): Promise<void>;
};

export interface DropModalOptions {
  host?: HTMLElement;
  content?: Node | null;
  /** 读屏念的名字。 */
  label?: string;
  /** Esc 和点背景能不能关，默认 true。 */
  dismissible?: boolean;
  role?: 'dialog' | 'alertdialog';
  /** 压暗深浅，默认 0.72。 */
  scrim?: number;
  onClose?: () => void;
}
export function dropModal(opts?: DropModalOptions): { open(): Promise<void>; close(): Promise<void>; el: HTMLElement };

export function pagerDots(scroller: HTMLElement, dots: HTMLElement): Destroyable;

export function coverHeader(scrollEl: HTMLElement, parts: {
  cover: HTMLElement; img?: HTMLElement | null; fade?: HTMLElement[]; compact?: HTMLElement | null;
}): Destroyable & { setPull(d: number): void };

export function pullToRefresh(scrollEl: HTMLElement, opts: {
  content: HTMLElement; head: HTMLElement; onPull?: (d: number) => void; onRefresh?: () => Promise<unknown>;
}): Destroyable;

export function popToggle(btn: HTMLElement, opts?: { on?: boolean; onChange?: (on: boolean) => void }): Destroyable;

export function relayLoader(el: HTMLElement, glyphs?: string[]): Destroyable;
