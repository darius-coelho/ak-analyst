import React, { useState }  from 'react';
import { useHistory } from 'react-router-dom';
import { connect } from 'react-redux';

import { ContextMenu, MenuItem } from "react-contextmenu";

import { runAction } from '../../config/components/Config';
import { launchAKBrowser } from '../../config/components/AKBrowseActionConfig';
import { launchCausalAnalyzer } from '../../config/components/AKCausalActionConfig';
import { launchAKVisualizer } from '../../config/components/AKVisualizeActionConfig';

import { useInfoToastContext } from '../../common/components/InfoToastContext';

import { setNodeFocus, deleteFocus, copyFocus, pasteFocus, setConfig, addNote, setNoteFocus,
         setOutput, validateCurrentState, handleNodeError } from "../graph.actions";
import { selectPathTo } from '../graph.selectors';
import DrawableGraph from './DrawableGraph';

import "../../../css/ContextMenu.css"

export function FlowGraph(props) {
  // Get react router manipulator
  const history = useHistory();

  const [ nodeType, setNodeType ] = useState(null)

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();

  /**
   * Deletes, copies, and pastes nodes based in key pressed
   */
  const keyPress = (e) => {
    let charCode = String.fromCharCode(e.which).toLowerCase();

    if (e.key === "Delete") {
      props.deleteFocus();
    }
    else if((e.ctrlKey || e.metaKey) && charCode === 'c') {
      props.copyFocus();
    }
    else if((e.ctrlKey || e.metaKey) && charCode === 'v') {
      props.pasteFocus();
    }
  }

  /**
   * Focuses a node when the context menu is shown
   * @param {String} e.detail.data.nid - the node ID.
   * @param {String} e.detail.data.type - the node/action type.
   */
  const onShowNodeContext = (e) => {
    props.setNodeFocus(e.detail.data.nid);
    setNodeType(e.detail.data.type)
  }

  /**
   * Runs the node over which the context menu was created
   * @param {String} data.nid - the node ID.
   * @param {String} data.type - the node/action type.
   */
  const handleRun = (e, data) => {
    // update the validity of current state
    props.validateCurrentState()
    // get node info required to execute the node
    const execData = props.pathTo(data.nid, 0)
    // execute action
    runAction(
      execData,
      props.setParams,
      props.setOutput,
      props.handleNodeError,
      addInfoToast
    )
  }

  /**
   * Launches an interface based on node type
   * @param {String} node.nid - the node ID.
   * @param {String} node.type - the node/action type.
   */
   const handleLaunchInterface = (e, node) => {
    // update the validity of current state
    props.validateCurrentState()

    // get node info required to execute the node
    const execData = props.pathTo(node.nid, 0)

    // launch the appropriate interface
    const launcher = {
      'AK_BROWSE': launchAKBrowser,
      'AK_CAUSAL': launchCausalAnalyzer,
      'VISUALIZER': launchAKVisualizer
    }

    launcher[node.type](
      history,
      execData,
      props.validateCurrentState,
      props.setParams.bind(null, node.nid),
      props.setOutput.bind(null, node.nid),
      props.handleNodeError,
      addInfoToast
    )
  }

  /**
   * Duplicates the node over which the context menu was created
   */
  const handleDuplicate = () => {
    props.copyFocus();
    props.pasteFocus();
  }

  /**
   * Deletes the node or note over which the context menu was created
   */
  const handleDelete = () => {
    props.deleteFocus();
  }

  /**
   * Adds note to the canvas
   */
   const handleAddNote = (e) => {
    const rect = document.querySelector(".basic-container").getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    props.addNote({
      x: offsetX,
      y: offsetY,
      width: 180,
      height: 70,
      content: "",
      isEditing: true
    })
  }

  /**
   * Focuses a node when the context menu is shown
   * @param {String} e.detail.data.nid - the node ID.
   * @param {String} e.detail.data.type - the node/action type.
   */
  const onShowNoteContext = (e) => {
    props.setNoteFocus(e.detail.data.nid);
  }


  /**
   * Renders the appropriate execute option based on the node type
   * @param {String} type - the node/action type.
   */
  const renderRunOption = (type) => {
    switch(type) {
      case 'AK_BROWSE': return <MenuItem onClick={handleLaunchInterface}>
                                  Launch Pattern Browser
                                </MenuItem>;
      case 'AK_CAUSAL': return <MenuItem onClick={handleLaunchInterface}>
                                  Launch Causal Analyzer
                                </MenuItem>;
      case 'VISUALIZER': return <MenuItem onClick={handleLaunchInterface}>
                                  Launch Visualizer
                                </MenuItem>;
      default: return <MenuItem onClick={handleRun}>
                        Run
                      </MenuItem>
    }
  }

  return (
    <div
      data-testid='content-container'
      className="content-container"
      onKeyDown={keyPress}
      tabIndex="0">

        <ContextMenu id="action_context_menu" onShow={onShowNodeContext}>
          {renderRunOption(nodeType)}
          <MenuItem onClick={handleDuplicate}>
            Duplicate
          </MenuItem>
          <MenuItem divider />
          <MenuItem onClick={handleDelete}>
            Delete
          </MenuItem>
        </ContextMenu>

        <ContextMenu id="canvas_context_menu">
          <MenuItem onClick={handleAddNote}>
            Add Note
          </MenuItem>
          <MenuItem divider />
          <MenuItem>
            Cancel
          </MenuItem>
        </ContextMenu>

        <ContextMenu id="note_context_menu" onShow={onShowNoteContext}>
          <MenuItem onClick={handleDelete}>
            Delete Node
          </MenuItem>
          <MenuItem divider />
          <MenuItem>
            Cancel
          </MenuItem>
        </ContextMenu>

        <DrawableGraph
          dragEdge={props.dragEdge}
          setDragEdge={props.setDragEdge}
          size={props.size}
          nodeSide={props.nodeSide}
          gridSide={props.gridSide} />
    </div>
  );
}

const mapStateToProps = (state) => {
  return {
    pathTo: (nodeId, port) => selectPathTo(state.graph, nodeId, port)
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    deleteFocus: () => dispatch(deleteFocus()),
    copyFocus: () => dispatch(copyFocus()),
    pasteFocus: () => dispatch(pasteFocus()),
    setNodeFocus: (id) => dispatch(setNodeFocus([id])),
    setNoteFocus: (id) => dispatch(setNoteFocus([id])),
    addNote: (note) => dispatch(addNote(note)),
    setParams: (id, params) => dispatch(setConfig(id, params)),
    setOutput: (id, output) => dispatch(setOutput(id, output)),
    validateCurrentState: () => dispatch(validateCurrentState()),
    handleNodeError: (id, action, err)  => dispatch(handleNodeError(id, action, err))
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(FlowGraph);
