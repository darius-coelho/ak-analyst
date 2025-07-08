import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import _ from 'lodash';
import * as d3 from 'd3';

import { ContextMenu, MenuItem } from "react-contextmenu";

import NaviBar from '../../../common/components/NaviBar';
import AttributeList from './AttributeList';
import CausalGraph from './CausalGraph';
import CausalConfig from './CausalConfig';

import VisualizationList from './VisualizationList';
import { abbreviateText } from '../../../utilities/utilities.js';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import AddressContext from "../../../../AddressContext";

import "./css/CausalExplorer.css"


/**
* Renders the aggregator interface
* @param {Object} config - Config parameters of the causal explorer action
* @param {array} data - The data preview
* @param {array} columns - List pf column names
* @param {Object} types - Mapping of columns names to their type
* @param {function} setParams - Functin to set the config parameters
*/
export function CausalExplorer(props) {
  const { data, columns, types, config, nodesToAdd,
	  edgesToAdd, targetNodes, setParams } = props
  
  // get react context that stores the web address for the ak engine api
  const context = useContext(AddressContext);

  const osScaler = window.navigator.userAgent.indexOf("Mac")!=-1 ? 0.66 : 1
  const gridSide = 40 * 1/(window.devicePixelRatio*osScaler)
  
  const pad = 10;
  const topPad = 35 + pad;
  
  const [dims, setDims] = useState({
    attributeBox: {
      width: 206,
      height: 0.55*(window.innerHeight - 3*pad) - (topPad - pad),
      top: topPad,
      left: 2*pad + 0.2*window.innerWidth
    },
    configBox: {
      left: pad,
      width: 0.2 * window.innerWidth,
      top: topPad,
      height: window.innerHeight - topPad - pad
    },
    buttonBox: {
      width: 0.2*window.innerWidth,
      height: 40,
      top: window.innerHeight - pad - 40,
      left: pad
    },
    graphBox: {
      width: window.innerWidth - 3*pad - 0.2*window.innerWidth - 201 - pad,
      height: 0.55*(window.innerHeight - 3*pad) - (topPad - pad),
      top: topPad,
      left: 2*pad + 0.2*window.innerWidth + 211
    },
    vizBox: {
      width: window.innerWidth - 3*pad - 0.2*window.innerWidth,
      height: 0.45*(window.innerHeight - 3*pad),
      top: 0.55*(window.innerHeight - 3*pad) + 2*pad,
      left: 2*pad + 0.2*window.innerWidth
    }
  })

  const [nodes, setNodes] = useState(initNodes())
  const [edges, setEdges] = useState(initEdges())
  const [loading, setLoading] = useState(false)
  const [latent, setLatent] = useState(null)
  const [focusNode, setFocusNode] = useState(null)
  const [focusEdge, setFocusEdge] = useState(null)
  const [modelList, setModelList] = useState([])
  
  useEffect(()=>{
    const endPoint = context.address + "ModelList";
    const controller = new AbortController();
    
    axios.post(endPoint, {}, {withCredentials: true, signal: controller.signal})
      .then((response) => {
        const models = response.data.models;

	// Add the auto option
	models.unshift({'label': 'Auto', 'module': '', 'value': 'Auto'})	
        setModelList(models);
      })
      .catch(error => {
	console.error(error);
      });

    return ()=>controller.abort();
    }, []);
  
  const changeFocusNode = (node) => {
    setFocusNode(node)
    setFocusEdge(null)
  }

  const changeFocusEdge = (edge) => {
    setFocusNode(null)
    setFocusEdge(edge)
  }

  useEffect(()=>{
    updateCyles()
  }, [edges]);


  /** Adjust the x-position based on grid */
  function nodePosX(x) {
    const x1 = gridSide * Math.floor(x/gridSide);
    return x > (x1 + gridSide/2) ? (x1 + gridSide) : x1;
  }

  /** Adjust the y-position based on grid */
  function nodePosY(y) {
    const y1 = gridSide * Math.floor(y/gridSide);
    return y > (y1 + gridSide/2) ? (y1 + gridSide) : y1;
  }

  /** Adjust the x and y position based on the grid. */
  function nodePos(x, y) {
    const xPos = nodePosX(x);
    const yPos = nodePosY(y); 
    return [xPos, yPos];
  }


  /** Initialize edges based on pattern browser input. */
  function initEdges() {
    return [...config.edges, ...edgesToAdd];
  }


  /** Resets the causal config params. */
  function resetNodeCausalParams(nodes) {
    return Object.assign({}, ...Object.entries(nodes).map(([k, v])=>({
      [k]: {
	...v,
	treatVar: '--placeholder--',
	alternative: '',
	reference: '',
	shift: '',
	ate: null,
	fitScore: null,
	influence: {}
      }
    })));
  }
  
  /** Initialize nodes based on pattern browser input */
  function initNodes() {
    if (nodesToAdd.length == 0)  return config.nodes;

    // default startX if config.nodes is empty
    let startX = (dims.graphBox.width / 2);
    
    if (!_.isEmpty(config.nodes)) {
      // set the added nodes pos. outside the bounding box of the manually
      // added nodes.
      const minX = d3.min(Object.keys(config.nodes), (d=>config.nodes[d].x));
      const maxX = d3.max(Object.keys(config.nodes), (d=>config.nodes[d].x));

      startX = (minX - dims.graphBox.left > dims.graphBox.left + dims.graphBox.width - maxX
		? (minX - dims.graphBox.left) / 2
		: (dims.graphBox.left + dims.graphBox.width - maxX) / 2);
    }
    
    const range = [Math.max(100, (dims.graphBox.height / 2) - (nodesToAdd.length / 2) * 50),
		   Math.min(dims.graphBox.height,
			    (dims.graphBox.height / 2) + (nodesToAdd.length / 2) * 50)];

    const yScale = d3.scaleLinear()
	  .domain([0, nodesToAdd.length])
	  .range(range)
    
    let nToA = nodesToAdd.map((attr, nid)=>({
      [attr]: {
	x: nodePosX(startX),
	y: nodePosY(yScale(nid)),
	type: 'observed',
	inCycle: false,
	dtype: types[attr],
	treatVar: '--placeholder--',
	alternative: '',
	reference: '',
	shift: '',
	ate: null,
	fitScore: null,
	influence: {}
      }
    }));

    // add the target nodes 
    nToA = nToA.concat(targetNodes.map((d,i)=>({
      [d]: {
	x: nodePosX(startX + 200),
	y: nodePosY(yScale(i)),
	type: 'observed',
	dtype: types[d],
	inCycle: false,
	treatVar: '--placeholder--',
	alternative: '',
	reference: '',
	shift: '',
	ate: null,
	fitScore: null,
	influence: {}
      }
    })));

    return {...config.nodes, ...Object.assign({}, ...nToA)};
  }
  
  /**
  * Adds a node to the causal graph
  * @param {string} attr - The attribute being added to the causal graph
  * @param {number} x - The x psoition of the causal node on the canvas
  * @param {number} y - The xy psoition of the causal node on the canvas
  */
  const onAddNode = (attr, x, y) => {
    
    const [xPos, yPos] = nodePos(x, y);
    setNodes({
      ...resetNodeCausalParams(nodes),				   
      [attr]: {
        x: xPos,
        y: yPos,
	type: 'observed',
        inCycle: false,
	dtype: types[attr],
	treatVar: '--placeholder--',
	alternative: '',
	reference: '',
	shift: '',
	ate: null,
	fitScore: null,
	influence: {}
      }
    })
    setFocusNode(attr)
    setFocusEdge(null)
  }

  /** Replace the latent variable with an actual one.  */
  const onReplaceLatent = (e, data) => {
    setNodes({
      ..._.omit(nodes, data.attr),
      [data.replace]: {
	...nodes[data.attr],
	type: 'observed',
	dtype: types[data.replace],
	treatVar: '--placeholder--',
	alternative: '',
	reference: '',
	shift: '',
	ate: null,
	fitScore: null,
	influence: {}
      }
      
    });

    setEdges(edges.map(d=>{
      const src = (d.sourceAttr === data.attr ? data.replace : d.sourceAttr);
      const tar = (d.targetAttr === data.attr ? data.replace : d.targetAttr);

      return {...d, sourceAttr: src, targetAttr: tar};
    }));
  }
  
  /**
  * Updates the position of a node in the causal graph while it is being dragged
  * @param {string} attr - The attribute being added to the causal graph
  * @param {number} x - The x position of the causal node on the canvas
  * @param {number} y - The y position of the causal node on the canvas
  */
  const onDragNode = (attr, x, y) => {    
    setNodes({
      ...nodes,
      [attr] : {
	...nodes[attr],
        x: x > 0 ? x  : 0,
        y: y > 0 ? y  : 0,
      }
    })
    setFocusNode(attr)
    setFocusEdge(null)
  }

  /**
  * Fixes the position of a node in the causal graph when it is dropped
  * @param {string} attr - The attribute being added to the causal graph
  */
  const onDropNode = (attr) => {
    const {x, y, type, inCycle} = nodes[attr];
    
    const x1 = gridSide * Math.floor(x/gridSide)
    const y1 = gridSide * Math.floor(y/gridSide)

    const xPos = x > (x1 + gridSide/2) ? (x1 + gridSide) : x1
    const yPos = y > (y1 + gridSide/2) ? (y1 + gridSide) : y1

    const newPos = {x: xPos, y: yPos};
    setNodes({
      ...nodes,
      [attr] : {...nodes[attr], ...newPos}
    })
    setFocusNode(attr)
    setFocusEdge(null)
  }


  /** Set the latent attribute which the menu is shown for. */
  const showLatentMenu = (e) => {    
    const data = e.detail.data;
    setLatent(data.attr);
  }
  
  /**
  * removes a node from the causal graph
  * @param {object} data - Object that contains the index of the edge to be removed
  */
  const removeNode = (e, data) => {
    const attr = data.attr
    let newNodes = [...nodes]
    delete newNodes[attr]
    setNodes(Object.entries(resetNodeCausalParams(nodes)).reduce((acc, [k,v])=> {
      if(k!=attr){
        return {
          ...acc,
          [k]: v
        }
      }
      return acc
    }, {}))
    setEdges(edges.filter( (d,i) => d.sourceAttr != attr && d.targetAttr != attr))
    setFocusNode(null)
    setFocusEdge(null)
  }

  /**
  * Adds an edge to the causal graph
  * @param {object} edge - Object representing an edge in the causal graph
  */
  const addEdge = (edge) => {
    setFocusNode(null)
    setFocusEdge(edges.length)
    setNodes(resetNodeCausalParams(nodes));
    
    setEdges([
      ...edges,
      edge
    ])
    
  }

  /**
  * removes an edge from the causal graph
  * @param {object} data - Object that contains the index of the edge to be removed
  */
  const removeEdge = (e, data) => {
    setEdges(edges.filter( (d,i) => i != data.edgeID))
    setNodes(resetNodeCausalParams(nodes));
    setFocusNode(null)
    setFocusEdge(null)
  }

  /**
  * Reverses an edge in the causal graph
  * @param {object} data - Object that contains the index of the edge to be reversed
  */
  const reverseEdge = (e, data) => {
    const edge = edges[data.edgeID]
    const newEdge = {
      sourceAttr: edge.targetAttr,
      sourcePort: edge.targetPort,
      targetAttr: edge.sourceAttr,
      targetPort: edge.sourcePort
    }
    setEdges(edges.map( (d,i) => {
      if(i==data.edgeID){
        return newEdge
      }
      return d
    }))

    setNodes(resetNodeCausalParams(nodes));
  } 

  /**
  * Marks cycles in the causal graph
  */
  const updateCyles = () => {
    
    const selectDescendantIDs = (node, path) => {
      if(path.has(node)){
        return true
      }
      else if(!visited[node]) {
        visited[node] = true
        const neighbors = edges.filter(d => d.sourceAttr == node).map(d => d.targetAttr)
        for(let i=0; i<neighbors.length; i++){
          const new_path = new Set([...path, node])
          if(selectDescendantIDs(neighbors[i], new_path)){
            return true
          }
        }

      }
      return false
    };

    let visited = []

    const new_nodes = Object.keys(nodes).reduce((nodeAcc, d)=> {
                        visited = Object.keys(nodes).reduce((acc, node)=> {
                          return {
                              ...acc,
                              [node]: false
                            }
                          }, {})
                        const isCycle = selectDescendantIDs(d, new Set())
                        return {
                          ...nodeAcc,
                          [d]: {
                            ...nodes[d],
                            inCycle: isCycle
                          }
                        }
                      }, {})
    setNodes(new_nodes)
  }

  /**
  * Saves the config of the causal explorer before exiting
  */
  const onExit = () => {
    setParams({
      nodes: nodes,
      edges: edges
    })
  }

  /**
   * Deletes nodes or edges based in key pressed   
   */
  const onKeyPress = (e) => {
    if (e.key === "Delete") {
      if(focusNode != null){
        removeNode(null, {attr: focusNode})
      }
      if(focusEdge != null){
        removeEdge(null, {edgeID: focusEdge})
      }
    }
  }

  return (
    <div>
      <ContextMenu id="causal_node_context_menu">
        <MenuItem onClick={removeNode}>
          Delete
        </MenuItem>
      </ContextMenu>

      <ContextMenu id="latent_node_context_menu" onShow={showLatentMenu}>
      <MenuItem>
          <div style={{fontWeight: 'bold'}}>Replace Latent Variable</div>
        </MenuItem>
      <MenuItem divider />
      {
	latent === null || !(latent in nodes) || !('payload' in nodes[latent]) ? null :

	  <MenuItem> 
	  <Row style={{fontWeight: 'bold'}}><Col lg={7}>Attribute</Col><Col>Score</Col></Row>
	  <MenuItem divider />
	  </MenuItem>
      }
      {
	latent === null || !(latent in nodes) || !('payload' in nodes[latent]) ? null :

	nodes[latent].payload.map(conf=>(
	    <MenuItem key={conf.name} data={{replace: conf.name}} onClick={onReplaceLatent} >
	    <Row>
	    <Col lg={7} title={conf.name}>{abbreviateText(conf.name, /*maxLen=*/10)}</Col>
	    <Col className="ps-3" >{conf.score.toFixed(2)}</Col>
	    </Row>
	    </MenuItem>
	))
      }
      </ContextMenu>

      <ContextMenu id="causal_edge_context_menu">
        <MenuItem onClick={reverseEdge}>
          Reverse direction
        </MenuItem>
        <MenuItem onClick={removeEdge}>
          Delete
        </MenuItem>
      </ContextMenu>

      <CausalConfig
        style={dims.configBox}
        nodes={nodes}
        edges={edges}
        focusNode={focusNode}
        modelList={modelList}
        resetNodeCausalParams={resetNodeCausalParams}
        setNodes={setNodes}
        setEdges={setEdges}
        setLoading={setLoading}
      />
      
      <AttributeList
        style={dims.attributeBox}
        attributes={columns}
        nodes={nodes}
      />
 
      <CausalGraph
        style={dims.graphBox}
        nodes={nodes}
        edges={edges}
        focusNode={focusNode}
        focusEdge={focusEdge}
        gridSide={gridSide}
        addNode={onAddNode}
        addEdge={addEdge}
        onDragNode={onDragNode}
        setNodes={setNodes}
        onDropNode={onDropNode}
        changeFocusNode={changeFocusNode}
        changeFocusEdge={changeFocusEdge}
        onKeyPress={onKeyPress}
      />
      
      <VisualizationList
        style={dims.vizBox}
        edges={edges}
        data={data}
        types={types}
        focusNode={focusNode}
        focusEdge={focusEdge}
      />
    
      <NaviBar
        backToData = {{pathname: "/main"}}
        onBack={onExit}
      />
      
    {
      loading ?
        <div className="loaderContainer" >
          <div className="loaderBarA" style={{top: "40%"}}/>
        </div>
      : null
    }
    </div>
  )
}

export default CausalExplorer;
