import React from 'react';
import GroupDetailDescription from './GroupDetailDescription';
import GroupDetailViz from './GroupDetailViz';
import GroupDetailFeatures from './GroupDetailFeatures';

import "../../../../css/Core.css"

export default function GroupDetail(props) {
  const { data, root, description, selectedFeature, selectedPatternIdx, 
    rawData, catLabels, dataWait, selectedIdx, target, targetType, width, height, 
    onSelect, onDownload, onViewTable, outputPatterns, onAddOutputPattern, onRemoveOutputPattern } = props
  
  if(data == null) {
    return null
  }
  
  const buttonStyle = {position: "absolute", top: 5};

  /* Adds the current pattern to the list of output patterns */
  const addPattern = () => {
    const pattern = {
      ID: data.ID,
      selectedFeature: selectedFeature,
      attributes: data.shap
    }
    onAddOutputPattern(pattern)
  }

  /* Removes the current pattern from the list of output patterns */
  const removePattern = () => {
    onRemoveOutputPattern(data.ID, selectedFeature)
  }

  const allowRemove = outputPatterns.filter(d => d.ID == data.ID && d.selectedFeature == selectedFeature).length > 0
  
  return (
    <div style={{width: width, height: height, marginTop: 15}}>
      <GroupDetailDescription 
        width={480}
        height={150}
        target={target}
        description={description}
        prob={+data.es}
        pval={+data.pval}
        rootAttr={root.map(d=>d.attribute)}
        selectedFeature={selectedFeature}
      />
      
      <GroupDetailFeatures
        width={480}
        data={data.shap}
        catLabels={catLabels}
        selectedIdx={selectedIdx}
        onSelect={onSelect}
      /> 
      
      <GroupDetailViz
        width={width}
        height={height}
        selectedIdx={selectedIdx}
        dataWait={dataWait}
        data={data}
        rawData={rawData}
        target={target}
        catLabels={catLabels}
        targetType={targetType}
      />
      
      <button
        className="coreButton"
        onClick={() => onViewTable(selectedPatternIdx)}
        style={{...buttonStyle, right: (width - 480) / 2 + 60}}>
          {"View Table"}
      </button>
          
      <button
        className="coreButton"
        onClick={() => onDownload(selectedPatternIdx)}
        style={{...buttonStyle, right: (width - 480) / 2 - 60}}>
          {"Download"}
      </button>

      <button
        className="coreButton"
        onClick={allowRemove ? removePattern : addPattern}
        style={{
          ...buttonStyle, 
          right: (width - 480) / 2 - (allowRemove ? 260 : 210),
          background: allowRemove ? "#af4c4c" : "#4c7faf"
          }}
        >
          {allowRemove ? "Remove from Output" : "Add to Output"}
      </button>
    </div>
  );
  
}
