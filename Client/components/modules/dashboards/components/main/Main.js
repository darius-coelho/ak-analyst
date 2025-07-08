import React, { useState, useEffect, useContext } from 'react'
import SplitPane from "react-split-pane";

import FlowGraph from "../../../graph/components/FlowGraph";
import ActionList from "../../../graph/components/ActionList";
import Config from "../../../config/components/Config";
import ActionOutput from "../../../output/components/ActionOutput";

import { setIsLoading, setOutput } from "../../../graph/graph.actions";

import { createFileOutput } from '../../../graph/components/Action.prototype';

import AddressContext from "../../../../AddressContext";

import mixpanel from 'mixpanel-browser';

import { store } from '../../../store'

import "./css/SplitPane.css"
import "../../../../css/Core.css"

export function LayoutETLMain(props) {

  // get react context that stores the web address for the ak engine api
  const context = useContext(AddressContext);      
  
  useEffect(() => {
    mixpanel.track("Page View", {'name': 'main'});
    
    // Websocket listener to listen for server request to set results/output of an action
    context.socket.on('set-action-output', function(data){
      const parseOutputFun = (d) => {
        switch(d['type']) {
          case 'LOAD_FILE':
          case 'CLEANSE':
          case 'AGGREGATE':
          case 'REGRESSION':
          case 'JOIN': return d['result'].outputList.map(x => createFileOutput(x))
          case 'AK_CAUSAL': return [{ errMsg: ""}];
          case 'AK_BROWSE': return [{ errMsg: ""}];
	        case 'AK_FEATURE_EXP': return [{ errMsg: ""}];
        }
        // default to identity function
        return d['result'].outputList
      };
      store.dispatch(setOutput(data['ID'], parseOutputFun(data)))
    });

  }, []);
    
  const pad = 10;
  const navbarH = props.navbarH ? props.navbarH : 0
  const [dims, setDims] = useState({
     // Params for split pane separting config and main view
     vertPane: {
      minSize: 0.1 * window.innerWidth,
      defaultSize: 0.25 * window.innerWidth,
      maxSize: window.innerWidth / 2,
      
      // styles to add a pretty box around it.
      style: {
        top: navbarH + pad,
        marginLeft: pad,  // NOTE: "left" was getting replaced by SplitPane
        height: (window.innerHeight-navbarH-2*pad),
        width: window.innerWidth - 2*pad,
        boxShadow: "0px 0px 1px 1px #9a9a9a"
      }
    },
    
    // Params for split pane separting main view and preview view
    horizPane: {
      minSize: 200,
      defaultSize: 0.65*window.innerHeight - navbarH,
      maxSize:  window.innerHeight - navbarH - 220,
    },
  })

  useEffect(() => {
    function handleResize() {
      setDims({
        // Params for split pane separting config and main view
        vertPane: {
          minSize: 0.1 * window.innerWidth,
          defaultSize: 0.22 * window.innerWidth,
          maxSize: window.innerWidth / 2,
          
          // styles to add a pretty box around it.
          style: {
            top: navbarH + pad,
            marginLeft: pad,  // NOTE: "left" was getting replaced by SplitPane
            height: (window.innerHeight-navbarH-2*pad),
            width: (window.innerWidth - 2*pad),
            boxShadow: "0px 0px 1px 1px #9a9a9a"
          }
        },
        
        // Params for split pane separting main view and preview view
        horizPane: {
          minSize: 200,
          defaultSize: 0.65*window.innerHeight - navbarH,
          maxSize:  window.innerHeight - navbarH - 220,
        },
      })
    }

    window.addEventListener('resize', handleResize)
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [])

  const [size, setSize] = useState(100)
  const [dragEdge, setDragEdge] = useState({ edgeInID: null, edgeInPort: null, edgeInLoc: null, edgeOutID: null, edgeOutPort: null, edgeOutLoc: null })
  
  const osScaler = window.navigator.userAgent.indexOf("Mac")!=-1 ? 0.66 : 1
  const nodeSide = 52 * 1/(window.devicePixelRatio*osScaler)
  const gridSide = 40 * 1/(window.devicePixelRatio*osScaler)
  
  return (

      <div>
        <SplitPane split="vertical" {...dims.vertPane} onChange={setSize}>
          <div id="config-panel" style={{width: "100%", height: "100%", background: "white"}}>
            <Config />
          </div>
          <SplitPane split="horizontal" {...dims.horizPane} onChange={setSize}>

            <div style={{width: "100%", display: "flex", flexDirection: "row", background: "white"}}>
              <ActionList setDragEdge={setDragEdge} nodeSide={nodeSide} gridSide={gridSide} />
              <FlowGraph
                size={size}
                setDragEdge={setDragEdge}
                dragEdge={dragEdge}
                nodeSide={nodeSide}
                gridSide={gridSide}
              />
            </div>	

            <div style={{width: "100%", height: "100%", background: "white"}}>					
              <ActionOutput />
            </div>
          </SplitPane>
        </SplitPane>
      </div>	

  );
}

export default LayoutETLMain;
