var common = require('./common');
var child = require('child_process');

var DEFAULT_MAXBUFFER_SIZE = 20 * 1024 * 1024;
var UNABLE_TO_SPAWN_ERROR_CODE = 127;

common.register('cmd', _cmd, {
  cmdOptions: null,
  globStart: 1,
  canReceivePipe: true,
  wrapOutput: true,
});

function _cmd(options, command, commandArgs, userOptions) {
  // `options` will usually not have a value: it's added by our commandline flag
  // parsing engine.
  commandArgs = [].slice.call(arguments, 2);

  // `userOptions` may or may not be provided. We need to check the last
  // argument. If it's an object, assume it's meant to be passed as
  // userOptions (since ShellStrings are already flattened to strings).
  if (commandArgs.length === 0) {
    userOptions = {};
  } else {
    var lastArg = commandArgs.pop();
    if (common.isObject(lastArg)) {
      userOptions = lastArg;
    } else {
      userOptions = {};
      commandArgs.push(lastArg);
    }
  }

  var pipe = common.readFromPipe();

  console.warn('args: ' + JSON.stringify(commandArgs));

  // Some of our defaults differ from spawnSync's defaults. These can be
  // overridden by the user.
  var defaultOptions = {
    maxBuffer: DEFAULT_MAXBUFFER_SIZE,
  };

  // For other options, we forbid the user from overriding them (either for
  // correctness or security).
  var requiredOptions = {
    input: pipe,
    shell: false,
  };

  var spawnOptions =
    Object.assign(defaultOptions, userOptions, requiredOptions);

  if (spawnOptions.encoding === 'buffer') {
    // A workaround for node v5 and early versions of v4 and v6.
    delete spawnOptions.encoding;
  }

  if (!command) {
    common.error('Must specify a non-empty string as a command');
  }
  // console.warn(command, commandArgs);

  var result = child.spawnSync(command, commandArgs, spawnOptions);
  var stdout;
  var stderr;
  var code;
  if (result.error) {
    // This can happen if `command` is not an executable binary, the child
    // process timed out, etc.
    stdout = '';
    stderr = 'Unable to spawn your process (received ' + result.error.errno + ')';
    code = UNABLE_TO_SPAWN_ERROR_CODE;
  } else {
    if (userOptions.encoding) {
      stdout = result.stdout;
      stderr = result.stderr;
    } else { // default to string
      stdout = result.stdout.toString();
      stderr = result.stderr.toString();
    }
    code = result.status;
  }

  // Pass `continue: true` so we can specify a value for stdout.
  if (code) common.error(stderr, code, { silent: true, continue: true });
  return new common.ShellString(stdout, stderr, code);
}
module.exports = _cmd;
