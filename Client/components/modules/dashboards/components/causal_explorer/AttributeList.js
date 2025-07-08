import React from 'react';

import { CustomDragDropContainer } from '../../../graph/components/ActionListNode'


/**
* Renders the attributes
* @param {array} attributes - Array containing the list of all attributes
* @param {object} nodes - Object containing the list of nodes in the causal graph
*/
const Attributes = (props) =>{
  const { attributes, nodes } = props

  if(attributes == null) return null

  return attributes.map((d, i) => {
    if(d in nodes){
      return(
        <div className='causalAttributeOuter' key={`causal-attr-${i}`}>
          <div className='causalAttributeInner deactivated'>{d}</div>        
        </div>
      );
    }

    return (
      <div className='causalAttributeOuter' key={`causal-attr-${i}`}>
        <CustomDragDropContainer
          targetKey="causalNodeDrop"
          dragData={{attr: d}}
          dragClone={true} >
            <div className='causalAttributeInner'>{d}</div>
        </CustomDragDropContainer>
      </div>
    );
  })
}

const divStyle = {
  //position: "absolute",
  //width: "calc(100% - 10px)",
  width: "200px",
  height: "calc(100% - 75px)",
  overflowX: 'hidden',
  overflowY: "auto",
  margin: 3,
}

/**
* Renders the lsit of attributes
* @param {object} style - css style for the box holding the attribute list
* @param {array} attributes - list of attributes
* @param {object} nodes - Object containing the list of nodes in the causal graph
*/
export function AttributeList(props) {
  const { style, attributes, nodes } = props

  const containerStyle = {
    ...style,
    margin: 0,
    background: "white",
    position: "absolute"
  };
  return (
      <div className="outerActionBox" style={containerStyle}>
      <label className="contentDivHead" title={"Attributes"}>Attributes</label>
      <br/>
      <div className="innerActionBox" style={divStyle}>
      <Attributes attributes={attributes} nodes={nodes}/>      
      </div>
    </div>
  )
}

export default AttributeList;
