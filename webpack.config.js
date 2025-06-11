const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// Detectamos qué trivia vamos a construir (default: selva)
const triviaId = process.env.TRIVIA || 'selva';
const isAndroid = process.env.IS_ANDROID === 'true';
const configPath = path.resolve(__dirname, `configs/${triviaId}.json`);

if (!fs.existsSync(configPath)) {
  throw new Error(`No se encontró el archivo de configuración: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

module.exports = {
  mode: 'development', // podés cambiar a 'production' para release

  entry: './public/core/main.js',

  output: {
    path: path.resolve(__dirname, isAndroid ? `distAndroid/${triviaId}` : `dist/${triviaId}`),
    filename: 'bundle.js',
    publicPath: isAndroid ? '' : `/${triviaId}/`,
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'string-replace-loader',
            options: {
              search: '__TRIVIA__',
              replace: 'public/'+triviaId,
              flags: 'g',
            },
          },
        ],
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
        { from: './public/core/misiones.json', to: './misiones.json' },
        { from: './public/core/firebase-messaging-sw.js', to: './firebase-messaging-sw.js' },
        { from: './public/core/fonts', to: './fonts' },

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
      __TRIVIA__: JSON.stringify(triviaId),
      __IS_ANDROID__: JSON.stringify(process.env.IS_ANDROID === 'true'),
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
