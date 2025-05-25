const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const capacitorConfigPath = path.join(__dirname, '../capacitor.config.json');
const capacitorConfig = JSON.parse(fs.readFileSync(capacitorConfigPath, 'utf-8'));


const triviaId = process.argv[2];

if (!triviaId) {
  console.error('❌ Debes especificar el nombre de la trivia. Ejemplo: npm run build -- selva');
  process.exit(1);
}

console.log(`\n🚧 Construyendo trivia: ${triviaId}`);

try {
  // 1. Webpack build
  execSync(`npx cross-env TRIVIA=${triviaId} webpack --mode production --config webpack.config.js`, { stdio: 'inherit' });

  // 2. Copiar los archivos a android/assets/public
  const distPath = path.join(__dirname, `../dist/${triviaId}`);
  if (!fs.existsSync(distPath)) {
    console.error(`❌ La carpeta ${distPath} no existe. Verificá que el build haya sido exitoso.`);
    process.exit(1);
  }
  const androidPath = path.join(__dirname, '../android/app/src/main/assets/public');

  fs.rmSync(androidPath, { recursive: true, force: true });
  fs.mkdirSync(androidPath, { recursive: true });
  fs.cpSync(distPath, androidPath, { recursive: true });

  // Modificar solo el campo 'server.url'
  capacitorConfig.server = {
    ...capacitorConfig.server,
    url: `https://glombagames.ddns.net/${triviaId}`
  };
  fs.writeFileSync(capacitorConfigPath, JSON.stringify(capacitorConfig, null, 2));
  console.log(`📦 capacitor.config.json actualizado con URL: ${capacitorConfig.server.url}`);


  // 3. Sincronizar con Capacitor
  execSync(`npx cap sync android`, { stdio: 'inherit' });

  console.log(`✅ Trivia '${triviaId}' construida y sincronizada.\n`);
} catch (error) {
  console.error(`❌ Error construyendo trivia '${triviaId}':`, error.message);
  process.exit(1);
}