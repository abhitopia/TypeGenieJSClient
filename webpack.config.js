let path = require("path")
let webpack = require("webpack")

let plugins = [
    new webpack.ProvidePlugin({
        $: "jquery",
        jQuery: "jquery"
    })
]

let typegenieConfig = {
    devtool: "source-map",
    optimization: {
        minimize: process.env.NODE_ENV === "development" ? false : true
    },
    entry: {
        typegenie: "./src/index.ts",
    },
    output: {
        publicPath: ".",
        path: process.env.NODE_ENV === "development" ? path.resolve(__dirname, "test-package/node_modules/typegeniejs/dist") : path.resolve(__dirname, "dist"),
        filename: "[name].js",
        sourceMapFilename: "[name].js.map",
        library: "typegenie",
        libraryTarget: "umd"
    },
    plugins: plugins,
    resolve: {
        modules: [path.resolve(__dirname, "src"), "node_modules"],
        extensions: [".ts", ".tsx", ".js"]
    },
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: "ts-loader",
            exclude: /node_modules/,
        }]
    }
}
module.exports = [typegenieConfig]
