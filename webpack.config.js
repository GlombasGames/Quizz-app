const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './public/main.js', // Archivo principal de entrada
  output: {
    path: path.resolve(__dirname, 'dist'), // Carpeta de salida
    filename: 'bundle.js', // Archivo JavaScript empaquetado
    clean: true, // Limpia la carpeta dist antes de cada build
  },
  module: {
    rules: [
      {
        test: /\.html$/, // Procesar archivos HTML
        use: ['html-loader'],
      },
      {
        test: /\.css$/, // Procesar archivos CSS
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html', // Archivo HTML base
      filename: 'index.html', // Archivo HTML generado
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 8080, // Puerto del servidor de desarrollo
    open: true, // Abre automáticamente el navegador
  },
  mode: 'development', // Modo de desarrollo (puedes cambiarlo a 'production' para optimizar)
};