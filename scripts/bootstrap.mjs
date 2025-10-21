import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = join(scriptDirectory, '..');
const summary = [];
const timings = [];
let corepackAlreadyEnabled = false;

function logWithTime(message) {
  const now = new Date();
  const timeString = now.toISOString().substr(11, 12);
  console.log(`[${timeString}] ${message}`);
  return now;
}

function logElapsedTime(startTime, operation) {
  const endTime = new Date();
  const elapsed = (endTime - startTime) / 1000;
  timings.push({ operation, duration: elapsed.toFixed(2) });
  logWithTime(`✅ ${operation} completado en ${elapsed.toFixed(2)} segundos`);
  return endTime;
}

function readJsonFile(relativePath) {
  const absolutePath = join(rootDirectory, relativePath);
  const content = readFileSync(absolutePath, 'utf8');
  return JSON.parse(content);
}

function parseVersion(value) {
  return value
    .replace(/^v/, '')
    .split('.')
    .map((segment) => Number.parseInt(segment, 10) || 0);
}

function compareVersions(left, right) {
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference < 0) {
      return -1;
    }
    if (difference > 0) {
      return 1;
    }
  }
  return 0;
}

function satisfiesConstraint(version, constraint) {
  if (!constraint) {
    return true;
  }
  if (constraint.startsWith('>=')) {
    return compareVersions(version, parseVersion(constraint.slice(2))) >= 0;
  }
  if (constraint.startsWith('>')) {
    return compareVersions(version, parseVersion(constraint.slice(1))) > 0;
  }
  if (constraint.startsWith('<=')) {
    return compareVersions(version, parseVersion(constraint.slice(2))) <= 0;
  }
  if (constraint.startsWith('<')) {
    return compareVersions(version, parseVersion(constraint.slice(1))) < 0;
  }
  if (constraint.startsWith('=')) {
    return compareVersions(version, parseVersion(constraint.slice(1))) === 0;
  }
  return compareVersions(version, parseVersion(constraint)) === 0;
}

function ensureNodeRequirement(range) {
  if (!range) {
    console.error('Node.js engine requirement missing in package.json.');
    process.exit(1);
  }
  const normalized = range.split(' ').filter((part) => part.length > 0);
  const version = parseVersion(process.version);
  const allSatisfied = normalized.every((constraint) => satisfiesConstraint(version, constraint));
  if (!allSatisfied) {
    console.error(`Node.js ${process.version} does not satisfy required range ${range}.`);
    process.exit(1);
  }
  summary.push(`Node.js requirement satisfied (${range}).`);
}

function parsePackageManager(value) {
  if (!value) {
    return null;
  }
  const lastAt = value.lastIndexOf('@');
  if (lastAt <= 0) {
    return { name: value, version: null };
  }
  const name = value.slice(0, lastAt);
  const version = value.slice(lastAt + 1);
  return { name, version };
}

function commandAvailable(command) {
  const result = spawnSync(command, ['--version'], { cwd: rootDirectory, stdio: 'ignore' });
  return result.status === 0;
}

async function execute(command, args, operation = 'Ejecutar comando') {
  return new Promise((resolve) => {
    const startTime = logWithTime(`🚀 Iniciando: ${operation} (${command} ${args.join(' ')})`);
    
    try {
      const result = spawnSync(command, args, { 
        cwd: rootDirectory, 
        stdio: 'inherit',
        shell: true
      });
      
      const success = result.status === 0;
      
      if (success) {
        logElapsedTime(startTime, operation);
      } else {
        console.error(`❌ Error en: ${operation} (Código: ${result.status || 'N/A'})`);
      }
      
      resolve(success);
    } catch (error) {
      console.error(`❌ Error al ejecutar ${operation}:`, error.message);
      resolve(false);
    }
  });
}

async function ensureCorepack() {
  if (corepackAlreadyEnabled) {
    return true;
  }

  try {
    // Verificar si corepack está disponible
    try {
      const corepackCheck = spawnSync('corepack', ['--version'], { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      if (corepackCheck.status !== 0) {
        throw new Error('Corepack check failed');
      }
      
      logWithTime(`ℹ️ Corepack ${corepackCheck.stdout.trim()} detectado`);
    } catch (error) {
      logWithTime('ℹ️ Corepack no está disponible, continuando sin él...');
      summary.push('Corepack not available, continuing without it.');
      return false;
    }
    
    // Si está disponible, intentar habilitarlo
    logWithTime('🔄 Habilitando Corepack...');
    const result = await execute('corepack', ['enable'], 'Habilitar Corepack');
    
    if (!result) {
      logWithTime('⚠️ No se pudo habilitar Corepack, continuando sin él...');
      return false;
    }
    
    summary.push('Corepack enabled successfully.');
    corepackAlreadyEnabled = true;
    return true;
  } catch (error) {
    logWithTime('⚠️ Error al intentar habilitar Corepack, continuando sin él...');
    return false;
  }
}

async function prepareWithCorepack(name, version) {
  if (!version) {
    return true;
  }

  try {
    logWithTime(`🔧 Preparando ${name}@${version} con Corepack...`);
    const result = await execute('corepack', ['prepare', `${name}@${version}`, '--activate'], `Preparar ${name} con Corepack`);
    return result !== null;
  } catch (error) {
    logWithTime(`⚠️ No se pudo preparar ${name}@${version} con Corepack: ${error.message}`);
    return false;
  }
}

function lockExists(name) {
  if (name === 'pnpm') {
    return existsSync(join(rootDirectory, 'pnpm-lock.yaml'));
  }
  if (name === 'yarn') {
    return existsSync(join(rootDirectory, 'yarn.lock'));
  }
  return existsSync(join(rootDirectory, 'package-lock.json'));
}

function installArguments(name, hasLock) {
  if (name === 'pnpm') {
    return hasLock ? ['install', '--frozen-lockfile'] : ['install'];
  }
  if (name === 'yarn') {
    return hasLock ? ['install', '--frozen-lockfile'] : ['install'];
  }
  if (name === 'npm') {
    return hasLock ? ['ci'] : ['install'];
  }
  return ['install'];
}

async function installDependencies(manager) {
  const hasLock = lockExists(manager.name);
  const args = installArguments(manager.name, hasLock);
  
  try {
    const success = await execute(manager.name, args, `Instalar dependencias con ${manager.name}`);
    
    if (success) {
      const lockState = hasLock ? 'lock respetado' : 'lock creado';
      summary.push(`Dependencias instaladas con ${manager.name} (${lockState}).`);
      return true;
    }
    
    return false;
  } catch (error) {
    logWithTime(`❌ Error al instalar dependencias con ${manager.name}: ${error.message}`);
    return false;
  }
}

async function installLefthook(manager) {
  try {
    let success = false;
    
    if (manager.name === 'pnpm') {
      success = await execute('pnpm', ['exec', 'lefthook', 'install'], 'Instalar Lefthook con pnpm');
    } else if (manager.name === 'yarn') {
      success = await execute('yarn', ['lefthook', 'install'], 'Instalar Lefthook con yarn');
    } else {
      success = await execute('npx', ['lefthook', 'install'], 'Instalar Lefthook con npx');
    }
    
    if (success) {
      summary.push('Lefthook instalado con configuración pre-commit.');
      return true;
    } else {
      logWithTime('⚠️ No se pudo instalar Lefthook, continuando sin él...');
      return false;
    }
  } catch (error) {
    logWithTime(`⚠️ Error al instalar Lefthook: ${error.message}, continuando sin él...`);
    return false;
  }
}

async function selectManager(packageManagerValue) {
  const parsed = parsePackageManager(packageManagerValue);
  const sequence = [
    { 
      name: 'pnpm', 
      version: parsed?.name === 'pnpm' ? parsed.version : null,
      requiresCorepack: true
    },
    { 
      name: 'yarn', 
      version: parsed?.name === 'yarn' ? parsed.version : null,
      requiresCorepack: true
    },
    { 
      name: 'npm', 
      version: parsed?.name === 'npm' ? parsed.version : null,
      requiresCorepack: false
    }
  ];

  for (const manager of sequence) {
    logWithTime(`🔍 Probando con ${manager.name}...`);
    
    // Verificar si el comando está disponible
    if (!commandAvailable(manager.name)) {
      logWithTime(`ℹ️ ${manager.name} no está disponible, probando con el siguiente gestor...`);
      continue;
    }

    // Manejar Corepack si es necesario
    if (manager.requiresCorepack && manager.version) {
      logWithTime(`🔄 Configurando ${manager.name}@${manager.version}...`);
      
      const corepackEnabled = await ensureCorepack();
      if (corepackEnabled) {
        const prepared = await prepareWithCorepack(manager.name, manager.version);
        if (!prepared) {
          logWithTime(`⚠️ No se pudo configurar ${manager.name}@${manager.version} con Corepack.`);
          continue;
        }
        summary.push(`${manager.name}@${manager.version} configurado con Corepack.`);
      } else {
        logWithTime(`ℹ️ Usando ${manager.name} sin Corepack...`);
      }
    }

    // Intentar instalar dependencias
    logWithTime(`🔄 Intentando instalar dependencias con ${manager.name}...`);
    const depsInstalled = await installDependencies(manager);
    
    if (depsInstalled) {
      summary.push(`✅ Gestor de paquetes seleccionado: ${manager.name}.`);
      return manager;
    }
    
    logWithTime(`⚠️ La instalación con ${manager.name} falló, probando con el siguiente...`);
  }
  
  return null;
}

async function run() {
  const startTime = logWithTime('🚀 Iniciando proceso de instalación');
  
  try {
    // 1. Leer configuración del proyecto
    logWithTime('📦 Leyendo configuración del proyecto...');
    const pkg = readJsonFile('package.json');
    
    // 2. Verificar requisitos de Node.js
    logWithTime('🔍 Verificando requisitos de Node.js...');
    const engineRequirement = pkg.engines?.node;
    ensureNodeRequirement(engineRequirement);
    
    // 3. Seleccionar y configurar el gestor de paquetes
    logWithTime('🛠️  Seleccionando gestor de paquetes...');
    const managerStart = new Date();
    const manager = await selectManager(pkg.packageManager);
    
    if (!manager) {
      console.error('❌ No se encontró un gestor de paquetes adecuado.');
      process.exit(1);
    }
    
    logElapsedTime(managerStart, `Selección de gestor de paquetes (${manager.name})`);
    
    // 4. Instalar Lefthook (opcional, no crítico)
    logWithTime('🔧 Configurando herramientas adicionales...');
    const toolsStart = new Date();
    
    // Ejecutar en paralelo las tareas que no son críticas
    await Promise.allSettled([
      installLefthook(manager).catch(err => {
        logWithTime(`⚠️ No se pudo instalar Lefthook: ${err.message}`);
      })
    ]);
    
    logElapsedTime(toolsStart, 'Configuración de herramientas adicionales');
    
    // Mostrar resumen
    console.log('\n📊 Resumen de la instalación:');
    console.log('='.repeat(50));
    console.log(summary.join('\n'));
    
    // Mostrar tiempos
    console.log('\n⏱️  Tiempos de ejecución:');
    console.log('='.repeat(50));
    timings.forEach(({ operation, duration }) => {
      console.log(`- ${operation}: ${duration} segundos`);
    });
    
    const totalTime = (new Date() - startTime) / 1000;
    console.log('='.repeat(50));
    console.log(`✨ Proceso completado en ${totalTime.toFixed(2)} segundos`);
    
  } catch (error) {
    console.error('\n❌ Error durante la instalación:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Manejar promesas no capturadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Error no manejado en la promesa:');
  console.error(reason);
  process.exit(1);
});

// Ejecutar la aplicación
run().catch(error => {
  console.error('❌ Error fatal no manejado:');
  console.error(error);
  process.exit(1);
});
