import * as colors from 'colors/safe';
import {table} from 'table';
import * as trakr from 'trakr';

export {Stats, Timer, TRACER} from 'trakr';  // TODO

export function aggregateStats(
    timers: trakr.Timer[], fn = trakr.Stats.median): Map<string, trakr.Stats> {
  const grouped: Map<string, trakr.Stats[]> = new Map();
  for (const timer of timers) {
    for (const [name, stats] of timer.stats().entries()) {
      const s = grouped.get(name) || [];
      if (!s.length) grouped.set(name, s);
      s.push(stats);
    }
  }

  const combined: Map<string, trakr.Stats> = new Map();
  for (const [name, stats] of grouped.entries()) {
    combined.set(name, {
      cnt: fn(stats.map(s => s.cnt)),
      sum: fn(stats.map(s => s.sum)),
      avg: fn(stats.map(s => s.avg)),
      var : fn(stats.map(s => s.var)),
      std: fn(stats.map(s => s.std)),
      sem: fn(stats.map(s => s.sem)),
      moe: fn(stats.map(s => s.moe)),
      rme: fn(stats.map(s => s.rme)),
      min: fn(stats.map(s => s.min)),
      max: fn(stats.map(s => s.max)),
      p50: fn(stats.map(s => s.p50)),
      p90: fn(stats.map(s => s.p90)),
      p95: fn(stats.map(s => s.p95)),
      p99: fn(stats.map(s => s.p99)),
    });
  }

  return combined;
}

type Formatted = string;
type Raw = (number|string);
type Data = Array<[Formatted[], Raw[]]>;
type SortFn = (header: string[], a: Raw[], b: Raw[]) => number;
type DisplayFn = (header: string[], data: Data, breaks?: number[]) => string;

export class Formatter {
  readonly full: boolean;
  readonly sort: SortFn|undefined;
  readonly fn: DisplayFn;

  constructor(
      full = false, sort: SortFn|undefined = SORT, fn: DisplayFn = TABLE) {
    this.full = full;
    this.sort = sort;
    this.fn = fn;
  }

  display(t: trakr.Timer): string {
    let out = '';

    const stats = t.stats();
    const total = t.duration;

    if (total) {
      out += `\n${colors.bold(colors.underline('Time'))}` +
          ` (${formatMillis(total)})\n`;
    }

    if (stats.size) {
      out += this.displayStats(stats, total);
    }

    if (t.counters.size) {
      if (!stats.size) out += '\n';
      out += `\n${colors.bold(colors.underline('Counters'))}\n`;
      out += this.displayCounters(t.counters);
    }

    return out;
  }

  displayStats(stats: Map<string, trakr.Stats>, total?: number): string {
    const header = ['name', 'sum', 'cnt', 'p50', 'p90', 'p95', 'p99'];
    if (this.full) header.push('min', 'max', 'avg', 'std');
    const maxes = (new Array(header.length)).fill(-Infinity);

    const data: Data = [];
    for (const [name, s] of stats.entries()) {
      const formatted: Formatted[] = [name];
      const raw: Raw[] = [name];
      for (let i = 1; i < header.length; i++) {
        const col = header[i] as keyof trakr.Stats;
        const r = s[col];
        raw.push(r);
        if (col === 'cnt') {
          formatted.push(`${r}`);
          continue;
        }
        let f = formatMillis(r as number);
        if (total) f += ` (${formatPercent(r, total)})`;
        formatted.push(f);
      }
      multimax(maxes, formatted);
      data.push([formatted, raw]);
    }

    let out = '';
    if (this.sort) data.sort((a, b) => this.sort!(header, a[1], b[1]));
    out += this.fn(header, data, maxes);

    return out;
  }

  displayCounters(counters: Map<string, number>): string {
    const header = ['name', 'count'];

    const groups = new Map();
    for (const [name, count] of counters.entries()) {
      const [prefix, suffix] = name.split(/:/, 2);
      let group = groups.get(prefix);
      if (!group) groups.set(prefix, (group = []));
      group.push([name, count]);
    }

    let out = '';
    for (const [group, data] of groups.entries()) {
      if (this.sort) {
        data.sort((a: Raw[], b: Raw[]) => this.sort!(header, a, b));
      }
      out += this.fn(header, data);
    }

    return out;
  }
}

export function TABLE(header: string[], data: Data, breaks?: number[]) {
  const formatted = header.length === 2 ? data : data.map(d => d[0]);
  const config = breaks && {
    columns: breaks.map((max, i) => {
      const conf: {wrapWord?: boolean, width?: number} = {wrapWord: true};
      if (i === 2) return conf;  // count

      let width = max;
      if (i === 0) {
        width = width > 20 ? 20 : width;
      } else if (width > 10) {
        width = 10;
      }
      conf.width = width;
      return conf;
    })
  };
  return table(
      [header.map(h => colors.bold(readable(h))), ...formatted], config);
}

export const CSV = sv(',');
export const TSV = sv('\t');

function sv(sep: string) {
  return (header: string[], data: Data) => {
    const d = header.length === 2 ? data : data.map(d => d[1]);
    return [header.map(readable), ...d].map(row => row.join(sep)).join('\n');
  };
}

export function formatMillis(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < 0.001) return `${decimal(ms * 1000 * 1000)}ns`;
  if (abs < 1) return `${decimal(ms * 1000)}\u03BCs`;
  if (abs < 1000) return `${decimal(ms)}ms`;
  return `${decimal(ms / 1000)}s`;
}

function decimal(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1) return n.toFixed(3);
  if (abs < 10) return n.toFixed(2);
  if (abs < 100) return n.toFixed(1);
  return n.toFixed();
}

function readable(s: string): string {
  if (s === 'cnt') return 'count';
  if (s === 'sum') return 'total';
  return s;
}

export function formatHHMMSS(ms: number, round?: boolean): string {
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

export function formatPercent(n: number, d: number): string {
  return `${(n * 100 / d).toFixed(2)}%`;
}

function multimax(maxes: number[], data: string[]) {
  for (let i = 0; i < data.length; i++) {
    const len = trakr.Stats.max(data[i].split(' ').map(d => d.length));
    if (len > maxes[i]) maxes[i] = len;
  }
}

// NOTE: sorts by 'total' for distribution stats and 'count' for counters.
export function SORT(header: string[], a: Raw[], b: Raw[]): number {
  return (b[1] as number) - (a[1] as number);
}

export const TABLE_FORMATTER = new Formatter(false, SORT, TABLE);
export const CSV_FORMATTER = new Formatter(false, SORT, CSV);
export const TSV_FORMATTER = new Formatter(false, SORT, TSV);
