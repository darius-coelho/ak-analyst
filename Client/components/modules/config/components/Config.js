import React, { useContext, useState } from 'react';
import { connect, useSelector } from 'react-redux';

import { selectFocusNodeOrNull, selectPathTo } from '../../graph/graph.selectors';
import { setConfig, setOutput, setIsLoading, validateCurrentState, handleNodeError } from '../../graph/graph.actions';
import { initializeConfig } from '../../graph/graph.reducer';
import { parseOutputFun, isPathReady, ReadyStatus } from '../../graph/components/Action.prototype';

import { useInfoToastContext } from '../../common/components/InfoToastContext';

import DefaultMessage from './DefaultMessage';

import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';

import LoadActionConfig  from "./LoadActionConfig";
import CleanseActionConfig  from "./CleanseActionConfig";
import JoinActionConfig  from "./JoinActionConfig";
import AggregateActionConfig from "./AggregateActionConfig"
import SplitDataActionConfig from './SplitDataActionConfig';
import AKMineActionConfig  from "./AKMineActionConfig";
import AKCausalActionConfig from './AKCausalActionConfig';
import SKLearnActionConfig  from "./SKLearnActionConfig";
import PredictActionConfig  from "./PredictActionConfig";
import AKRegressionActionConfig from './AKRegressionActionConfig';
import AKBrowseActionConfig  from "./AKBrowseActionConfig";
import AKVisualizeActionConfig from './AKVisualizeActionConfig';

import api from '../../../../apis/api';
import mixpanel from 'mixpanel-browser';

import HelpIcon from "../../common/components/HelpIcon"

import AddressContext from "../../../AddressContext";

export const LOAD_FILE = 'LOAD_FILE';
export const LOAD_CLOUD = 'LOAD_CLOUD';
export const CLEANSE = 'CLEANSE';
export const JOIN = 'JOIN';
export const AGGREGATE = 'AGGREGATE';
export const SPLITDATA = 'SPLITDATA';
export const AK_MINE = 'AK_MINE';
export const AK_CAUSAL = 'AK_CAUSAL';
export const SKLEARN = 'SKLEARN';
export const REGRESSION = 'REGRESSION';
export const PREDICT = 'PREDICT';
export const AK_BROWSE = 'AK_BROWSE';
export const VISUALIZER = 'VISUALIZER';

/**
 * Renders a button that resets the inputs and outputs of an action
 * @param {String} props.type - Type of action.
 * @param {fn} props.setParams - Reducer function to set action config parameters.
 * @param {fn} props.setOutput - Reducer function to set action output.
 */
function ResetButton(props) {

  const onClick = () => {
    const params = initializeConfig(props.type)
    switch(props.type){
      case 'LOAD_FILE':
        props.setParams(params);
        props.setOutput([null]);
        return;
      case 'AK_BROWSE', 'VISUALIZER': return 'OK';
      case 'CLEANSE':
        props.setParams(params)
        props.setOutput([null]);
        return;
      case 'AK_MINE':
        props.setParams(params)
        props.setOutput([null]);
        return;
      case 'VISUALIZER':
        props.setParams(params)
        props.setOutput([null]);
        return;
      default:
        props.setParams(params);
        props.setOutput([null]);
        return;
    }
    return null
  };

  var buttonStyle={
    position: "absolute",
    display: "block",
    bottom:0,
    margin:10,
    width: 80,
    marginLeft: "calc(50% + 5px)",
    padding: "5px 15px",
    background: "#4c7faf"
  }
  return (
      <Button variant="success" onClick={onClick} style={buttonStyle}>
        {"Reset"}
      </Button>
  );
}

/**
 * Executes an action
 * @param {Object} execData - object contianing information about the node and its predecessors in the pipeline
 * @param {Function} setParams - function to set the config of a node (Node ID must be bound to the function)
 * @param {Function} setOutput - function to set the output of a node (Node ID must be bound to the function)
 * @param {Function} handleNodeError - function to handle an error for a pipeline node
 * @param {Function} addInfoToast - function that shows an error message toast
 */
export function runAction(execData, setParams, setOutput, handleNodeError, addInfoToast) {
  const isReady = isPathReady(execData) // check if the current path is ready to be executed
  if(isReady){
    mixpanel.track("Run Action", {'type': execData['type']});

    api.executePipeline(execData.ID, ()=>{}, (error) => {
      const errRes = error.response.data
      handleNodeError(errRes.nodeID, errRes.action_type, errRes.err)

      if (errRes.action_type === "LOAD_CLOUD")
        setParams(errRes.data)

      setOutput(null)
      addInfoToast(error.response.data.err, 'danger')
    });
  }
  else{
    // Alert user that path not ready for execution
    addInfoToast(
      "Could not run as the action or its predecessors are not ready.",
      'danger'
    )
  }
}

/**
 * Renders a button that runs the current action
 * @param {String} props.disabled - Indicates if the current action is not ready.
 * @param {fn} props.pathTo - Selector function that gets the flow graph path to the current action node.
 * @param {fn} props.setIsLoading - Reducer function to set flag that indicated the action is running.
 * @param {fn} props.setOutput - Reducer function to set action output.
 */
function RunButton(props) {
  // get react context that stores the web address for the ak engine api
  const context = useContext(AddressContext);
  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();
  // get the name of the pipeline
  const pipelineName = useSelector(state=>state.global.pipelineName);
  const pipelineState = useSelector(state=>state);
  const autoSaveName = useSelector(state=>state.global.autoSaveName);
  const isSamplePipeline = useSelector(state=>state.global.isSample);
  
  const defaultClick = () => {
    // update the validity of current state
    props.validateCurrentState()
    // get node info required to execute the node
    const execData = props.pathTo()
    // execute action
    runAction(
      execData,
      props.setParams,
      props.setOutput,
      props.handleNodeError,
      addInfoToast
    )
  };

  const onClick = ('onClick' in props && props.onClick != null ? props.onClick : defaultClick);
  var buttonStyle={
    position: "absolute",
    display: "block",
    bottom:0,
    width: 80,
    margin:10,
    marginLeft: "calc(50% - 85px)",
    padding: "5px 15px",
    background: "#4c7faf"
  }

  const buttonText = ('buttonText' in props ? props.buttonText : "Run");

  return (
      <Button  variant="success" disabled={props.disabled} onClick={onClick} style={buttonStyle}>
        {buttonText}
      </Button>
  );
}

function ConfigBody(props) {
  const [runClick, setRunClick] = useState(null);

  const {ID, type, config, input, output, readyStatus} = props.focusNode || {};
  if (props.focusNode) {
    if (readyStatus === ReadyStatus.PrevMissing) 
      return <DefaultMessage text={'Please connect appropriate actions.'} />

    if (readyStatus === ReadyStatus.PrevUnready)
      return <DefaultMessage text={'1 or more connections is not ready.'} />

    if (readyStatus === ReadyStatus.PrevNoOutput)
      return <DefaultMessage text={'Data not ready. Run prior actions.'} />

    if (readyStatus === ReadyStatus.Error)
      return <DefaultMessage text={'An error occurred.'} />
  }
  
  const isReady = props.focusNode && props.focusNode.readyStatus === ReadyStatus.OK;
  let { setParams, setOutput, pathTo, validateCurrentState, handleNodeError } = props

  if (setParams) {
    setParams = setParams.bind(null, ID);
    setOutput = setOutput.bind([null], ID);
    pathTo = pathTo.bind(null, ID, 0);
  }

  let processOutput = null;
  if(props.focusNode) {
    processOutput = parseOutputFun(props.focusNode.type);
  }

  /** Wrapper for setting the runClick state variable */
  const setOpenSelectedFile = (openFileFun) => {
    setRunClick(()=>openFileFun);
  }

  switch(type) {
    case LOAD_FILE: return (
      <div data-testid='container' style={{textAlign: "center"}}>
        <LoadActionConfig {...{
	          ID,
            config,
	          pathTo,
            setParams,
            setOutput,
            handleNodeError,
	          setOpenSelectedFile
          }}
          type={type}  />
        <RunButton
          {...{
            pathTo,
            setOutput,
            processOutput,
            validateCurrentState,
            handleNodeError,
	          onClick: runClick === null ? null : runClick.bind(this, config)
          }}
        />
        <ResetButton {...{type, setParams, setOutput}}/>
      </div>
    );
    case LOAD_CLOUD: return (
      <div data-testid='container' style={{textAlign: "center"}}>
        <LoadActionConfig {...{
            ID,
            config,
            pathTo,
            setParams,
            config,
            setParams,
            setOutput,
            handleNodeError
          }}
          type={type} />
        <RunButton
          disabled={!isReady}
          {...{
            pathTo,
            setOutput,
            processOutput,
            validateCurrentState,
            handleNodeError,
	          setParams
          }}
        />
        <ResetButton {...{type, setParams, setOutput}}/>
      </div>
    );
    case CLEANSE: return (
      <div data-testid='container' style={{textAlign: "center"}}>
	      <CleanseActionConfig
          {...{
	          ID,
            input,
            config,
            pathTo,
            setParams,
            setOutput,
            handleNodeError
          }}
        />
        <RunButton
          disabled={!isReady}
          {...{
            pathTo,
            setOutput,
            processOutput,
            validateCurrentState,
            handleNodeError
          }}
        />
        <ResetButton {...{type, setParams, setOutput}}/>
      </div>
    );
    case JOIN: return (
      <div data-testid='container'>
        <JoinActionConfig {...config} {...{input, setParams, setOutput}}/>
        <RunButton
          disabled={!isReady}
          {...{
            pathTo,
            setOutput,
            processOutput,
            validateCurrentState,
            handleNodeError
          }}
        />
        <ResetButton {...{type, setParams, setOutput}}/>
      </div>
    );
    case AGGREGATE: return (
      <div data-testid='container' style={{textAlign: "center"}}>
        <AggregateActionConfig
          {...{
	          ID,
            input,
            output,
            config,
            pathTo,
            setParams,
            setOutput,
            processOutput,
            handleNodeError
          }}
        />
        <RunButton
          disabled={!isReady || config.aggKey===null}
          {...{
            pathTo,
            setOutput,
            processOutput,
            validateCurrentState,
            handleNodeError
          }}
        />
        <ResetButton {...{type, setParams, setOutput}}/>
      </div>
    );
    case SPLITDATA: return (
      <div data-testid='container'>
        <SplitDataActionConfig
          {...{
            input,
            output,
            config,
            pathTo,
            setParams,
            setOutput,
            processOutput,
            handleNodeError
          }}
        />
        <RunButton
          disabled={!isReady}
          {...{
            pathTo,
            setOutput,
            processOutput,
            validateCurrentState,
            handleNodeError
          }}
        />
        <ResetButton {...{type, setParams, setOutput}}/>
      </div>
    );
    case AK_MINE: return (
      <div data-testid='container'>
        <AKMineActionConfig {...{input, config, setParams, setOutput}}/>
        <RunButton
          disabled={!isReady}
          {...{
            pathTo,
            setOutput,
            processOutput,
            validateCurrentState,
            handleNodeError
          }}
        />
        <ResetButton {...{type, setParams, setOutput}}/>
      </div>
    );
    case SKLEARN: return (
      <div data-testid='container'>
        <SKLearnActionConfig {...{input, config, setParams, setOutput}}/>
        <RunButton
          disabled={!isReady}
          buttonText={"Fit"}
          {...{
            pathTo,
            setOutput,
            processOutput,
            validateCurrentState,
            handleNodeError
          }}
        />
        <ResetButton {...{type, setParams, setOutput}}/>
      </div>
    );
    case REGRESSION: return (
      <div data-testid='container'>
        <AKRegressionActionConfig {...{input, config, setParams, setOutput}}/>
        <RunButton
          disabled={!isReady}
          {...{
            pathTo,
            setOutput,
            processOutput,
            validateCurrentState,
            handleNodeError
          }}
        />
        <ResetButton {...{type, setParams, setOutput}}/>
      </div>
    );
  case PREDICT: return (
      <div data-testid='container'>
        <PredictActionConfig {...{isReady, input, config, setParams, setOutput}}/>
        <RunButton
          disabled={!isReady}
          {...{
            pathTo,
            setOutput,
            processOutput,
            validateCurrentState,
            handleNodeError
          }}
        />
        <ResetButton {...{type, setParams, setOutput}}/>
      </div>
    );
    case AK_BROWSE: return (
      <div data-testid='container' style={{textAlign: "center", margin: "auto"}}>
        <AKBrowseActionConfig
          {...{
	          ID,
            input,
            config,
	          output,
            pathTo,
            setParams,
            setOutput,
            validateCurrentState,
            handleNodeError
          }}
        />
      </div>
    );
    case VISUALIZER: return (
      <div data-testid='container' style={{textAlign: "center"}}>
        <AKVisualizeActionConfig
          {...{
	          ID,
            input,
            config,
            pathTo,
            setParams,
            setOutput,
            validateCurrentState,
            handleNodeError
          }}
        />
      </div>
    );
    case AK_CAUSAL: return (
      <div data-testid='container' style={{textAlign: "center", margin: "auto"}}>
        <AKCausalActionConfig
          {...{
	          ID,
            input,
	          config,
            pathTo,
            setParams,
            setOutput,
            validateCurrentState,
            handleNodeError
          }}
        />
      </div>
    );
    default: return (<div data-testid='container'></div>);
  }
}

export function Config(props) {
  return (
    <Card style={{border: 'none', width: "100%", height: "100%"}}>
      <label className="contentDivHead"  title={"Action Configuration"}>
        Action Configuration
      </label>
      <HelpIcon
        content={
          `The action configuration panel allows you to configure an action.
          To bring up the configuration options click on an action that has been placed on the canvas to the right.`
        }
      />
      <ConfigBody {...props} />
    </Card>
  );
}

const mapStateToProps = (state) => {
  return {
    focusNode: selectFocusNodeOrNull(state.graph),
    pathTo: (nodeId, port) => selectPathTo(state.graph, nodeId, port)
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setParams: (id, params) => dispatch(setConfig(id, params)),
    setOutput: (id, output) => dispatch(setOutput(id, output)),
    setIsLoading: (id, status) => dispatch(setIsLoading(id, status)),
    validateCurrentState: () => dispatch(validateCurrentState()),
    handleNodeError: (id, action, err)  => dispatch(handleNodeError(id, action, err))
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Config);
