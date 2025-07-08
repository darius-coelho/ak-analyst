import React from 'react';
import { connect } from 'react-redux';

import Node from './Node';
import { LOAD_FILE, LOAD_CLOUD, CLEANSE, AGGREGATE, JOIN, SPLITDATA, AK_MINE, SKLEARN,
	 PREDICT, AK_BROWSE, REGRESSION, VISUALIZER, AK_CAUSAL } from "../../config/components/Config";
import { setNodeFocus, setNodePos } from "../graph.actions";
import { uploadData, uploadCloudData, mergeData, transformData,
	 aggregateData, splitData, modelBuilder, predict,
	 minePatterns, causalExtractor, rollingRegression,
	 browsePatterns, visualizer } from './icons/akIcons';


const typeToIcon = (type) => {
  switch(type) {
    case LOAD_FILE: return uploadData;
    case LOAD_CLOUD: return uploadCloudData;
    case CLEANSE: return transformData;
    case JOIN: return mergeData;
    case AGGREGATE: return aggregateData;
    case SPLITDATA: return splitData;
    case AK_MINE: return minePatterns;
    case AK_CAUSAL: return causalExtractor;
    case SKLEARN: return modelBuilder;
    case REGRESSION: return rollingRegression;
    case PREDICT: return predict;
    case AK_BROWSE: return browsePatterns;
    case VISUALIZER: return visualizer;
  }
  return null;
};

// Action component should wrap the Node component
// and pass the icon to be displayed as well as
// the relevant callback functions.
// props: should contain the node info that this action maps to.
export function Action(props) {
  const { gridSide } = props
  
  function updateNodePos(id, evt, ui) {    
    const {x, y} = props.pos;
    
    // Keep the node within the bounds of the canvas
    const deltaX = (x + ui.deltaX < 1 ? 0 : ui.deltaX);
    const deltaY = (y + ui.deltaY < 1 ? 0 : ui.deltaY);
    
    const newPos = {x: x + deltaX, y: y + deltaY};
    props.setNodePos(id, newPos);
  }

  function onDropNode(id, e) {    
    const {x, y} = props.pos;   
    

    const x1 = gridSide * Math.floor(x/gridSide)
    const y1 = gridSide * Math.floor(y/gridSide)

    const xPos = x > (x1 + gridSide/2) ? (x1 + gridSide) : x1
    const yPos = y > (y1 + gridSide/2) ? (y1 + gridSide) : y1

    const newPos = {x: xPos, y: yPos};
    props.setNodePos(id, newPos);
  }
  
  const icon = typeToIcon(props.type);
  const callbacks = {
    onStart: props.setNodeFocus,
    onDrag: updateNodePos,
    onStop: onDropNode,
    portMouseDown: props.portMouseDown,
  };
  
  return (
      <Node {...props} icon={icon} {...callbacks} />
  );
}

const mapStateToProps = null;
const mapDispatchToProps = (dispatch) => {
  return {
    setNodeFocus: (id) => dispatch(setNodeFocus([id])),
    setNodePos: (id, pos) => dispatch(setNodePos(id, pos))
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Action);
