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

// calculator-api.js
function generateSessionToken() {
  return "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".replace(
    /x/g,
    () => Math.floor(Math.random() * 16).toString(16)
  );
}
__name(generateSessionToken, "generateSessionToken");
function generateAccessToken() {
  const chars = "abcdef0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
__name(generateAccessToken, "generateAccessToken");
function createErrorResponse(code, message, statusCode = 400, details) {
  return new Response(JSON.stringify({ code, message, ...details && { details } }), {
    status: statusCode,
    headers: { "Content-Type": "application/json" }
  });
}
__name(createErrorResponse, "createErrorResponse");
function createSuccessResponse(data, statusCode = 200) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { "Content-Type": "application/json" }
  });
}
__name(createSuccessResponse, "createSuccessResponse");
async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch (err) {
    throw new Error("Invalid JSON body");
  }
}
__name(parseJsonBody, "parseJsonBody");
function validateContentType(request, expected = "application/json") {
  const contentType = request.headers.get("Content-Type") || "";
  return contentType.includes(expected);
}
__name(validateContentType, "validateContentType");
function isValidEmail(email) {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email) && email.length <= 255;
}
__name(isValidEmail, "isValidEmail");
var rateLimitStore = /* @__PURE__ */ new Map();
function checkRateLimit(sessionToken, limit = 10) {
  const now = Date.now();
  const entry = rateLimitStore.get(sessionToken);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(sessionToken, { count: 1, resetAt: now + 60 * 60 * 1e3 });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}
__name(checkRateLimit, "checkRateLimit");
async function handleCreateSession(request, env2) {
  try {
    const sessionToken = generateSessionToken();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const response = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/calculator_sessions_v2`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": env2.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_SERVICE_ROLE_KEY}`,
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          session_token: sessionToken,
          step_completed: 1,
          is_premium: false,
          payment_status: "pending",
          created_at: now,
          updated_at: now
        })
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase error:", errorText);
      return createErrorResponse("DB_INSERT_FAILED", "Failed to create session", 500);
    }
    const data = await response.json();
    const sessionRecord = Array.isArray(data) ? data[0] : data;
    const sessionId = sessionRecord?.id;
    return createSuccessResponse({
      session_token: sessionToken,
      session_id: sessionId,
      created_at: now
    }, 201);
  } catch (err) {
    console.error("handleCreateSession error:", err);
    return createErrorResponse("INTERNAL_ERROR", String(err), 500);
  }
}
__name(handleCreateSession, "handleCreateSession");
async function handleValidateSession(request, env2) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse("INVALID_CONTENT_TYPE", "Expected application/json", 400);
    }
    const body = await parseJsonBody(request);
    const { session_token } = body;
    if (!session_token) {
      return createErrorResponse("MISSING_FIELDS", "session_token required", 400);
    }
    const sessionResponse = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        headers: {
          "apikey": env2.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );
    if (!sessionResponse.ok) {
      return createErrorResponse("SESSION_NOT_FOUND", "Session not found", 404);
    }
    const sessions = await sessionResponse.json();
    if (!sessions || sessions.length === 0) {
      return createErrorResponse("SESSION_NOT_FOUND", "Session not found", 404);
    }
    const session = sessions[0];
    return createSuccessResponse({
      session_token,
      is_premium: true,
      payment_status: session.payment_status || "pending",
      step_completed: session.step_completed || 1
    });
  } catch (err) {
    console.error("handleValidateSession error:", err);
    return createErrorResponse("INTERNAL_ERROR", String(err), 500);
  }
}
__name(handleValidateSession, "handleValidateSession");
async function handleSaveStep1(request, env2) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse("INVALID_CONTENT_TYPE", "Expected application/json", 400);
    }
    const body = await parseJsonBody(request);
    const { session_token, data } = body;
    if (!session_token || !data) {
      return createErrorResponse("MISSING_FIELDS", "session_token and data are required", 400);
    }
    if (!checkRateLimit(session_token, 10)) {
      return createErrorResponse("RATE_LIMIT", "Too many requests. Try again later.", 429);
    }
    if (!data.sex || !["male", "female"].includes(data.sex)) {
      return createErrorResponse("VALIDATION_FAILED", "Invalid sex value", 400);
    }
    if (!data.age || data.age < 13 || data.age > 150) {
      return createErrorResponse("VALIDATION_FAILED", "Age must be between 13 and 150", 400);
    }
    const response = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": env2.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          sex: data.sex,
          age: data.age,
          height_feet: data.height_feet || null,
          height_inches: data.height_inches || null,
          height_cm: data.height_cm || null,
          weight_value: data.weight_value,
          weight_unit: data.weight_unit || "lbs",
          step_completed: 2,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        })
      }
    );
    if (!response.ok) {
      return createErrorResponse("DB_UPDATE_FAILED", "Failed to save step 1", 500);
    }
    return createSuccessResponse({
      session_token,
      step_completed: 2,
      next_step: 3
    });
  } catch (err) {
    console.error("handleSaveStep1 error:", err);
    return createErrorResponse("INTERNAL_ERROR", String(err), 500);
  }
}
__name(handleSaveStep1, "handleSaveStep1");
async function handleSaveStep2(request, env2) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse("INVALID_CONTENT_TYPE", "Expected application/json", 400);
    }
    const body = await parseJsonBody(request);
    const { session_token, data } = body;
    if (!session_token || !data) {
      return createErrorResponse("MISSING_FIELDS", "session_token and data are required", 400);
    }
    if (!checkRateLimit(session_token, 10)) {
      return createErrorResponse("RATE_LIMIT", "Too many requests. Try again later.", 429);
    }
    const response = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": env2.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          lifestyle_activity: data.lifestyle_activity,
          exercise_frequency: data.exercise_frequency,
          goal: data.goal,
          deficit_percentage: data.deficit_percentage || null,
          diet_type: data.diet_type,
          step_completed: 3,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        })
      }
    );
    if (!response.ok) {
      return createErrorResponse("DB_UPDATE_FAILED", "Failed to save step 2", 500);
    }
    return createSuccessResponse({
      session_token,
      step_completed: 3,
      next_step: 4
    });
  } catch (err) {
    console.error("handleSaveStep2 error:", err);
    return createErrorResponse("INTERNAL_ERROR", String(err), 500);
  }
}
__name(handleSaveStep2, "handleSaveStep2");
async function handleSaveStep3(request, env2) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse("INVALID_CONTENT_TYPE", "Expected application/json", 400);
    }
    const body = await parseJsonBody(request);
    const { session_token, calculated_macros } = body;
    if (!session_token || !calculated_macros) {
      return createErrorResponse("MISSING_FIELDS", "session_token and calculated_macros required", 400);
    }
    if (!checkRateLimit(session_token, 10)) {
      return createErrorResponse("RATE_LIMIT", "Too many requests. Try again later.", 429);
    }
    const updateResponse = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": env2.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          calculated_macros,
          step_completed: 3,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        })
      }
    );
    if (!updateResponse.ok) {
      return createErrorResponse("DB_UPDATE_FAILED", "Failed to save step 3", 500);
    }
    const tiersResponse = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/payment_tiers?is_active=eq.true&order=display_order.asc`,
      {
        headers: {
          "apikey": env2.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_ANON_KEY}`
        }
      }
    );
    const tiers = tiersResponse.ok ? await tiersResponse.json() : [];
    return createSuccessResponse({
      session_token,
      step_completed: 3,
      calculated_macros,
      available_tiers: tiers,
      next_step: 4
    });
  } catch (err) {
    console.error("handleSaveStep3 error:", err);
    return createErrorResponse("INTERNAL_ERROR", String(err), 500);
  }
}
__name(handleSaveStep3, "handleSaveStep3");
async function handleGetPaymentTiers(request, env2) {
  try {
    const response = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/payment_tiers?is_active=eq.true&order=display_order.asc`,
      {
        headers: {
          "apikey": env2.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_ANON_KEY}`
        }
      }
    );
    const tiers = response.ok ? await response.json() : [];
    return createSuccessResponse({
      tiers,
      count: tiers.length
    });
  } catch (err) {
    console.error("handleGetPaymentTiers error:", err);
    return createErrorResponse("INTERNAL_ERROR", String(err), 500);
  }
}
__name(handleGetPaymentTiers, "handleGetPaymentTiers");
async function handleInitiatePayment(request, env2) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse("INVALID_CONTENT_TYPE", "Expected application/json", 400);
    }
    const body = await parseJsonBody(request);
    const { session_token, tier_id } = body;
    if (!session_token || !tier_id) {
      return createErrorResponse("MISSING_FIELDS", "session_token and tier_id required", 400);
    }
    if (!checkRateLimit(session_token, 5)) {
      return createErrorResponse("RATE_LIMIT", "Too many payment attempts.", 429);
    }
    const tierResponse = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/payment_tiers?id=eq.${tier_id}`,
      {
        headers: {
          "apikey": env2.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_ANON_KEY}`
        }
      }
    );
    if (!tierResponse.ok) {
      return createErrorResponse("TIER_NOT_FOUND", "Payment tier not found", 404);
    }
    const tiers = await tierResponse.json();
    if (!tiers || tiers.length === 0) {
      return createErrorResponse("TIER_NOT_FOUND", "Payment tier not found", 404);
    }
    const tier = tiers[0];
    const paymentIntentId = `pi_${Math.random().toString(36).substring(2, 26)}`;
    const updateResponse = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": env2.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          tier_id,
          stripe_payment_intent_id: paymentIntentId,
          amount_paid_cents: tier.price_cents,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        })
      }
    );
    if (!updateResponse.ok) {
      return createErrorResponse("DB_UPDATE_FAILED", "Failed to initiate payment", 500);
    }
    return createSuccessResponse({
      stripe_session_url: `https://checkout.stripe.com/pay/${paymentIntentId}`,
      payment_intent_id: paymentIntentId,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    }, 201);
  } catch (err) {
    console.error("handleInitiatePayment error:", err);
    return createErrorResponse("INTERNAL_ERROR", String(err), 500);
  }
}
__name(handleInitiatePayment, "handleInitiatePayment");
async function handleVerifyPayment(request, env2) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse("INVALID_CONTENT_TYPE", "Expected application/json", 400);
    }
    const body = await parseJsonBody(request);
    const { session_token, stripe_payment_intent_id } = body;
    if (!session_token || !stripe_payment_intent_id) {
      return createErrorResponse("MISSING_FIELDS", "session_token and stripe_payment_intent_id required", 400);
    }
    if (!checkRateLimit(session_token, 5)) {
      return createErrorResponse("RATE_LIMIT", "Too many verification attempts.", 429);
    }
    const sessionResponse = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        headers: {
          "apikey": env2.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );
    if (!sessionResponse.ok) {
      return createErrorResponse("SESSION_NOT_FOUND", "Session not found", 404);
    }
    const sessions = await sessionResponse.json();
    if (!sessions || sessions.length === 0) {
      return createErrorResponse("SESSION_NOT_FOUND", "Session not found", 404);
    }
    const session = sessions[0];
    if (session.stripe_payment_intent_id !== stripe_payment_intent_id) {
      return createErrorResponse("PAYMENT_MISMATCH", "Payment intent does not match session", 400);
    }
    try {
      const updateResponse = await fetch(
        `${env2.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": env2.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${env2.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            is_premium: true,
            payment_status: "completed",
            payment_verified_at: (/* @__PURE__ */ new Date()).toISOString(),
            step_completed: 4,
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          })
        }
      );
      if (!updateResponse.ok) {
        throw new Error("Failed to update session");
      }
      const accessToken = generateAccessToken();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1e3);
      const reportResponse = await fetch(
        `${env2.SUPABASE_URL}/rest/v1/calculator_reports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": env2.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${env2.SUPABASE_SERVICE_ROLE_KEY}`,
            "Prefer": "return=representation"
          },
          body: JSON.stringify({
            session_id: session.id,
            email: session.email,
            access_token: accessToken,
            report_html: "<p>Report generation starting...</p>",
            report_json: {
              status: "queued",
              stage: 0,
              queued_at: (/* @__PURE__ */ new Date()).toISOString(),
              tier_id: session.tier_id
            },
            is_generated: false,
            is_expired: false,
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            expires_at: expiresAt.toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          })
        }
      );
      if (!reportResponse.ok) {
        throw new Error("Failed to create report");
      }
      console.log(`[Report Queue] Session ${session.id} queued for generation`);
      return createSuccessResponse({
        session_token,
        is_premium: true,
        payment_status: "completed",
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
        message: "Payment verified. Report generation started."
      }, 200);
    } catch (transactionError) {
      return createErrorResponse("PAYMENT_VERIFICATION_FAILED", "Transaction failed", 500);
    }
  } catch (err) {
    console.error("handleVerifyPayment error:", err);
    return createErrorResponse("INTERNAL_ERROR", String(err), 500);
  }
}
__name(handleVerifyPayment, "handleVerifyPayment");
async function handleStep4Submission(request, env2) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse("INVALID_CONTENT_TYPE", "Expected application/json", 400);
    }
    const body = await parseJsonBody(request);
    const { session_token, data: formData } = body;
    if (!session_token || !formData) {
      return createErrorResponse("MISSING_FIELDS", "session_token and data required", 400);
    }
    if (!formData.email || !isValidEmail(formData.email)) {
      return createErrorResponse("INVALID_EMAIL", "Valid email required", 400);
    }
    if (!checkRateLimit(session_token, 3)) {
      return createErrorResponse("RATE_LIMIT", "Too many submissions.", 429);
    }
    const sessionResponse = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        headers: {
          "apikey": env2.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );
    if (!sessionResponse.ok) {
      return createErrorResponse("SESSION_NOT_FOUND", "Session not found", 404);
    }
    const sessions = await sessionResponse.json();
    if (!sessions || sessions.length === 0) {
      return createErrorResponse("SESSION_NOT_FOUND", "Session not found", 404);
    }
    const session = sessions[0];
    if (!session.is_premium || session.payment_status !== "completed") {
      return createErrorResponse("PAYMENT_REQUIRED", "Payment required to access step 4", 403);
    }
    const validationErrors = [];
    if (!formData.first_name || formData.first_name.length > 100) {
      validationErrors.push({ field: "first_name", message: "First name required (1-100 chars)" });
    }
    if (!formData.last_name || formData.last_name.length > 100) {
      validationErrors.push({ field: "last_name", message: "Last name required (1-100 chars)" });
    }
    if (validationErrors.length > 0) {
      return createErrorResponse("VALIDATION_FAILED", "Form validation failed", 400, { errors: validationErrors });
    }
    const updateResponse = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": env2.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          medications: formData.medications || null,
          conditions: formData.conditions || [],
          other_conditions: formData.other_conditions || null,
          symptoms: formData.symptoms || null,
          other_symptoms: formData.other_symptoms || null,
          allergies: formData.allergies || null,
          avoid_foods: formData.avoid_foods || null,
          dairy_tolerance: formData.dairy_tolerance || null,
          previous_diets: formData.previous_diets || null,
          what_worked: formData.what_worked || null,
          carnivore_experience: formData.carnivore_experience || null,
          cooking_skill: formData.cooking_skill || null,
          meal_prep_time: formData.meal_prep_time || null,
          budget: formData.budget || null,
          family_situation: formData.family_situation || null,
          work_travel: formData.work_travel || null,
          goals: formData.goals || [],
          biggest_challenge: formData.biggest_challenge || null,
          additional_notes: formData.additional_notes || null,
          step_completed: 4,
          completed_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        })
      }
    );
    if (!updateResponse.ok) {
      return createErrorResponse("DB_UPDATE_FAILED", "Failed to save step 4 data", 500);
    }
    return createSuccessResponse({
      success: true,
      session_token,
      step_completed: 4,
      message: "Step 4 submitted. Report generation queued."
    }, 200);
  } catch (err) {
    console.error("handleStep4Submission error:", err);
    return createErrorResponse("INTERNAL_ERROR", String(err), 500);
  }
}
__name(handleStep4Submission, "handleStep4Submission");
async function handleReportStatus(request, env2, accessToken) {
  try {
    if (!accessToken || accessToken.length !== 64 || !/^[a-f0-9]{64}$/i.test(accessToken)) {
      return createErrorResponse("INVALID_TOKEN", "Invalid access token format", 400);
    }
    const response = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/calculator_reports?access_token=eq.${accessToken}`,
      {
        headers: {
          "apikey": env2.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_ANON_KEY}`
        }
      }
    );
    if (!response.ok) {
      return createErrorResponse("REPORT_NOT_FOUND", "Report not found", 404);
    }
    const reports = await response.json();
    if (!reports || reports.length === 0) {
      return createErrorResponse("REPORT_NOT_FOUND", "Report not found", 404);
    }
    const report2 = reports[0];
    if (report2.is_expired || new Date(report2.expires_at) < /* @__PURE__ */ new Date()) {
      return createErrorResponse("REPORT_EXPIRED", "Report access has expired", 410);
    }
    const reportMeta = report2.report_json || {};
    const status = reportMeta.status || "unknown";
    const stage = reportMeta.stage || 0;
    const progress = reportMeta.progress || 0;
    let timeRemaining = 0;
    if (status === "queued") {
      timeRemaining = 30;
    } else if (status === "generating") {
      const stageMap = { 1: 25, 2: 20, 3: 30, 4: 20, 5: 5 };
      timeRemaining = stageMap[stage] || 15;
    }
    const stageNames = {
      0: "Initializing...",
      1: "Calculating your macros...",
      2: "Analyzing your health profile...",
      3: "Generating your protocol...",
      4: "Personalizing recommendations...",
      5: "Finalizing your report..."
    };
    return createSuccessResponse({
      access_token: accessToken,
      status,
      is_generated: report2.is_generated,
      stage,
      stage_name: stageNames[stage] || "Processing...",
      progress,
      time_remaining_seconds: timeRemaining,
      expires_at: report2.expires_at
    }, 200);
  } catch (err) {
    console.error("handleReportStatus error:", err);
    return createErrorResponse("INTERNAL_ERROR", String(err), 500);
  }
}
__name(handleReportStatus, "handleReportStatus");
async function handleReportInit(request, env2) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse("INVALID_CONTENT_TYPE", "Expected application/json", 400);
    }
    const body = await parseJsonBody(request);
    const { session_token } = body;
    if (!session_token) {
      return createErrorResponse("MISSING_FIELDS", "session_token required", 400);
    }
    const sessionResponse = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        headers: {
          "apikey": env2.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );
    if (!sessionResponse.ok) {
      return createErrorResponse("SESSION_NOT_FOUND", "Session not found", 404);
    }
    const sessions = await sessionResponse.json();
    if (!sessions || sessions.length === 0) {
      return createErrorResponse("SESSION_NOT_FOUND", "Session not found", 404);
    }
    const session = sessions[0];
    const existingReportResponse = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/calculator_reports?session_id=eq.${session.id}`,
      {
        headers: {
          "apikey": env2.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );
    let accessToken;
    if (existingReportResponse.ok) {
      const existingReports = await existingReportResponse.json();
      if (existingReports && existingReports.length > 0) {
        accessToken = existingReports[0].access_token;
        return createSuccessResponse({
          access_token: accessToken,
          report_id: existingReports[0].id,
          status: "already_generated"
        }, 200);
      }
    }
    accessToken = generateAccessToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1e3);
    const reportHTML = await generateReportWithClaude(session, env2);
    const saveResponse = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/calculator_reports`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": env2.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_SERVICE_ROLE_KEY}`,
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          session_id: session.id,
          email: session.email,
          access_token: accessToken,
          report_html: reportHTML,
          report_json: {
            status: "completed",
            stage: 5,
            generated_at: (/* @__PURE__ */ new Date()).toISOString(),
            tier_id: session.tier_id
          },
          is_expired: false,
          expires_at: expiresAt.toISOString()
        })
      }
    );
    if (!saveResponse.ok) {
      console.error("Failed to save report:", await saveResponse.text());
      return createErrorResponse("DB_INSERT_FAILED", "Failed to save generated report", 500);
    }
    const reportData = await saveResponse.json();
    return createSuccessResponse({
      access_token: accessToken,
      report_id: reportData[0]?.id,
      status: "generated",
      expires_at: expiresAt.toISOString()
    }, 201);
  } catch (err) {
    console.error("handleReportInit error:", err);
    return createErrorResponse("INTERNAL_ERROR", String(err), 500);
  }
}
__name(handleReportInit, "handleReportInit");
async function generateReportWithClaude(session, env2) {
  try {
    if (!env2.CLAUDE_API_KEY) {
      console.error("CLAUDE_API_KEY not configured");
      return generateFallbackReport(session);
    }
    const prompt = `Generate a personalized carnivore diet report for:

Name: ${session.first_name} ${session.last_name}
Age: ${session.age}
Sex: ${session.sex}
Weight: ${session.weight_value} ${session.weight_unit}
Height: ${session.height_feet}ft ${session.height_inches}in
Goal: ${session.goal}
Diet Type: ${session.diet_type}
Activity Level: ${session.lifestyle_activity}

Macros to follow:
- Calories: ${session.calculated_macros?.calories || 2e3}
- Protein: ${session.calculated_macros?.protein_grams || 150}g
- Fat: ${session.calculated_macros?.fat_grams || 150}g
- Carbs: ${session.calculated_macros?.carbs_grams || 25}g

Health Info:
- Allergies: ${session.allergies || "None"}
- Foods to avoid: ${session.avoid_foods || "None"}
- Dairy tolerance: ${session.dairy_tolerance || "Not specified"}
- Previous diet experience: ${session.previous_diets || "Not specified"}

Generate a comprehensive, personalized carnivore diet report with practical recommendations.
Format as HTML with proper sections and styling.`;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env2.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2e3,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });
    if (!response.ok) {
      console.error("Claude API error:", response.status, await response.text());
      return generateFallbackReport(session);
    }
    const data = await response.json();
    const reportContent = data.content[0]?.text || "";
    return wrapReportHTML(reportContent, session);
  } catch (err) {
    console.error("Error calling Claude API:", err);
    return generateFallbackReport(session);
  }
}
__name(generateReportWithClaude, "generateReportWithClaude");
function wrapReportHTML(content, session) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Personalized Carnivore Report</title>
  <style>
    body {
      font-family: 'Merriweather', Georgia, serif;
      line-height: 1.6;
      color: #2c1810;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f4e4d4;
    }
    h1, h2, h3 {
      font-family: 'Playfair Display', Georgia, serif;
      color: #b8860b;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #d4a574;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .macros {
      background: #f9f5f0;
      padding: 20px;
      border-radius: 4px;
      margin: 20px 0;
      border-left: 4px solid #d4a574;
    }
    .macro-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e0d5c7;
    }
    .macro-row:last-child {
      border-bottom: none;
    }
    .macro-label {
      font-weight: 600;
    }
    .macro-value {
      color: #b8860b;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Personalized Carnivore Report</h1>
      <p>${session.first_name} ${session.last_name}</p>
    </div>

    <div class="macros">
      <h2>Your Daily Macro Targets</h2>
      <div class="macro-row">
        <span class="macro-label">Calories</span>
        <span class="macro-value">${session.calculated_macros?.calories || 2e3}</span>
      </div>
      <div class="macro-row">
        <span class="macro-label">Protein</span>
        <span class="macro-value">${session.calculated_macros?.protein_grams || 150}g</span>
      </div>
      <div class="macro-row">
        <span class="macro-label">Fat</span>
        <span class="macro-value">${session.calculated_macros?.fat_grams || 150}g</span>
      </div>
      <div class="macro-row">
        <span class="macro-label">Carbs</span>
        <span class="macro-value">${session.calculated_macros?.carbs_grams || 25}g</span>
      </div>
    </div>

    <div class="recommendations">
      ${content}
    </div>
  </div>
</body>
</html>`;
}
__name(wrapReportHTML, "wrapReportHTML");
function generateFallbackReport(session) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Personalized Carnivore Report</title>
  <style>
    body {
      font-family: 'Merriweather', Georgia, serif;
      line-height: 1.6;
      color: #2c1810;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f4e4d4;
    }
    h1, h2 { font-family: 'Playfair Display', Georgia, serif; color: #b8860b; }
    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); }
    .header { text-align: center; border-bottom: 3px solid #d4a574; padding-bottom: 20px; margin-bottom: 30px; }
    .macros { background: #f9f5f0; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #d4a574; }
    .macro-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0d5c7; }
    .macro-value { color: #b8860b; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Personalized Carnivore Report</h1>
      <p>${session.first_name} ${session.last_name}</p>
    </div>

    <div class="macros">
      <h2>Your Daily Macro Targets</h2>
      <div class="macro-row">
        <span>Calories</span>
        <span class="macro-value">${session.calculated_macros?.calories || 2e3}</span>
      </div>
      <div class="macro-row">
        <span>Protein</span>
        <span class="macro-value">${session.calculated_macros?.protein_grams || 150}g</span>
      </div>
      <div class="macro-row">
        <span>Fat</span>
        <span class="macro-value">${session.calculated_macros?.fat_grams || 150}g</span>
      </div>
      <div class="macro-row">
        <span>Carbs</span>
        <span class="macro-value">${session.calculated_macros?.carbs_grams || 25}g</span>
      </div>
    </div>

    <div class="recommendations">
      <h2>Your Carnivore Protocol</h2>
      <p>Your personalized report is being generated. Based on your profile:</p>
      <ul>
        <li><strong>Goal:</strong> ${session.goal}</li>
        <li><strong>Activity Level:</strong> ${session.lifestyle_activity}</li>
        <li><strong>Diet Type:</strong> ${session.diet_type}</li>
        <li><strong>Dairy Tolerance:</strong> ${session.dairy_tolerance || "Not specified"}</li>
      </ul>
      <h3>Primary Recommendations</h3>
      <ul>
        <li>Focus on ruminant meats (beef, lamb, bison) as your primary protein</li>
        <li>Include organ meats (liver, kidney) for micronutrient density</li>
        <li>Add butter and fat from quality sources</li>
        <li>Drink plenty of water and consider electrolyte supplementation</li>
        <li>Track macros for the first 2-4 weeks to understand portion sizes</li>
      </ul>
    </div>
  </div>
</body>
</html>`;
}
__name(generateFallbackReport, "generateFallbackReport");
async function handleReportContent(request, env2, accessToken) {
  try {
    if (!accessToken || accessToken.length !== 64 || !/^[a-f0-9]{64}$/i.test(accessToken)) {
      return createErrorResponse("INVALID_TOKEN", "Invalid access token format", 400);
    }
    const response = await fetch(
      `${env2.SUPABASE_URL}/rest/v1/calculator_reports?access_token=eq.${accessToken}`,
      {
        headers: {
          "apikey": env2.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${env2.SUPABASE_ANON_KEY}`
        }
      }
    );
    if (!response.ok) {
      return createErrorResponse("REPORT_NOT_FOUND", "Report not found", 404);
    }
    const reports = await response.json();
    if (!reports || reports.length === 0) {
      return createErrorResponse("REPORT_NOT_FOUND", "Report not found", 404);
    }
    const report2 = reports[0];
    if (report2.is_expired || new Date(report2.expires_at) < /* @__PURE__ */ new Date()) {
      return createErrorResponse("REPORT_EXPIRED", "Report access has expired", 410);
    }
    return new Response(report2.report_html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  } catch (err) {
    console.error("handleReportContent error:", err);
    return createErrorResponse("INTERNAL_ERROR", String(err), 500);
  }
}
__name(handleReportContent, "handleReportContent");
var calculator_api_default = {
  async fetch(request, env2) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": env2.FRONTEND_URL || "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }
    if (path === "/api/v1/calculator/session" && method === "POST") {
      return await handleCreateSession(request, env2);
    }
    if (path === "/api/v1/calculator/validate" && method === "POST") {
      return await handleValidateSession(request, env2);
    }
    if (path === "/api/v1/calculator/step/1" && method === "POST") {
      return await handleSaveStep1(request, env2);
    }
    if (path === "/api/v1/calculator/step/2" && method === "POST") {
      return await handleSaveStep2(request, env2);
    }
    if (path === "/api/v1/calculator/step/3" && method === "POST") {
      return await handleSaveStep3(request, env2);
    }
    if (path === "/api/v1/calculator/step/4" && method === "POST") {
      return await handleStep4Submission(request, env2);
    }
    if (path === "/api/v1/calculator/payment/tiers" && method === "GET") {
      return await handleGetPaymentTiers(request, env2);
    }
    if (path === "/api/v1/calculator/payment/initiate" && method === "POST") {
      return await handleInitiatePayment(request, env2);
    }
    if (path === "/api/v1/calculator/payment/verify" && method === "POST") {
      return await handleVerifyPayment(request, env2);
    }
    if (path === "/api/v1/calculator/report/init" && method === "POST") {
      return await handleReportInit(request, env2);
    }
    const contentMatch = path.match(/^\/api\/v1\/calculator\/report\/([a-f0-9]{64})\/content$/i);
    if (contentMatch && method === "GET") {
      return await handleReportContent(request, env2, contentMatch[1]);
    }
    const statusMatch = path.match(/^\/api\/v1\/calculator\/report\/([a-f0-9]{64})\/status$/i);
    if (statusMatch && method === "GET") {
      return await handleReportStatus(request, env2, statusMatch[1]);
    }
    return createErrorResponse("NOT_FOUND", "Endpoint not found", 404);
  }
};

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-31HAsv/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = calculator_api_default;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-31HAsv/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=calculator-api.js.map
