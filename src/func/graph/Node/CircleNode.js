'use strict'
import Node from './Node'
import { hideLabelScale } from '../Util/constant'
/**
 * 图标节点类型
 */
class CircleNode extends Node {
  constructor (body, data, globalOptions, options) {
    super(body, data, globalOptions, options)
    this.r = this.iconRadius()
  }

  /**
   * 绘制节点
   * @param {Object} d 节点对象
   */
  draw () {
    const d = this
    const body = this.body
    const ctx = body.nodeContainer.getContext('2d')
    const scale = body.scale
    const isHideLabel = body.hideLabel
    // 去除浮点小数保证坐标为整数, 防止抗锯齿性能低下
    d.x = Math.floor(d.x)
    d.y = Math.floor(d.y)
    ctx.save()
    // 节点图标
    this.drawIcon(ctx, false)
    // 节点名称
    if (d.globalOptions.showLabel && d.label !== undefined && d.label !== null && !isHideLabel && scale.k >= hideLabelScale) {
      this.drawLabel(ctx, d)
    }
    ctx.restore()
  }

  /**
   * 绘制缩略图中的节点
   */
  drawThumbnail (ctx) {
    const d = this
    // 去除浮点小数保证坐标为整数, 防止抗锯齿性能低下
    d.x = Math.floor(d.x)
    d.y = Math.floor(d.y)
    ctx.save()
    // 节点图标
    this.drawIcon(ctx, true)
    ctx.restore()
  }

  /**
   * 绘制节点名称
   * @param {Object} ctx canvas 上下文
   * @param {Object} d 当前节点对象
   */
  drawLabel (ctx, d) {
    ctx.save()
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    const opt = d.options
    ctx.fillStyle = opt.font.color.default
    ctx.font = `${opt.font.size.default}px ${opt.font.face}`
    let h = d.y + d.r + 10
    ctx.fillText(d.label, d.x, h)
    ctx.restore()
  }

  /**
   * 绘制图标
   * @param {Object} ctx canvas上下文
   */
  drawIcon (ctx) {
    const d = this
    ctx.save()
    // 开始绘制
    ctx.beginPath()
    ctx.moveTo(d.x + d.r, d.y)
    this.fillNodeStyle(ctx)
    ctx.arc(d.x, d.y, d.r, 0, 2 * Math.PI)
    ctx.fill()
    ctx.restore()
  }
}

export default CircleNode
