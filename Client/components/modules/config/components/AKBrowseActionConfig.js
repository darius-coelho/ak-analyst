import React from 'react';
import api from '../../../../apis/api';

import { store } from '../../store';

import { useHistory } from 'react-router-dom';
import { isPathReady } from '../../graph/components/Action.prototype';

import { useInfoToastContext } from '../../common/components/InfoToastContext';

/**
 * Send mining config to server to prepare data for pattern browser 
 * and launch the pattern browser card interface
 * @param {Object} history - the history hook passed down from the component calling the function.
 * @param {Object} execData - object contianing information about the node and its predecessors in the pipeline
 * @param {Function} validateCurrentState - function to validate the current state of the pipeline
 * @param {Function} setParams - function to set the config of a node (Node ID must be bound to the function)
 * @param {Function} setOutput - function to set the output of a node (Node ID must be bound to the function)
 * @param {Function} handleNodeError - function to handle an error for a pipeline node
 * @param {Function} addInfoToast - function that shows an error message toast 
 */
export function launchAKBrowser(history, execData, validateCurrentState, setParams, setOutput, handleNodeError, addInfoToast) {
  const isReady = isPathReady(execData) // check if the current path is ready to be executed

  if (isReady) {
    // Find mine input
    const mineInput = execData.input.find(d => d.type == 'AK_MINE')
    // Execute if ready
    const targets = mineInput.config.target;
    const targetType = mineInput.config.mineType;
    const alpha = mineInput.config.alpha

    const handleResponse = (response) => {
      validateCurrentState() // update the validity of current state

      // NOTE: This is a bit of a hack. The state is stale when accessing
      // through the selectors
      const updateConfig = store.getState().graph.nodes[execData.ID].config;

      if (Object.keys(response.data.patterns).length > 0) {
        // If patterns were found
        // Route to pattern browser component with appropriate props
        if (history.location.pathname === "/main") {
          history.push({
            pathname: "/pattern-browser-card",
            state: {
              config: updateConfig,
              output: execData.output,
              targets: targets,
              targetType: targetType,
              alpha: alpha,
              patterns: response.data.patterns,
              features: response.data.features,
              overallSummary: response.data.summary,
              catLabels: response.data.catLabels,
              patternsLoaded: true,
              setParams: setParams,
              setOutput: setOutput
            }
          });
          setOutput([{ errMsg: "" }]);
        }
      }
      else {
        // Show Error in output
        console.log("No patterns")
        setOutput([{ errMsg: "No patterns found. Please re-mine with new parameters." }]);
      }
    }

    const handleError = (error) => {
      console.log(error)
      const errRes = error.response.data
      handleNodeError(errRes.nodeID, errRes.action_type, errRes.err)
      addInfoToast(error.response.data.err, 'danger');
    }
    api.initCardBrowser(execData.ID, handleResponse, handleError);
  }
  else {
    // Alert user that path not ready for execution
    addInfoToast(
      "Could not run as the action or its predecessors are not ready.",
      'danger'
    );
  }
}

export function AKBrowseActionConfig(props) {
  // Get react router manipulator
  const history = useHistory();

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();
  
  /**
   * Handle clicking the launch browser button
   * @param {Object} event - mouse event, unused here.
   */
  function onLaunchCardBrowser(event) {
    // update the validity of current state    
    props.validateCurrentState()
    // get node info required to execute the node
    const execData = props.pathTo()
    // launch the pattern browser
    launchAKBrowser(
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
        <button className='btn btn-primary' onClick={onLaunchCardBrowser}>
          {`Launch Pattern Browser`}
        </button>
      </div>
    </div>
  );
}

export default AKBrowseActionConfig;
