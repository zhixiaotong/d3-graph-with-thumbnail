'use strict'
import * as Util from '../Util/index'
import defaultNodeOption from '../Options/node'
import { Status } from '../Util/constant'

/**
 * 节点基类
 */
class Node {
  constructor (body, data, globalOptions, options) {
    this.id = data.id
    this.body = body
    this.globalOptions = globalOptions // 接收全局变量
    this.options = {}
    this.label = data.label // 节点名称
    this.type = data.type // 节点类型
    this.children = []
    this.x = data.x || void 0 // 坐标X
    this.y = data.y || void 0 // 坐标Y
    this.vx = data.vx || void 0 // X方向加速度
    this.vy = data.vy || void 0 // Y方向加速度
    this.fx = data.fx || void 0 // 固定X
    this.fy = data.fy || void 0 // 固定Y
    this.dragged = false // 是否被拖拽
    this.dr_x = void 0 // 拖拽点击的点位x与圆点x的差
    this.dr_y = void 0 // 拖拽点击的点位y与圆点x的差
    this.boundingBox = data.boundingBox || { left: void 0, right: void 0, top: void 0, bottom: void 0 } // 节点的边界
    this.status = data.status || Status.default // 默认效果
    this.setOptions(options)
  }

  /**
   * 设置参数
   * @param {Object} options
   */
  setOptions (options) {
    this.options = Util.deepExtend(defaultNodeOption, options)
  }

  /**
   * 半径
   */
  iconRadius () {
    return 20
  }

  static iconRadius () {
    return 20
  }

  /**
   * 填充样式
   * @param {Object} ctx canvas上下文
   */
  fillNodeStyle (ctx) {
    const d = this
    const opt = d.options
    switch (d.status) {
      case Status.selection:
        ctx.fillStyle = opt.color.selection.background
        ctx.strokeStyle = opt.color.selection.border
        break
      default:
        ctx.fillStyle = opt.color.default.background
        ctx.strokeStyle = opt.color.default.border
        break
    }
    ctx.stroke()
    ctx.fill()
  }

  /**
   * 初始化边界框
   */
  initialBBox () {
    const d = this
    d.boundingBox.left = d.x - d.r
    d.boundingBox.right = d.x + d.r
    d.boundingBox.top = d.y - d.r
    d.boundingBox.bottom = d.y + d.r
  }
}

export default Node
