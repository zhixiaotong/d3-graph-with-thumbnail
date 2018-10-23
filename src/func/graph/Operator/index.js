import Node from '../Node/Node'
import CircleNode from '../Node/CircleNode'
import StraightEdge from '../Edge/StraightEdge'
import * as Util from '../Util/index'
import * as EdgeUtil from '../Edge/util/edgeUtil'
const d3Force = require('d3-force')

/**
 * 操作类
 */
class Operator {
  constructor (body, simulation, options) {
    this.body = body
    this.simulation = simulation
    this.options = options
  }

  /**
   * 清空画布
   * @param canvas 指定canvas
   */
  clearGraph (canvas) {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  /**
   * 设置数据集[一般第一个节点为被查询节点]
   * @param {Array} nodes 节点集：原生数据
   * @param {Array} edges 连线集：原生数
   * @param {Boolean} isCenter 是否居中
   */
  setDataSet (nodes = [], edges = [], isCenter = true) {
    if (nodes.length === 0) return
    this.setNodeDataSet(nodes)
    this.setEdgeDataSet(edges)
    // d3重新定位并绘制
    this.simulation.force('link').links(this.body.transformData.edges)
    this.simulation.nodes(this.body.transformData.nodes)
    if (isCenter) {
      this.simulation.force('center', d3Force.forceCenter(this.body.nodeContainer.width / 2, this.body.nodeContainer.height / 2))
    } else {
      this.simulation.force('center', null)
    }
    this.simulation.alpha(1).restart()
  }

  /**
   * 设置节点数据集
   * @param {Array} nodes 节点集：原生数据
   * @param {Boolean} needFlush 是否需要刷新画布
   */
  setNodeDataSet (nodes, needFlush = false) {
    // 获取老数据
    const oldNodes = this.body.transformData.nodes
    const oldNodeDatas = this.body.data.nodes
    // 如果传入了节点
    if (nodes.length > 0) {
      const [addIds, updateIds, updateMap] = [[], [], {}]
      // 传入的节点数据可能有现有数据, 判断是新增或更新
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        // 这里如果节点没有id则赋值id
        node.id = node.id || Util.uuid()
        if (oldNodes.filter(n => n.id === node.id).length === 1) {
          updateIds.push(node.id)
          updateMap[node.id] = node
          // 替换
          oldNodeDatas.splice(oldNodeDatas.findIndex(o => o.id === node.id), 1, node)
        } else {
          addIds.push(node.id)
          oldNodeDatas.push(node)
        }
      }
      // 新增节点
      this.addNodes(addIds, nodes[0].id, needFlush)
      // 更新节点
      this.updateNodes(updateIds, updateMap, needFlush)
    }
  }

  /**
   * 由于d3初始化节点的坐标算法在屏幕左上角, 做出优化, 保证加载的节点在父节点的位置开始
   * @param {Array} nodes 原生节点数组
   * @param {Object} parentNode 父节点
   * @returns {Array}
   */
  initialNodePoint (nodes, parentNode) {
    if (nodes.length === 0) return
    // 如果初始化画布为空,传入节点等于所有节点时,不需要优化,直接走d3的位置算法
    if (this.body.transformData.nodes.length === nodes.length) return
    let radius, angle
    const initialAngle = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i]
      if (isNaN(node.x) || isNaN(node.y)) {
        if (parentNode != null && parentNode.id !== node.id) {
          radius = Node.iconRadius() * Math.sqrt(i)
          angle = i * initialAngle
          node.x = parentNode.x + radius * Math.cos(angle)
          node.y = parentNode.y + radius * Math.sin(angle)
        }
      }
    }
    return nodes
  }

  /**
   * 批量新增节点
   * @param {String[]} ids id数组
   * @param {Boolean} needFlush 是否刷新画布
   */
  addNodes (ids, parentId = null, needFlush = true) {
    let id
    const newNodes = []
    let nodes = this.body.transformData.nodes
    // 遍历新增节点
    for (let i = 0; i < ids.length; i++) {
      id = ids[i]
      const p = this.getNodeEntity(id)
      const newNode = this.nodeClass(this.body, p, this.options, this.body.nodeOptions[p.type] || {})
      newNodes.push(newNode)
      this.body.nodeMaps[id] = newNode
    }
    this.body.transformData.nodes = nodes = [...nodes, ...newNodes]
    // d3重新定位节点位置
    this.simulation.nodes(this.body.transformData.nodes)
    // 是否绘制
    if (needFlush) {
      this.simulation.alpha(1).restart()
    }
  }

  /**
   * 批量更新节点
   * @param {String[]} ids id数组
   * @param {Object} newNodeMaps {key：id，value：更新节点数据}
   * @param {Boolean} needFlush 是否刷新画布
   */
  updateNodes (ids, newNodeMaps, needFlush = true) {
    let id
    const nodes = this.body.nodeMaps
    for (let i = 0; i < ids.length; i++) {
      id = ids[i]
      let node = nodes[id]
      const newNode = newNodeMaps[id]
      if (node !== undefined) {
        // 覆盖更新节点数据及配置
        node = Util.deepExtend(node, newNode, true, true)
      } else {
        throw new Error(`不存在id为：${node.id}更新节点`)
      }
    }
    // 是否绘制
    if (needFlush) {
      this.body.emitter.emit('redrawNodes')
      this.body.emitter.emit('redrawThumb')
    }
  }

  /**
   * 直线：实现 or 虚线
   * @param {Object} ctx canvas上下文
   * @param {Array} start 开始点位
   * @param {Array} end 结束点位
   * @param {Boolean} isSolid 是否实线
   */
  straightEdge (ctx, start, end, isSolid = true) {
    ctx.beginPath()
    if (!isSolid) { ctx.setLineDash([3, 5]) }
    ctx.moveTo(start[0], start[1])
    ctx.lineTo(end[0], end[1])
  }

  /**
   * 设置连线数据集
   * @param {Array} edges 连线集：原生数据
   * @param {Boolean} needFlush 是否需要刷新画布
   */
  setEdgeDataSet (edges, needFlush = false) {
    if (edges.length > 0) {
      // 获取老数据
      const oldEdges = this.body.transformData.edges
      const oldEdgeDatas = this.body.data.edges
      // 如果传入了连线
      if (edges.length > 0) {
        const [addIds, updateIds, updateMap] = [[], [], {}]
        // 传入的节点数据可能有现有数据, 判断是新增或更新
        for (let i = 0; i < edges.length; i++) {
          const edge = edges[i]
          // 这里如果节点没有id则赋值id
          edge.id = edge.id || Util.uuid()
          if (oldEdges.filter(n => n.id === edge.id).length === 1) {
            updateIds.push(edge.id)
            updateMap[edge.id] = edge
            // 替换
            oldEdgeDatas.splice(oldEdgeDatas.findIndex(o => o.id === edge.id), 1, edge)
          } else {
            addIds.push(edge.id)
            oldEdgeDatas.push(edge)
          }
        }
        // 新增节点
        this.addEdges(addIds, needFlush)
        // 更新节点
        this.updateEdges(updateIds, updateMap, needFlush)
      }
    }
  }

  /**
   * 添加指定id集合的连线
   * @param {String} ids id集合
   * @param {Boolean} needFlush 是否刷新
   */
  addEdges (ids, needFlush = true) {
    let id
    const newEdges = []
    let edges = this.body.transformData.edges
    // 遍历新增连线
    for (let i = 0; i < ids.length; i++) {
      id = ids[i]
      const p = this.getEdgeEntity(id)
      const newEdge = this.edgeClass(this.body, p, this.options, this.body.edgeOptions[p.type] || {})
      newEdges.push(newEdge)
      this.body.edgeMaps[id] = p
    }
    this.body.transformData.edges = edges = [...edges, ...newEdges]
    // d3关联连线的source和target变成对象
    this.simulation.force('link').links(edges)
    // 是否绘制
    if (needFlush) {
      this.body.emitter.emit('redrawEdges')
    }
  }

  /**
   * 批量更新连线
   * @param {String[]} ids id数组
   * @param {Object} newNodeMaps {key：id，value：更新节点数据}
   * @param {Boolean} needFlush 是否刷新画布
   */
  updateEdges (ids, newEdgeMaps, needFlush = true) {
    let id
    const edgeMaps = this.body.edgeMaps
    const edges = this.body.transformData.edges
    const updateEdges = []
    for (let i = 0; i < ids.length; i++) {
      id = ids[i]
      let edge = edgeMaps[id]
      const newEdge = newEdgeMaps[id]
      if (edge !== undefined) {
        // 覆盖更新节点数据及配置
        edge = Util.deepExtend(edge, newEdge, true, true)
        // d3关联连线的source和target变成对象
        this.simulation.force('link').links([edge])
        updateEdges.push(edge)
      } else {
        throw new Error(`更新失败：不存在id为：${edge.id}的连线`)
      }
    }
    // 替换之前的edges
    for (let i = 0; i < updateEdges.length; i++) {
      const edge = updateEdges[i]
      edges.splice(edges.findIndex(e => e.id === edge.id), 1, edge)
    }
    // 是否绘制
    if (needFlush) {
      this.body.emitter.emit('redrawEdges')
    }
  }

  /**
   * 创建节点对象
   * @param {Object} body body对象
   * @param {Object} nodeObj 节点对象
   * @param {Object} globalOpt 全局配置
   * @param {Object} nodeOpt 节点配置
   * @returns {Object} 节点对象
   */
  nodeClass (body, nodeObj, globalOpt, nodeOpt = {}) {
    return new CircleNode(body, nodeObj, globalOpt, nodeOpt)
  }

  /**
   * 创建连线对象
   * @param {Object} body body对象
   * @param {Object} edgeObj 线条对象
   * @param {Object} globalOpt 全局配置
   * @param {Object} nodeOpt 节点配置
   * @returns {Object} 节点对象
   */
  edgeClass (body, edgeObj, globalOpt, nodeOpt = {}) {
    return new StraightEdge(body, this, edgeObj, globalOpt, nodeOpt)
  }

  /**
   * 找到指定点位匹配的最近的节点对象:圆形对象
   * @param {Number} x 坐标点x
   * @param {Number} y 坐标点y
   * @param {Number} radius 节点半径
   */
  findNode (x, y, radius) {
    let i, dx, dy, d2, node, closest
    const nodes = this.body.transformData.viewNodes
    const n = nodes.length
    i = 0
    if (radius == null) {
      throw new Error('错误:半径为必传参数')
    } else {
      radius *= radius
    }
    for (i = 0; i < n; i++) {
      node = nodes[i]
      dx = x - node.x
      dy = y - node.y
      d2 = dx * dx + dy * dy
      if (d2 < radius) {
        closest = node
        radius = d2
      }
    }
    return closest
  }

  /**
   * 获取指定点位所在的线条对象
   * @param x 坐标点x
   * @param y 坐标点y
   */
  findEdge (x, y) {
    let mindist = 10
    let overlappingEdge = null
    const edges = this.body.transformData.edges
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i]
      const dist = EdgeUtil.getDistanceToLine([e.source.x, e.source.y], [e.target.x, e.target.y], [x, y])
      if (dist < mindist) {
        overlappingEdge = e
        mindist = dist
      }
    }
    return overlappingEdge
  }

  /**
   * 过滤矩形中包含的节点
   * @param {Array} nodes 需要筛选的节点数组
   * @param {Array} rect 矩形
   */
  findNodesByRect (nodes, rect) {
    const [x0, y0, x1, y1] = rect
    const boundX0 = this.transformX(x0)
    const boundY0 = this.transformY(y0)
    const boundX1 = this.transformX(x1)
    const boundY1 = this.transformY(y1)
    return nodes.filter(n => n.x >= boundX0 &&
        n.x <= boundX1 &&
        n.y >= boundY0 &&
        n.y <= boundY1)
  }

  /**
   * 判断节点是否在node范围内
   * @param {Object} node 节点对象
   * @param {Array} rect 矩形
   */
  nodeIsInRect (node, rect) {
    let isIn = true
    const [x0, y0, x1, y1] = rect
    const boundX0 = this.transformX(x0)
    const boundY0 = this.transformY(y0)
    const boundX1 = this.transformX(x1)
    const boundY1 = this.transformY(y1)
    isIn = node.x > boundX0 && node.x < boundX1 && node.y > boundY0 && node.y < boundY1
    return isIn
  }

  /**
   * 鼠标操作对象
   * @param m 鼠标相对于容器的坐标[x, y]
   */
  mouseTargetObject (m) {
    let d = null
    const node = this.findNode(this.transformX(m[0]), this.transformY(m[1]), Node.iconRadius())
    const edge = this.findEdge(this.transformX(m[0]), this.transformY(m[1]))
    if (node != null) {
      d = node
    } else if (edge != null) {
      d = edge
    }
    return d
  }

  /**
   * 转换成画布中的位置: X坐标
   * @param x0 鼠标相对于容器的x坐标
   */
  transformX (x0) {
    return this.body.scale.invertX(x0)
  }

  /**
   * 转换成画布中的位置：Y坐标
   * @param y0 鼠标相对于容器的y坐标
   */
  transformY (y0) {
    return this.body.scale.invertY(y0)
  }

  /**
   * 获取鼠标对应的节点对象
   * @param {Object} m 鼠标对象
   */
  getMouseNode (m) {
    let d = null
    const point = { x: this.transformX(m[0]), y: this.transformY(m[1]) }
    // 点击了实体类节点
    const node = this.findNode(point.x, point.y, Node.iconRadius())
    if (node != null) {
      d = node
    }
    return d
  }

  /**
   * 获取鼠标对应的连线对象
   * @param {Object} m 鼠标对象
   */
  getMouseEdge (m) {
    let d = null
    const point = { x: this.transformX(m[0]), y: this.transformY(m[1]) }
    const edge = this.findEdge(point.x, point.y)
    if (edge != null) {
      d = edge
    }
    return d
  }

  /**
   * 获取鼠标对应的对象
   * @param {Object} m 鼠标对象
   */
  getMouseTargetObject (m) {
    let d = this.getMouseNode(m)
    if (d == null) {
      d = this.getMouseEdge(m)
    }
    return d
  }

  /**
   * 根据id得到对应节点数据
   * @param {String} id id
   * @returns
   */
  getNodeEntity (id) {
    const nodes = this.body.data.nodes.filter(e => e.id === id)
    return nodes.length === 1 ? nodes[0] : null
  }

  /**
   * 根据id得到对应连线数据
   * @param {String} id id
   * @returns
   */
  getEdgeEntity (id) {
    const edges = this.body.data.edges.filter(e => e.id === id)
    return edges.length === 1 ? edges[0] : null
  }

  /**
   * 判断节点所在的边界是否在canvas的可视化范围中
   * @param {Object} canvas canvas
   * @param {Object} node 节点对象
   * @returns {Boolean}
   */
  isInViewport (canvas, node) {
    const rect = [0, 0, canvas.width, canvas.height]
    return this.nodeIsInRect(node, rect)
  }

  /**
   * 视图中心位置
   * @param {Object} canvas canvas对象
   */
  getViewCenter (canvas = this.body.nodeContainer) {
    return {
      x: this.transformX(0.5 * canvas.clientWidth),
      y: this.transformY(0.5 * canvas.clientHeight)
    }
  }

  /**
   * 指定节点的id集返回对应的边界
   * @param {Array} nodeIds 指定节点的id集合
   * @returns { minX, maxX, minY, maxY } 边界
   */
  getRange (nodeIds = []) {
    let [minY, maxY, minX, maxX] = [1e9, -1e9, 1e9, -1e9]
    let node
    const nodeMaps = this.body.nodeMaps
    if (nodeIds.length > 0) {
      for (var i = 0; i < nodeIds.length; i++) {
        node = nodeMaps[nodeIds[i]]
        if (minX > node.boundingBox.left) {
          minX = node.boundingBox.left
        }
        if (maxX < node.boundingBox.right) {
          maxX = node.boundingBox.right
        }
        if (minY > node.boundingBox.top) {
          minY = node.boundingBox.top
        }
        if (maxY < node.boundingBox.bottom) {
          maxY = node.boundingBox.bottom
        }
      }
    } else { // 如果没有传递nodeIds, 则默认是所有节点
      let nodeId
      for (nodeId in nodeMaps) {
        if (nodeMaps.hasOwnProperty(nodeId)) {
          node = nodeMaps[nodeId]
          if (minX > node.boundingBox.left) {
            minX = node.boundingBox.left
          }
          if (maxX < node.boundingBox.right) {
            maxX = node.boundingBox.right
          }
          if (minY > node.boundingBox.top) {
            minY = node.boundingBox.top
          }
          if (maxY < node.boundingBox.bottom) {
            maxY = node.boundingBox.bottom
          }
        }
      }
    }
    if (minX === 1e9 && maxX === -1e9 && minY === 1e9 && maxY === -1e9) {
      minY = 0
      maxY = 0
      minX = 0
      maxX = 0
    }
    return { minX, maxX, minY, maxY }
  }
}

export default Operator
