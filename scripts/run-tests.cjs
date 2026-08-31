const { spawn } = require('child_process');
const { glob } = require('glob');
const Table = require('cli-table3');

// Find all script test files
const testFiles = glob.sync('scripts/**/*.test.ts');

const parallelism = 10;

if (testFiles.length === 0) {
  console.log('No test files found');
  process.exit(0);
}

console.log('🚀 Running tests in PARALLEL mode');
console.log('Found test files:', testFiles.join(' '));

// Store test results
const testResults = [];
const startTime = Date.now();

// Controlled concurrency promise runner
async function promiseRunner(funs, concurrency) {
  let result = [];
  while (funs.length > 0) {
    const group = funs.splice(0, concurrency);
    const promises = group.map(f => f());
    const partial = await Promise.all(promises);
    result = result.concat(partial);
  }
  return result;
}

// Run tests with controlled parallelism using Promise.all
async function runTestsInParallel() {
  const testTasks = testFiles.map(testFile => () => {
    return runTestAsync(testFile);
  });

  console.log(`🚀 Running ${testFiles.length} tests with controlled concurrency (max ${parallelism} parallel)`);
  const results = await promiseRunner(testTasks, parallelism);
  return results;
}

// Async test execution using spawn
function runTestAsync(testFile) {
  return new Promise((resolve) => {
    const testStartTime = Date.now();

    console.log(`\n🔄 Running tests in ${testFile}...`);

    const child = spawn('npx', ['tsx', '--test', testFile], {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('close', (code) => {
      const duration = Date.now() - testStartTime;
      if (code === 0) {
        resolve({ file: testFile, status: 'PASS', duration: `${duration}ms` });
      } else {
        resolve({ file: testFile, status: 'FAIL', duration: `${duration}ms` });
      }
    });

    child.on('error', (error) => {
      console.error(`❌ Tests failed in ${testFile}:`, error.message);
      const duration = Date.now() - testStartTime;
      resolve({ file: testFile, status: 'FAIL', duration: `${duration}ms` });
    });
  });
}

// Execute tests in parallel
runTestsInParallel().then(results => {
  testResults.push(...results);
  displayResults();
});

function displayResults() {
  const totalTime = Date.now() - startTime;

  const table = new Table({
    head: ['📊 TEST SUMMARY (PARALLEL)', ''],
    chars: {
      'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
      'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
      'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
      'right': '║', 'right-mid': '╢', 'middle': '│'
    }
  });

  table.push(
    ['File', 'Status', 'Duration', 'Order'],
    ['─'.repeat(40), '─'.repeat(10), '─'.repeat(10), '─'.repeat(6)]
  );

  const sortedResults = testResults
    .map((result, index) => ({ ...result, order: index + 1 }))
    .sort((a, b) => {
      const aTime = parseInt(a.duration.replace('ms', ''));
      const bTime = parseInt(b.duration.replace('ms', ''));
      return aTime - bTime;
    });

  sortedResults.forEach(result => {
    const fileName = result.file.replace('scripts/', '').replace('.test.ts', '');
    const status = result.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    const order = `#${result.order}`;
    table.push([fileName, status, result.duration, order]);
  });

  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.status === 'PASS').length;
  const failedTests = testResults.filter(r => r.status === 'FAIL').length;
  const totalRow = `Total: ${totalTests} files | ✅ ${passedTests} | ❌ ${failedTests} | ⏱️ ${totalTime}ms`;
  table.push([{ colSpan: 4, content: totalRow }]);

  console.log('\n');
  console.log(table.toString());

  const hasErrors = failedTests > 0;
  if (hasErrors) {
    console.log('\n❌ Some tests failed. Check the output above for details.');
  } else {
    console.log('\n✅ All tests passed!');
  }

  process.exit(hasErrors ? 1 : 0);
}
