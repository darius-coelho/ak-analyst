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
function HistogramConfig(props) {
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
  const onBucketChange = (evt) => {
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
      barColor: color
    })
  }

  const numCols = columns.filter( d => types[d] == 'Numerical')

  return (
    <div>
      <Row><Col lg='12' style={{fontSize: "15px"}}>Bar Chart Options</Col></Row>
      <hr className="lineDivide"/>
      <Row data-testid="scatterOptions">
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: labelWidth, height: 32}}>
            X Attribute
          </InputGroup.Text>
          <Form.Select
            aria-label="xAttr"
            name="X"
            value={config.X}
            onChange={onChangeProp} >
              {numCols.map( (d, i) => {
                return <option key={'y'+i} value={d}>{d}</option>
              })}
          </Form.Select>
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: labelWidth, height: 32}}>
            Aggregation Function
          </InputGroup.Text>
          <Form.Select
            aria-label="yFunc"
            name="yFunc"
            value={config.yFunc}
            onChange={onChangeProp} >
              <option value={'Count'}>Count</option>
              <option value={'Prob.'}>Prob.</option>
          </Form.Select>
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            style={{width: labelWidth, height: 32, background: config.N < 2 ? "#ffb9b9" : "#e9ecef"}}>
              # Buckets (Approx.)
          </InputGroup.Text>
          <input
            type="NUMBER"
            name={"N"}
            min={2}
            max={100}
            step={1}
            value={config.N}
            size={8}
            style={{
              width: `calc(100% - ${labelWidth}px)`,
              border: "1px solid #ccc",
              borderRadius: "0px 3px 3px 0px",
              padding: "3px 7px",
              fontSize: ".875rem"
            }}
            onChange={onBucketChange}
          />
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
      </Row>
    </div>
  );
}

export default HistogramConfig;