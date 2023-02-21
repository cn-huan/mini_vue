// 封装xhr，模拟Axios
// 皮泽鹏，2023年02月15日封装

function Axios() {
  // 用于保存请求数据
  this.data = {};
  // 缓存this,用于修改this指向问题
  let _this = this;
  this.interceptors = {
    // 请求拦截器和相应拦截器
    request(callBack) {
      _this.saveRequest = callBack;
    },
    response(callBack) {
      _this.saveResponse = callBack;
    },
  };
}

// 可以传入data，然后自动拼接，也可以自己拼接好了不传入data值
Axios.prototype.get = function (url, data = {}) {
  // 回调函数传参 实现请求拦截器
  if (this.saveRequest) {
    this.saveRequest(this);
  }
  let _this = this;

  return new Promise((resolve, reject) => {
    // 判断是否有data，有的话自动拼接
    let keys = Object.keys(data);
    if (keys.length) {
      url += "?";
      // for in 会遍历所有属性，包括原型上的属性，所以改用Object.keys加for
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (i == keys.length - 1) {
          url += `${key}=${data[key]}`;
        } else {
          url += `${key}=${data[key]}&`;
        }
      }
    }

    let xhr = new XMLHttpRequest();
    xhr.open("get", url, true);

    // 设置请求头
    setHeaders(xhr, this.headers);

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || xhr.status === 304) {
          let response = JSON.parse(xhr.responseText);

          // 响应拦截器
          if (_this.saveResponse) {
            response = _this.saveResponse(response);
          }

          resolve(response);
        } else {
          reject(xhr.responseText);
        }
      }
    };
    xhr.send();
  });
};

Axios.prototype.post = function (url, data) {
  // 回调函数传参 实现请求拦截器
  if (this.saveRequest) {
    this.saveRequest(this);
  }
  let _this = this;

  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open("post", url, true);

    // 设置请求头
    setHeaders(xhr, this.headers);

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          let response = JSON.parse(xhr.responseText);

          // 响应拦截器
          if (_this.saveResponse) {
            response = _this.saveResponse(response);
          }

          resolve(response);
        } else {
          reject(xhr.responseText);
        }
      }
    };
    xhr.send(JSON.stringify(data));
  });
};

Axios.prototype.create = function (obj) {
  let http = new Axios();
  http.headers = obj.headers;
  return http;
};

function setHeaders(xhr, headers) {
  let keys = Object.keys(headers);
  if (keys.length) {
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      xhr.setRequestHeader(key, headers[key]);
    }
  }
}

// module使用
// export default Axios;
