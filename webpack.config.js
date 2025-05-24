const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// Detectamos qué trivia vamos a construir (default: selva)
const triviaId = process.env.TRIVIA || 'selva';
const configPath = path.resolve(__dirname, `configs/${triviaId}.json`);

if (!fs.existsSync(configPath)) {
  throw new Error(`No se encontró el archivo de configuración: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

module.exports = {
  mode: 'development', // podés cambiar a 'production' para release

  entry: './public/core/main.js',

  output: {
    path: path.resolve(__dirname, `dist/${triviaId}`),
    filename: 'bundle.js',
    publicPath: '',
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.json$/,
        type: 'json',
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './public/core/index.html',
      filename: 'index.html',
      title: config.nombre || 'Trivia',
    }),
    new CopyWebpackPlugin({
      patterns: [
        // Estos archivos son iguales para todos
        { from: './public/core/style.css', to: './style.css' },
        { from: './public/core/firebase-messaging-sw.js', to: './firebase-messaging-sw.js' },

        // Estos archivos cambian por trivia
        {
          from: `./public/${triviaId}/categorias.json`,
          to: './categorias.json',
        },
        {
          from: `./public/${triviaId}/assets`,
          to: './assets',
        },
      ],
    }),
    new webpack.DefinePlugin({
      'window.TRIVIA_ID': JSON.stringify(config.triviaId),
    }),
  ],

  devServer: {
    static: {
      directory: path.join(__dirname, `dist/${triviaId}`),
    },
    port: 3000,
    open: true,
  },
};
