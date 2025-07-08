import React from 'react';
import api from '../../../../apis/api';
import { useHistory } from 'react-router-dom';
import { isPathReady } from '../../graph/components/Action.prototype';

import Container from 'react-bootstrap/Container';

import { SampleOptions } from './Options';

import { useInfoToastContext } from '../../common/components/InfoToastContext';

/**
 * Launches the visualizer interface
 * @param {Object} history - the history hook passed down from the component calling the function.
 * @param {Object} execData - object contianing information about the node and its predecessors in the pipeline
 * @param {Function} validateCurrentState - function to validate the current state of the pipeline
 * @param {Function} setParams - function to set the config of a node (Node ID must be bound to the function)
 * @param {Function} setOutput - function to set the output of a node (Node ID must be bound to the function)
 * @param {Function} handleNodeError - function to handle an error for a pipeline node
 * @param {Function} addInfoToast - function that shows an error message toast
 */
export function launchAKVisualizer(history, execData, validateCurrentState, setParams, setOutput, handleNodeError, addInfoToast) {
  const isReady = isPathReady(execData) // check if the current path is ready to be executed

  if (isReady) {
    // Execute if ready
    const handleResponse = (response) => {
      if (history.location.pathname === "/main") {
        // Route visualizer component with data
        history.push({
          pathname: "/visualizer",
          state: {
            data: response.data.outputList[0].preview,
            columns: response.data.outputList[0].columns,
            types: response.data.outputList[0].colTypes,
            config: execData.config,
            setParams: setParams,
          }
        });
        setOutput([{ errMsg: "" }]);
      }
    };

    const handleError = (error) => {
      const errRes = error.response.data
      handleNodeError(errRes.nodeID, errRes.action_type, errRes.err)
      addInfoToast(error.response.data.err, 'danger');
    };

    api.executePipeline(execData.ID, handleResponse, handleError);
  }
  else {
    // Alert user that path not ready for execution
    addInfoToast(
      "Could not run as the action or its predecessors are not ready.",
      'danger'
    );
  }

}

export function AKVisualizeActionConfig(props) {
  // Get react router manipulator
  const history = useHistory();

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();

  /**
  * Handle clicking the launch visualizer button
  * @param {Object} event - mouse event, unused here.
  */
  function onLaunchVisualizer(event) {
    // update the validity of current state
    props.validateCurrentState()
    // get node info required to execute the node
    const execData = props.pathTo()
    // launch the visualizer
    launchAKVisualizer(
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
    <Container>
      <SampleOptions {...props} />
      <button className='btn btn-primary' onClick={onLaunchVisualizer}>
        {`Launch Visualizer`}
      </button>
    </Container>
  );
}

export default AKVisualizeActionConfig;
