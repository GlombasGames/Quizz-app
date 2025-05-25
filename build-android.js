
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const triviaId = process.argv[2];

if (!triviaId) {
  console.error('❌ Debes indicar el nombre de la trivia (por ejemplo: mitologia, selva, etc.)');
  process.exit(1);
}

const triviaNameCapitalized = triviaId.charAt(0).toUpperCase() + triviaId.slice(1);
const configPath = path.join(__dirname, 'capacitor.config.json');
const androidBase = path.join(__dirname, 'android');
const androidTarget = path.join(__dirname, `android-${triviaId}`);
const googleServicesSrc = path.join(__dirname, `googleServices/google-services.json`);
const googleServicesDst = path.join(androidBase, 'app/google-services.json');

console.log(`
🚀 Generando proyecto Android para la trivia: ${triviaId}`);

// 🔁 Restaurar configuraciones de main.js para Android
const mainJsPath = path.join(__dirname, 'public', 'core', 'main.js');
let mainContent = fs.readFileSync(mainJsPath, 'utf8');
mainContent = mainContent.replace("const baseURL = `/${triviaName}`", "const baseURL = ''");
mainContent = mainContent.replace("const buildPath = (key) => `${triviaName}/${key}.json`;", "const buildPath = (key) => `${key}.json`;");
fs.writeFileSync(mainJsPath, mainContent, 'utf8');
console.log('🔄 main.js restaurado para uso en APK');

// Paso 1: Modificar capacitor.config.json
const newConfig = {
  appId: `com.glombagames.trivia${triviaId}`,
  appName: triviaNameCapitalized,
  webDir: `dist/${triviaId}`,
  bundledWebRuntime: false
};
fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
console.log('✅ capacitor.config.json actualizado');

// Paso 2: Eliminar carpeta android si existe
if (fs.existsSync(androidBase)) {
  fs.rmSync(androidBase, { recursive: true, force: true });
  console.log('🗑️ Carpeta android/ eliminada');
}

// Paso 3: Crear proyecto Android
execSync('npx cap add android', { stdio: 'inherit' });

// Paso 3.5: Copiar iconos y splash personalizados
const resFolder = path.join(__dirname, 'resources');
const triviaResFolder = path.join(resFolder, triviaId);

if (fs.existsSync(triviaResFolder)) {
  fs.copyFileSync(path.join(triviaResFolder, 'icon.png'), path.join(resFolder, 'icon.png'));
  if (fs.existsSync(path.join(triviaResFolder, 'splash.png'))) {
    fs.copyFileSync(path.join(triviaResFolder, 'splash.png'), path.join(resFolder, 'splash.png'));
  }
  console.log(`🎨 Icono y splash personalizados aplicados desde: ${triviaResFolder}`);
  execSync('npx @capacitor/assets generate --android', { stdio: 'inherit' });
} else {
  console.warn(`⚠️ No se encontraron assets personalizados en: ${triviaResFolder}`);
}
// Paso 4: Copiar google-services.json
if (!fs.existsSync(googleServicesSrc)) {
  console.error(`❌ No se encontró el archivo: ${googleServicesSrc}`);
  process.exit(1);
}
fs.copyFileSync(googleServicesSrc, googleServicesDst);
console.log('✅ google-services.json copiado');

// Paso 5: Sincronizar con Capacitor
execSync('npx cap sync android', { stdio: 'inherit' });

// Paso 5.5: Agregar Firebase dependencies si no están en build.gradle
const gradlePath = path.join(androidBase, 'app', 'build.gradle');
let gradleContent = fs.readFileSync(gradlePath, 'utf8');

const firebaseBom = `    implementation platform('com.google.firebase:firebase-bom:32.1.1')`;
const firebaseMessaging = `    implementation 'com.google.firebase:firebase-messaging'`;

if (!gradleContent.includes(firebaseMessaging)) {
  gradleContent = gradleContent.replace(
    /dependencies\s*{/,
    match => `${match}\n${firebaseBom}\n${firebaseMessaging}`
  );
  fs.writeFileSync(gradlePath, gradleContent, 'utf8');
  console.log('✅ Firebase Messaging agregado a build.gradle');
} else {
  console.log('ℹ️ Firebase Messaging ya estaba presente en build.gradle');
}


// Paso 6: Copiar la carpeta android a android-<trivia>
if (fs.existsSync(androidTarget)) {
  fs.rmSync(androidTarget, { recursive: true, force: true });
}
fs.cpSync(androidBase, androidTarget, { recursive: true });
console.log(`📁 Proyecto Android copiado a: ${androidTarget}`);

console.log(`✅ Proyecto Android para '${triviaId}' generado exitosamente.`);

// Paso final: reiniciar Android Studio si está abierto (Windows)
try {
  execSync('taskkill /IM studio64.exe /F');
  console.log('🛑 Android Studio cerrado');
} catch (e) {
  console.log('ℹ️ Android Studio no estaba abierto o no se pudo cerrar');
}

try {
  execSync('npx cap open android', { stdio: 'inherit' });
  console.log('🚀 Android Studio reabierto');
} catch (e) {
  console.warn('⚠️ No se pudo abrir Android Studio automáticamente');
}