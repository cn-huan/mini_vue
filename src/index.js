const app = new Vue({
  el: "app",
  data: {
    vif: true,
    vshow: true,
    text: "v-text",
    html: "<h2>v-html</h2>",
    style: {
      color: "red",
    },
    model: "v-model",
  },
  methods: {
    vIf() {
      this.vif = !this.vif;
    },
    vShow() {
      this.vshow = !this.vshow;
    },
  },
  beforeCreate() {
    // 初始化http实例，并挂载
    let http = new Axios();
    http.create({
      headers: {
        "Content-Type": "application/json",
      },
    });
    // 请求拦截器配置
    http.interceptors.request(function request(config) {
      config.headers = {
        "Content-Type": "application/json",
        token: "nihaoa",
      };
    });
    // 响应拦截器配置
    // http.interceptors.response(function response(res) {
    //   return res;
    // });
    Vue.prototype.$http = http;
  },
  created() {
    // 初始化websocket连接，并挂载
    this.socket = new Socket("ws://localhost:8080/websocket", () => {
      this.socket.send("Nihao");
    });
    this.socket.onmessage((res) => {
      console.log(res);
    });
    this.socket.onclose(2000, 10, (res) => {
      console.log(res);
      alert("网络连接失败，请刷新页面或者联系网站管理员");
    });
    this.socket.connect();
  },
  beforeMount() {},
  mounted() {},
});
