/**
 * 获取线条上的点
 * @param {Array} start 开始点位
 * @param {Array} end 结束点位
 * @param {Boolean} t 贝塞尔因子
 */
export function getLinePoint (start, end) {
  return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]
}

/**
 * 获取当前鼠标点到直线的距离
 * @param a 起点坐标
 * @param b 目标坐标
 * @param pointer 当前鼠标坐标
 */
export function getDistanceToLine (a, b, pointer) {
  const [x1, y1] = a
  const [x2, y2] = b
  const [x3, y3] = pointer
  const px = x2 - x1
  const py = y2 - y1
  const something = px * px + py * py
  let u = ((x3 - x1) * px + (y3 - y1) * py) / something
  if (u > 1) {
    u = 1
  } else if (u < 0) {
    u = 0
  }
  const x = x1 + u * px
  const y = y1 + u * py
  const dx = x - x3
  const dy = y - y3
  return Math.sqrt(dx * dx + dy * dy)
}
