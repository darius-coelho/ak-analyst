import React, { useState } from 'react';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'

import "../../../../../css/Core.css"
import  "../css/VizConfig.css"

/**
 * Renders a configuration panel for the pie chart.
 * @param {array} columns - list of input attributes.
 * @param {Object} types - mapping of attributes names to their types.
 * @param {Object} config - Configuration for the bar chart
 * @param {function} setChartConfig - Function to set the bar chart config.
 */
function PieConfig(props) {
  const { columns, types, config, setChartConfig } = props

  const labelWidth = 150
  
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
      [field]: +evt.target.value
    })
  }
  
  /**
   * Handles changing the Y configuration parameter.   
   */
  const onChangePropY = (evt) => {
    if(evt.target.value != 'ak_none' && config.y == 'ak_none'){
      setChartConfig({
        ...config,
        [evt.target.name]: evt.target.value,
        func: 'Mean'
      })
    }
    else if(evt.target.value == 'ak_none' && config.y != 'ak_none'){
      setChartConfig({
        ...config,
        [evt.target.name]: evt.target.value,
        func: 'None'
      })
    }
    else {
      setChartConfig({
        ...config,
        [evt.target.name]: evt.target.value
      })
    }
  }  

  const isYNum = config.R != 'ak_none' && types[config.R] == 'Numerical'
  const catCols = columns.filter( d => types[d] == 'Ordinal' || types[d] == 'Nominal')
  const numCols = columns.filter( d => types[d] == 'Numerical')

  return (
    <div>
      <Row><Col lg='12' style={{fontSize: "15px"}}>Pie Chart Options</Col></Row>
      <hr  className="lineDivide"/>
      <Row data-testid="scatterOptions">
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: labelWidth, height: 32}}>
            Slice Attribute
          </InputGroup.Text>
          <Form.Select 
            aria-label="sliceAttr"
            name="sAttr"
            value={config.sAttr}
            onChange={onChangeProp} >
              {catCols.map( (d, i) => {
                return <option key={'x'+i} value={d}>{d}</option>
              })}
          </Form.Select>
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: labelWidth, height: 32}}>
            Angle Mapping
          </InputGroup.Text>
          <Form.Select 
            aria-label="sliceMap"
            name="sMap"
            value={config.sMap}
            onChange={onChangeProp} >
              <option value={'Count'}>Count</option>
              <option value={'Equal'}>Equal Size</option>
          </Form.Select>
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: labelWidth, height: 32}}>
            Radius Attribute
          </InputGroup.Text>
          <Form.Select 
            aria-label="rAttr"
            name="R"
            value={config.R}
            onChange={onChangePropY} >
              <option key={'y-none'} value={'ak_none'}>{`None`}</option>
              {numCols.map( (d, i) => {
                return <option key={'y'+i} value={d}>{d}</option>
              })}
          </Form.Select>
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: labelWidth, height: 32}}>
            Radius Agg. Function
          </InputGroup.Text>
          <Form.Select
            aria-label="aggFunc"
            name="aggFunc"
            value={config.aggFunc}
            onChange={onChangeProp} >
              <option value={"Mean"} disabled={!isYNum} style={{color: isYNum ? "inherit" : "#cacaca"}}>Mean</option>
              <option value={"Median"} disabled={!isYNum} style={{color: isYNum ? "inherit" : "#cacaca"}}>Median</option> 
              <option value={"Min"} disabled={!isYNum} style={{color: isYNum ? "inherit" : "#cacaca"}}>Min</option>
              <option value={"Max"} disabled={!isYNum} style={{color: isYNum ? "inherit" : "#cacaca"}}>Max</option>             
          </Form.Select>
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            style={{
              width: labelWidth,
              height: 32,
              background: config.rSizeMin < 0 ? "#ffb9b9" : "#e9ecef"
            }}>
              Inner Radius 
          </InputGroup.Text>
          <input
            type="NUMBER"
            name={"rSizeMin"}
            min={0}
            max={1000}
            step={1}
            value={config.rSizeMin} 
            size={8}
            style={{
              width: `calc(100% - ${labelWidth}px)`,
              border: "1px solid #ccc",
              borderRadius: "0px 3px 3px 0px",
              padding: "3px 7px",
              fontSize: ".875rem"
            }}
            onChange={onPointSizeChange}
          />
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            style={{
              width: labelWidth,
              height: 32,
              background: +config.rSizeMax <= 0 || +config.rSizeMax < +config.rSizeMin ? "#ffb9b9" : "#e9ecef"
            }}>
              Outer Radius
          </InputGroup.Text>
          <input
            type="NUMBER"
            name={"rSizeMax"}
            min={2}
            max={1500}
            step={1}
            value={config.rSizeMax}
            size={8}
            style={{
              width: `calc(100% - ${labelWidth}px)`,
              border: "1px solid #ccc",
              borderRadius: "0px 3px 3px 0px",
              padding: "3px 7px",
              fontSize: ".875rem"
            }}
            onChange={onPointSizeChange}
          />
        </InputGroup>
      </Row>
    </div>
  );
}

export default PieConfig;