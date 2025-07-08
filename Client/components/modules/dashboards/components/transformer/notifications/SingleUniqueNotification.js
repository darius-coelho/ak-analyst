import React from 'react';

export function SingleUniqueNotification(props) {
  const { description, onDelete } = props;  
  
  if(description.type == "Numerical" && description.min != description.max){
    return null
  }
  if((description.type == "Nominal" || description.type == "Ordinal")&& description.card > 1){
    return null
  }

  return (
    <div className="listInnerItem">
      <div style={{ display: "inline-block", margin: 10, verticalAlign: "middle", cursor:"default"}}>
        <i className="material-icons-round" style={{position: "absolute", color: "#000000"}}>warning_amber</i>
        <i className="material-icons-round" style={{color: "#ebfb00"}}>warning</i>
      </div>
      <label className="listLabel">{"Column has a single unique value."}</label>
      <button
        className="coreButton"
        style={{position: "absolute", right: 5, margin: 10}}
        onClick={() => onDelete([description.name])}
        >
          {"Drop Column"}
      </button>                 
    </div>
  );
}

export default SingleUniqueNotification; 