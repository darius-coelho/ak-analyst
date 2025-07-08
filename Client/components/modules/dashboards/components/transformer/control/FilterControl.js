import React from 'react';
import FilterHistogram from '../FilterHistogram'

/** Renders the control panel for filtering Numerical attributes. */
export function FilterControl(props) {
  const { width, description, onPreviewFilter, onTransform} = props;
  
  return (
      <div style={{display: "block"}} >
        <FilterHistogram          
          description={description}   
          onPreviewFilter={onPreviewFilter}     
          onTransform={onTransform}  
          width={width} 
          height={110} 
          padding={50} 
        />
      </div>
  );
}

export default FilterControl;
