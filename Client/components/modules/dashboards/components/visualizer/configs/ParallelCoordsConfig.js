import React, { useState } from 'react';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import Select from 'react-select';

import { HexColorPicker } from "react-colorful";

import "../../../../../css/Core.css"
import  "../css/VizConfig.css"

/**
 * Renders a configuration panel for the balloon plot.
 * @param {array} columns - list of input attributes.
 * @param {Object} types - mapping of attributes names to their types.
 * @param {Object} config - Configuration for the balloon plot
 * @param {function} setChartConfig - Function to set the balloon plot config.
 */
function ParallelCoordsConfig(props) {
  const { columns, types, config, setChartConfig } = props

  const labelWidth = 140
  
  const [showColPick, setShowColPick] = useState(false)
  const toggleColorPicker = () => setShowColPick(!showColPick)
  
  const colorDiv = {
    width: `calc(100% - ${labelWidth+4}px)`,
    height: 34,
    margin: 2
  }

  /** Handles changing the target variable. */
  const onAttrsChange = (selected) => {    
    setChartConfig({
      ...config,
      attrs: selected.map(d => d.value)
    });    
  };

  /**
   * Changes the point color in te configuration.
   * @param {string} color - the new color
   */
  const setColor = (color) => {
    setChartConfig({
      ...config,
      lineColor: color
    })
  }
  
  /**
   * Changes a configuration line thickness parameter.   
   */
   const onLineThicknessChange = (evt) => {
    const field = evt.target.getAttribute("name")
    setChartConfig({
      ...config,
      lineThickness: evt.target.value
    })
  }

  const customStyles = {
    control: styles => ({ 
      ...styles,
     backgroundColor: 'white',       
     borderTopLeftRadius: 0,
     borderBottomLeftRadius: 0,
     padding: 0,           
     minHeight: '32px',             
     fontSize: 13,
     overflow: "hidden"
    }),
    
    multiValueLabel: (styles) => ({
      ...styles,
      padding: 2,
    }),
  };

  return (
    <div>
      <Row><Col lg='12' style={{fontSize: "15px"}}>Parallel Coordinates Options</Col></Row>
      <hr  className="lineDivide"/>
      <Row data-testid="scatterOptions">
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            style={{width: labelWidth, background: config.attrs.length < 2 ? "#ffb9b9" : "#e9ecef"}}>
              Attributes
          </InputGroup.Text>          
          <div style={{width: `calc(100% - ${labelWidth}px)`}}>
            <Select
              arial-label="attributes"
              name="attributes"
              height="32px"
              isMulti
              value={config.attrs.map(d => ({value: d, label: d}))}
              onChange={onAttrsChange}
              styles={customStyles}
              options={columns.map(d=>({ value: d, label: d } ))}
            />
          </div>
        </InputGroup>


        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text style={{width: labelWidth, height: 38}}>
            Line Color
          </InputGroup.Text>
          <div style={{...colorDiv, background: config.lineColor}} name="showLineColor" onClick={toggleColorPicker} />
          {
            showColPick
            ? <section className="colorPicker colorContainer">
                <HexColorPicker color={config.lineColor} onChange={setColor} />
              </section>
            : null
          }
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            style={{width: labelWidth, height: 38, background: config.lineThickness <= 0 ? "#ffb9b9" : "#e9ecef"}}>
              Line Thickness 
          </InputGroup.Text>
          <input
            type="NUMBER"
            name={"lineThickness"}
            min={1}
            max={25}
            step={1}
            value={config.lineThickness} 
            size={8}
            style={{width: `calc(100% - ${labelWidth}px)`, border: "1px solid #ccc", borderRadius: 3,  padding: 3}}
            onChange={onLineThicknessChange}
          />
        </InputGroup>
        
      </Row>
    </div>
  );
}

export default ParallelCoordsConfig;