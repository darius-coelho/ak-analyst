import React, { useState } from 'react';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'

import { HexColorPicker } from "react-colorful";

import "../../../../../css/Core.css"
import  "../css/VizConfig.css"


function ScatterConfig(props) {
  const { columns, types, config, setChartConfig } = props

  const labelWidth = 140
  
  const [showColPick, setShowColPick] = useState(false)
  const toggleColorPicker = () => setShowColPick(!showColPick)

  const onChangeProp = (evt) => {
    setChartConfig({
      ...config,
      [evt.target.name]: evt.target.value
    })
  }  

  const onPointSizeChange = (evt) => {
    const field = evt.target.getAttribute("name")
    setChartConfig({
      ...config,
      [field]: +evt.target.value
    })
  }

  const colorDiv = {
    width: `calc(100% - ${labelWidth+4}px)`,
    height: 28,
    margin: 2
  }

  const setColor = (color) => {
    setChartConfig({
      ...config,
      pointColor: color
    })
  }

  return (
    <div>
      <Row><Col lg='12' style={{fontSize: "15px"}}>Scatterplot Options</Col></Row>
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
              {columns.map( (d, i) => {
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
            onChange={onChangeProp} >
              {columns.map( (d, i) => {
                return <option key={'y'+i} value={d}>{d}</option>
              })}
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
            Radius Attribute
          </InputGroup.Text>
          <Form.Select
            aria-label="rAttr"
            name="r"
            value={config.r}
            onChange={onChangeProp} >
              <option value={"None"}>None</option>
              {columns.map( (d, i) => {
                return <option key={'r'+i} value={d}>{d}</option>
              })}
          </Form.Select>
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            style={{
              width: labelWidth,
              height: 32,
              background: config.rSizeMin <= 0 ? "#ffb9b9" : "#e9ecef"
            }}>
              Radius Size
          </InputGroup.Text>
          <input
            type="NUMBER"
            name={"rSizeMin"}
            min={1}
            max={25}
            step={1}
            value={config.rSizeMin} 
            size={8}
            style={{width: `calc(100% - ${labelWidth}px)`, border: "1px solid #ccc", borderRadius: 3,  padding: 3}}
            onChange={onPointSizeChange}
          />
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            style={{
              width: labelWidth,
              height: 32,
              background: config.rSizeMax <= 0 || config.rSizeMax < config.rSizeMin ? "#ffb9b9" : "#e9ecef"
            }}>
              Radius Size (Max)
          </InputGroup.Text>
          <input
            type="NUMBER"
            name={"rSizeMax"}
            min={1}
            max={50}
            step={1}
            value={config.rSizeMax}
            size={8}
            style={{width: `calc(100% - ${labelWidth}px)`, border: "1px solid #ccc", borderRadius: 3,  padding: 3}}
            onChange={onPointSizeChange}
          />
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
              {columns.map( (d, i) => {
                return <option key={'color'+i} value={d}>{d}</option>
              })}
          </Form.Select>
        </InputGroup>
       
      </Row>
    </div>
  );
}

export default ScatterConfig;