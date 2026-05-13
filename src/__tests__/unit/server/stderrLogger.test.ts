import { StderrLogger } from '../../../server/stderrLogger';

describe('StderrLogger', () => {
  let writes: string[];
  let originalWrite: typeof process.stderr.write;
  let originalLevel: string | undefined;

  beforeEach(() => {
    writes = [];
    originalWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: unknown): boolean => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    originalLevel = process.env.CALM_LOG_LEVEL;
    delete process.env.CALM_LOG_LEVEL;
  });

  afterEach(() => {
    process.stderr.write = originalWrite;
    if (originalLevel === undefined) delete process.env.CALM_LOG_LEVEL;
    else process.env.CALM_LOG_LEVEL = originalLevel;
  });

  test('info writes to stderr with [INFO] prefix', () => {
    new StderrLogger().info('hello');
    expect(writes).toEqual(['[INFO] hello\n']);
  });

  test('info appends serialized meta when provided', () => {
    new StderrLogger().info('hello', { k: 1 });
    expect(writes).toEqual(['[INFO] hello {"k":1}\n']);
  });

  test('warn and error use their own prefixes', () => {
    const log = new StderrLogger();
    log.warn('w');
    log.error('e');
    expect(writes).toEqual(['[WARN] w\n', '[ERROR] e\n']);
  });

  test('debug is suppressed unless CALM_LOG_LEVEL=debug', () => {
    new StderrLogger().debug('d');
    expect(writes).toEqual([]);
  });

  test('debug writes when CALM_LOG_LEVEL=debug', () => {
    process.env.CALM_LOG_LEVEL = 'debug';
    new StderrLogger().debug('d', { x: 1 });
    expect(writes).toEqual(['[DEBUG] d {"x":1}\n']);
  });

  test('never writes to stdout', () => {
    const stdoutWrites: string[] = [];
    const originalStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdoutWrites.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const log = new StderrLogger();
      log.info('i');
      log.warn('w');
      log.error('e');
      process.env.CALM_LOG_LEVEL = 'debug';
      log.debug('d');
    } finally {
      process.stdout.write = originalStdout;
    }
    expect(stdoutWrites).toEqual([]);
  });
});
