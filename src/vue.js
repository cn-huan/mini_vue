/*
  vue实例构造函数

  执行各生命周期
  添加代理，修改this指向
  挂载方法和属性
  挂载dom节点
  解析模板分析指令
  创建数据响应（订阅发布者）
*/

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

// 设置proxy代理
Vue.prototype._proxy = function (vm) {
  return new Proxy(vm, {
    get() {
      return Reflect.get(...arguments);
    },
    set(target, prop, value) {
      // 是函数的话改变一下this指向，确定指向proxy
      if (typeof value === "function") {
        target[prop] = value.bind(vm.$vm);
      } else {
        if (target[prop] !== value) {
          Reflect.set(...arguments);
        }
      }
      // 判断如果已经存在该属性，那么就触发发布者，通知订阅者们干活
      if (vm.$dep) {
        vm.$dep.notify(prop);
      }
    },
  });
};

/* 
  初始化data数据
  @Param vm proxy代理的this
  @Param data vue实例的data
*/
Vue.prototype.initData = function (vm, data) {
  if (typeof data === "object" && !(data instanceof Array)) {
    for (let key in data) {
      vm[key] = data[key];
    }
  } else {
    console.warn(`data not Object!!!`);
  }
};

/* 
  挂载methods方法
  @Param vm proxy代理的this
  @Param methods vue实例的methods
*/
Vue.prototype.initMethods = function (vm, methods) {
  for (let fn in methods) {
    if (typeof methods[fn] !== "function") {
      console.warn(`methods.${fn} not fuction, is ${typeof methods[fn]}!!!!`);
    } else {
      vm[fn] = methods[fn];
    }
  }
};

//

/*
  模板解析函数
  递归解析模板分析指令
  并创建订阅发布者
  实现数据和视图的响应
*/
function Compiler(vm) {
  this.vm = vm;
  let el = vm.$el;
  // 给实例上挂载发布者
  vm.$dep = new Dep();
  this.compiler(el);
}

/* 
  递归解析模板
  @Param el 根节点
*/
Compiler.prototype.compiler = function (node) {
  let childNodes = Array.from(node.childNodes);
  childNodes.forEach((node) => {
    let type = node.nodeType;
    if (type === 1) {
      this.elementNode(node);
    } else if (type === 3) {
      this.textNode(node);
    }
    if (node.childNodes && node.childNodes.length) {
      this.compiler(node);
    }
  });
};

/* 
  解析元素节点
  @Param node 元素节点
*/
Compiler.prototype.elementNode = function (node) {
  Array.from(node.attributes).forEach((attr) => {
    // 判定是否有指令存在 并执行对应命令
    if (attr.name.startsWith("v-")) {
      let attrName = attr.name.split(":");
      switch (attrName[0]) {
        case "v-if":
          this.vIf(node, attr.value);
          node.removeAttribute(attr.name);
          break;
        case "v-show":
          this.vShow(node, attr.value);
          node.removeAttribute(attr.name);
          break;
        case "v-text":
          this.vText(node, attr.value);
          node.removeAttribute(attr.name);
          break;
        case "v-html":
          this.vHtml(node, attr.value);
          node.removeAttribute(attr.name);
          break;
        case "v-bind":
          this.vBind(node, attrName[1], attr.value);
          node.removeAttribute(attr.name);
          break;
        case "v-model":
          this.vModel(node, attr.value);
          node.removeAttribute(attr.name);
          break;
        case "v-on":
          this.vOn(node, attrName[1], attr.value);
          node.removeAttribute(attr.name);
          break;
      }
    } else if (attr.name.startsWith(":")) {
      this.vBind(node, attr.name.slice(1), attr.value);
      // 删除掉元素上面的指令属性
      node.removeAttribute(attr.name);
    } else if (attr.name.startsWith("@")) {
      this.vOn(node, attr.name.slice(1), attr.value);
      node.removeAttribute(attr.name);
    }
  });
};

/* 
  解析文本节点
  @Param node 文本节点
  模板字符串解析{{name}}
*/
Compiler.prototype.textNode = function (node) {
  let reg = /\{\{(.+?)\}\}/g;
  let txt = node.textContent;
  if (reg.test(txt)) {
    node.textContent = txt.replace(reg, (str, key, index) => {
      this.vm.$dep.addDep(
        key,
        new Watch(this.vm, key, function (newVal) {
          node.textContent = txt.replace(reg, (str, key, index) => {
            return this.vm[key];
          });
        })
      );
      return this.vm[key];
    });
  }
};

/* 
  判断是否是字符串，不是的话返回vm上的数据
  @Param prop 节点属性的值
*/
Compiler.prototype.attrVal = function (prop) {
  prop = prop.trim();
  let val;
  if (prop.startsWith("'") && prop.endsWith("'")) {
    val = prop.slice(1, -1);
  } else {
    if (this.vm.hasOwnProperty(prop)) {
      val = this.vm[prop];
    } else {
      // 解析boolean
      if (prop === "true") {
        val = true;
      } else if (prop === "false") {
        val = false;
      } else {
        // 解析例如list[0].name这种的表达式,try catch抛出错误警告
        try {
          val = eval(`this.vm.${prop}`);
        } catch {
          console.warn(`vue实例上没有${prop}属性`)
        }
      }
    }
  }
  return val;
};

/* 
  处理v-if指令
  @Param node 节点
  @Param key 指令属性对应的值（v-if="key"）
*/
Compiler.prototype.vIf = function (node, key) {
  let val = this.attrVal(key);
  const pNode = node.parentNode;
  // 参考节点，方便确认插入位置
  const nNode = node.nextSibling;
  if (!val) {
    pNode.removeChild(node);
  }
  // 如果绑定的键值就是布尔值，那么就不需要订阅者
  if (key === "true" || key === "false") {
    return;
  }
  let _this = this;
  this.vm.$dep.addDep(
    key,
    new Watch(this.vm, key, function (newVal) {
      if (Boolean(this.oldVal) !== Boolean(newVal)) {
        // insertBefore插入到参考节点之前
        if (newVal) {
          pNode.insertBefore(node, nNode);
          // 新添加的节点进行解析
          _this.compiler(node);
        } else {
          pNode.removeChild(node);
        }
      }
    })
  );
};

/*
  处理v-show指令
  @Param node 节点
  @Param key 指令属性对应的值（v-show="key"）
*/
Compiler.prototype.vShow = function (node, key) {
  let val = this.attrVal(key);
  val ? (node.style.display = "inlink-block") : (node.style.display = "none");
  // 如果绑定的键值就是布尔值，那么就不需要订阅者
  if (key === "true" || key === "false") {
    return;
  }
  this.vm.$dep.addDep(
    key,
    new Watch(this.vm, key, function (newVal) {
      if (Boolean(this.oldVal) !== Boolean(newVal)) {
        newVal
          ? (node.style.display = "inline-block")
          : (node.style.display = "none");
      }
    })
  );
};

/* 
  处理v-text指令
  @Param node 节点
  @Param value 指令属性对应的值（v-text="value"）
*/
Compiler.prototype.vText = function (node, value) {
  node.textContent = this.attrVal(value);
  this.vm.$dep.addDep(
    value,
    new Watch(this.vm, value, (newVal) => {
      node.textContent = newVal;
      // 改变值之后重新解析模板分析是否存在指令
      // 因为要调用Compiler上的方法，所以使用箭头函数指向外部的this
      this.compiler(node);
    })
  );
};

/* 
  处理v-html指令
  @Param node 节点
  @Param value 指令属性对应的值（v-html="value"）
*/
Compiler.prototype.vHtml = function (node, value) {
  node.innerHTML = this.attrVal(value);
  this.vm.$dep.addDep(
    value,
    new Watch(this.vm, value, (newVal) => {
      node.innerHTML = newVal;
      // 解析新添加的节点 分析内部指令
      this.compiler(node);
    })
  );
};

/* 
  处理v-bind指令
  @Param node 节点
  @Param key 需要绑定的属性
  @Param prop 属性的值(只支持对象和字符串，字符串需要是原生style写法)
  v-bind:key="prop"
  支持简写:key="prop"
*/
Compiler.prototype.vBind = function (node, key, prop) {
  let val = this.attrVal(prop);
  if (key === "style") {
    // 如果val是字符串，就修改为对象
    if (typeof val === "string") {
      let obj = {};
      val.split(";").forEach((item) => {
        if (item.indexOf(":")) {
          let attr = item.split(":");
          obj[attr[0]] = attr[1];
        }
      });
      val = obj;
    }
    for (let attr in val) {
      node.style[attr] = val[attr];
    }
    this.vm.$dep.addDep(
      prop,
      new Watch(this.vm, key, function (newVal) {
        // 因为要用Watch实例上的oldVal属性，所以使用普通函数
        // 判断如果旧的style还存在就删除掉 然后再添加新的style
        for (let attr in this.oldVal) {
          node.style[attr] = "";
        }
        for (let attr in newVal) {
          node.style[attr] = newVal[attr];
        }
      })
    );
  } else if (key === "class") {
    node.classList.add(val);
    this.vm.$dep.addDep(
      prop,
      new Watch(this.vm, key, function (newVal) {
        // 判断如果旧的类名还存在就删除掉
        if (node.classList.contains(this.oldVal)) {
          node.classList.remove(this.oldVal);
        }
        node.classList.add(newVal);
      })
    );
  } else {
    node.setAttribute(key, JSON.stringify(val));
    this.vm.$dep.addDep(
      prop,
      new Watch(this.vm, key, function (newVal) {
        node.setAttribute(key, JSON.stringify(newVal));
      })
    );
  }
};

/* 
  处理v-model指令
  @Param node 节点
  @Param key 指令属性对应的值（v-model="key"）
*/
Compiler.prototype.vModel = function (node, key) {
  node.value = this.attrVal(key);
  // 实现双向绑定
  node.addEventListener("input", () => {
    this.vm[key] = node.value;
  });
  this.vm.$dep.addDep(
    key,
    new Watch(this.vm, key, function (newVal) {
      node.value = newVal;
    })
  );
};

/* 
  处理v-on指令
  @Param node 节点
  @Param key 需要绑定的事件类型
  @Param prop 属性的值
  v-on:key="prop"
  支持简写 @click="add"
*/
Compiler.prototype.vOn = function (node, key, prop) {
  node.addEventListener(key, this.vm[prop]);
};

//

// 发布者
class Dep {
  constructor() {
    // 存储订阅者
    this.deps = {};
  }

  /* 
    添加订阅者
    @Param key 绑定的数据名
    @Param dep 订阅者
  */
  addDep(key, dep) {
    if (this.deps.hasOwnProperty(key)) {
      this.deps[key].push(dep);
    } else {
      this.deps[key] = [dep];
    }
  }

  /* 
    通知订阅者起床干活
    @Param key 绑定的数据名
  */
  notify(key) {
    if (this.deps.hasOwnProperty(key)) {
      this.deps[key].forEach((dep) => {
        dep.update();
      });
    }
  }
}

//

// 订阅者
class Watch {
  /* 
    @Param vm proxy代理后的vue实例
    @Param key 绑定的属性名
    @Param callBack 回调函数
  */
  constructor(vm, key, callBack) {
    this.vm = vm;
    this.key = key;
    this.callBack = callBack;
    this.oldVal = vm[key];
  }

  // 订阅者们开始更新视图，没有领导（虚拟dom）调度他们，各自为战吧
  update() {
    this.callBack(this.vm[this.key]);
    this.oldVal = this.vm[this.key];
  }
}

// module使用
// export default Vue;