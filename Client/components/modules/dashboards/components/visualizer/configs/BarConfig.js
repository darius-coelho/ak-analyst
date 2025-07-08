import React, { useState } from 'react';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'

import { HexColorPicker } from "react-colorful";

import "../../../../../css/Core.css"
import  "../css/VizConfig.css"

/**
 * Renders a configuration panel for the bar chart.
 * @param {array} columns - list of input attributes.
 * @param {Object} types - mapping of attributes names to their types.
 * @param {Object} config - Configuration for the bar chart
 * @param {function} setChartConfig - Function to set the bar chart config.
 */
function BarConfig(props) {
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
        func: 'Count'
      })
    }
    else {
      setChartConfig({
        ...config,
        [evt.target.name]: evt.target.value
      })
    }
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
      barColor: color
    })
  }

  const isYNum = config.y != 'xcount' && types[config.y] == 'Numerical'
  const catCols = columns.filter( d => types[d] == 'Ordinal' || types[d] == 'Nominal')
  const numCols = columns.filter( d => types[d] == 'Numerical')

  return (
    <div>
      <Row><Col lg='12' style={{fontSize: "15px"}}>Bar Chart Options</Col></Row>
      <hr  className="lineDivide"/>
      <Row data-testid="scatterOptions">
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: labelWidth, height: 32}}>
            X Attribute
          </InputGroup.Text>
          <Form.Select
            aria-label="xAttr"
            name="x"
            value={config.x}
            onChange={onChangeProp} >
              {catCols.map( (d, i) => {
                return <option key={'x'+i} value={d}>{d}</option>
              })}
          </Form.Select>
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: labelWidth, height: 32}}>
            Y Attribute
          </InputGroup.Text>
          <Form.Select
            aria-label="yAttr"
            name="y"
            value={config.y}
            onChange={onChangePropY} >
              <option key={'y-none'} value={'ak_none'}>{`None`}</option>
              {numCols.map( (d, i) => {
                return <option key={'y'+i} value={d}>{d}</option>
              })}
          </Form.Select>
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: labelWidth, height: 32}}>
            Y Agg. Function
          </InputGroup.Text>
          <Form.Select
            aria-label="colAttr"
            name="func"
            value={config.func}
            onChange={onChangeProp} >
              <option value={'Count'} disabled={isYNum} style={{color: !isYNum ? "inherit" : "#cacaca"}}>Count</option>
              <option value={'Prob'} disabled={isYNum} style={{color: !isYNum ? "inherit" : "#cacaca"}}>Prob</option>
              <option value={"Mean"} disabled={!isYNum} style={{color: isYNum ? "inherit" : "#cacaca"}}>Mean</option>
              <option value={"Median"} disabled={!isYNum} style={{color: isYNum ? "inherit" : "#cacaca"}}>Median</option>
              <option value={"Min"} disabled={!isYNum} style={{color: isYNum ? "inherit" : "#cacaca"}}>Min</option>
              <option value={"Max"} disabled={!isYNum} style={{color: isYNum ? "inherit" : "#cacaca"}}>Max</option>
          </Form.Select>
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: labelWidth, height: 32}}>
            Color
          </InputGroup.Text>
          <div style={{...colorDiv, background: config.barColor}} name="showLineColor" onClick={toggleColorPicker}></div>
          {
            showColPick
            ? <section className="colorPicker colorContainer">
                <HexColorPicker color={config.barColor} onChange={setColor} />
              </section>
            : null
          }
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: labelWidth, height: 32}}>
            Color Attribute
          </InputGroup.Text>
          <Form.Select
            aria-label="colAttr"
            name="color"
            value={config.color}
            onChange={onChangeProp} >
              <option value={"None"}>None</option>
              {catCols.map( (d, i) => {
                return <option key={'color'+i} value={d}>{d}</option>
              })}
          </Form.Select>
        </InputGroup>
      </Row>
    </div>
  );
}

export default BarConfig;