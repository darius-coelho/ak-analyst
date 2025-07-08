import React, { useState } from 'react';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'

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
function BalloonConfig(props) {
  const { columns, types, config, setChartConfig } = props

  const labelWidth = 140
  
  const [showColPick, setShowColPick] = useState(false)
  const toggleColorPicker = () => setShowColPick(!showColPick)

  /**
   * Changes a configuration parameter.   
   */
  const onChangeProp = (evt) => {
    setChartConfig({
      ...config,
      [evt.target.name]: evt.target.value
    })
  }  

  /**
   * Changes a configuration radius parameter.   
   */
  const onPointSizeChange = (evt) => {
    const field = evt.target.getAttribute("name")
    setChartConfig({
      ...config,
      [field]: evt.target.value
    })
  }

  const colorDiv = {
    width: `calc(100% - ${labelWidth+4}px)`,
    height: 28,
    margin: 2
  }

  /**
   * Changes the point color in te configuration.
   * @param {string} color - the new color
   */
  const setColor = (color) => {
    setChartConfig({
      ...config,
      pointColor: color
    })
  }

   return (
    <div>
      <Row><Col lg='12' style={{fontSize: "15px"}}>Balloon Chart Options</Col></Row>
      <hr  className="lineDivide"/>
      <Row data-testid="scatterOptions">
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text style={{width: labelWidth, background: config.x == 'None' ? "#ffb9b9" : "#e9ecef"}}>
            X Attribute
          </InputGroup.Text>
          <Form.Select 
            aria-label="xAttr"
            name="x"
            value={config.x}
            onChange={onChangeProp} >
              {columns.map( (d, i) => <option key={'x'+i} value={d}>{d}</option>)}
          </Form.Select>
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text style={{width: labelWidth, background: config.y == 'None' ? "#ffb9b9" : "#e9ecef"}}>
            Y Attribute
          </InputGroup.Text>
          <Form.Select 
            aria-label="yAttr"
            name="y"
            value={config.y}
            onChange={onChangeProp} >              
              {columns.map((d, i) => <option key={'y'+i} value={d}>{d}</option>)}
          </Form.Select>
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: labelWidth, height: 32}}>
            Color
          </InputGroup.Text>
          <div style={{...colorDiv, background: config.pointColor}} name="showLineColor" onClick={toggleColorPicker}></div>
          {
            showColPick
            ? <section className="colorPicker colorContainer">
                <HexColorPicker color={config.pointColor} onChange={setColor} />
              </section>
            : null
          }
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: labelWidth, height: 32}}>
            Max Radius
          </InputGroup.Text>
          <input
            type="NUMBER"
            name={"rSizeMax"}
            min={2}
            max={50}
            step={1}
            value={config.rSizeMax}
            size={8}
            style={{width: `calc(100% - ${labelWidth}px)`, border: "1px solid #ccc", borderRadius: 3,  padding: 3}}
            onChange={onPointSizeChange}
          />
        </InputGroup>
        
      </Row>
    </div>
  );
}

export default BalloonConfig;