let path = require("path")
let webpack = require("webpack")


let showServerSettings = true
if (process.env.NODE_ENV === "development") {
    showServerSettings = true
} else {
    showServerSettings = false
}

let plugins = [
    new webpack.ProvidePlugin({
        $: "jquery",
        jQuery: "jquery"
    }),
    new webpack.DefinePlugin({
        SHOW_SERVER_SETTINGS: showServerSettings
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
        path: path.resolve(__dirname, "dist/typegenie"),
        filename: "[name].js",
        sourceMapFilename: "[name].js.map",
        library: "typegenie",
        libraryTarget: "var"
    },
    plugins: plugins,
    resolve: {
        modules: [path.resolve(__dirname, "src"), "node_modules"],
        alias: {
            truecomposeapi: path.resolve(__dirname, "../truecomposeapi/src")
        },
        extensions: [".ts", ".tsx", ".js"]
    },
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: "ts-loader",
            exclude: /node_modules/,
        },
            {
                test: /\.css$/,
                // exclude: /node_modules/,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.html$/,
                exclude: /node_modules/,
                use: { loader: "html-loader" }
            },
            {
                test: /\.(png|jpg|gif)$/,
                use: [{
                    loader: "file-loader",
                    options: {}
                }]
            }]
    }
}

module.exports = [typegenieConfig]
