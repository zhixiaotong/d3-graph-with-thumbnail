# d3-graph-with-thumbnail

> d3 graph using canvas with thumbnail

## description

> 基于d3.js的simulation力导图，canvas实现的带缩略图的关系图谱案例

> 目前项目采用vue开发，因此以vue cli 2+构建项目，如果运行报错，可能是版本原因，解决方式：npm install之后，运行 npm i -D webpack-dev-server@2.9.7即可

> 由于是内网项目，删减了很多其他基础功能，比如：取消了canvas的框选节点、取消了基于链表的前进撤消...但保留了基本的代码结构和一些canvas优化性能的方式。以上大都是较容易实现的功能，之前网上鲜有基于canvas的缩略图案例，因此放上来做一个记录，给有需求的朋友帮助，与君共勉。

> 本案例遵从MIT协议，请认准[http://www.github.com/zhixiaotong]
  如果该案例对你有所启发或帮助，请留下你的小心心，不胜感激~
  
## 预览：
![Demo picture](https://github.com/zhixiaotong/d3-graph-with-thumbnail/blob/master/demo.gif)

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report

# run unit tests
npm run unit

# run e2e tests
npm run e2e

# run all tests
npm test
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
