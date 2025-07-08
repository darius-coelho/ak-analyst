import React from 'react';
import { connect } from 'react-redux';

import { selectFocusNodeOrNull, selectPathTo } from '../../graph/graph.selectors';


import { LOAD_FILE, LOAD_CLOUD, CLEANSE, AGGREGATE, JOIN,
	 SPLITDATA, AK_MINE, PREDICT, SKLEARN, REGRESSION,
	 AK_BROWSE, VISUALIZER } from '../../config/components/Config';

import HelpIcon from "../../common/components/HelpIcon"

import Card from 'react-bootstrap/Card';

import TableOutput  from "./TableOutput";
import SplitDataActionOutput from './SplitDataActionOutput';
import AKMineActionOutput  from "./AKMineActionOutput";
import SKLearnActionOutput from "./SKLearnActionOutput";
import AKBrowseActionOutput  from "./AKBrowseActionOutput";
import AKVisualizerActionOutput from "./AKVisualizerActionOutput"
import PredictActionOutput  from "./PredictActionOutput";
import LoadActionOutput from "./LoadActionOutput";


function OutputBody(props) {
  const {ID, type, config, output} = props.focusNode || {};
  
  const pathTo = props.pathTo.bind(null, ID, 0)

  switch(type) {
    case LOAD_FILE: return (
      <LoadActionOutput pathTo={pathTo} output={output} />      
    );
    case LOAD_CLOUD: return (
      <TableOutput config={config} output={output} />      
    );
    case CLEANSE: return (
      <TableOutput pathTo={pathTo} output={output} />
    );
    case AGGREGATE: return (
      <TableOutput pathTo={pathTo} output={output} />
    );
    case JOIN: return (      
      <TableOutput pathTo={pathTo} output={output} />
    );
    case PREDICT: return (
      <PredictActionOutput pathTo={pathTo} output={output} />      
    );
    case SPLITDATA : return (
      <SplitDataActionOutput pathTo={pathTo} output={output} />
    );
    case AK_MINE: return (
      <AKMineActionOutput {...config} pathTo={pathTo} output={output}/> 
    );
    case SKLEARN: return (
      <SKLearnActionOutput {...config} pathTo={pathTo} output={output} />
    );
    case REGRESSION: return (      
      <TableOutput pathTo={pathTo} config={config} output={output} />
    );
    case AK_BROWSE: return (
      <AKBrowseActionOutput {...config} output={output}/>
    );
    case VISUALIZER: return (
      <AKVisualizerActionOutput {...config} output={output}/>
    );
    default: return (<div data-testid='container'></div>);
  }    
}

export function ActionOutput(props) {
  return (
    <Card style={{border: 'none', height: "100%"}}>
      <label
        className="contentDivHead"
        title={"Action Output"}
        style={{width: 250, marginBottom: 15}}>
          Action Output
      </label>
      <HelpIcon 
        content={
          `This panel allows you to view the output of an action.
          To bring up the action output click on an action that has been placed on the canvas to the right.
          You must run an action for it to produce an output.`
        } 
      />
      <OutputBody {...props} />
    </Card>
  );
}

const mapStateToProps = (state) => {
  return {
    focusNode: selectFocusNodeOrNull(state.graph),  
    pathTo: (nodeId) => selectPathTo(state.graph, nodeId, 0)
  };
};


export default connect(mapStateToProps, null)(ActionOutput);
