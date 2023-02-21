// 封装webSocket，更好的管理webSocket连接
// 皮泽鹏，2023年02月15日封装

// 利用Symbol实现属性私有化
/*
  @Param url 连接地址值
  @Param connectNum 重连次数
  @Param ws webocket实例
  @Param open onopen执行函数
  @Param message onmessage消息处理函数
  @Param closeTime 重连间隔时间
  @Param closeNum 最大重连次数
  @Param close 超过最大重连次数之后执行的函数
  @Param closeTimeOut 重连的定时器
*/
const url = Symbol("url");
const connectNum = Symbol("connectNum");
const ws = Symbol("ws");
const open = Symbol("open");
const message = Symbol("message");
const closeTime = Symbol("closeTime");
const closeNum = Symbol("closeNum");
const close = Symbol("close");
const closeTimeOut = Symbol("closeTimeOut");

class Socket {
  [closeTime] = 3000;
  [closeNum] = 3;

  constructor(wsUrl, onopen = undefined) {
    this[url] = wsUrl;
    this[connectNum] = 0;
    this[ws] = null;
    if (onopen) {
      this[open] = onopen;
    }
  }

  // 设置消息处理回调函数
  onmessage(callBack) {
    this[message] = callBack;
  }

  // 发送消息
  send(data) {
    this[ws].send(JSON.stringify(data));
  }

  // 设置断线重连参数
  // @Param time 重连间隔时间
  // @Param num 重连最大次数
  // @Param callBack 重连失败执行的回调函数
  onclose(time = 3000, num = 3, callBack) {
    this[closeTime] = time;
    this[closeNum] = num;
    this[close] = callBack;
  }

  // 连接开始
  connect() {
    this[ws] = new WebSocket(this[url]);

    this[ws].onopen = () => {
      // 每次连接重置定时器和连接次数
      this[connectNum] = 0;
      if (this[closeTimeOut]) {
        clearTimeout(this[closeTimeOut]);
      }

      if (this[open]) {
        this[open]();
      }
    };

    // 设置消息处理函数，回调函数传参
    this[ws].onmessage = (res) => {
      this[message](res);
    };

    this[ws].onclose = (res) => {
      console.log(res);

      /// 设置断线重连定时器
      this[closeTimeOut] = setTimeout(() => {
        if (this[connectNum] < this[closeNum]) {
          this.connect();
          this[connectNum]++;
          console.log(`重连${this[connectNum]}次`);
        } else {
          clearTimeout(this[closeTimeOut]);
          this[close](res);
        }
      }, this[closeTime]);
    };
  }
}

// module使用
// export default Socket;
