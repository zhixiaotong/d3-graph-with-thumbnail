'use strict'
import Edge from './Edge'

/**
 * 直线
 */
class StraightEdge extends Edge {
  /**
   * 绘制连线
   * @param {Object} body body
   */
  draw (body) {
    const e = this
    const ctx = body.edgeContainer.getContext('2d')
    ctx.save()
    ctx.lineCap = 'round'
    // 绘制连线
    this.operator.straightEdge(ctx, [e.source.x, e.source.y], [e.target.x, e.target.y], true)
    // 处理线条样式
    ctx.lineWidth = 1
    ctx.strokeStyle = '#ddd'
    ctx.stroke()
    ctx.restore()
  }
}

export default StraightEdge
