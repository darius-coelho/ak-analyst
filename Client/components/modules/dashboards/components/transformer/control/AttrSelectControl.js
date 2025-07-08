import React from 'react';
import Select from 'react-select';

/** Component which renders the multi attribute select. */
export function AttrSelectControl(props) {
  const { width, attributes, selectedAttr, selectedType, toHighlight, highlightColor,
	  onSelectedAttrChange, onSearchChange } = props;

  // Filter attributes to be displayed based on selected data type
  let dispAttr = attributes
  let dispSelectedAttr = selectedAttr
  if( selectedType != 'All'){      
    dispAttr = attributes.filter((d) => (d.type == selectedType || d.type  == "All" ))
    dispSelectedAttr = selectedAttr.filter((d) => (d.type == selectedType || d.type  == "All" ))
  }

  /// Setup styles
  const divStyle2 = {
    display: "inline-block",
    textAlign: 'left',
    verticalAlign: "top",
    width: width,
    marginLeft: 20,
  };

  const divStyle3 = {
    display: "block",
    width: width,
    marginTop: 10,    
    textAlign:"left"
  };

  const customStyles = {
    valueContainer: base => ({
      ...base,    
      overflow: "auto",  
      maxHeight: 150,
      margin: 4
    }),
    multiValue: (styles, { data }) => {
      if(toHighlight && toHighlight.includes(data.value)){
        return {
          ...styles,
          background: highlightColor
        };
      }
      return {
        ...styles,
      };
    },
  };   
  
  return (
      <div style={{display: "block", paddingTop: 30}} >        
        <div style={divStyle2}>
          <label style={{display: "block"}}>{"Select Attributes to be transformed:"}</label>
          <div style={divStyle3}>
            <Select
              defaultValue={[]}
              isMulti
              name="attributes"
              options={dispAttr}
              onChange={onSelectedAttrChange}
              onInputChange={onSearchChange}
              value={dispSelectedAttr}
              className="selectAttr"
              classNamePrefix="selectAttr"
              styles={customStyles}
            />
          </div>       
        </div>      
      </div>
  );
}

export default AttrSelectControl;
