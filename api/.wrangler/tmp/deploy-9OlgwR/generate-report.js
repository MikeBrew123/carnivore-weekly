var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var isWorkerdProcessV2 = globalThis.Cloudflare.compatibilityFlags.enable_nodejs_process_v2;
var unenvProcess = new Process({
  env: globalProcess.env,
  // `hrtime` is only available from workerd process v2
  hrtime: isWorkerdProcessV2 ? workerdProcess.hrtime : hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  // Always implemented by workerd
  env,
  // Only implemented in workerd v2
  hrtime: hrtime3,
  // Always implemented by workerd
  nextTick
} = unenvProcess;
var {
  _channel,
  _disconnect,
  _events,
  _eventsCount,
  _handleQueue,
  _maxListeners,
  _pendingMessage,
  _send,
  assert: assert2,
  disconnect,
  mainModule
} = unenvProcess;
var {
  // @ts-expect-error `_debugEnd` is missing typings
  _debugEnd,
  // @ts-expect-error `_debugProcess` is missing typings
  _debugProcess,
  // @ts-expect-error `_exiting` is missing typings
  _exiting,
  // @ts-expect-error `_fatalException` is missing typings
  _fatalException,
  // @ts-expect-error `_getActiveHandles` is missing typings
  _getActiveHandles,
  // @ts-expect-error `_getActiveRequests` is missing typings
  _getActiveRequests,
  // @ts-expect-error `_kill` is missing typings
  _kill,
  // @ts-expect-error `_linkedBinding` is missing typings
  _linkedBinding,
  // @ts-expect-error `_preload_modules` is missing typings
  _preload_modules,
  // @ts-expect-error `_rawDebug` is missing typings
  _rawDebug,
  // @ts-expect-error `_startProfilerIdleNotifier` is missing typings
  _startProfilerIdleNotifier,
  // @ts-expect-error `_stopProfilerIdleNotifier` is missing typings
  _stopProfilerIdleNotifier,
  // @ts-expect-error `_tickCallback` is missing typings
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  availableMemory,
  // @ts-expect-error `binding` is missing typings
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  // @ts-expect-error `domain` is missing typings
  domain,
  emit,
  emitWarning,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  // @ts-expect-error `initgroups` is missing typings
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  memoryUsage,
  // @ts-expect-error `moduleLoadList` is missing typings
  moduleLoadList,
  off,
  on,
  once,
  // @ts-expect-error `openStdin` is missing typings
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  // @ts-expect-error `reallyExit` is missing typings
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = isWorkerdProcessV2 ? workerdProcess : unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// generate-report.js
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
var foodDatabase = {
  proteins: [
    // Beef
    { name: "Ground Beef (80/20)", category: "Beef", diet: ["Carnivore", "Strict Carnivore", "Keto", "Lion"], cost: ["tight", "moderate", "premium"], calories: 290, protein: 20, fat: 23, carbs: 0 },
    { name: "Grass-fed Ground Beef", category: "Beef", diet: ["Carnivore", "Strict Carnivore", "Keto"], cost: ["moderate", "premium"], calories: 280, protein: 21, fat: 22, carbs: 0 },
    { name: "Ribeye Steak", category: "Beef", diet: ["Carnivore", "Strict Carnivore", "Keto", "Lion"], cost: ["moderate", "premium"], calories: 291, protein: 24, fat: 23, carbs: 0 },
    { name: "NY Strip Steak", category: "Beef", diet: ["Carnivore", "Strict Carnivore", "Keto", "Lion"], cost: ["moderate", "premium"], calories: 271, protein: 27, fat: 18, carbs: 0 },
    { name: "Chuck Steak", category: "Beef", diet: ["Carnivore", "Strict Carnivore", "Keto", "Lion"], cost: ["tight", "moderate"], calories: 300, protein: 22, fat: 24, carbs: 0 },
    { name: "Beef Brisket", category: "Beef", diet: ["Carnivore", "Strict Carnivore", "Keto", "Lion"], cost: ["tight", "moderate"], calories: 289, protein: 26, fat: 21, carbs: 0 },
    { name: "Beef Liver", category: "Beef Organs", diet: ["Carnivore", "Strict Carnivore", "Keto", "Lion"], cost: ["tight", "moderate"], calories: 165, protein: 26, fat: 6, carbs: 5 },
    { name: "Beef Heart", category: "Beef Organs", diet: ["Carnivore", "Strict Carnivore", "Keto", "Lion"], cost: ["tight"], calories: 96, protein: 17, fat: 3.5, carbs: 0.2 },
    // Lamb
    { name: "Ground Lamb", category: "Lamb", diet: ["Carnivore", "Strict Carnivore", "Keto"], cost: ["moderate", "premium"], calories: 282, protein: 23, fat: 22, carbs: 0 },
    { name: "Lamb Chops", category: "Lamb", diet: ["Carnivore", "Strict Carnivore", "Keto"], cost: ["moderate", "premium"], calories: 294, protein: 25, fat: 22, carbs: 0 },
    // Pork
    { name: "Pork Chops", category: "Pork", diet: ["Carnivore", "Keto"], cost: ["tight", "moderate"], calories: 242, protein: 27, fat: 14, carbs: 0 },
    { name: "Bacon", category: "Pork", diet: ["Carnivore", "Keto", "Lion"], cost: ["tight", "moderate"], calories: 541, protein: 37, fat: 43, carbs: 1 },
    // Fish
    { name: "Salmon Fillet (wild)", category: "Fish", diet: ["Pescatarian", "Carnivore", "Keto"], cost: ["moderate", "premium"], calories: 280, protein: 25, fat: 20, carbs: 0 },
    { name: "Salmon Fillet (farmed)", category: "Fish", diet: ["Pescatarian", "Carnivore", "Keto"], cost: ["tight", "moderate"], calories: 208, protein: 20, fat: 13, carbs: 0 },
    { name: "Canned Salmon (in oil)", category: "Fish", diet: ["Pescatarian", "Carnivore", "Keto"], cost: ["tight", "moderate"], calories: 220, protein: 20, fat: 15, carbs: 0 },
    { name: "Mackerel", category: "Fish", diet: ["Pescatarian", "Carnivore", "Keto"], cost: ["tight", "moderate"], calories: 305, protein: 20, fat: 25, carbs: 0 },
    { name: "Sardines (in oil)", category: "Fish", diet: ["Pescatarian", "Carnivore", "Keto"], cost: ["tight", "moderate"], calories: 208, protein: 25, fat: 11, carbs: 0 },
    { name: "Herring", category: "Fish", diet: ["Pescatarian", "Carnivore", "Keto"], cost: ["tight", "moderate"], calories: 206, protein: 20, fat: 13, carbs: 0 },
    { name: "Cod Fillet", category: "Fish", diet: ["Pescatarian", "Carnivore", "Keto"], cost: ["moderate"], calories: 82, protein: 18, fat: 0.7, carbs: 0 },
    { name: "Tuna Steak", category: "Fish", diet: ["Pescatarian", "Carnivore", "Keto"], cost: ["moderate", "premium"], calories: 132, protein: 23, fat: 4.6, carbs: 0 },
    // Poultry
    { name: "Eggs", category: "Eggs", diet: ["Carnivore", "Keto", "Pescatarian", "Lion"], cost: ["tight", "moderate"], calories: 155, protein: 13, fat: 11, carbs: 1.1 },
    { name: "Chicken Thighs", category: "Poultry", diet: ["Carnivore", "Keto"], cost: ["tight", "moderate"], calories: 209, protein: 22, fat: 13, carbs: 0 },
    { name: "Duck", category: "Poultry", diet: ["Carnivore", "Keto"], cost: ["moderate", "premium"], calories: 337, protein: 19, fat: 29, carbs: 0 }
  ],
  pantryItems: [
    { name: "Salt (Redmond Real Salt)", category: "Pantry", diet: ["Carnivore", "Strict Carnivore", "Keto", "Pescatarian", "Lion"], cost: ["tight", "moderate", "premium"], calories: 0, protein: 0, fat: 0, carbs: 0 },
    { name: "Quality Salt", category: "Pantry", diet: ["Carnivore", "Strict Carnivore", "Keto", "Pescatarian", "Lion"], cost: ["tight", "moderate"], calories: 0, protein: 0, fat: 0, carbs: 0 }
  ],
  fats: [
    { name: "Butter", category: "Dairy", diet: ["Carnivore", "Keto", "Pescatarian"], cost: ["tight", "moderate", "premium"], calories: 717, protein: 0.9, fat: 81, carbs: 0.1 },
    { name: "Grass-fed Butter", category: "Dairy", diet: ["Carnivore", "Keto", "Pescatarian"], cost: ["moderate", "premium"], calories: 717, protein: 0.9, fat: 81, carbs: 0.1 },
    { name: "Ghee", category: "Dairy", diet: ["Carnivore", "Keto", "Pescatarian"], cost: ["moderate", "premium"], calories: 900, protein: 0, fat: 100, carbs: 0 }
  ],
  vegetables: [
    { name: "Spinach", category: "Vegetables", diet: ["Keto"], cost: ["tight", "moderate"], allergies: [], carbs: 3.6 },
    { name: "Leafy Greens", category: "Vegetables", diet: ["Keto"], cost: ["tight", "moderate"], allergies: [], carbs: 4 },
    { name: "Broccoli", category: "Vegetables", diet: ["Keto"], cost: ["tight", "moderate"], allergies: [], carbs: 7 },
    { name: "Cauliflower", category: "Vegetables", diet: ["Keto"], cost: ["tight", "moderate"], allergies: [], carbs: 5 },
    { name: "Asparagus", category: "Vegetables", diet: ["Keto"], cost: ["moderate", "premium"], allergies: [], carbs: 2 }
  ],
  other: [
    { name: "Filtered Water", category: "Beverages", diet: ["Carnivore", "Keto", "Pescatarian", "Lion"], cost: ["tight"], calories: 0, protein: 0, fat: 0, carbs: 0 }
  ]
};
function generateFullMealPlan(data) {
  const diet = data.selectedProtocol || "Carnivore";
  const budget = data.budget || "moderate";
  const availableProteins = foodDatabase.proteins.filter(
    (p) => p.diet.includes(diet) && p.cost.includes(budget)
  );
  if (availableProteins.length === 0) {
    availableProteins.push(...foodDatabase.proteins.filter(
      (p) => p.diet.includes("Carnivore")
    ));
  }
  const mealPlan = {
    weeks: []
  };
  for (let week = 1; week <= 4; week++) {
    const weekMeals = {
      weekNumber: week,
      days: []
    };
    for (let day = 1; day <= 7; day++) {
      const dayNum = (week - 1) * 7 + day;
      const proteinIndex = dayNum % availableProteins.length;
      const mainProtein = availableProteins[proteinIndex];
      const altProtein = availableProteins[(proteinIndex + 1) % availableProteins.length];
      let breakfast, lunch, dinner;
      if (diet.includes("Lion")) {
        breakfast = `${mainProtein.name} + Salt`;
        lunch = `${mainProtein.name} + Salt`;
        dinner = `${mainProtein.name} + Salt`;
      } else if (diet.includes("Strict Carnivore")) {
        breakfast = `${mainProtein.name} + Eggs + Butter`;
        lunch = `${mainProtein.name} + Salt`;
        dinner = `${altProtein.name} + Butter`;
      } else if (diet.includes("Pescatarian")) {
        breakfast = `Eggs + ${mainProtein.name} + Butter`;
        lunch = `${mainProtein.name} + Salt`;
        dinner = `${altProtein.name} + Butter`;
      } else if (diet.includes("Keto")) {
        breakfast = `Eggs + ${mainProtein.name} + Avocado`;
        lunch = `${mainProtein.name} + Leafy Greens + Butter`;
        dinner = `${altProtein.name} + Broccoli + Oil`;
      } else {
        breakfast = `${mainProtein.name} + Eggs + Butter`;
        lunch = `${mainProtein.name} + Salt`;
        dinner = `${altProtein.name} + Butter`;
      }
      weekMeals.days.push({
        dayNumber: dayNum,
        breakfast,
        lunch,
        dinner
      });
    }
    mealPlan.weeks.push(weekMeals);
  }
  return mealPlan;
}
__name(generateFullMealPlan, "generateFullMealPlan");
function generateGroceryListByWeek(data) {
  const diet = data.selectedProtocol || "Carnivore";
  const budget = data.budget || "moderate";
  const allergies = (data.allergies || "").toLowerCase();
  let proteins = foodDatabase.proteins.filter(
    (p) => p.diet.includes(diet) && p.cost.includes(budget) && !p.name.toLowerCase().includes("dairy")
  );
  if (proteins.length === 0) {
    proteins = foodDatabase.proteins.filter(
      (p) => p.diet.includes("Carnivore") && !p.name.toLowerCase().includes("dairy")
    );
  }
  if (proteins.length === 0) {
    proteins = foodDatabase.proteins.filter(
      (p) => !p.name.toLowerCase().includes("dairy")
    );
  }
  let fats = foodDatabase.fats.filter(
    (f) => f.diet.includes(diet) && f.cost.includes(budget)
  );
  if (fats.length === 0) {
    fats = foodDatabase.fats.filter(
      (f) => f.diet.includes("Carnivore")
    );
  }
  if (fats.length === 0) {
    fats = foodDatabase.fats;
  }
  const groceryLists = {};
  for (let week = 1; week <= 4; week++) {
    const protein1 = proteins.length > 0 ? proteins[(week - 1) % proteins.length] : { name: "Ground Beef", quantity: "5 lbs" };
    const protein2 = proteins.length > 1 ? proteins[week % proteins.length] : { name: "Beef Liver", quantity: "1-2 units" };
    const fat1 = fats.length > 0 ? fats[0] : { name: "Butter", quantity: "1 lb" };
    groceryLists[`week${week}`] = {
      weekNumber: week,
      proteins: [
        {
          name: protein1.name || "Ground Beef",
          quantity: protein1.quantity || "5 lbs"
        },
        {
          name: protein2.name || "Beef Liver",
          quantity: protein2.quantity || "1-2 units"
        }
      ],
      fats: [
        {
          name: fat1.name || "Butter",
          quantity: fat1.quantity || "1 lb"
        }
      ],
      pantry: [
        {
          name: "Salt (Redmond Real Salt)",
          quantity: "1 container",
          category: "Pantry"
        }
      ]
    };
  }
  return groceryLists;
}
__name(generateGroceryListByWeek, "generateGroceryListByWeek");
var generate_report_default = {
  async fetch(request, env2) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders
      });
    }
    try {
      const data = await request.json();
      if (!data.email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const startTime = Date.now();
      console.log("[Report Generation] Starting report generation for:", data.email);
      const reports = await generateAllReports(data, env2.ANTHROPIC_API_KEY);
      const reportTime = Date.now() - startTime;
      console.log(`[Report Generation] Reports completed in ${reportTime}ms`);
      const combineStart = Date.now();
      const combinedReport = combineReports(reports);
      const combineTime = Date.now() - combineStart;
      console.log(`[Report Generation] Report combining completed in ${combineTime}ms`);
      console.log("[Report Generation] Sending response to client");
      return new Response(JSON.stringify({
        success: true,
        report: combinedReport,
        email: data.email,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error3) {
      console.error("Error generating reports:", error3);
      return new Response(JSON.stringify({
        error: "Failed to generate reports",
        details: error3.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
async function generateAllReports(data, apiKey) {
  const reports = {};
  try {
    console.log("[generateAllReports] Starting AI reports...");
    const aiReports = await generateAIReports(data, apiKey);
    reports[1] = aiReports.summary;
    reports[6] = aiReports.obstacle;
    console.log("[generateAllReports] AI reports completed");
    console.log("[generateAllReports] Loading template reports...");
    reports[2] = await loadAndCustomizeTemplate("foodGuide", data);
    console.log("[generateAllReports] Report #2 loaded");
    reports[3] = await loadAndCustomizeTemplate("mealCalendar", data);
    console.log("[generateAllReports] Report #3 loaded");
    reports[4] = await loadAndCustomizeTemplate("shoppingList", data);
    console.log("[generateAllReports] Report #4 loaded");
    reports[5] = await loadAndCustomizeTemplate("physicianConsult", data);
    console.log("[generateAllReports] Report #5 loaded");
    reports[7] = await loadAndCustomizeTemplate("restaurant", data);
    console.log("[generateAllReports] Report #7 loaded");
    reports[8] = await loadAndCustomizeTemplate("science", data);
    console.log("[generateAllReports] Report #8 loaded");
    reports[9] = await loadAndCustomizeTemplate("labs", data);
    console.log("[generateAllReports] Report #9 loaded");
    reports[10] = await loadAndCustomizeTemplate("electrolytes", data);
    console.log("[generateAllReports] Report #10 loaded");
    reports[11] = await loadAndCustomizeTemplate("timeline", data);
    console.log("[generateAllReports] Report #11 loaded");
    reports[12] = await loadAndCustomizeTemplate("stallBreaker", data);
    console.log("[generateAllReports] Report #12 loaded");
    reports[13] = await loadAndCustomizeTemplate("tracker", data);
    console.log("[generateAllReports] Report #13 loaded - All reports complete");
    return reports;
  } catch (error3) {
    console.error("[generateAllReports] ERROR:", error3.message);
    console.error("[generateAllReports] Stack:", error3.stack);
    throw error3;
  }
}
__name(generateAllReports, "generateAllReports");
function combineReports(reports) {
  let combined = "# Your Complete Personalized Carnivore Diet Report\n\n";
  combined += `*Generated on ${(/* @__PURE__ */ new Date()).toLocaleDateString()}*

`;
  for (let i = 1; i <= 13; i++) {
    if (reports[i]) {
      if (i > 1) {
        combined += "\n\n---\n\n";
      } else {
        combined += "\n\n";
      }
      combined += reports[i];
    }
  }
  return wrapInPrintHTML(combined);
}
__name(combineReports, "combineReports");
function wrapInPrintHTML(markdownContent) {
  const printCSS = `
    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 100%;
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
      background: #fff;
    }

    body {
      padding: 12mm 15mm;
      max-width: 210mm;
      margin: 0 auto;
    }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      font-weight: bold;
      page-break-after: avoid;
      break-after: avoid;
      page-break-inside: avoid;
      break-inside: avoid;
      orphans: 3;
      widows: 3;
    }

    h1 {
      font-size: 16pt;
      background-color: #f5f1ed;
      padding: 10pt 8pt;
      margin-top: 0pt;
      margin-bottom: 12pt;
      color: #1a1a1a;
      letter-spacing: 0.5pt;
    }

    h2 {
      font-size: 13pt;
      margin-top: 16pt;
      margin-bottom: 8pt;
      color: #2c2c2c;
      font-weight: bold;
      page-break-before: always;
      break-before: page;
    }

    h2:first-of-type {
      margin-top: 8pt;
      page-break-before: avoid;
      break-before: avoid;
    }

    h3 {
      font-size: 11pt;
      margin-top: 10pt;
      margin-bottom: 6pt;
      color: #333;
      font-weight: bold;
    }

    h4 {
      font-size: 10pt;
      margin-top: 8pt;
      margin-bottom: 4pt;
      color: #444;
      font-weight: bold;
    }

    /* Paragraphs */
    p {
      margin: 0 0 8pt 0;
      text-align: left;
      line-height: 1.5;
      orphans: 2;
      widows: 2;
    }

    /* Keep heading with following paragraph */
    h1 + p, h2 + p, h3 + p, h4 + p {
      margin-top: 0pt;
    }

    /* Reduce space between consecutive elements */
    h1 + h2,
    h2 + h3,
    h3 + h4 {
      margin-top: 4pt;
    }

    /* Lists */
    ul, ol {
      margin: 8pt 0 8pt 40pt;
      padding-left: 20pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    li {
      margin-bottom: 6pt;
      margin-left: 20pt;
      text-align: left;
    }

    /* Horizontal rules - section dividers */
    hr {
      border: none;
      border-top: 1pt solid #ccc;
      margin: 20pt 0;
      padding: 0;
      height: 0;
      page-break-after: avoid;
      break-after: avoid;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14pt 0;
      page-break-inside: avoid;
      break-inside: avoid;
      font-size: 10pt;
      line-height: 1.4;
    }

    thead {
      display: table-header-group;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    th {
      background-color: #e8e8e8;
      color: #000;
      font-weight: bold;
      padding: 8pt 10pt;
      text-align: left;
      border: 1pt solid #999;
      font-size: 10pt;
    }

    td {
      padding: 7pt 10pt;
      border: 1pt solid #999;
      text-align: left;
      vertical-align: top;
    }

    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    tr:nth-child(even) {
      background-color: #fafafa;
    }

    tr:first-child {
      background-color: #e8e8e8;
    }

    /* Code blocks */
    code {
      font-family: 'Courier New', monospace;
      font-size: 9pt;
      background: #f5f5f5;
      padding: 2pt 4pt;
    }

    pre {
      background: #f5f5f5;
      padding: 10pt;
      border-left: 2pt solid #999;
      margin: 10pt 0;
      font-size: 9pt;
      page-break-inside: avoid;
      break-inside: avoid;
      overflow-x: auto;
    }

    /* Blockquotes */
    blockquote {
      margin: 12pt 0 12pt 20pt;
      padding-left: 10pt;
      border-left: 3pt solid #ccc;
      font-style: italic;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Links - show URL in print */
    a {
      color: #0066cc;
      text-decoration: none;
    }

    a[href]:after {
      content: " (" attr(href) ")";
      font-size: 8pt;
      color: #666;
    }

    /* Images */
    img {
      max-width: 100%;
      height: auto;
      margin: 10pt 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Emphasis */
    strong, b {
      font-weight: bold;
    }

    em, i {
      font-style: italic;
    }

    /* Utilities */
    .page-break {
      page-break-before: always;
      break-before: page;
    }

    .no-print {
      display: none !important;
    }

    /* Ensure text is black for print */
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }

    /* Report sections */
    .report-section {
      page-break-after: avoid;
      break-after: avoid;
      margin-bottom: 30pt;
    }

    /* Prevent orphans and widows */
    p {
      orphans: 3;
      widows: 3;
    }
  `;
  const generatedDate = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  let contentHTML = markdownToHTML(markdownContent);
  contentHTML = contentHTML.replace(/<h1>[^<]*<\/h1>\n?/, "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personalized Carnivore Diet Report</title>
  <style>
    ${printCSS}

    /* Cover page styles */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      page-break-after: always;
      break-after: page;
      text-align: center;
      padding: 0;
      margin: 0;
    }

    .cover-logo {
      margin-bottom: 40pt;
    }

    .cover-logo img {
      max-width: 400pt;
      max-height: 400pt;
      width: auto;
      height: auto;
      object-fit: contain;
    }

    .cover-title {
      font-size: 36pt;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 60pt;
      line-height: 1.3;
      max-width: 500pt;
    }

    .cover-date {
      font-size: 14pt;
      color: #666;
      margin-top: auto;
      padding-bottom: 40pt;
    }

    .content-start {
      page-break-before: always;
      break-before: page;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-logo">
      <img src="https://carnivoreweekly.com/CarnivoreWeeklySquare.png" alt="Carnivore Weekly Logo" />
    </div>
    <h1 class="cover-title">Your Complete Personalized<br>Carnivore Diet Report</h1>
    <div class="cover-date">Generated on ${generatedDate}</div>
  </div>

  <!-- Content Pages -->
  <div class="content-start report-content">
    ${contentHTML}
  </div>
</body>
</html>`;
}
__name(wrapInPrintHTML, "wrapInPrintHTML");
function markdownToHTML(markdown) {
  const lines = markdown.split("\n");
  let html = "";
  let currentParagraph = [];
  let inList = false;
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^#+\s/.test(line)) {
      if (currentParagraph.length > 0) {
        html += "<p>" + currentParagraph.join("\n") + "</p>\n";
        currentParagraph = [];
      }
      if (inList) {
        html += "</ul>\n";
        inList = false;
      }
      if (inTable) {
        html += "</table>\n";
        inTable = false;
      }
      const level = line.match(/^#+/)[0].length;
      const title2 = line.replace(/^#+\s*/, "");
      html += `<h${level}>${escapeHTML(title2)}</h${level}>
`;
    } else if (/^---+$/.test(line)) {
      if (currentParagraph.length > 0) {
        html += "<p>" + currentParagraph.join("\n") + "</p>\n";
        currentParagraph = [];
      }
      html += "<hr>\n";
    } else if (line.trim() === "") {
      if (currentParagraph.length > 0) {
        html += "<p>" + currentParagraph.join("\n") + "</p>\n";
        currentParagraph = [];
      }
      if (inList) {
        html += "</ul>\n";
        inList = false;
      }
      if (inTable) {
        html += "</table>\n";
        inTable = false;
      }
    } else if (/^[\*\-]\s/.test(line)) {
      if (!inList && currentParagraph.length > 0) {
        html += "<p>" + currentParagraph.join("\n") + "</p>\n";
        currentParagraph = [];
      }
      if (!inList) {
        html += "<ul>\n";
        inList = true;
      }
      const item = line.replace(/^[\*\-]\s*/, "");
      html += `<li>${escapeHTML(item)}</li>
`;
    } else if (/^\|.*\|$/.test(line)) {
      if (currentParagraph.length > 0) {
        html += "<p>" + currentParagraph.join("\n") + "</p>\n";
        currentParagraph = [];
      }
      const cells = line.split("|").filter((c) => c.trim());
      const isSeparator = cells.every((cell) => /^[:|-]+$/.test(cell.trim()));
      if (isSeparator) {
        continue;
      }
      const isPlaceholder = cells.every((cell) => {
        const trimmed = cell.trim();
        return /^[-_☐\s]+$/.test(trimmed) || trimmed === "";
      });
      if (isPlaceholder) {
        continue;
      }
      if (!inTable) {
        html += "<table>\n";
        inTable = true;
      }
      html += "<tr>\n";
      cells.forEach((cell) => {
        const content = cell.trim();
        if (/^[-_☐\s]+$/.test(content) || content === "") {
          html += "<td></td>\n";
        } else if (!/^-+$/.test(content)) {
          html += `<td>${escapeHTML(content)}</td>
`;
        }
      });
      html += "</tr>\n";
    } else if (line.trim()) {
      if (inList) {
        html += "</ul>\n";
        inList = false;
      }
      if (inTable) {
        html += "</table>\n";
        inTable = false;
      }
      currentParagraph.push(line);
    }
  }
  if (currentParagraph.length > 0) {
    html += "<p>" + currentParagraph.join("\n") + "</p>\n";
  }
  if (inList) {
    html += "</ul>\n";
  }
  if (inTable) {
    html += "</table>\n";
  }
  html = applyInlineFormatting(html);
  return html;
}
__name(markdownToHTML, "markdownToHTML");
function applyInlineFormatting(html) {
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; margin: 12pt 0;">');
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return html;
}
__name(applyInlineFormatting, "applyInlineFormatting");
function escapeHTML(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
__name(escapeHTML, "escapeHTML");
async function generateAIReports(data, apiKey) {
  const summaryPrompt = buildExecutiveSummaryPrompt(data);
  const summary = await callClaudeAPI(
    apiKey,
    buildExecutiveSummarySystemPrompt(),
    summaryPrompt,
    2e3
  );
  const obstaclePrompt = buildObstacleProtocolPrompt(data);
  const obstacle = await callClaudeAPI(
    apiKey,
    buildObstacleProtocolSystemPrompt(),
    obstaclePrompt,
    2500
  );
  return {
    summary: `## Report #1: Your Personalized Protocol

${summary}`,
    obstacle: `## Report #6: Conquering Your Kryptonite

${obstacle}`
  };
}
__name(generateAIReports, "generateAIReports");
async function callClaudeAPI(apiKey, systemPrompt, userPrompt, maxTokens) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-opus-4-5-20251101",
      max_tokens: maxTokens,
      temperature: 1,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: userPrompt
      }]
    })
  });
  if (!response.ok) {
    const error3 = await response.json();
    throw new Error(`Claude API error: ${JSON.stringify(error3)}`);
  }
  const result = await response.json();
  return result.content[0].text;
}
__name(callClaudeAPI, "callClaudeAPI");
async function loadAndCustomizeTemplate(templateName, data) {
  const templates = {
    foodGuide: getTemplateContent("foodGuide", data.selectedProtocol),
    mealCalendar: getTemplateContent("mealCalendar"),
    shoppingList: getTemplateContent("shoppingList"),
    physicianConsult: getTemplateContent("physicianConsult", data),
    restaurant: getTemplateContent("restaurant"),
    science: getTemplateContent("science", data.selectedProtocol),
    labs: getTemplateContent("labs"),
    electrolytes: getTemplateContent("electrolytes"),
    timeline: getTemplateContent("timeline"),
    stallBreaker: getTemplateContent("stallBreaker"),
    tracker: getTemplateContent("tracker")
  };
  let template = templates[templateName] || "";
  template = replacePlaceholders(template, data);
  return template;
}
__name(loadAndCustomizeTemplate, "loadAndCustomizeTemplate");
function evaluateCondition(expr, data) {
  const eqMatch = expr.match(/(\w+)\s*===\s*['"]([^'"]+)['"]/);
  if (eqMatch) {
    const [, field, value] = eqMatch;
    return data[field] === value;
  }
  return false;
}
__name(evaluateCondition, "evaluateCondition");
function replacePlaceholders(template, data) {
  let result = template;
  result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
    const elseIfRegex = /\{\{else\s+if\s+([^}]+)\}\}([\s\S]*?)(?=\{\{(?:else|\/if)\}\})/g;
    const elseRegex = /\{\{else\}\}([\s\S]*?)$/;
    let mainCondition = evaluateCondition(condition, data);
    if (mainCondition) {
      const beforeElse = content.split(/\{\{else\s+if|\{\{else\}\}/)[0];
      return beforeElse;
    }
    let elseIfMatch;
    let remaining = content;
    while ((elseIfMatch = elseIfRegex.exec(content)) !== null) {
      if (evaluateCondition(elseIfMatch[1], data)) {
        return elseIfMatch[2];
      }
    }
    const elseMatch = content.match(/\{\{else\}\}([\s\S]*?)$/);
    if (elseMatch) {
      return elseMatch[1];
    }
    return "";
  });
  const currentDate = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  result = result.replace(/\{\{currentDate\}\}/g, currentDate);
  result = result.replace(/\{\{firstName\}\}/g, data.firstName || "Friend");
  result = result.replace(/\{\{diet\}\}/g, data.selectedProtocol || "Carnivore");
  result = result.replace(/\{\{selectedProtocol\}\}/g, data.selectedProtocol || "Carnivore");
  result = result.replace(/\{\{goal\}\}/g, data.goal || "Health Optimization");
  result = result.replace(/\{\{budget\}\}/g, data.budget || "Moderate");
  result = result.replace(/\{\{mealPrepTime\}\}/g, data.mealPrepTime || "Some");
  result = result.replace(/\{\{weight\}\}/g, data.weight || "");
  const allergyText = data.allergies ? data.allergies : "No known allergies";
  const conditionText = Array.isArray(data.conditions) ? data.conditions.join(", ") : data.conditions ? data.conditions : "No significant health conditions";
  const medicationText = Array.isArray(data.medications) ? data.medications.join(", ") : data.medications ? data.medications : "Not taking medications";
  const symptomText = Array.isArray(data.symptoms) ? data.symptoms.join(", ") : data.symptoms ? data.symptoms : "No significant symptoms";
  result = result.replace(/\{\{allergies\}\}/g, allergyText);
  result = result.replace(/\{\{conditions\}\}/g, conditionText);
  result = result.replace(/\{\{medications\}\}/g, medicationText);
  result = result.replace(/\{\{symptoms\}\}/g, symptomText);
  if (data.macros) {
    const calories = data.macros.calories || 2e3;
    const protein = data.macros.protein || 130;
    const fat = data.macros.fat || 150;
    const carbs = data.macros.carbs || 20;
    result = result.replace(/\{\{macros\.calories\}\}/g, calories);
    result = result.replace(/\{\{macros\.protein\}\}/g, protein);
    result = result.replace(/\{\{macros\.fat\}\}/g, fat);
    result = result.replace(/\{\{macros\.carbs\}\}/g, carbs);
    result = result.replace(/\{\{calories\}\}/g, calories);
    result = result.replace(/\{\{protein\}\}/g, protein);
    result = result.replace(/\{\{fat\}\}/g, fat);
    result = result.replace(/\{\{carbs\}\}/g, carbs);
  }
  result = result.replace(/\{\{dairyTolerance\}\}/g, data.dairyTolerance || "Full");
  result = result.replace(/\{\{biggestChallenge\}\}/g, data.biggestChallenge || "Staying consistent");
  result = result.replace(/\{\{anythingElse\}\}/g, data.anythingElse || "");
  const proteinsByDiet = {
    "Lion": "beef",
    "Strict Carnivore": "beef and organ meats",
    "Carnivore": "beef, fish, and eggs",
    "Pescatarian": "fish and eggs",
    "Keto": "meat, fish, and eggs"
  };
  const proteinText = proteinsByDiet[data.selectedProtocol] || "meat and fish";
  result = result.replace(/\{\{proteins\}\}/g, proteinText);
  const nutrientsByDiet = {
    "Lion": "bioavailable B vitamins, iron, and zinc",
    "Strict Carnivore": "B vitamins, iron, zinc, and selenium",
    "Carnivore": "complete amino acids, B vitamins, iron, and omega-3s",
    "Pescatarian": "omega-3 fatty acids, B vitamins, and selenium",
    "Keto": "vitamins, minerals, and healthy fats"
  };
  const nutrientText = nutrientsByDiet[data.selectedProtocol] || "essential nutrients";
  result = result.replace(/\{\{nutrient\}\}/g, nutrientText);
  result = result.replace(/\{\{lab\}\}/g, "lipid panel and inflammatory markers");
  const fullMealPlan = generateFullMealPlan(data);
  for (let day = 1; day <= 30; day++) {
    const week = Math.ceil(day / 7);
    const dayInWeek = (day - 1) % 7;
    const dayData = fullMealPlan.weeks[week - 1]?.days[dayInWeek];
    if (dayData) {
      result = result.replace(new RegExp(`\\{\\{breakfast${day}\\}\\}`, "g"), dayData.breakfast);
      result = result.replace(new RegExp(`\\{\\{lunch${day}\\}\\}`, "g"), dayData.lunch);
      result = result.replace(new RegExp(`\\{\\{dinner${day}\\}\\}`, "g"), dayData.dinner);
    }
  }
  const groceryLists = generateGroceryListByWeek(data);
  for (let week = 1; week <= 4; week++) {
    const weekData = groceryLists[`week${week}`];
    if (weekData && weekData.proteins.length >= 2) {
      result = result.replace(new RegExp(`\\{\\{protein1Week${week}\\}\\}`, "g"), weekData.proteins[0].name);
      result = result.replace(new RegExp(`\\{\\{qty1Week${week}\\}\\}`, "g"), weekData.proteins[0].quantity);
      result = result.replace(new RegExp(`\\{\\{protein2Week${week}\\}\\}`, "g"), weekData.proteins[1].name);
      result = result.replace(new RegExp(`\\{\\{qty2Week${week}\\}\\}`, "g"), weekData.proteins[1].quantity);
    }
    if (weekData && weekData.fats.length >= 1) {
      result = result.replace(new RegExp(`\\{\\{dairy${week}\\}\\}`, "g"), weekData.fats[0].name);
      result = result.replace(new RegExp(`\\{\\{dairyQty${week}\\}\\}`, "g"), weekData.fats[0].quantity);
    }
    if (weekData && weekData.pantry.length >= 1) {
      result = result.replace(new RegExp(`\\{\\{pantry${week}\\}\\}`, "g"), weekData.pantry[0].name);
      result = result.replace(new RegExp(`\\{\\{pantryQty${week}\\}\\}`, "g"), weekData.pantry[0].quantity);
    }
  }
  if (groceryLists.week1) {
    const week1 = groceryLists.week1;
    result = result.replace(/\{\{protein1Week1\}\}/g, week1.proteins[0]?.name || "");
    result = result.replace(/\{\{qty1Week1\}\}/g, week1.proteins[0]?.quantity || "");
    result = result.replace(/\{\{protein2Week1\}\}/g, week1.proteins[1]?.name || "");
    result = result.replace(/\{\{qty2Week1\}\}/g, week1.proteins[1]?.quantity || "");
    result = result.replace(/\{\{dairy1\}\}/g, week1.fats[0]?.name || "Butter");
    result = result.replace(/\{\{dairyQty1\}\}/g, week1.fats[0]?.quantity || "1 lb");
  }
  if (fullMealPlan.weeks.length > 0 && fullMealPlan.weeks[0].days.length > 0) {
    const firstDay = fullMealPlan.weeks[0].days[0];
    const mainProteinMatch = firstDay.breakfast.match(/^([^+]+)/);
    const mainProtein = mainProteinMatch ? mainProteinMatch[1].trim() : "Ground Beef";
    result = result.replace(/\{\{protein1\}\}/g, mainProtein);
    result = result.replace(/\{\{protein2\}\}/g, "Salmon");
  } else {
    result = result.replace(/\{\{protein1\}\}/g, "Ground Beef");
    result = result.replace(/\{\{protein2\}\}/g, "Salmon");
  }
  result = result.replace(/\{\{vegetable1\}\}/g, "Salt (Pantry Item)");
  result = result.replace(/\{\{vegetable2\}\}/g, "Butter (Healthy Fat)");
  result = result.replace(/\{\{\w+\}\}/g, "");
  return result;
}
__name(replacePlaceholders, "replacePlaceholders");
function buildExecutiveSummarySystemPrompt() {
  return `You are an expert nutritional and behavioral coach creating personalized Executive Summaries for diet protocols.

TONE & STYLE:
- Direct, supportive, practical
- Acknowledge their specific situation and challenges
- Evidence-based but accessible
- Like a knowledgeable coach who understands their journey
- Avoid hype or unrealistic promises

OUTPUT FORMAT:
- Pure Markdown, no HTML
- No preamble or introduction
- Start directly with the report content

CONTENT REQUIREMENTS:
- Mission Brief (1-2 sentences): Why this protocol fits their situation
- Daily Targets: Specific macros, calories, and approach
- Why This Protocol: Evidence that this works for their goal
- First Action Step: What to do TODAY
- 30-Day Timeline: What to expect week by week
- Biggest Challenge Addressed: Direct response to their stated concern
- Medical Disclaimer: Required at bottom`;
}
__name(buildExecutiveSummarySystemPrompt, "buildExecutiveSummarySystemPrompt");
function buildObstacleProtocolSystemPrompt() {
  return `You are an expert behavioral psychologist and diet coach creating Obstacle Override Protocols.

TONE & STYLE:
- Compassionate but practical
- Acknowledge the challenge without judgment
- Provide specific, actionable tactics
- Empowering and motivational
- Direct and solution-focused

GENERATE:
1. IDENTIFYING THE ENEMY: Reframe their challenge psychologically
2. THE MINDSET SHIFT: Explain why they can overcome this
3. THE TACTICAL SOLUTION: 3-step protocol with specific actions
4. THE "BREAK GLASS" EMERGENCY PLAN: Backup tools (salt trick, 10-min rule, etc.)
5. COMMITMENT CONTRACT: They can sign to reinforce commitment

OUTPUT FORMAT:
- Pure Markdown, no HTML
- Direct, no preamble
- Tone is motivational but grounded in reality`;
}
__name(buildObstacleProtocolSystemPrompt, "buildObstacleProtocolSystemPrompt");
function buildExecutiveSummaryPrompt(data) {
  const profile3 = buildProfile(data);
  return `Generate an Executive Summary for this person:

${profile3}`;
}
__name(buildExecutiveSummaryPrompt, "buildExecutiveSummaryPrompt");
function buildObstacleProtocolPrompt(data) {
  return `Create an Obstacle Override Protocol for this challenge: "${data.biggestChallenge || "Staying consistent with diet"}"

Context: ${buildProfile(data)}`;
}
__name(buildObstacleProtocolPrompt, "buildObstacleProtocolPrompt");
function getTemplateContent(templateName, dietOrData) {
  const data = typeof dietOrData === "string" ? { selectedProtocol: dietOrData } : dietOrData || {};
  const templates = {
    // Report #2: Food Guide - Conditional on diet type
    foodGuide: getFoodGuideTemplate(data.selectedProtocol),
    // Report #3: 30-Day Meal Calendar
    mealCalendar: `## Report #3: Your Custom 30-Day Meal Calendar

*Protocol: {{diet}} | Budget Level: {{budget}} | Focus: {{goal}}*

## The Strategy
This plan rotates proteins for variety and simplicity. Cook proteins 2-3 times per week, mixing with different {{diet}}-appropriate options.

## Week 1: Adaptation & Baseline
| Day | Breakfast | Lunch | Dinner |
| :--- | :--- | :--- | :--- |
| Day 1 | {{breakfast1}} | {{lunch1}} | {{dinner1}} |
| Day 2 | {{breakfast2}} | {{lunch2}} | {{dinner2}} |
| Day 3 | {{breakfast3}} | {{lunch3}} | {{dinner3}} |
| Day 4 | {{breakfast4}} | {{lunch4}} | {{dinner4}} |
| Day 5 | {{breakfast5}} | {{lunch5}} | {{dinner5}} |
| Day 6 | {{breakfast6}} | {{lunch6}} | {{dinner6}} |
| Day 7 | {{breakfast7}} | {{lunch7}} | {{dinner7}} |

## Week 2: Building Consistency
| Day | Breakfast | Lunch | Dinner |
| :--- | :--- | :--- | :--- |
| Day 8 | {{breakfast8}} | {{lunch8}} | {{dinner8}} |
| Day 9 | {{breakfast9}} | {{lunch9}} | {{dinner9}} |
| Day 10 | {{breakfast10}} | {{lunch10}} | {{dinner10}} |
| Day 11 | {{breakfast11}} | {{lunch11}} | {{dinner11}} |
| Day 12 | {{breakfast12}} | {{lunch12}} | {{dinner12}} |
| Day 13 | {{breakfast13}} | {{lunch13}} | {{dinner13}} |
| Day 14 | {{breakfast14}} | {{lunch14}} | {{dinner14}} |

## Week 3: Finding Your Rhythm
| Day | Breakfast | Lunch | Dinner |
| :--- | :--- | :--- | :--- |
| Day 15 | {{breakfast15}} | {{lunch15}} | {{dinner15}} |
| Day 16 | {{breakfast16}} | {{lunch16}} | {{dinner16}} |
| Day 17 | {{breakfast17}} | {{lunch17}} | {{dinner17}} |
| Day 18 | {{breakfast18}} | {{lunch18}} | {{dinner18}} |
| Day 19 | {{breakfast19}} | {{lunch19}} | {{dinner19}} |
| Day 20 | {{breakfast20}} | {{lunch20}} | {{dinner20}} |
| Day 21 | {{breakfast21}} | {{lunch21}} | {{dinner21}} |

## Week 4: The New Normal
| Day | Breakfast | Lunch | Dinner |
| :--- | :--- | :--- | :--- |
| Day 22 | {{breakfast22}} | {{lunch22}} | {{dinner22}} |
| Day 23 | {{breakfast23}} | {{lunch23}} | {{dinner23}} |
| Day 24 | {{breakfast24}} | {{lunch24}} | {{dinner24}} |
| Day 25 | {{breakfast25}} | {{lunch25}} | {{dinner25}} |
| Day 26 | {{breakfast26}} | {{lunch26}} | {{dinner26}} |
| Day 27 | {{breakfast27}} | {{lunch27}} | {{dinner27}} |
| Day 28 | {{breakfast28}} | {{lunch28}} | {{dinner28}} |
| Day 29 | {{breakfast29}} | {{lunch29}} | {{dinner29}} |
| Day 30 | {{breakfast30}} | {{lunch30}} | {{dinner30}} |

## Substitution Guide
- If you lack {{protein1}}, substitute with {{protein2}}
- If you lack {{vegetable1}}, substitute with {{vegetable2}}

*This meal plan rotates proteins for variety while staying true to {{diet}}.* \u{1F37D}\uFE0F`,
    // Report #4: Weekly Shopping Lists
    shoppingList: `## Report #4: Your Weekly Grocery Lists

*Based on your custom {{diet}} meal plan*

> **\u26A0\uFE0F A Note on Grocery Pricing:** Food costs vary by region and season. Your "{{budget}}" setting controls the **types of cuts** recommended, not the final total.

## \u{1F6D2} "Week 0" Pantry Stock-Up
* [ ] Quality Salt (Redmond Real Salt or Maldon)
* [ ] Primary Cooking Fat (Butter or Ghee)
* [ ] Food Storage Containers
* [ ] Basic Seasonings (if tolerated)

## \u{1F6D2} Week 1 Shopping List
### \u{1F969} The Butcher
* [ ] {{protein1Week1}} - {{qty1Week1}}
* [ ] {{protein2Week1}} - {{qty2Week1}}

### \u{1F95A} Dairy & Eggs
* [ ] Eggs - 18-count
* [ ] {{dairy1}} - {{dairyQty1}}

### \u{1F9C2} Pantry
* [ ] Salt - 1 container

## \u{1F6D2} Week 2 Shopping List
### \u{1F969} The Butcher
* [ ] {{protein1Week2}} - {{qty1Week2}}
* [ ] {{protein2Week2}} - {{qty2Week2}}

### \u{1F95A} Dairy & Eggs
* [ ] Eggs - 18-count
* [ ] {{dairy2}} - {{dairyQty2}}

### \u{1F9C2} Pantry
* [ ] Salt (replenish as needed)

## \u{1F6D2} Week 3 Shopping List
### \u{1F969} The Butcher
* [ ] {{protein1Week3}} - {{qty1Week3}}
* [ ] {{protein2Week3}} - {{qty2Week3}}

### \u{1F95A} Dairy & Eggs
* [ ] Eggs - 18-count
* [ ] {{dairy3}} - {{dairyQty3}}

### \u{1F9C2} Pantry
* [ ] Salt (replenish as needed)

## \u{1F6D2} Week 4 Shopping List
### \u{1F969} The Butcher
* [ ] {{protein1Week4}} - {{qty1Week4}}
* [ ] {{protein2Week4}} - {{qty2Week4}}

### \u{1F95A} Dairy & Eggs
* [ ] Eggs - 18-count
* [ ] {{dairy4}} - {{dairyQty4}}

### \u{1F9C2} Pantry
* [ ] Salt (replenish as needed)

## \u{1F4A1} Smart Shopping Tips
{{#if budget === 'tight'}}Look for Manager's Special markdowns, buy whole sub-primals, organ meats are super cheap and nutrient-dense.{{else if budget === 'moderate'}}Check store flyers for sales, stock your freezer with discounted items.{{else}}Buy from local farms, prioritize quality sources and grass-fed options.{{/if}}

**Pro tip:** Buy proteins in bulk when on sale and freeze them. This reduces weekly shopping stress and saves money.`,
    // Report #5: Physician Consultation Guide
    physicianConsult: `## Report #5: Physician Consultation Guide

*For {{firstName}} to review with your doctor*

> **\u26A0\uFE0F MEDICAL DISCLAIMER:** Do not change medication without medical supervision.

## 1. What to Say:

"Dr. [Name], I'm starting a {{diet}} metabolic intervention to address {{symptoms}}. My goal is {{goal}}. I need your help monitoring labs and adjusting medications if needed."

## 2. Critical Medication Review

{{#if medications}}Based on your medications, discuss with your doctor:{{/if}}

## 3. Recommended Lab Work
### The Key Labs to Check
* [ ] Fasting Glucose, Insulin, HbA1c
* [ ] Lipid Panel (Total, LDL, HDL, Triglycerides, ApoB)
* [ ] Kidney & Liver (Creatinine, eGFR, ALT, AST)
* [ ] Inflammation (hs-CRP)
* [ ] Micronutrients (Vitamin D, B12)

## 4. Common Doctor Concerns

### "Won't this hurt your cholesterol?"
**Response:** "I understand. LDL may increase initially, but triglycerides drop noticeably. Can we focus on triglyceride/HDL ratio and ApoB? I'll retest after 8 weeks."

### "You'll be deficient in nutrients."
**Response:** "{{diet}} includes nutrient-rich {{proteins}} which contain {{nutrient}}. We can monitor {{lab}} to confirm adequacy."

## 5. Lab Monitoring Schedule
**Week 0:** Baseline labs
**Week 8:** Repeat comprehensive labs`,
    // Report #7: Restaurant & Travel Guide
    restaurant: `## Report #7: Dining Out & Travel Survival Guide

*For {{firstName}} navigating the world on {{diet}}*

## The Three Golden Rules

### Rule #1: Be "That Person"
- Your health comes first. Do not apologize for your dietary needs.

### Rule #2: Beware the Seed Oils
- Always ask: "What fat do you use for cooking?" Request butter, ghee, or olive oil.

### Rule #3: When in Doubt, Order Steak
- A plain steak with butter is available almost everywhere.

## Restaurant Strategy by Cuisine

### Steakhouse
- Order: Ribeye + butter + vegetable
- Customization: "Cooked in butter, no seed oils"

### Diner
- Order: Burger (no bun) + eggs + bacon
- Customization: "No bun, extra patty, cooked in butter"

### Mexican
- Order: Carne asada + guacamole
- Customization: "No tortillas, no rice, cooked in butter"

### Asian
- Order: Grilled fish or beef
- Customization: "Cooked in butter, no sauce"

## Fast Food Emergency Menu

**McDonald's:** 3x Beef Patties + cheese (no bun) + eggs + bacon
**Wendy's:** Dave's Single (no bun) + extra beef
**Chipotle:** Steak bowl, no rice, no beans
**Taco Bell:** Power Menu Bowl, no rice/beans

## Travel Packing
* [ ] Beef jerky (check sugar content)
* [ ] Macadamia nuts or pecans
* [ ] Hard cheese
* [ ] Sardines canned in oil
* [ ] Salt packets

**Remember: Own your choices. Your health comes first.** \u{1F37D}\uFE0F`,
    // Report #8-13: Appendix Reports (Condensed)
    science: `## Report #8: The Science & Evidence

*Why {{diet}} works: Evidence-based research*

## Key Research

Research on {{diet}} shows promising results for {{goal}} and {{symptoms}}:

**Metabolic Effects:** {{diet}} shifts metabolism to fat-burning, reducing insulin resistance and stabilizing blood sugar.

**Anti-Inflammatory:** Elimination of plant foods may reduce {{symptoms}}.

**Microbiome Changes:** {{diet}} shifts gut bacteria toward beneficial species.

## Why {{diet}} for {{firstName}}:

1. **Rapid metabolic effect** - Addresses your insulin sensitivity quickly
2. **Anti-inflammatory** - Removes your common triggers
3. **Sustainable** - No calorie counting, naturally satiating
4. **Evidence-backed** - Research supports efficacy

**Work with your doctor for personalized guidance.**`,
    labs: `## Report #9: Laboratory Reference Guide

*Understanding your lab results on {{diet}}*

## Standard vs. {{diet}} Ranges

### Glucose & Insulin
| Marker | Standard | {{diet}} Target | Note |
|--------|----------|---|---|
| Fasting Glucose | 70-100 | 60-85 | Lower is better on low-carb |
| Fasting Insulin | <10 | <5 | Measures insulin sensitivity |
| HbA1c | <5.7% | <5.5% | 3-month glucose average |

### Lipids
| Marker | Standard | {{diet}} Typical | Note |
|--------|----------|---|---|
| HDL | >40 | Often \u2191 | Protective factor |
| Triglycerides | <150 | Often \u2193 | Improves a lot |
| hs-CRP | <1.0 | Often \u2193\u2193 | Expect improvement |

## What to Expect After 8 Weeks

\u2705 **Likely:** HbA1c, glucose, triglycerides, hs-CRP, HDL improve
\u26A0\uFE0F **May increase:** LDL (particle size usually improves)

**Ask your doctor:** Can we focus on LDL particle size rather than LDL number?`,
    electrolytes: `## Report #10: The Electrolyte Protocol

*Managing sodium, potassium, and magnesium on {{diet}}*

## Why Electrolytes Matter

On {{diet}}, your body releases water and electrolytes more rapidly. This causes "keto flu" (headache, fatigue) in Week 1-2.

## The Ketoade Recipe

### Ingredients
- 1 liter water
- 1 teaspoon salt (Redmond or Himalayan)
- \xBD teaspoon "Lite Salt" (potassium)
- Pinch of magnesium powder (optional, 200-300mg)
- Lemon/lime juice (optional)

### Instructions
1. Mix all ingredients
2. Drink 1-2 liters daily, especially weeks 1-4

## Daily Electrolyte Goals

- **Salt:** 3-7 grams (3-7 teaspoons, based on activity)
- **Potassium:** 2-4 grams (from beef + ketoade)
- **Magnesium:** 300-600mg (supplement or food)

## Signs You Need More

\u26A0\uFE0F **Headaches** \u2192 Add salt
\u26A0\uFE0F **Muscle cramps** \u2192 Add potassium + magnesium
\u26A0\uFE0F **Fatigue** \u2192 Add salt + magnesium
\u26A0\uFE0F **Dizziness** \u2192 Add salt immediately`,
    timeline: `## Report #11: The Adaptation Timeline

*What to expect week by week on {{diet}}*

## Week 1: The Glycogen Depletion Phase

**Days 1-3:** Water loss (3-7 lbs normal), stable energy
**Days 4-7:** Transition trough, possible "keto flu", cravings peak
**Action:** Eat normally, stay hydrated, increase salt

## Week 2: The Difficult Week

**Days 8-10:** Peak dip, worst energy, strong cravings
**Days 11-14:** Turning point, energy returns, cravings subside
**Action:** Push through. This is temporary. Don't cheat.

## Week 3: The Breakthrough

**Days 15-21:** Fat adaptation accelerating, consistent weight loss, excellent energy, mental clarity improves
**Action:** Enjoy. Note health improvements.

## Week 4: The New Normal

**Days 22-30:** {{diet}} feels normal, stable energy, sleep improves, skin/hair improve
**Action:** This is your new baseline. Track improvements.

**The hardest part is Weeks 1-2. If you push through, the payoff is worth it.**`,
    stallBreaker: `## Report #12: The Stall-Breaker Protocol

*What to do if weight loss stalls after Week 2*

## Check These 4 Things (In Order)

### 1. Real Stall or Normal Fluctuation?
- It's been 7+ days with no weight loss?
- You've been strict on {{diet}}?
- You're drinking water and getting electrolytes?

Wait 10-14 days before making changes.

### 2. Dairy Creep
Small amounts of cheese/cream add 1000+ calories.
- Are you adding butter to everything? Using cream in coffee?
- Solution: Track dairy for 3 days, reduce by 50%

### 3. Too Much Fat
{{diet}} is high-fat, but not unlimited.
- How many grams of fat daily? Are you adding excessive cooking fat?
- Solution: Reduce added fat by 20%, let meat's natural fat be primary

### 4. Hidden Carbs
- Check labels on processed meats, supplements, condiments
- Solution: Switch to plain meats and dairy

## Keep Going

Don't quit {{diet}} \u2022 Don't add carbs \u2022 Trust Carnivore\u2014stalls are temporary`,
    tracker: `## Report #13: 30-Day Symptom & Progress Tracker

*Track what matters: How you FEEL, not just the scale*

## How to Use This Tracker

1. Weigh yourself (morning, after bathroom)
2. Rate energy (1-10)
3. Rate mood (1-10)
4. Note digestion quality
5. Track non-scale victories (NSVs)

## Daily Tracker

| Day | Weight | Energy | Mood | Digestion | NSVs |
|-----|--------|--------|------|-----------|------|
| 1 | ___ | \u2610\u2610\u2610\u2610\u2610 | \u2610\u2610\u2610\u2610\u2610 | Good/OK/Bad | |
| 7 | ___ | \u2610\u2610\u2610\u2610\u2610 | \u2610\u2610\u2610\u2610\u2610 | Good/OK/Bad | |
| 15 | ___ | \u2610\u2610\u2610\u2610\u2610 | \u2610\u2610\u2610\u2610\u2610 | Good/OK/Bad | |
| 30 | ___ | \u2610\u2610\u2610\u2610\u2610 | \u2610\u2610\u2610\u2610\u2610 | Good/OK/Bad | |

## Symptom Checklist

| Symptom | Week 1 | Week 2 | Week 3 | Week 4 |
|---------|--------|--------|--------|--------|
| Brain fog | \u2610 | \u2610 | \u2610 | \u2610 |
| Energy crashes | \u2610 | \u2610 | \u2610 | \u2610 |
| Cravings | \u2610 | \u2610 | \u2610 | \u2610 |
| Sleep quality | \u2610 | \u2610 | \u2610 | \u2610 |
| Joint pain | \u2610 | \u2610 | \u2610 | \u2610 |
| Bloating | \u2610 | \u2610 | \u2610 | \u2610 |
| Mood | \u2610 | \u2610 | \u2610 | \u2610 |
| Digestion | \u2610 | \u2610 | \u2610 | \u2610 |

## End of 30 Days: Reflection

**What improved the most?** _____________

**What's still a challenge?** _____________

**Continue {{diet}} past 30 days?** \u2610 Yes \u2610 Maybe \u2610 No

*Remember: This is YOUR data. Use it to make decisions about {{diet}}.*`
  };
  return templates[templateName] || "";
}
__name(getTemplateContent, "getTemplateContent");
function getFoodGuideTemplate(diet) {
  const dietType = (diet || "").toLowerCase();
  if (dietType.includes("lion")) {
    return `## Report #2: Your Lion Diet Food Guide

**Prepared for:** {{firstName}}
**Diet Protocol:** Lion Diet (Beef Only)
**Date:** {{currentDate}}

---

## \u{1F402} Your Lion Diet Food Pyramid

![Lion Diet Pyramid](https://carnivoreweekly.com/images/LionFP.png)

The Lion Diet: **ONLY beef, salt, and water**. This is an elimination protocol.

---

## TIER 1: FOUNDATION (100% of intake)

**ALL beef forms acceptable:**
- Ground beef (80/20 or fattier)
- Ribeye, NY strip, chuck steak
- Brisket, sirloin, short ribs
- Beef tongue, beef heart

**Cooking:** Any method (grilled, fried, broiled, boiled)

**Fat content:** CRITICAL - 80/20 minimum, fattier is better

---

## Daily Eating Pattern

Lion Diet is typically **one meal per day (OMAD)**.

- **One large meal:** 500-1500g beef + salt
- **Meal timing:** Whenever hungry
- **Seasoning:** Salt only

---

## Electrolyte Protocol

- **Salt:** 1-2 teaspoons daily
- **Potassium:** ~400mg per 100g beef
- **Magnesium:** ~25mg per 100g beef

---

## Budget Optimization

{{#if budget === 'tight'}}Ground beef (80/20), chuck steak, short ribs, organ meats (cheapest)

**Cost:** $30-50/week{{else if budget === 'moderate'}}Mix ground beef with quality steaks, include organs

**Cost:** $50-80/week{{else}}Grass-fed beef, quality cuts, organ variety

**Cost:** $80-150+/week{{/if}}

---

## Week-by-Week Adaptation

**Week 1:** Water loss (3-7 lbs), possible "keto flu"
**Week 2:** Energy dip continues, add salt
**Week 3:** Energy returns, mental clarity
**Week 4:** New normal, healing begins

---

*Beef, salt, water. That's it. This is therapeutic, not recreational.*`;
  } else if (dietType.includes("pescatarian")) {
    return `## Report #2: Your Pescatarian Carnivore Food Guide

**Prepared for:** {{firstName}}
**Diet Protocol:** Pescatarian Carnivore (Fish, Eggs, Dairy)
**Date:** {{currentDate}}

---

## \u{1F41F} Your Pescatarian Carnivore Pyramid

![Pescatarian Pyramid](https://carnivoreweekly.com/images/PescatarianFP.png)

Pescatarian Carnivore: **Fish, seafood, eggs, dairy - no land meat**.

---

## TIER 1: FOUNDATION (60-70% of intake)

### Fatty Fish (Primary Protein)
- Salmon (wild > farmed)
- Mackerel, sardines, herring
- Trout, tuna (canned in oil)
- Anchovies, eel

**Choose fatty fish, not lean** (cod, tilapia too lean)

### Eggs (Daily Staple)
- Whole eggs, fried, scrambled, boiled
- All forms acceptable
- Amount: 2-6 daily

---

## TIER 2: VARIETY (20-30%)

### Shellfish & Seafood
- Shrimp, crab, lobster
- Oysters, mussels, clams
- Scallops, squid

### Fish Roe & Organs
- Fish roe (caviar) - nutrient-dense
- Fish organs (if available)

---

## TIER 3: OPTIONAL (10-15%)

{{#if dairyTolerance === 'full'}}**Dairy (Full):** Butter, ghee, hard cheeses, soft cheeses, Greek yogurt{{else if dairyTolerance === 'some'}}**Dairy (Limited):** Butter, ghee, hard aged cheeses{{else}}**Dairy (None):** Coconut oil, avocado oil{{/if}}

---

## TIER 4: AVOID

\u274C **Land meat** - Beef, pork, lamb, poultry
\u274C **Plants** - All vegetables, fruits, nuts
\u274C **Processed** - Sugar, grains, ultra-processed items

---

## Daily Eating Patterns

- **Two meals:** Eggs + salmon + butter, Fish + oysters
- **OMAD:** Salmon + shrimp + eggs + butter
- **Three meals:** Eggs + mackerel, Shrimp + butter, Salmon + oysters

---

*Pescatarian carnivore gives you health benefits with ethical alignment.* \u{1F41F}`;
  } else if (dietType.includes("keto") || dietType.includes("low carb")) {
    return `## Report #2: Your Keto Food Guide

**Prepared for:** {{firstName}}
**Diet Protocol:** Ketogenic (Low-Carb, High-Fat)
**Date:** {{currentDate}}

---

## \u{1F525} Your Keto Food Pyramid

![Keto Food Pyramid](https://carnivoreweekly.com/images/KetoFP.png)

Keto: **Low-carb, high-fat with animal products AND some low-carb plants**.

---

## TIER 1: FOUNDATION (70-75%)

### Proteins & Healthy Fats
- **Red meat:** Ground beef, ribeye, chuck, lamb
- **Poultry:** Chicken thighs, duck, turkey thighs
- **Fish:** Salmon, mackerel, sardines, herring
- **Eggs:** 3-6 daily, all forms

### Healthy Fats
- Butter, ghee, coconut oil
- Avocado oil, olive oil, animal fats

**Use generously. Fat is your fuel.**

---

## TIER 2: REGULAR VARIETY (15-20%)

### Non-Starchy Vegetables
- **Leafy:** Spinach, kale, lettuce, arugula
- **Cruciferous:** Broccoli, cauliflower, Brussels sprouts
- **Low-carb:** Zucchini, asparagus, green beans, cucumber

{{#if allergies && allergies.includes('nightshade')}}**Avoid nightshades** (tomato, pepper){{/if}}

### Dairy (Based on Tolerance)

{{#if dairyTolerance === 'full'}}Butter, cheese, heavy cream, Greek yogurt{{else if dairyTolerance === 'some'}}Butter, ghee, hard aged cheeses{{else}}Coconut oil, avocado oil{{/if}}

### Nuts (Limited)
{{#if allergies && allergies.includes('tree nut')}}**Avoid nuts**{{else}}Macadamia (lowest carb), pecans, walnuts, almonds. Portion control: 1 oz max.{{/if}}

---

## TIER 3: OCCASIONAL (5%)

- Avocado (3g net carbs)
- Olives (1g net carbs)
- Berries (in moderation)

---

## TIER 4: AVOID

\u274C **High-carb veggies** - Potatoes, corn, peas, carrots
\u274C **Grains** - Wheat, rice, oats, bread, pasta
\u274C **Sugar** - All forms
\u274C **Plant oils** - Vegetable, soybean, canola, corn

**Use only:** Butter, ghee, olive oil, avocado oil, coconut oil

---

## Carb Counting

**Net Carbs = Total Carbs - Fiber**

**Target:** 20-50g net carbs daily (mostly vegetables)

---

## Budget Optimization

{{#if budget === 'tight'}}Ground beef, eggs, chicken thighs, frozen veggies, butter, organ meats{{else if budget === 'moderate'}}Mix ground beef with steaks, variety of proteins, fresh/frozen veggies{{else}}Grass-fed beef, wild-caught fish, organic veggies, premium nuts{{/if}}

---

*Keto is flexible, sustainable, and effective.* \u{1F525}`;
  } else {
    return `## Report #2: Your Carnivore Food Guide

**Prepared for:** {{firstName}}
**Diet Protocol:** Strict Carnivore (Animal Products Only)
**Date:** {{currentDate}}

---

## \u{1F969} Your Carnivore Food Pyramid

![Carnivore Food Pyramid](https://carnivoreweekly.com/images/CarnivorFP.png)

Carnivore: **Only animal products, salt, and water**. No plants.

---

## TIER 1: FOUNDATION (70-80%)

### Red Meat (Ruminant)
- Ground beef (80/20 or fattier)
- Ribeye, NY strip, chuck
- Ground lamb, bison

**Why:** Highest bioavailable nutrients, best satiety

### Eggs (Daily Staple)
- Whole eggs, fried, scrambled, boiled
- Amount: 2-6 daily

### Fatty Fish
- Salmon (wild > farmed)
- Mackerel, sardines, herring
- Trout, tuna (canned in oil)

---

## TIER 2: VARIETY (15-20%)

### Poultry
- Chicken thighs (dark meat)
- Duck (fattier)
- Turkey thighs

### Cured & Processed
- Bacon (pork or beef)
- Sausage (check ingredients)
- Beef jerky (sugar-free)
- Smoked salmon

---

## TIER 3: OPTIONAL (5-10%)

{{#if dairyTolerance === 'full'}}**Dairy (Full):** Butter, ghee, hard cheeses, soft cheeses, Greek yogurt{{else if dairyTolerance === 'some'}}**Dairy (Limited):** Butter, ghee, hard aged cheeses{{else}}**Dairy (None):** Tallow, avocado oil{{/if}}

---

## TIER 4: AVOID

\u274C **All plants** - Veggies, fruits, nuts, seeds, plant oils
\u274C **Processed foods** - Ultra-processed with sugar
\u274C **Dairy (if intolerant)** - Milk, cream, soft cheeses

---

## Daily Eating Patterns

- **Two meals:** Eggs + bacon + butter, Ribeye + salt
- **OMAD:** Large steak + eggs + butter
- **Three meals:** Ground beef + eggs, Fish + butter, Ribeye

---

## Budget Optimization

{{#if budget === 'tight'}}Ground beef, eggs, chicken thighs, organ meats{{else if budget === 'moderate'}}Ground beef mix, variety of proteins, fresh/frozen fish{{else}}Grass-fed beef, wild-caught fish, premium cuts{{/if}}

---

*You have everything you need. Execute.* \u{1F969}`;
  }
}
__name(getFoodGuideTemplate, "getFoodGuideTemplate");
function buildProfile(data) {
  let profile3 = [];
  if (data.firstName) {
    profile3.push(`NAME: ${data.firstName}`);
  }
  profile3.push(`EMAIL: ${data.email}`);
  if (data.macros) {
    profile3.push(`
MACRO TARGETS:`);
    profile3.push(`- Calories: ${data.macros.calories}`);
    profile3.push(`- Protein: ${data.macros.protein}g`);
    profile3.push(`- Fat: ${data.macros.fat}g`);
    profile3.push(`- Activity Level: ${data.macros.activityLevel}`);
    profile3.push(`- Goal: ${data.macros.goal}`);
  }
  if (data.allergies || data.foodRestrictions || data.dairyTolerance) {
    profile3.push(`
FOOD RESTRICTIONS:`);
    if (data.allergies) profile3.push(`- Allergies: ${data.allergies}`);
    if (data.foodRestrictions) profile3.push(`- Won't eat: ${data.foodRestrictions}`);
    if (data.dairyTolerance) profile3.push(`- Dairy tolerance: ${data.dairyTolerance}`);
  }
  if (data.medications || data.conditions || data.otherConditions) {
    profile3.push(`
HEALTH CONDITIONS:`);
    if (data.medications) profile3.push(`- Medications: ${data.medications}`);
    if (data.conditions) {
      const conditionsList = Array.isArray(data.conditions) ? data.conditions.join(", ") : data.conditions;
      profile3.push(`- Conditions: ${conditionsList}`);
    }
    if (data.otherConditions) profile3.push(`- Other: ${data.otherConditions}`);
  }
  if (data.symptoms || data.otherSymptoms) {
    profile3.push(`
CURRENT SYMPTOMS:`);
    if (data.symptoms) {
      const symptomsList = Array.isArray(data.symptoms) ? data.symptoms.join(", ") : data.symptoms;
      profile3.push(`- ${symptomsList}`);
    }
    if (data.otherSymptoms) profile3.push(`- Other: ${data.otherSymptoms}`);
  }
  if (data.previousDiets || data.carnivoreExperience || data.whatWorked) {
    profile3.push(`
DIET HISTORY:`);
    if (data.previousDiets) profile3.push(`- Previous diets: ${data.previousDiets}`);
    if (data.carnivoreExperience) profile3.push(`- Carnivore experience: ${data.carnivoreExperience}`);
    if (data.whatWorked) profile3.push(`- What worked/didn't: ${data.whatWorked}`);
  }
  if (data.cookingSkill || data.mealPrepTime || data.budget || data.familySituation || data.workTravel) {
    profile3.push(`
LIFESTYLE:`);
    if (data.cookingSkill) profile3.push(`- Cooking skill: ${data.cookingSkill}`);
    if (data.mealPrepTime) profile3.push(`- Meal prep time: ${data.mealPrepTime}`);
    if (data.budget) profile3.push(`- Budget: ${data.budget}`);
    if (data.familySituation) profile3.push(`- Family: ${data.familySituation}`);
    if (data.workTravel) profile3.push(`- Work/travel: ${data.workTravel}`);
  }
  if (data.goals || data.biggestChallenge || data.anythingElse) {
    profile3.push(`
GOALS & CHALLENGES:`);
    if (data.goals) {
      const goalsList = Array.isArray(data.goals) ? data.goals.join(", ") : data.goals;
      profile3.push(`- Goals: ${goalsList}`);
    }
    if (data.biggestChallenge) profile3.push(`- Biggest challenge: ${data.biggestChallenge}`);
    if (data.anythingElse) profile3.push(`- Additional info: ${data.anythingElse}`);
  }
  return profile3.join("\n");
}
__name(buildProfile, "buildProfile");
export {
  generate_report_default as default
};
//# sourceMappingURL=generate-report.js.map
