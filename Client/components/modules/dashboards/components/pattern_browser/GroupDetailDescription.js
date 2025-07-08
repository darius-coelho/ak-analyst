import React, { useState } from 'react';
import "./css/GroupDetail.css"


export default function GroupDetailDescription(props) {  
  
  const { width, height, target, description, prob, pval, rootAttr, selectedFeature} = props;
  
  // Construct pattern description text
  let descTxt = [<span key={"desc0"} style={{fontWeight:"bold"}}>{"Description: "}</span>]
  for(let i=0; i<description.length; i++){
    let txtCol = description[i].text == "low" ? "#ff0000" : "#007b4b"
    descTxt.push(<span key={"desc" + (i+1)} style={{color:txtCol}}>{description[i].text}</span>)
    descTxt.push(" " + description[i].attribute)
    if(i != description.length-1){      
      descTxt.push(" + ")
    }
  }
  
  // Construct probability explanation text
  let expl = ["The probability that a randomly selected point within this group has a "]
  if(prob < 0){
   expl.push(<span key={"exp1"} style={{color:"#ff0000"}}>lower</span>)
  }
  else{
    expl.push(<span key={"exp1"} style={{color:"#007b4b"}}>higher</span>)
  }
    
  expl.push(" ")
  expl.push(<span  key={"exp2"} style={{fontWeight:"bold"}}>{target}</span>)
  expl.push(" than any point outside this group is ")
  expl.push(<span  key={"exp3"} style={{fontWeight:"bold"}}>{Math.abs(prob)}</span>)
  
  // Construct statistical significance explanation text
  let sigTxt = "This finding is statistically highly significant.";
  if(pval >= 0.05){
    sigTxt = '<p>This finding is <strong>not</strong>  statistically highly significant.</p>';
  } 

  const sigLevel = (pval) => {
    if(pval < 0.001) {
      return "p = " + pval + "***"
    }
    else if(pval < 0.01) {
      return "p = " + pval + "**"
    } 
    else if(pval < 0.05) {
      return "p = " + pval + "*"
    } 
    else{
      return "p = " + pval
    }     
  }  
  
  return (
    <div className='detDescBox'>            
      <p className='detLineStyle'>{descTxt}</p>
      <p className='detLineStyle'>{expl}</p>
      <p className='detLineStyle' title={sigLevel(pval)} dangerouslySetInnerHTML={{__html: sigTxt}}></p>
      { // Report if the selected feature is added to the root attributes of the group
        rootAttr.includes(selectedFeature)
        ? null
			  : <p className='addedFeature'>
            {`Adding ${selectedFeature} to the group.`}
          </p>
      }     
    </div>
  );
}
