import * as colors from 'colors/safe';
import {table} from 'table';
import * as trakr from 'trakr';

export {Tracer, TRACER} from 'trakr';

export interface FormatterOptions {
}

export class Formatter {
  static create(options?: FormatterOptions) {
  }

  display(options?: FormatterOptions) {
  }
}

export abstract class Tracker extends trakr.Tracker {
  static create(options?: FormatterOptions & TrackerOptions) {
  }

  abstract display(options?: FormatterOptions | Formatter);
}

class FormattingTracker extends Tracker {
  protected readonly tracker: trakr.Tracker
  protected readonly options: FormatterOptions | Formatter;

  constructor(tracker: trakr.Tracker, options?: FormatterOptions | Formatter) {
    this.tracker = tracker;
    this.options = options;
  }

  display(options?: FormatterOptions | Formatter) {
    if (options) {
    } else {
      if (this.options instanceof Formatter) {
        this.options.format(this);
      } else {
        Formatter.create(this.options).display()
      }
  }
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

  display<T extends Tracker>(t: T): string {
    return t.display(this);
  }
}

export class Tracker extends trakr.Tracker {
  display(fmt: Formatter = TABLE_FORMATTER): string {
    // TODO
    return '';
  }
}

export class Timer extends trakr.Timer {
  display(fmt: Formatter = TABLE_FORMATTER): string {
    let out = '';

    const stats = this.stats();
    const total = this.duration;

    if (total) {
      out += `\n${colors.bold(colors.underline('Time'))}` +
          `(${Timer.format(total)})\n`;
    }

    if (stats.size) {
      const header = ['name', 'tot', 'cnt', 'p50', 'p90', 'p95', 'p99'];
      if (fmt.full) header.push('min', 'max', 'avg', 'std');
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
          let f = Timer.format(r as number);
          if (total) f += ` (${Timer.percent(r, total)})`;
          formatted.push(f);
        }
        multimax(maxes, formatted);
        data.push([formatted, raw]);
      }

      if (fmt.sort) data.sort((a, b) => fmt.sort!(header, a[1], b[1]));
      out += fmt.fn(header, data, maxes);
    }

    if (this.counters.size) {
      if (!stats.size) out += '\n';
      out += `\n${colors.bold(colors.underline('Counters'))}\n`;

      const header = ['name', 'count'];

      const groups = new Map();
      for (const [name, count] of this.counters.entries()) {
        const [prefix, suffix] = name.split(/:/, 2);
        let group = groups.get(prefix);
        if (!group) groups.set(prefix, (group = []));
        group.push([name, count]);
      }

      for (const [group, data] of groups.entries()) {
        if (fmt.sort) {
          data.sort((a: Raw[], b: Raw[]) => fmt.sort!(header, a, b));
        }
        out += fmt.fn(header, data);
      }
    }

    return out;
  }

  static percent(n: number, d: number): string {
    return `${(n * 100 / d).toFixed(2)}%`;
  }
}

export class Stats extends trakr.Stats {}

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

function readable(s: string): string {
  if (s === 'cnt') return 'count';
  if (s === 'tot') return 'total';
  return s;
}

function multimax(maxes: number[], data: string[]) {
  for (let i = 0; i < data.length; i++) {
    const len = Stats.max(data[i].split(' ').map(d => d.length));
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
