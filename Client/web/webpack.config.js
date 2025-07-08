var debug = process.env.NODE_ENV !== "production";
var webpack = require('webpack');
var path = require('path');


module.exports = (env) => {

  const plugins = [
    new webpack.DefinePlugin({
      'process.env': {
        'akaWeb': 1,
	'AK_DEV': process.env.AK_DEV,
      }
    })
  ] 

  return {
    context: path.join(__dirname, "src"),
    devtool: debug ? "inline-source-map" : null,
    entry: "./client.js",
    target: 'web',
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
    plugins: 
      debug 
      ? plugins      
      : plugins.concat([
          new webpack.optimize.DedupePlugin(),
          new webpack.optimize.OccurenceOrderPlugin(),
          new webpack.optimize.UglifyJsPlugin({ mangle: false, sourcemap: false })
        ])
  }
}
