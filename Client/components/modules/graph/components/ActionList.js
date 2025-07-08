import React, { useState } from 'react';
import Collapse from 'react-bootstrap/Collapse';

import ActionListNode from './ActionListNode';
import { LOAD_FILE, LOAD_CLOUD, CLEANSE, JOIN, AGGREGATE, SPLITDATA, AK_MINE, SKLEARN,
	 AK_CAUSAL, REGRESSION, PREDICT, AK_BROWSE, VISUALIZER } from '../../config/components/Config';

import HelpIcon from '../../common/components/HelpIcon';

import "./css/ActionListBox.css"

export default function ActionList(props) {

  const [openIO, setOpenIO] = useState(true);
  const [openTransform, setOpenTransform] = useState(true);
  const [openAnalyze, setOpenAnalyze] = useState(true);
  const [openExplore, setOpenExplore] = useState(true);

  /*Toggles the expand/collapse flag for the File IO icons */
  const toggleOpenIO = () => {
    setOpenIO(!openIO)
  }

  /*Toggles the expand/collapse flag for the Data Manipulation icons */
  const toggleOpenTransform = () => {
    setOpenTransform(!openTransform)
  }

  /*Toggles the expand/collapse flag for the Analysis & Prediction icons */
  const toggleOpenAnalyze = () => {
    setOpenAnalyze(!openAnalyze)
  }

  /*Toggles the expand/collapse flag for the Visual Exploration icons */
  const toggleOpenExplore = () => {
    setOpenExplore(!openExplore)
  }

  return (
      <div className="outerActionBox" style={{width: props.nodeSide * 2.2}}>
      <HelpIcon 
        content={
          `This panel contains all the actions the AK analyst provides.
          To use an action drag it into the canvas on the right and configure it via the panel to the left.`
        }
      />
      <label className="contentDivHead" title={"Actions"}>Actions</label>
      <div className="innerActionBox">

        <div className='actionCategoryDiv'> 
          <label 
            className="actionCategoryLabel"
            title='File I/O'>
              File I/O
          </label>

          <i className="material-icons-outlined collapseIcon" onClick={toggleOpenIO}>
            {openIO ? 'expand_less' : 'expand_more'}
          </i>
        </div>
        <Collapse in={openIO}>
        <div>
        <ActionListNode type={LOAD_FILE} setDragEdge={props.setDragEdge} nodeSide={props.nodeSide} gridSide={props.gridSide} />
        <ActionListNode type={LOAD_CLOUD} setDragEdge={props.setDragEdge} nodeSide={props.nodeSide} gridSide={props.gridSide} /> 
        </div>
        </Collapse>

        <div className='actionCategoryDiv'> 
          <label 
            className="actionCategoryLabel"
            title='Data Manipulation'>
              Data Manipulation
          </label>

          <i className="material-icons-outlined collapseIcon" onClick={toggleOpenTransform}>
            {openTransform ? 'expand_less' : 'expand_more'}
          </i>
        </div>
        <Collapse in={openTransform}>
        <div>
        <ActionListNode type={CLEANSE} setDragEdge={props.setDragEdge} nodeSide={props.nodeSide} gridSide={props.gridSide} />
        <ActionListNode type={AGGREGATE} setDragEdge={props.setDragEdge} nodeSide={props.nodeSide} gridSide={props.gridSide} />
        <ActionListNode type={JOIN} setDragEdge={props.setDragEdge} nodeSide={props.nodeSide} gridSide={props.gridSide} />
        <ActionListNode type={SPLITDATA} setDragEdge={props.setDragEdge} nodeSide={props.nodeSide} gridSide={props.gridSide} />
        </div>
        </Collapse>

        
        <div className='actionCategoryDiv'> 
          <label 
            className="actionCategoryLabel"
            title='Analysis & Prediction'>
              Analysis & Prediction
          </label>
          <i className="material-icons-outlined collapseIcon" onClick={toggleOpenAnalyze}>
            {openAnalyze ? 'expand_less' : 'expand_more'}
          </i>
        </div>
        <Collapse in={openAnalyze}>
        <div>
        <ActionListNode type={AK_MINE} setDragEdge={props.setDragEdge} nodeSide={props.nodeSide} gridSide={props.gridSide} />
        <ActionListNode type={AK_CAUSAL} setDragEdge={props.setDragEdge} nodeSide={props.nodeSide} gridSide={props.gridSide} />
        <ActionListNode type={SKLEARN} setDragEdge={props.setDragEdge} nodeSide={props.nodeSide} gridSide={props.gridSide} />
        <ActionListNode type={REGRESSION} setDragEdge={props.setDragEdge} nodeSide={props.nodeSide} gridSide={props.gridSide} />
        <ActionListNode type={PREDICT} setDragEdge={props.setDragEdge} nodeSide={props.nodeSide} gridSide={props.gridSide} />
        </div>
        </Collapse>
        
        <div className='actionCategoryDiv'> 
          <label 
            className="actionCategoryLabel"
            title='Visual Exploration'>
              Visual Exploration
          </label>
          <i className="material-icons-outlined collapseIcon" onClick={toggleOpenExplore}>
           {openExplore ? 'expand_less' : 'expand_more'}
          </i>
        </div>
        <Collapse in={openExplore}>
        <div>
        <ActionListNode type={AK_BROWSE} setDragEdge={props.setDragEdge} nodeSide={props.nodeSide} gridSide={props.gridSide} />
        <ActionListNode type={VISUALIZER} setDragEdge={props.setDragEdge} nodeSide={props.nodeSide} gridSide={props.gridSide} />
        </div>
        </Collapse>

      </div>
    </div>
  );
}
