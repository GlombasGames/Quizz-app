
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const configsDir = path.join(__dirname, 'configs');
const triviaFiles = fs.readdirSync(configsDir).filter(f => f.endsWith('.json'));

triviaFiles.forEach(file => {
  const triviaId = path.basename(file, '.json');
  const triviaNameCapitalized = triviaId.charAt(0).toUpperCase() + triviaId.slice(1);
  console.log(`\n🌐 Compilando trivia web: ${triviaId}`);

  // ✅ Modificar capacitor.config.json
  const capacitorConfig = {
    appId: `com.glombagames.trivia${triviaId}`,
    appName: triviaNameCapitalized,
    webDir: 'dist',
    bundledWebRuntime: false,
    server: {
      cleartext: false,
      url: 'https://glombagames.ddns.net/'
    }
  };
  fs.writeFileSync(path.join(__dirname, 'capacitor.config.json'), JSON.stringify(capacitorConfig, null, 2));
  console.log('⚙️  capacitor.config.json actualizado');

  // ✅ Parchear main.js si es necesario
  const mainJsPath = path.join(__dirname, 'public', 'core', 'main.js');
  let mainContent = fs.readFileSync(mainJsPath, 'utf8');
  mainContent = mainContent.replace("const baseURL = ''", "const baseURL = `/${triviaId}`");
  mainContent = mainContent.replace("const buildPath = (key) => `${key}.json`;", "const buildPath = (key) => `${triviaId}/${key}.json`;");
  fs.writeFileSync(mainJsPath, mainContent, 'utf8');
  console.log('🛠️  main.js modificado para build web');

  // 🛠️ Compilar con Webpack
  execSync(`npx cross-env TRIVIA=${triviaId} webpack --mode production --config webpack.config.js`, { stdio: 'inherit' });

  console.log(`✅ Trivia ${triviaId} compilada correctamente`);
});
