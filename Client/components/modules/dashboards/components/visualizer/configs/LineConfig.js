import React, { useState } from 'react';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'

import { HexColorPicker } from "react-colorful";

import "../../../../../css/Core.css"
import  "../css/VizConfig.css"

const ColorPicker = ({color, idx, field, onChange}) => {

  const setColor = (newColor) => {
    onChange(idx, field, newColor)
  }

  return <section className="colorPicker colorContainer">
            <HexColorPicker color={color} onChange={setColor} />
          </section>
}

const MarkerConfig = (columns, onChange, removeCond) => {
  return (d, index) => {

    return <InputGroup size='sm' className="mb-3" key={"mkcond"+index}>
            <InputGroup.Text id="basic-addon2" style={{width: 120, height: 32}}>
              Condition
            </InputGroup.Text>
            <Form.Select 
              aria-label="mkCond"
              name="mkCond"              
              value={d.cond}
              onChange={(evt) => onChange(index, "cond", evt.target.value)} > 
                <option value={"EQ"}>{"="}</option>    
                <option value={"NE"}>{"!="}</option>    
                <option value={"LT"}>{"<"}</option>                
                <option value={"LTE"}>{"<="}</option>                
                <option value={"GT"}>{">"}</option>                
                <option value={"GTE"}>{">="}</option>                                               
            </Form.Select>      
            <Form.Select 
              aria-label="mkCondVar"
              name="mkCondVar"              
              value={d.attr}
              onChange={(evt) => onChange(index, "attr", evt.target.value)} > 
                {columns.map( (v, i) => {
                  return <option key={'mkCondVar'+i} value={v}>{v}</option>
                })}               
            </Form.Select>
            <i 
              className="material-icons-outlined" 
              style={{
                color: "#939393",
                cursor: "pointer", 
                verticalAlign: "middle", 
                float: "right",        
              }}
              onClick={() => removeCond(index)}>
                {"clear"}
            </i>
          </InputGroup>
  }
}

const LineYConfig = (columns, onChangeYProp, removeY) => {
  return (d, index) => {    

    const onChange = (evt) => {
      onChangeYProp(index, evt.target.name, evt.target.value)
    }

    const toggleColorPicker = (evt) => {
      const field = evt.target.getAttribute("name")
      onChangeYProp(index, field, !d[field])
    }

    const onChangeMarker = (idx, field, value) => {
      let tmp = d.mkCond
      tmp[idx][field] = value
      onChangeYProp(index, "mkCond", tmp)
    }

    const addCond = () => {  
      onChangeYProp(index, "mkCond", [
        ...d.mkCond,
        {
          cond: "EQ",
          attr: columns[0],
        }
      ])
    }

    const removeMkCond = (idx) => {    
      if(idx > -1 && d.mkCond.length > 1) {
        const newConds =  [...d.mkCond].filter((v, index) => { return index !== idx })
        onChangeYProp(index, "mkCond", newConds)
      } 
    }  

    const colorDiv = {
      width: 20,
      height: 20,
      margin: 5
    }

    return (
      <div key={'lineY-'+index} style={{marginTop: 20}}>
      <Row>
        <Col lg='12' style={{fontSize: "15px"}}>
          {`Line ${index+1}`}
          <i 
              className="material-icons-outlined" 
              style={{
                color: "#939393",
                cursor: "pointer", 
                verticalAlign: "middle", 
                float: "right",
                visibility: index == 0 ? "hidden" : "visible"                
              }}
              onClick={() => removeY(index)}>
                {"clear"}
            </i>
        </Col>        
      </Row>
      <hr  className="lineDivide"/>
      <Row data-testid="scatterOptions" style={{marginBottom: 15}}>
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: 160, height: 32}}>
            Y Attribute
          </InputGroup.Text>
          <Form.Select 
            aria-label="yAttr"
            name="y"              
            value={d.y}
            onChange={onChange} >   
              {columns.map((d, i) => {
                return <option key={'y'+i} value={d}>{d}</option>
              })}             
          </Form.Select>
          <div style={{...colorDiv, background: d.lineColor}} name="showLineColor" onClick={toggleColorPicker}></div>
          {
            d.showLineColor
            ? <ColorPicker color={d.lineColor} idx={index} field={"lineColor"} onChange={onChangeYProp}/>           
            : null
          }
          
        </InputGroup>
        
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: 160, height: 32}}>
            Lower Bound Attribute
          </InputGroup.Text>
          <Form.Select 
            aria-label="lbAttr"
            name="lb"              
            value={d.lb}
            onChange={onChange} >   
              <option value={"None"}>None</option>      
              {columns.map( (v, i) => {
                return <option key={'lb'+i} value={v}>{v}</option>
              })}             
          </Form.Select>
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: 160, height: 32}}>
            Upper Bound Attribute
          </InputGroup.Text>
          <Form.Select 
            aria-label="ubAttr"
            name="ub"              
            value={d.ub}
            onChange={onChange} > 
              <option value={"None"}>None</option>    
              {columns.map( (v, i) => {
                return <option key={'ub'+i} value={v}>{v}</option>
              })}             
          </Form.Select>          
        </InputGroup>
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: 120, height: 32}}>
            Marker Type
          </InputGroup.Text>
          <Form.Select 
            aria-label="marker"
            name="marker"              
            value={d.marker}
            onChange={onChange} > 
              <option value={"None"}>None</option>    
              <option value={"Circle"}>Circle</option>    
              <option value={"Line"}>Line</option>    
              <option value={"Square"}>Square</option>    
              <option value={"Diamond"}>Diamond</option>    
          </Form.Select>
          <div style={{...colorDiv, background: d.markerColor}} name="showMarkerColor" onClick={toggleColorPicker}></div>
          {
            d.showMarkerColor
            ? <ColorPicker color={d.markerColor} idx={index} field={"markerColor"} onChange={onChangeYProp}/>
            : null
          }
        </InputGroup>

        {
          d.marker != "None"
          ? <InputGroup size='sm' className="mb-3">
              <InputGroup.Text id="basic-addon2" style={{width: 120, height: 32}}>
                Condition Join
              </InputGroup.Text>
              <Form.Select 
                aria-label="mkCondJoin"
                name="mkCondJoin"              
                value={d.mkCondJoin}
                onChange={onChange} > 
                  <option value={"AND"}>AND</option>    
                  <option value={"OR"}>OR</option>    
              </Form.Select>          
            </InputGroup>
          : null
        }
        

        {
          d.marker != "None"
          ? d.mkCond.map(MarkerConfig(columns, onChangeMarker, removeMkCond))
          : null
        }

        {
          d.marker != "None"
          ? <input
              type="button"
              className="coreButton"
              style={{display:"block", margin:"0px auto", width: 120, fontSize: 12}}
              onClick={addCond}
              value={"Add Condition"}
            />   
          : null
        }
      </Row>
    </div>
    );
  }
}

function LineConfig(props) {
  const { columns, types, config, setChartConfig } = props
  

  const onChangeProp = (evt) => {    
    setChartConfig({
      ...config,
      [evt.target.name]: evt.target.value
    })
  }

  const onChangeYProp = (index, name, value) => {
    let tmp = [...config.y]
    tmp[index][name] = value
    setChartConfig({
      ...config,
      y: tmp
    })
  }

  const addYAttr = () => {    
    setChartConfig({
      ...config,
      y: [
        ...config.y,
        {
          y: columns.find(c => types[c] === "Numerical"),
          lineColor: "#08519c",
          showLineColor: false,
          lb: "None",
          ub: "None",                    
          marker: "None",
          markerColor: "#b92e2e",
          showMarkerColor: false,
          mkCond: [{
            cond: "EQ",
            attr: columns[0],
          }],          
          mkCondJoin: "AND"  
        }   
      ]
    })
  }

  const removeYAttr = (idx) => {    
    if(idx > -1) {
      setChartConfig({
        ...config,
        y: [...config.y].filter((v, index) => { return index !== idx })
      })
    } 
  }  

  const dateCols = columns.filter(d => types[d] == 'DateTime')
  const numCols = columns.filter(d => types[d] == 'Numerical')
  
  return (  
    <div>
      <Row><Col lg='12' style={{fontSize: "15px"}}>Line Chart Options</Col></Row>
      <hr  className="lineDivide"/>
      <Row data-testid="lineOptions">
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: 160, height: 32}}>
            X Attribute
          </InputGroup.Text>
          <Form.Select 
            aria-label="xAttr"
            name="x"              
            value={config.x}
            onChange={onChangeProp} >   
              {dateCols.map( (d, i) => {
                return <option key={'x'+i} value={d}>{d}</option>
              })}             
          </Form.Select>
        </InputGroup>        
      </Row>

      {config.y.map(LineYConfig(numCols, onChangeYProp, removeYAttr))}
      
      <input
        type="button"
        className="coreButton"
        style={{display:"block", margin:"25px auto"}}
        onClick={() => addYAttr()}
        value={"Add Y Attribute"}
      />     
    </div>    
  );
}

    
export default LineConfig;
