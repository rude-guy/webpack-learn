const { ExternalModule } = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const pluginName = 'ExternalWebpackPlugin';

class ExternalsWebpackPlugin {
  constructor(options) {
    // 保存参数
    this.options = options;
    // 保存参数传入的所有需要转化CDN外部externals的库名称
    this.transformLibrary = Object.keys(options);
    // 分析依赖引入 保存代码中使用到需要转化为外部CDN的库
    this.usedLibrary = new Set();
  }
  apply(compiler) {
    // normalModuleFactory 创建后会触发该事件监听函数
    compiler.hooks.normalModuleFactory.tap(pluginName, (normalModuleFactory) => {
      // 在初始化解析模块之前调用
      normalModuleFactory.hooks.factorize.tapAsync(pluginName, (resolveData, callback) => {
        // 获取引入的模块名称
        const requireModuleName = resolveData.request;
        if (this.transformLibrary.includes(requireModuleName)) {
          // 如果当前模块需要被处理为外部依赖
          // 首先获得当前模块需要转化成为的变量名
          const externalModuleName = this.options[requireModuleName].variableName;
          callback(null, new ExternalModule(externalModuleName, 'window', requireModuleName));
        } else {
          // 正常编译，不需要处理外部依赖
          callback();
        }
      });

      // 在编译模块时触发，将模块变成为AST阶段调用
      normalModuleFactory.hooks.parser.for('javascript/auto').tap(pluginName, (parser) => {
        // 当遇到模块引入语句import时
        importHandler.call(this, parser);
        // 当遇到模块引入语句require时
        requireHandler.call(this, parser);
      });
    });

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      // 获取HtmlWebpackPlugin拓展的compilation hooks
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tap(pluginName, (data) => {
        // 额外添加scripts
        const scriptTag = data.assetTags.scripts;
        this.usedLibrary.forEach((library) => {
          scriptTag.unshift({
            tagName: 'script',
            voidTag: false,
            meta: { plugin: pluginName },
            attributes: {
              defer: true,
              type: undefined,
              src: this.options[library].src,
            },
          });
        });
      });
    });
  }
}

function importHandler(parser) {
  parser.hooks.import.tap(pluginName, (statement, source) => {
    // 解析当前模块中的import语句
    if (this.transformLibrary.includes(source)) {
      this.usedLibrary.add(source);
    }
  });
}

function requireHandler(parser) {
  // 解析当前模块中的require语句
  parser.hooks.call.for('require').tap(pluginName, (expression) => {
    const moduleName = expression.arguments[0].value;
    // 当前require语句中使用传入的模块时
    if (this.transformLibrary.includes(moduleName)) {
      this.usedLibrary.add(moduleName);
    }
  });
}

module.exports = ExternalsWebpackPlugin;
