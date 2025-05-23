const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const configsDir = path.join(__dirname, 'configs');
const triviaFiles = fs.readdirSync(configsDir).filter(f => f.endsWith('.json'));

triviaFiles.forEach(file => {
  const triviaId = path.basename(file, '.json');
  console.log(`\n▶️  Building trivia: ${triviaId}`);

  // 1. Compilar con Webpack
  execSync(`TRIVIA=${triviaId} webpack --mode production --config webpack.config.js`, { stdio: 'inherit' });

  // 2. Copiar al folder de Capacitor
  const distPath = path.join(__dirname, `dist/${triviaId}`);
  const androidPath = path.join(__dirname, 'android/app/src/main/assets/public');

  fs.rmSync(androidPath, { recursive: true, force: true });
  fs.mkdirSync(androidPath, { recursive: true });
  fs.cpSync(distPath, androidPath, { recursive: true });

  // 3. Sync con Capacitor
  execSync(`npx cap sync android`, { stdio: 'inherit' });

  console.log(`✅ Trivia ${triviaId} build completado y sincronizado.\n`);
});
