import React from 'react';
import api from '../../../../apis/api';

import { useHistory } from 'react-router-dom';
import { isPathReady } from '../../graph/components/Action.prototype';

import { useInfoToastContext } from '../../common/components/InfoToastContext';


/**
 * Launches the causal analyzer interface
 * @param {Object} history - the history hook passed down from the component calling the function.
 * @param {Object} execData - object contianing information about the node and its predecessors in the pipeline
 * @param {Function} validateCurrentState - function to validate the current state of the pipeline
 * @param {Function} setParams - function to set the config of a node (Node ID must be bound to the function)
 * @param {Function} setOutput - function to set the output of a node (Node ID must be bound to the function)
 * @param {Function} handleNodeError - function to handle an error for a pipeline node
 * @param {Function} addInfoToast - function that shows an error message toast 
 */
export function launchCausalAnalyzer(history, execData, validateCurrentState, setParams, setOutput, handleNodeError, addInfoToast) {
  
  const config = execData.config || {}

  /** Converts the selected patterns to a list of attributes. */
  function patternsToAttr(patterns) {
    return [...new Set(patterns.map(d => [...d.core]).flat())];
  }

  /** 
   * Processes the list of selected patterns into nodes, targets and edges.
   * @param {array} inputs - List of selected patterns for each input browser.
   * returns a 3-tuple containing nodes, targets, and edges to add to the graph.
   */
  function graphToAdd(inputs) {
    const patterns = inputs.map(d => [patternsToAttr(d.output[0].selectedPatterns),
    ...d.output[0].targets]);

    const targets = [...new Set(inputs.map(d => [...d.output[0].targets]).flat())];

    const edges = patterns.map(p => p.slice(1).map(tar => p[0].map(d => ({
      sourceAttr: d,
      sourcePort: 'right',
      targetAttr: tar,
      targetPort: 'left'
    })))).flat(2);

    const nodes = [...new Set(patterns.map(p => p[0]).flat())];
    return [nodes, targets, edges];
  }

  const [browserNodes, targetNodes, edgesToAdd] = graphToAdd(
    execData.input.slice(1).filter(d => 'selectedPatterns' in d.output[0])
  );

  const isReady = isPathReady(execData); // check if the current path is ready to be executed

  if (isReady) {
    const nodes = config.nodes || {};
    const edges = config.edges || [];

    const handleResponse = (response) => {
      // Route to causal explorer component with appropriate props
      const input = execData.input[0].output[0]
      if (input) {
        history.push({
          pathname: "/causal-explorer",
          state: {
            data: input.preview,
            columns: input.columns,
            types: input.colTypes,
            config: execData.config,
            nodesToAdd: browserNodes.filter(d => !Object.keys(config.nodes).includes(d)),
            edgesToAdd: edgesToAdd
              .filter(e => config.edges.filter(ce => ce.sourceAttr === e.sourceAttr
                && ce.targetAttr === e.targetAttr).length == 0),
            targetNodes: targetNodes,
            setParams: setParams
          }
        });
      }
    };

    const handleError = (error) => {
      console.log(error);
      const errRes = error.response.data
      handleNodeError(errRes.nodeID, errRes.action_type, errRes.err)
      addInfoToast(error.response.data.err, 'danger');
    };
    api.initCausal(execData.ID, nodes, edges, handleResponse, handleError);

    setOutput([{ errMsg: "" }]);
  }
  else {
    // Alert user that path not ready for execution
    addInfoToast(
      "Could not run as the action or its predecessors are not ready.",
      'danger'
    );
  }

}

export function AKCausalActionConfig(props) {
  // Get react router manipulator
  const history = useHistory();

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();

  /**
  * Launches the causal explorer
  * @param {Object} event - mouse event, unused here.
  */
  function onLaunchCausalExplorer(event) {
    props.validateCurrentState() // update the validity of current state
    const execData = props.pathTo()
    // launch the pattern browser
    launchCausalAnalyzer(
      history,
      execData,
      props.validateCurrentState,
      props.setParams,
      props.setOutput,
      props.handleNodeError,
      addInfoToast
    )
  }
  
  return (
    <div>
      <div>
        <button className='btn btn-primary' onClick={onLaunchCausalExplorer}>
          {`Launch Causal Analyzer`}
        </button>
      </div>
    </div>
  );
}

export default AKCausalActionConfig;
