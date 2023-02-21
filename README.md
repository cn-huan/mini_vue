模拟vue进行封装，实现MVVM，同时实现了**v-if，v-show，v-on，v-text，v-bind，v-model，模板字符串等指令**<br/>
实现了**beforeCreate，created，beforeMount，mounted**生命周期<br/>
**参考axios思路进行封装ajax**，方便快速发起http请求<br/>
以及封装了websocket，快速发送消息，处理消息，以及断线自动重连并将它们全部整合<br/>

<hr/>

<h2 style="color:red">vue构造函数</h2>

```
function Vue(options) {
  // 执行beforeCreate生命周期
  if (options.beforeCreate) {
    options.beforeCreate.call(this);
  }

  // 给this添加代理
  this.$vm = this._proxy(this);
  let _this = this.$vm;

  _this.$options = options || {};
  _this.$data =
    typeof options.data === "function" ? options.data() : options.data;

  // 初始化data数据
  this.initData(_this, _this.$data);

  // 初始化methods，改变函数this指向同时挂载到实例上面
  this.initMethods(_this, options.methods);

  // 执行created生命周期
  if (options.created) {
    options.created.call(_this);
  }

  // 执行beforeMount生命周期
  if (options.beforeMount) {
    options.beforeMount.call(_this);
  }

  // 挂载节点
  _this.$el = document.getElementById(options.el);
  // 解析模板 并创建订阅发布者
  new Compiler(_this);

  // 执行mounted生命周期
  if (options.mounted) {
    options.mounted.call(_this);
  }

  return _this;
}

```

<span style="color:red">详细代码请下载查看</span>
