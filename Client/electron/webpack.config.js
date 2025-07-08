let debug = process.env.NODE_ENV !== "production";
let webpack = require('webpack');
let path = require('path');

// Set up expiry date
const curr_date = new Date() 
const exp_date = new Date(curr_date.setFullYear(curr_date.getFullYear() + 1))

module.exports = (env) => {       
  return {
    context: path.join(__dirname, "src"),
    devtool: debug ? "inline-source-map" : null,
    entry: "./client.js",
    target: 'electron-main',
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /(node_modules|bower_components)/,
          loader: 'babel-loader',
          options: {
            presets: ['react', 'es2015', 'stage-0'],
            plugins: ['react-html-attrs', 'transform-class-properties', 'transform-decorators-legacy'],
          }
        },
        { test: /\.css$/, use: ['style-loader', 'css-loader']},
        {
          test: /\.(png|jpg|gif)$/,
                use: [{
                  loader: 'file-loader',
                  options: {}
                }]
        }
      ]
    },
    output: {
      path: __dirname + "/public/",
      filename: "client.min.js"
    },
    plugins: debug 
            ? [
                new webpack.DefinePlugin({
                "process.env.EXP_DATE": JSON.stringify(exp_date.toISOString()), // Set up expiry date
                })
              ]
            : [
                new webpack.optimize.DedupePlugin(),
                new webpack.optimize.OccurenceOrderPlugin(),
                new webpack.optimize.UglifyJsPlugin({ mangle: false, sourcemap: false }),
                new webpack.DefinePlugin({
                  "process.env.EXP_DATE": JSON.stringify(exp_date.toISOString()), // Set up expiry date
                  })
              ]
  }
}
