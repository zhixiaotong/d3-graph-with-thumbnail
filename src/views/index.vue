<template>
  <div id="graph"></div>
</template>
<script>

import * as d3 from 'd3'
import { Status } from '@/func/graph/Util/constant'
import Node from '@/func/graph/Node/Node'
import Graph from '@/func/graph/index'
import Thumbnail from '@/func/graph/Thumbnail/index'
// 默认数据
const defaultDatas = {
  nodes: [
    {
      id: '001',
      label: '节点一'
    },
    {
      id: '002',
      label: '节点二'
    },
    {
      id: '003',
      label: '节点三'
    },
    {
      id: '004',
      label: '节点四'
    },
    {
      id: '005',
      label: '节点五'
    },
    {
      id: '006',
      label: '节点六'
    },
    {
      id: '007',
      label: '节点七'
    },
    {
      id: '008',
      label: '节点八'
    },
    {
      id: '009',
      label: '节点九'
    },
    {
      id: '010',
      label: '节点十'
    }
  ],
  edges: [
    {
      source: '001',
      target: '002'
    },
    {
      source: '001',
      target: '003'
    },
    {
      source: '001',
      target: '004'
    },
    {
      source: '001',
      target: '005'
    },
    {
      source: '001',
      target: '006'
    },
    {
      source: '001',
      target: '007'
    },
    {
      source: '001',
      target: '008'
    },
    {
      source: '001',
      target: '009'
    },
    {
      source: '001',
      target: '010'
    }
  ]
}
export default {
  data () {
    return {
      graph: null
    }
  },
  mounted () {
    this.$nextTick(() => {
      this.initializeGraph()
      this.initializeEvent()
      this.loadData()
    })
  },
  methods: {
    // 初始化
    initializeGraph () {
      const option = {}
      let dom = document.querySelector('#graph')
      const bounding = dom.getBoundingClientRect()
      // 画布
      this.graph = new Graph(dom, {nodes: [], edges: []}, bounding.width, bounding.height, option)
      // 缩略图
      this.graph.thumbnail = new Thumbnail(dom, this.graph.body, this.graph.operator)
    },
    // 注册事件
    initializeEvent () {
      const canvas = this.graph.body.nodeContainer
      d3.select(canvas)
        .on('click', () => this.graph.body.emitter.emit('tap', d3.mouse(canvas), d3.event, params => {
          console.log('单击')
          this.clickEvent(d3.mouse(canvas), d3.event, params)
        }))
        .on('contextmenu', () => this.graph.body.emitter.emit('tap', d3.mouse(canvas), d3.event, params => {
          // 阻止默认右键事件
          d3.event.returnValue = false
          console.log('右键')
        }))
        .on('dblclick', () => this.graph.body.emitter.emit('tap', d3.mouse(canvas), d3.event, params => {
          console.log('双击')
        }))
      // 注册窗口resize事件
      d3.select(window).on('resize', () => {
        this.graph.body.emitter.emit('resize', document.body.clientWidth, document.body.clientHeight)
      })
    },
    /** 加载数据 */
    loadData () {
      // 延时
      setTimeout(() => this.graph.setData(defaultDatas))
    },
    /** 点击事件 */
    clickEvent (coordinates, evt, obj) {
      if (obj && obj instanceof Node) {
        const oldStatus = obj.status
        obj.status = oldStatus === Status.selection ? Status.default : Status.selection
        this.graph.body.emitter.emit('click.node', event, obj)
      }
    }
  }
}
</script>
<style>
  html, body {
    overflow: hidden;
    height: 100%;
    margin: 0;
    padding: 0;
  }
  #graph {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
  }
</style>
