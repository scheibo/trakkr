import * as colors from 'colors/safe';
import {table} from 'table';
import * as trakr from 'trakr';

export const TRACER = trakr.TRACER;

export interface TrackerOptions extends trakr.TrackerOptions {}

export class Tracker {
  static create(options?: TrackerOptions) {
    return new Tracker(trakr.Tracker.create(options));
  }

  private readonly delegate: trakr.Tracker;
  private readonly formatter: Formatter;

  constructor(delegate: trakr.Tracker, options?: FormatterOptions|Formatter) {
    this.delegate = delegate;
    this.formatter = Formatter.get(options);
  }

  get counters(): Map<string, number> {
    return this.delegate.counters;
  }

  count(name: string, val?: number) {
    this.delegate.count(name, val);
  }

  add(name: string, val: number) {
    this.delegate.add(name, val);
  }

  stats(pop?: boolean): Map<string, Stats> {
    return this.delegate.stats(pop);
  }

  format(options?: FormatterOptions|Formatter) {
    const formatter = options ? Formatter.get(options) : this.formatter;
    return formatter.formatTracker(this);
  }

  toString(): string {
    return this.format();
  }
}

export interface TimerOptions extends trakr.TimerOptions {}

export class Timer {
  static create(options?: TimerOptions) {
    return new Timer(trakr.Timer.create(options));
  }

  private readonly delegate: trakr.Timer;
  private readonly formatter: Formatter;

  constructor(delegate: trakr.Timer, options?: FormatterOptions|Formatter) {
    this.delegate = delegate;
    this.formatter = Formatter.get(options);
  }

  count(name: string, val?: number) {
    this.delegate.count(name, val);
  }

  get counters(): Map<string, number> {
    return this.delegate.counters;
  }

  get duration(): number|undefined {
    return this.delegate.duration;
  }

  start() {
    this.delegate.start();
  }

  stop() {
    this.delegate.stop();
  }

  stats(pop?: boolean): Map<string, Stats> {
    return this.delegate.stats(pop);
  }

  // tslint:disable-next-line:no-any
  time(name: string): (a: any) => any {
    return this.delegate.time(name);
  }

  format(options?: FormatterOptions|Formatter) {
    const formatter = options ? Formatter.get(options) : this.formatter;
    return formatter.formatTimer(this);
  }

  toString(): string {
    return this.format();
  }
}

// Critical Mann-Whitney U-values for 95% confidence.
// For more info see http://www.saburchill.com/IBbiology/stats/003.html.
// clang-format off
const TABLE = [
	[0, 1, 2],
	[1, 2, 3, 5],
	[1, 3, 5, 6, 8],
	[2, 4, 6, 8, 10, 13],
	[2, 4, 7, 10, 12, 15, 17],
	[3, 5, 8, 11, 14, 17, 20, 23],
	[3, 6, 9, 13, 16, 19, 23, 26, 30],
	[4, 7, 11, 14, 18, 22, 26, 29, 33, 37],
	[4, 8, 12, 16, 20, 24, 28, 33, 37, 41, 45],
	[5, 9, 13, 17, 22, 26, 31, 36, 40, 45, 50, 55],
	[5, 10, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59, 64],
	[6, 11, 15, 21, 26, 31, 37, 42, 47, 53, 59, 64, 70, 75],
	[6, 11, 17, 22, 28, 34, 39, 45, 51, 57, 63, 67, 75, 81, 87],
	[7, 12, 18, 24, 30, 36, 42, 48, 55, 61, 67, 74, 80, 86, 93, 99],
	[7, 13, 19, 25, 32, 38, 45, 52, 58, 65, 72, 78, 85, 92, 99, 106, 113],
	[8, 14, 20, 27, 34, 41, 48, 55, 62, 69, 76, 83, 90, 98, 105, 112, 119, 127],
	[8, 15, 22, 29, 36, 43, 50, 58, 65, 73, 80, 88, 96, 103, 111, 119, 126, 134, 142],
	[9, 16, 23, 30, 38, 45, 53, 61, 69, 77, 85, 93, 101, 109, 117, 125, 133, 141, 150, 158],
	[9, 17, 24, 32, 40, 48, 56, 64, 73, 81, 89, 98, 106, 115, 123, 132, 140, 149, 157, 166, 175],
	[10, 17, 25, 33, 42, 50, 59, 67, 76, 85, 94, 102, 111, 120, 129, 138, 147, 156, 165, 174, 183, 192],
	[10, 18, 27, 35, 44, 53, 62, 71, 80, 89, 98, 107, 117, 126, 135, 145, 154, 163, 173, 182, 192, 201, 211],
	[11, 19, 28, 37, 46, 55, 64, 74, 83, 93, 102, 112, 122, 132, 141, 151, 161, 171, 181, 191, 200, 210, 220, 230],
	[11, 20, 29, 38, 48, 57, 67, 77, 87, 97, 107, 118, 125, 138, 147, 158, 168, 178, 188, 199, 209, 219, 230, 240, 250],
	[12, 21, 30, 40, 50, 60, 70, 80, 90, 101, 111, 122, 132, 143, 154, 164, 175, 186, 196, 207, 218, 228, 239, 250, 261, 272],
	[13, 22, 32, 42, 52, 62, 73, 83, 94, 105, 116, 127, 138, 149, 160, 171, 182, 193, 204, 215, 226, 238, 249, 260, 271, 282, 294],
	[13, 23, 33, 43, 54, 65, 76, 87, 98, 109, 120, 131, 143, 154, 166, 177, 189, 200, 212, 223, 235, 247, 258, 270, 282, 293, 305, 317]
];
// clang-format on

export class Stats extends trakr.Stats {
  // Mann-Whitney U test comparison
  static utestCompare(control: number[], test: number[]) {
    if (control === test) return 0;

    const cc = control.length;
    const ct = test.length;
    const max = Math.max(cc, ct);
    const min = Math.min(cc, ct);

    const score = (x: number, ys: number[]) =>
        ys.reduce((sum, y) => sum + (y > x ? 0 : y < x ? 1 : 0.5), 0);
    const U = (xs: number[], ys: number[]) =>
        xs.reduce((sum, x) => sum + score(x, ys), 0);
    const uc = U(control, test);
    const ut = U(test, control);
    const u = Math.min(uc, ut);

    // Reject the null hypothesis the two samples come from the
    // same population (i.e. have the same median) if...
    if (cc + ct > 30) {
      // ...the z-stat is greater than 1.96 or less than -1.96
      // http://www.statisticslectures.com/topics/mannwhitneyu/
      const Z = (u: number) =>
          (u - ((cc * ct) / 2)) / Math.sqrt((cc * ct * (cc + ct + 1)) / 12);
      return Math.abs(Z(u)) > 1.96 ? (u === uc ? 1 : -1) : 0;
    }
    // ...the U value is less than or equal the critical U value.
    const critical = max < 5 || min < 3 ? 0 : TABLE[max - 5][min - 3];
    return u <= critical ? (u === uc ? 1 : -1) : 0;
  }

  // Percentile bootstrap confidence interval
  static bootstrap(
      control: number[], test: number[],
      random?: (min: number, max: number) => number) {
    const N = 1000;
    const d50 = new Array(N);
    const d90 = new Array(N);
    const d95 = new Array(N);
    const d99 = new Array(N);

    if (random) {
      random = (min: number, max: number) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
      };
    }

    const sample = (arr: number[], n: number) => {
      const sampled = [];
      const length = arr.length;
      for (let i = 0; i < n; i++) {
        sampled.push(arr[random!(0, length)]);
      }
      return sampled;
    };

    const percentiles = (arr: number[]) => {
      arr.sort((a, b) => a - b);
      return {
        p50: Stats.ptile(arr, 0.50),
        p90: Stats.ptile(arr, 0.90),
        p95: Stats.ptile(arr, 0.95),
        p99: Stats.ptile(arr, 0.99),
      };
    };

    const cc = Math.floor(control.length / 3);
    const ct = Math.floor(test.length / 3);
    for (let i = 0; i < N; i++) {
      const qc = percentiles(sample(control, cc));
      const qt = percentiles(sample(test, ct));

      d50[i] = qc.p50 - qt.p50;
      d90[i] = qc.p90 - qt.p90;
      d95[i] = qc.p95 - qt.p95;
      d99[i] = qc.p99 - qt.p99;
    }

    const md50 = Stats.mean(d50);
    const md90 = Stats.mean(d90);
    const md95 = Stats.mean(d95);
    const md99 = Stats.mean(d99);

    const ci = (d: number[], m: number) =>
        1.96 * Stats.standardDeviation(d, false, m);

    return {
      d50: md50,
      d90: md90,
      d95: md95,
      d99: md99,
      ci50: ci(d50, md50),
      ci90: ci(d90, md90),
      ci95: ci(d95, md95),
      ci99: ci(d99, md99),
    };
  }

  static aggregate(stats: Stats[], fn = Stats.median): Stats {
    const aggregated: {-readonly[P in keyof Stats]?: Array<Stats[P]>|
                       Stats[P]} = {};
    let k: keyof Stats;
    for (const s of stats) {
      for (k in s) {
        ((aggregated[k] = aggregated[k] || []) as number[]).push(s[k]);
      }
    }
    for (k in aggregated) {
      aggregated[k] = fn(aggregated[k] as number[]);
    }
    return aggregated as Stats;
  }
}

// clang-format off
const STATS: {[k in keyof Stats]: string} = {
  cnt: 'count',
  sum: 'total',
  avg: 'mean',
  var: 'variance',
  std: 'standard deviation',
  sem: 'standard error of mean',
  moe: 'margin of error',
  rme: 'relative margin of error',
  min: 'minimum',
  max: 'maximum',
  p50: '50th percentile',
  p90: '90th percentile',
  p95: '95th percentile',
  p99: '99th percentile',
};
// clang-format on

export interface FormatterOptions {}

export class Formatter {
  static get(options?: FormatterOptions|Formatter) {
    return options instanceof Formatter ? options : Formatter.create(options);
  }

  static create(options?: FormatterOptions) {
    return new Formatter(options);
  }

  constructor(options?: FormatterOptions) {
    // TODO
  }

  format(obj: Timer|Timer[]|Tracker|Tracker[]|Stats|Stats[]) {
    if (Array.isArray(obj)) {
      if (!obj.length) return '';
      const o = obj[0];
      if (o instanceof Tracker) return this.formatTrackers(obj as Tracker[]);
      if (o instanceof Timer) return this.formatTimers(obj as Timer[]);
      if (o instanceof Stats) return this.formatAllStats(obj as Stats[]);
      throw new TypeError('Invalid object type for format');
    }
    if (obj instanceof Tracker) return this.formatTracker(obj);
    if (obj instanceof Timer) return this.formatTimer(obj);
    if (obj instanceof Stats) return this.formatStats(obj);
    throw new TypeError('Invalid object type for format');
  }

  formatTracker(tracker: Tracker) {
    return '';  // TODO
  }

  formatTrackers(trackers: Tracker[]) {
    return '';  // TODO
  }

  formatTimer(timer: Timer) {
    return '';  // TODO
  }

  formatTimers(timers: Timer[]) {
    return '';  // TODO
  }

  formatStats(stats: Stats) {
    return '';  // TODO
  }

  formatAllStats(stats: Stats[]) {
    return '';  // TODO
  }

  static human(key: keyof Stats) {
    return STATS[key];
  }

  static millis(ms: number): string {
    const dec = Formatter.decimal;
    const abs = Math.abs(ms);
    if (abs < 0.001) return `${dec(ms * 1000 * 1000)}ns`;
    if (abs < 1) return `${dec(ms * 1000)}\u03BCs`;
    if (abs < 1000) return `${dec(ms)}ms`;
    return `${dec(ms / 1000)}s`;
  }

  static decimal(n: number): string {
    const abs = Math.abs(n);
    if (abs < 1) return n.toFixed(3);
    if (abs < 10) return n.toFixed(2);
    if (abs < 100) return n.toFixed(1);
    return n.toFixed();
  }

  static hhmmss(ms: number, round?: boolean): string {
    let s = ms / 1000;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s - (h * 3600)) / 60);
    s = s - (h * 3600) - (m * 60);
    if (round) s = Math.round(s);

    const mm = m < 10 ? `0${m}` : `${m}`;
    const ss = s < 10 ? `0${s}` : `${s}`;
    if (h > 0) {
      const hh = h < 10 ? `0${h}` : `${h}`;
      return `${hh}:${mm}:${ss}`;
    } else {
      return `${mm}:${ss}`;
    }
  }

  static percent(n: number, d: number): string {
    return `${(n * 100 / d).toFixed(2)}%`;
  }
}

function aggregateCounters<T>(
    ts: T[], fn: (t: T) => Map<string, number>): Map<string, number> {
  const aggregated = new Map();
  for (const t of ts) {
    for (const [name, sum] of fn(t).entries()) {
      aggregated.set(name, (aggregated.get(name) || 0) + sum);
    }
  }
  return aggregated;
}

function aggregateStats<T>(
    ts: T[], fn: (t: T) => Map<string, Stats>): Map<string, Stats> {
  const grouped = new Map();
  for (const t of ts) {
    for (const [name, stats] of fn(t).entries()) {
      const s = grouped.get(name) || [];
      if (!s.length) grouped.set(name, s);
      s.push(stats);
    }
  }

  const aggregated = new Map();
  for (const [name, stats] of grouped.entries()) {
    aggregated.set(name, Stats.aggregate(stats));
  }
  return aggregated;
}
