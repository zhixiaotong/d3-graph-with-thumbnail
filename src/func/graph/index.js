/**
 * author:lz (http://www.github.com/zhixiaotong)
 * 基于d3的关系网络图的基础JS Module
 * Copyright All rights reserved.
 */
'use strict'
import * as d3 from 'd3'
import Emitter from 'component-emitter'
import Node from './Node/Node'
import Operator from './Operator'
import * as Util from './Util/index'
import GlobalOptions from './Options/global'

/**
 * 画布对象以及画布对应事件
 */
class Graph {
  constructor (panel, datas, width, height, options) {
    if (arguments.length === 0) {
      throw new SyntaxError('panel容器为必传参数')
    }
    if (panel === null || panel.tagName.toUpperCase() !== 'DIV') {
      throw new SyntaxError('当前页面不存在该div容器')
    }
    if (!(this instanceof Graph)) {
      throw new SyntaxError('必须使用new运算符调用构造函数')
    }
    Emitter(this) // 绑定emitter, 设置自定义事件
    this.panel = panel // dom容器
    this.defaultWidth = width || '100%'
    this.defaultHeight = height || '100%'
    this.options = {}
    this.body = {
      nodeContainer: void 0, // 节点canvas
      edgeContainer: void 0, // 连线canvas
      nodeOptions: {}, // 节点配置, 默认为空, 从外部ajax获取赋值
      edgeOptions: {}, // 连线配置, 默认为空, 从外部ajax获取赋值
      emitter: { // 触发器
        on: this.on.bind(this),
        off: this.off.bind(this),
        emit: this.emit.bind(this),
        once: this.once.bind(this),
        listeners: this.listeners.bind(this),
        hasListeners: this.hasListeners.bind(this)
      },
      nodeMaps: {}, // {id : Node}
      edgeMaps: {}, // {id : Edge}
      data: { // 未做任何处理的原生数据
        nodes: datas.nodes || [],
        edges: datas.edges || []
      },
      transformData: { // 转换后的数据，用于展示
        nodes: [], // 所有节点
        edges: [], // 所有连线
        viewNodes: [] // 视图可见的节点
      },
      scale: d3.zoomIdentity, // 默认缩放平移比例
      hideLabel: false // 默认不隐藏label, 触发缩放平移设置为true, 降低渲染能耗
    }
    this.simulation = null // 力导图
    this.thumbnail = null // 缩略图
    this.operator = null // 针对画布的操作集
    this.init(options) // 初始化配置参数
  }

  /**
   * 初始化入口
   * @param {Object} options 自定义配置
   */
  init (options) {
    this.initContainer() // 初始化canvas容器
    this.setOptions(options) // 初始化参数
    this.initForceSimulation() // 初始化力导图
    this.bindEvent() // 绑定事件
    this.setData(this.body.data) // 初始化值
  }

  /**
   * 生成canvas容器:节点和连线分别用不同的canvas绘制
   */
  initContainer () {
    const nodeCanvas = document.createElement('canvas')
    const edgeCanvas = document.createElement('canvas')
    nodeCanvas.id = Util.uuid()
    edgeCanvas.id = Util.uuid()
    nodeCanvas.style.cssText = edgeCanvas.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      user-select: none;
      -webkit-user-drag: none;
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0);`
    // 添加dom -> 最后添加节点canvas保证可以拖拽
    this.panel.appendChild(edgeCanvas)
    this.panel.appendChild(nodeCanvas)
    // 实例化容器
    this.body.nodeContainer = nodeCanvas
    this.body.edgeContainer = edgeCanvas
    // 设置容器大小
    this.setContainerSize(this.defaultWidth, this.defaultHeight)
  }

  /**
   * 设置参数
   * @param {Object} options 自定义配置
   */
  setOptions (options) {
    this.options = Util.extend(Object.assign({}, GlobalOptions), options)
  }

  /**
   * 初始化力导图
   */
  initForceSimulation () {
    const _this = this
    // 自定义force约束
    const drilldown = alpha => {}
    _this.simulation = d3.forceSimulation()
      .alphaDecay(0.05) // 设置alpha衰减系数
      .force('link', d3.forceLink().id(d => d.id)) // 连线的距离设置
      .force('collide', d3.forceCollide(60).strength(0.1))
      .force('charge', d3.forceManyBody().distanceMin(300).distanceMax(400).strength(-400)) // 节点之间作用力
      .force('drilldown', drilldown)
      // 生成空的力导图
    _this.simulation.nodes([])
      .on('tick', () => _this.body.emitter.emit('redraw'))
      .stop()
    _this.simulation.force('link').links([])
    // 注册操作类
    _this.operator = new Operator(_this.body, _this.simulation, _this.options)
  }

  /**
   * 绑定事件
   */
  bindEvent () {
    const me = this
    // 注册默认的鼠标移动高亮和框选事件
    me.bindMouse()
    // 拖拽事件
    me.bindDrag()
    // 缩放平移事件
    me.bindZoomPan()
    // 注册emitter事件
    // 1  zoom pan 事件
    me.body.emitter.on('enableZoomPan', () => this.bindZoomPan())
    me.body.emitter.on('disableZoomPan', () => this.unbindZoomPan())
    me.body.emitter.on('enableDrag', () => this.bindDrag())
    me.body.emitter.on('disableDrag', () => this.unbindDrag())
    // 2  重绘整个画布
    me.body.emitter.on('redraw', () => me.redraw())
    // 3  重绘节点画布
    me.body.emitter.on('redrawNodes', () => me.redrawNodes())
    // 4  重绘连线画布
    me.body.emitter.on('redrawEdges', () => me.redrawEdges())
    // 5  重绘缩略图画布
    me.body.emitter.on('redrawThumb', () => me.redrawThumb())
    // 10  resize事件
    me.body.emitter.on('resize', (width, height) => me.setSize(width, height))
    // 11  click被用到:根据鼠标坐标获取操作对象
    me.body.emitter.on('tap', (mousePoint, event, callback) => {
      const d = me.operator.getMouseTargetObject(mousePoint)
      if (callback && Util.isFunction(callback)) { callback.call(this, d, event) }
    })
    me.body.emitter.on('click.node', (event, node) => {
      me.body.emitter.emit('redrawNodes')
      if (this.thumbnail !== null) {
        me.body.emitter.emit('redrawThumb')
      }
    })
  }

  /**
   * 鼠标按下
   */
  mousedownEvent () {
    const event = d3.event
    if (event != null && event.shiftKey && event.button === 0) {
      // 禁止缩放平移
      this.unbindZoomPan()
      // 禁止拖拽
      this.unbindDrag()
    }
  }

  /**
   * 设置容器大小
   * @param {Number} width 宽度
   * @param {Number} height 高度
   */
  setContainerSize (width, height) {
    this.body.nodeContainer.width = this.body.edgeContainer.width = width
    this.body.nodeContainer.height = this.body.edgeContainer.height = height
    this.body.nodeContainer.style.width = this.body.edgeContainer.style.width = `${width}px`
    this.body.nodeContainer.style.height = this.body.edgeContainer.style.height = `${height}px`
    this.panel.style.width = `${width}px`
    this.panel.style.height = `${height}px`
  }

  /**
   * setSize 设置canvas大小,自动调用重新绘制
   * @param {String | Number} width 宽度
   * @param {String | Number} height 高度
   */
  setSize (width, height) {
    // 缓存原来canvas大小
    const _container = this.body.nodeContainer
    const oldWidth = _container.getBoundingClientRect().width
    const oldHeight = _container.getBoundingClientRect().height
    // 改变尺寸前屏幕中心在canvas坐标内的坐标
    const prevViewCenter = this.operator.getViewCenter(_container)
    // 设置容器大小
    this.setContainerSize(width, height)
    // 重新计算canvas内容大小和偏移量
    if (width !== 0 && height !== 0 && (oldWidth !== width || oldHeight !== height)) {
      const widthRatio = width / oldWidth
      const heightRatio = height / oldHeight
      let newScale = this.body.scale.k
      if (widthRatio !== 1 && heightRatio !== 1) {
        newScale = newScale * (widthRatio + heightRatio) / 2
      } else if (widthRatio !== 1) {
        newScale = newScale * widthRatio
      } else if (heightRatio !== 1) {
        newScale = newScale * heightRatio
      }
      this.body.scale.k = newScale
      // 改变尺寸后屏幕中心在canvas坐标内的坐标
      const currentViewCenter = this.operator.getViewCenter(_container)
      // 两个中心的相对位置
      const rx = currentViewCenter.x - prevViewCenter.x
      const ry = currentViewCenter.y - prevViewCenter.y
      // 计算偏移量
      this.body.scale.x += rx * this.body.scale.k
      this.body.scale.y += ry * this.body.scale.k
      this.body.emitter.emit('redraw')
    }
  }

  /**
   * 销毁当前实例
   */
  destroy () {
    // 清除事件
    this.body.emitter.off()
    this.off()
    // 删除数据
    for (const nodeId in this.body.nodeMaps) {
      delete this.body.nodeMaps[nodeId]
    }
    for (const edgeId in this.body.edgeMaps) {
      delete this.body.edgeMaps[edgeId]
    }
    delete this.operator
    this.body.data = this.body.transformData = {
      nodes: [],
      edges: []
    }
    // 清空数据
    this.simulation = null
    // 移除缩略图上注册的body事件
    document.body.removeEventListener('mousemove', evt => this.thumbnail.mousemove(evt))
    // 清空缩略图
    delete this.thumbnail
    // 删除dom
    Util.recursiveDOMDelete(this.panel)
  }

  /**
   * 设置数据
   * @param data 包含nodes和edges的数据
   * @param isCenter 是否居中
   */
  setData (data = {
    nodes: [],
    edges: []
  }, isCenter = true) {
    this.operator.setDataSet(data.nodes, data.edges, isCenter)
  }

  /**
   * 绘制节点画布
   */
  renderNodes () {
    if (this.body.data === undefined) return
    const nodes = this.body.transformData.nodes
    // 遍历渲染节点
    if (nodes.length > 0) {
      // 清空视图中可见的节点数组
      this.body.transformData.viewNodes = []
      const ctx = this.body.nodeContainer.getContext('2d')
      const scale = this.body.scale
      // 遍历绘制节点
      ctx.save()
      ctx.translate(scale.x, scale.y)
      ctx.scale(scale.k, scale.k)
      for (const node of nodes) {
        // 初始化节点边界
        node.initialBBox()
        // 判断当前节点是否在屏幕可视范围内, 如果边界在可视范围内则渲染节点, 降低性能损耗
        if (!this.operator.isInViewport(this.body.nodeContainer, node)) continue
        this.body.transformData.viewNodes.push(node)
      }
      // 在视图范围内再绘制
      const viewNodes = this.body.transformData.viewNodes
      for (const node of viewNodes) {
        node.draw()
      }
      ctx.restore()
    }
  }

  /**
   * 绘制连线画布
   */
  renderEdges () {
    if (this.body.data === undefined) return
    if (!this.options.showEdge) return
    const nodes = this.body.transformData.nodes
    const edges = this.body.transformData.edges
    if (nodes.length === 0) return
    // 清空视图中可见的节点数组
    const edgeCtx = this.body.edgeContainer.getContext('2d')
    const scale = this.body.scale
    // 遍历绘制连线
    if (edges.length > 0) {
      edgeCtx.save()
      edgeCtx.translate(scale.x, scale.y)
      edgeCtx.scale(scale.k, scale.k)
      for (const edge of edges) {
        edge.draw(this.body)
      }
      edgeCtx.restore()
    }
  }

  /**
   * 重新绘制：清空 + 绘制
   */
  redraw () {
    // 先绘制连线再绘制节点, 保证节点在连线层级上
    this.redrawEdges()
    this.redrawNodes()
    this.redrawThumb()
  }

  /**
   * 重绘节点画布
   */
  redrawNodes () {
    this.operator.clearGraph(this.body.nodeContainer)
    this.renderNodes()
  }

  /**
   * 重绘连线画布
   */
  redrawEdges () {
    this.operator.clearGraph(this.body.edgeContainer)
    this.renderEdges()
  }

  /**
   * 重绘缩略图
   */
  redrawThumb () {
    if (this.thumbnail != null) {
      this.thumbnail.redraw()
    }
  }

  /**
   * 注册鼠标事件:框选
   */
  bindMouse () {
    d3.select(this.body.nodeContainer)
      .on('mousedown', () => this.mousedownEvent())
  }

  /**
   * 注册默认模式下拖拽事件
   */
  bindDrag () {
    // 禁用默认拖拽事件
    d3.dragDisable(window)
    // 注册canvas拖拽
    d3.select(this.body.nodeContainer).call(d3.drag().subject(() => this.dragsubject())
      .on('start', () => this.dragstartEvent())
      .on('drag', () => this.draggingEvent())
      .on('end', () => this.dragendEvent())
      .on('start.render drag.render', () => this.body.emitter.emit('redraw'))
    )
  }

  /**
   * 取消拖拽事件
   */
  unbindDrag () {
    // 恢复默认拖拽事件
    d3.dragEnable(window)
    // 取消canvas拖拽
    d3.select(this.body.nodeContainer).on('.drag', null)
  }

  /**
   * 注册缩放平移事件
   */
  bindZoomPan () {
    d3.select(this.body.nodeContainer).call(
      d3.zoom().scaleExtent([0.1, 3])
        .on('start', () => this.zoomStartEvent())
        .on('zoom', () => this.zoomingEvent())
        .on('end', () => this.zoomEndEvent())
    ).on('dblclick.zoom', null)
  }

  /**
   * 取消注册平移缩放
   */
  unbindZoomPan () {
    d3.select(this.body.nodeContainer).call(
      d3.zoom()
        .on('start', null)
        .on('zoom', null)
        .on('end', null)
    )
  }

  /**
   * 拖拽开始
   */
  dragstartEvent () {
    // 防止事件传播
    d3.event.sourceEvent.stopPropagation()
    if (this.options.enableDrag) {
      const nodes = this.body.transformData.nodes
      nodes.splice(nodes.indexOf(d3.event.subject), 1)
      nodes.push(d3.event.subject)
      d3.event.subject.active = true
      // 记录开始拖拽的对象的点位差
      d3.event.subject.dr_x = this.operator.transformX(d3.mouse(this.body.nodeContainer)[0]) - d3.event.subject.x
      d3.event.subject.dr_y = this.operator.transformY(d3.mouse(this.body.nodeContainer)[1]) - d3.event.subject.y
    }
  }

  /**
   * 拖拽过程
   */
  draggingEvent () {
    // 拖拽过程中不绘制连线
    if (this.options.showEdge) {
      this.options.showEdge = false
    }
    // 拖拽过程中不绘制节点描述
    if (!this.body.hideLabel) {
      this.body.hideLabel = true
    }
    if (this.options.enableDrag) {
      // 记录原来的位置
      const sub = d3.event.subject
      const mousePoint = d3.mouse(this.body.nodeContainer)
      sub.x = this.operator.transformX(mousePoint[0]) - sub.dr_x
      sub.y = this.operator.transformY(mousePoint[1]) - sub.dr_y
    }
  }

  /**
   * 拖拽结束
   */
  dragendEvent () {
    // 防止事件传播
    d3.event.sourceEvent.stopPropagation()
    const _this = this
    if (this.options.enableDrag) {
      d3.event.subject.active = false
      d3.event.subject.dr_x = void 0
      d3.event.subject.dr_y = void 0
      // 延时0.2秒执行绘制
      d3.timeout(elapsed => {
        if (_this.body.hideLabel) {
          _this.options.showEdge = GlobalOptions.showEdge
          _this.body.hideLabel = false
          _this.body.emitter.emit('redraw')
        }
      }, 200)
    }
  }

  /**
   * 平移缩放事件
   */
  zoomEvent () {
    const evt = d3.event
    if (this.options.enableZoomPan && ((evt.type !== 'end' && evt.shiftKey !== undefined && !evt.shiftKey) || (evt.type !== 'end' && evt.shiftKey === undefined && !evt.sourceEvent.shiftKey) || evt.type === 'end')) {
      this.body.scale = evt.transform
      this.body.emitter.emit('redraw')
    }
  }

  /**
   * 平移缩放中的事件
   */
  zoomingEvent () {
    const evt = d3.event
    if (JSON.stringify(this.body.scale) === JSON.stringify(evt.transform)) return
    this.zoomEvent()
  }

  /**
   * 平移缩放 - 开始事件
   */
  zoomStartEvent () {
    const evt = d3.event
    // 阻止默认事件
    evt.sourceEvent.stopPropagation()
    if (this.options.enableZoomPan && !evt.shiftKey) {
      // 隐藏label绘制
      this.body.hideLabel = true
      // 不绘制edge连线
      this.options.showEdge = false
    }
  }

  /**
   * 平移缩放 - 结束事件
   */
  zoomEndEvent () {
    const evt = d3.event
    if (this.options.enableZoomPan && !evt.shiftKey) {
      // 开始label绘制
      this.body.hideLabel = false
      // 还原绘制edge连线配置
      this.options.showEdge = GlobalOptions.showEdge
      // 结束后触发
      this.zoomEvent(evt)
    }
  }

  /**
   * 拖拽应用对象
   */
  dragsubject () {
    const mousePoint = d3.mouse(this.body.nodeContainer)
    const point = {
      x: this.operator.transformX(mousePoint[0]),
      y: this.operator.transformY(mousePoint[1])
    }
    return this.operator.findNode(point.x, point.y, Node.iconRadius())
  }
}

export default Graph
