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
function CorrelationConfig(props) {
  const { columns, types, config, setChartConfig } = props

  const labelWidth = 140
  
  const [showPosColPick, setShowPosColPick] = useState(false)
  const [showNegColPick, setShowNegColPick] = useState(false)
  const togglePosColorPicker = () => setShowPosColPick(!showPosColPick)
  const toggleNegColorPicker = () => setShowNegColPick(!showNegColPick)
  
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
  const setPosColor = (color) => {
    setChartConfig({
      ...config,
      posColor: color
    })
  }
  
  /**
   * Changes the point color in te configuration.
   * @param {string} color - the new color
   */
   const setNegColor = (color) => {
    setChartConfig({
      ...config,
      negColor: color
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
            Positive Corr. Color
          </InputGroup.Text>
          <div style={{...colorDiv, background: config.posColor}} name="showLineColor" onClick={togglePosColorPicker} />
          {
            showPosColPick
            ? <section className="colorPicker colorContainer">
                <HexColorPicker color={config.posColor} onChange={setPosColor} />
              </section>
            : null
          }
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text style={{width: labelWidth, height: 38}}>
            Negative Corr. Color
          </InputGroup.Text>
          <div style={{...colorDiv, background: config.negColor}} name="showLineColor" onClick={toggleNegColorPicker} />
          {
            showNegColPick
            ? <section className="colorPicker colorContainer">
                <HexColorPicker color={config.negColor} onChange={setNegColor} />
              </section>
            : null
          }
        </InputGroup>       
        
      </Row>
    </div>
  );
}

export default CorrelationConfig;