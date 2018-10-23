/**
 * 缩略图
 */
'use strict'
import * as d3 from 'd3'
class Thumbnail {
  constructor (parentContainer, body, operator, width) {
    this.body = body
    this.operator = operator
    this.width = width | 160 // 缩略图canvas的大小
    this.parentContainer = parentContainer // 父级容器
    this.container = document.createElement('div')
    this.viewportCvs = document.createElement('canvas') // 节点canvas
    this.handleCvs = document.createElement('canvas') // 操作canvas
    this.scale = {// 缩放因子
      k: 1, x: 0, y: 0
    }
    this.thumbScale = 5 // 缩略图对应主屏幕移动的比例
    this.drag = false // 是否拖拽的标记
    this.startPoint = void 0 // 开始拖拽的点
    this.range = void 0 // 节点和屏幕边界并集[minX, minY, maxX, maxY]
    this.nodeRange = void 0 // 节点边界[minX, minY, maxX, maxY]
    this.screenRange = void 0 // 屏幕边界[minX, minY, maxX, maxY]
    this.viewCenter = void 0 // 屏幕中心点[缩略图]
    this.isDragged = false // 是否移动鼠标位置:用以防止mousemove后触发click
    this.init()
  }
  init () {
    this.container.className = 'thumbnail'
    this.container.style.cssText = `
        position: absolute;
        left: 5px;
        bottom: 5px;
        padding: 3px;
        border: 1px solid #ddd;
        background-color: #fff;`
    this.container.style.width = this.container.style.height = `${this.width + 8}px`
    const temp = document.createElement('div')
    temp.style.cssText = `
        position: relative;
        width: 100%;
        height: 100%;    
        user-select: none;
        -webkit-user-drag: none;
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);`
    const canvasStyle = `
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        width: 100%;
        height: 100%`
    this.viewportCvs.style.cssText = this.handleCvs.style.cssText = canvasStyle
    this.parentContainer.appendChild(this.container)
    this.container.appendChild(temp)
    temp.appendChild(this.viewportCvs)
    temp.appendChild(this.handleCvs)
    // 容器大小
    this.viewportCvs.width = this.handleCvs.width = this.viewportCvs.height = this.handleCvs.height = this.width
    // 注册拖拽事件
    d3.select(this.handleCvs)
      .on('click', () => this.click())
      .on('mousedown', () => this.mousedown())
      // 改变d3注册为body注册, 这样保证移出屏幕仍然可以拖拽
    document.body.addEventListener('mousemove', evt => this.mousemove(evt))
    document.body.addEventListener('mouseup', evt => this.mouseup())
    // 绘制
    this.redraw()
  }

  /**
   * 只绘制节点
   */
  redraw () {
    if (this.body.data === undefined) {
      return
    }
    // 清空缩略图主画布
    this.operator.clearGraph(this.viewportCvs)
    // 清空缩略图矩形区域
    this.operator.clearGraph(this.handleCvs)
    // 遍历渲染节点和连线
    const nodes = this.body.transformData.nodes
    if (nodes.length > 0) {
      const ctx = this.viewportCvs.getContext('2d')
      // 获取节点边界
      const range = this.nodeRange = this.operator.getRange()
      // 获取屏幕边界
      const cBBox = this.body.nodeContainer.getBoundingClientRect()
      const screenRange = this.screenRange = {
        minX: this.operator.transformX(0),
        minY: this.operator.transformY(0),
        maxX: this.operator.transformX(cBBox.width),
        maxY: this.operator.transformY(cBBox.height)
      }
      let ax, ay, ix, iy
      // 如果节点全部显示在屏幕内
      if (this.body.transformData.nodes.length === this.body.transformData.viewNodes.length) {
        ax = range.maxX
        ay = range.maxY
        ix = range.minX
        iy = range.minY
      } else { // 存在节点不在屏幕内
        ax = Math.max(range.maxX, screenRange.maxX)
        ay = Math.max(range.maxY, screenRange.maxY)
        ix = Math.min(range.minX, screenRange.minX)
        iy = Math.min(range.minY, screenRange.minY)
      }
      // 记录整个范围的边界
      this.range = {
        minX: ix, maxX: ax, minY: iy, maxY: ay
      }
      const width = ax - ix
      const height = ay - iy
      const refer = Math.max(width, height)
      const scale = this.scale
      scale.k = this.width / refer
      ctx.save()
      // 缩放
      ctx.scale(scale.k, scale.k)
      if (width === height) {
        scale.x = -ix
        scale.y = -iy
      } else if (width > height) {
        scale.x = -ix
        scale.y = -iy + (width - height) / 2
      } else {
        scale.x = -ix + (height - width) / 2
        scale.y = -iy
      }
      ctx.translate(scale.x, scale.y)
      // 遍历绘制节点
      for (const node of nodes) {
        if (!isNaN(node.x) && !isNaN(node.y)) {
          node.drawThumbnail(ctx)
        }
      }
      // 存在部分节点不在屏幕中则绘制对应矩形
      if (this.body.transformData.nodes.length > 0 && this.body.transformData.nodes.length > this.body.transformData.viewNodes.length) {
        this.drawThumbnailViewRect(width, height)
      }
      this.viewCenter = {
        x: (this.screenRange.maxX + this.screenRange.minX) / 2, y: (this.screenRange.maxY + this.screenRange.minY) / 2
      }
      ctx.restore()
    }
  }

  /**
   * 绘制缩略图的矩形
   * @param {Number} width 宽度
   * @param {Number} height 高度
   */
  drawThumbnailViewRect (width, height) {
    const ctx = this.handleCvs.getContext('2d')
    const scale = this.scale
    // 获取矩形位置
    const x = this.screenRange.minX
    const y = this.screenRange.minY
    const w = this.screenRange.maxX - this.screenRange.minX
    const h = this.screenRange.maxY - this.screenRange.minY
    // 绘制矩形区域
    ctx.save()
    ctx.beginPath()
    ctx.scale(scale.k, scale.k)
    ctx.translate(scale.x, scale.y)
    ctx.lineWidth = 1 / scale.k
    ctx.strokeStyle = '#409EFF'
    ctx.rect(x, y, w, h)
    ctx.stroke()
    ctx.restore()
  }

  /**
   * 点击事件
   */
  click () {
    if (this.isDragged) {
      this.isDragged = false
      return
    }
    const [x, y] = d3.mouse(this.handleCvs)
    let tx, ty
    if (this.body.transformData.nodes.length > this.body.transformData.viewNodes.length) { // 可视屏幕中心
      const { minX, maxX, minY, maxY } = this.range
      const rangeCenter = {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2
      }
      tx = (this.viewCenter.x - rangeCenter.x) * this.scale.k + this.width / 2
      ty = (this.viewCenter.y - rangeCenter.y) * this.scale.k + this.width / 2
    } else { // 缩略图中心
      tx = ty = this.width / 2
    }
    // 向量偏移量
    const vector = {
      x: x - tx,
      y: y - ty
    }
    // 赋值偏移量并重绘主画布
    const bs = this.body.scale
    bs.x -= this.thumbScale * vector.x
    bs.y -= this.thumbScale * vector.y
    this.body.emitter.emit('redraw')
    this.startPoint = {
      x, y
    }
  }

  /**
   * 鼠标按下:记录初始位置
   */
  mousedown () {
    this.drag = true
    const [x, y] = d3.mouse(this.handleCvs)
    this.startPoint = {
      x, y
    }
  }

  /**
   * 鼠标移动:根据相对偏移计算主画布的偏移量, 触发主画布的绘制
   */
  mousemove (evt) {
    if (this.drag) {
      const bounding = this.handleCvs.getBoundingClientRect()
      // const [x, y] = d3.mouse(this.handleCvs)
      const [x, y] = [evt.pageX - bounding.left, evt.pageY - bounding.top]
      // 计算偏移量
      const vector = {
        x: x - this.startPoint.x,
        y: y - this.startPoint.y
      }
      // 重绘
      const bs = this.body.scale
      bs.x -= this.thumbScale * vector.x
      bs.y -= this.thumbScale * vector.y
      this.body.emitter.emit('redraw')
      // 重新记录拖拽初始位置
      this.startPoint = {
        x, y
      }
      this.isDragged = true
    }
  }

  /**
   * 鼠标抬起
   */
  mouseup () {
    this.drag = false
    this.startPoint = void 0
  }

  /**
   * 打开缩略图
   */
  open () {
    this.container.style.display = 'block'
  }

  /**
   * 关闭缩略图
   */
  close () {
    this.container.style.display = 'none'
  }
}

export default Thumbnail
