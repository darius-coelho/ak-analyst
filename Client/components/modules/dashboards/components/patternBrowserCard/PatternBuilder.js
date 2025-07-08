import React, { useState, useEffect, useRef } from 'react';
import * as d3 from "d3";
import SVGBrush from 'react-svg-brush';
import Select from 'react-select';
import FormControl from 'react-bootstrap/FormControl'
import Stack from 'react-bootstrap/Stack';

import Chart from './charts/Chart';
import { abbreviateNumber } from '../../../utilities/utilities';

import "../../../../css/Modal.css"


const xScale = (width, padding, min, max) => {
  return d3.scaleLinear()
    .domain([min, max])
    .range([padding, width-padding]);
};

const customStyles = {
  container: styles => ({
    ...styles,
    width: 180,
    display: "inline-block"
  }),
  control: styles => ({
    ...styles,
   backgroundColor: 'white',
   padding: 0,
   minHeight: '32px',
   fontSize: 13,
   overflow: "hidden"
  }),
  multiValueLabel: (styles) => ({
    ...styles,
    padding: 2,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999
  })
};

/**
  * Renders a categorical feature range for the pattern
  * @param {json} patternAttribute - The attribute properties
  * @param {number} width - The width of the visual for the core features
  * @param {number} barheight - the bars height/thickness
  * @param {number} paddingH - horizontal padding for the component
  * @param {number} paddingV - vertical padding for the component
  * @param {function} onClickCategory - handles selecting/deselcting category 
  */
const NominalFeatureBar = (props) => {
  const { patternAttribute, width, barheight, paddingH, paddingV, onClickCategory } = props

  // Determine number of segements and number of categories per segement
  const wd = (width - (2*paddingH)) / patternAttribute.globalRange.length
  const patternCats = patternAttribute.range.map( d => ({cat: d, idx: patternAttribute.globalRange.indexOf(d)}))

  const globalRect = {
    x: paddingH,
    y: paddingV,
    width: width-2*paddingH,
    height: barheight,
    fill: "#dadada"
  }

  const patternCatRect = {
    y: paddingV,
    width: Math.max(2.5, wd) - 2,
    height: barheight,
    fill: "#91a3d3",
    cursor: "pointer"
  }

  const catRect = {
    ...patternCatRect,
    fill: "#dadada",
    cursor: "pointer"
  }

  return(
    <svg width={width} height={barheight+2*paddingV}>
      {
        patternAttribute.globalRange.length <= 30
        ? patternAttribute.globalRange.map((v,i) =>
          <rect
            key={`pattern-${patternAttribute.attr}-div-${i}`}
            {...catRect}
            x={(i*wd) + paddingH}
            onClick={() => onClickCategory(v)}
          >
          <title>{v}</title>
          </rect>
        )
        : <g>
            <title>{`All Categories:\n ${JSON.stringify(patternAttribute.globalRange)}`}</title>
            <rect {...globalRect}></rect>
          </g>
      }      
      <g>
        {
          patternCats.map((v,i) =>
            <rect
              key={`pattern-${patternAttribute.attr}-foreground-${i}`}
              {...patternCatRect}
              x={(v.idx*wd) + paddingH}
              onClick={() => onClickCategory(v.cat)}
            >
              <title>{v.cat}</title>
            </rect>
          )
        }
      </g>      
    </svg>
  )
}

/**
  * Renders a control to edit a nominal pattern attribute
  * @param {number} idx - The row height - white space + bar height
  * @param {json} patternAttribute - The attribute properties
  * @param {array} attributes - list of attributes that can be a core attribute  
  * @param {function} onChangeAttribute - handles changing the attribute 
  * @param {function} onChangeRange - handles changing the attribute's range for the pattern 
  * @param {function} onDelete - handles deleting the attribute from the core attribute list
  */
const NominalPatternAttribute = (props) => {

  const { idx, attributes, patternAttribute, onChangeAttribute, onChangeRange, onDelete } = props

  // Handles selecting/deselcting a category from the NominalFeatureBar
  const onClickCategory = (cat) => {
    const index = patternAttribute.range.indexOf(cat);
    if (index > -1) { 
      onChangeRange(idx, patternAttribute.range.filter(d => d !== cat))
    }
    else {
      onChangeRange(idx, [...patternAttribute.range, cat])
    }
  }

  const catSelectStyles = {
    container: styles => ({
      ...styles,
      width: 300,
      display: "inline-block"
    }),
    control: styles => ({
      ...styles,
     backgroundColor: 'white',
     padding: 0,
     minHeight: '32px',     
     fontSize: 13,
     overflow: "hidden"
    }),
    valueContainer: base => ({
      ...base,
      minHeight: 32,
      overflow: "auto",
      maxHeight: 70,
      margin: 2
    }),
    multiValueLabel: (styles) => ({
      ...styles,
      padding: 2,
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999
    })
  };

  return(
    <div style={{textAlign: 'center', marginBottom: 25}}>
      <Stack direction="horizontal" gap={3}>
        <Select
          arial-label="target"
          name="target"
          height="32px"
          menuPortalTarget={document.body}
          menuPlacement="auto"
          menuPosition="fixed"
          value={{ value: patternAttribute.attr, label: patternAttribute.attr }}
          onChange={(selected) => onChangeAttribute(idx, selected.value)}
          styles={customStyles}
          options={[{ value: patternAttribute.attr, label: patternAttribute.attr }, ...attributes.map(d=>({ value: d, label: d }))]}
          menuShouldScrollIntoView={true}
        />
        <div className="ms-auto">
        <Select
          isMulti
          arial-label="target"
          name="target"
          height="32px"
          menuPortalTarget={document.body}
          menuPlacement="auto"
          menuPosition="fixed"
          value={patternAttribute.range.map(d=>({ value: d, label: d }))}
          onChange={(selected) => onChangeRange(idx, selected.map( d => d.value))}
          styles={catSelectStyles}
          options={patternAttribute.globalRange.map(d=>({ value: d, label: d }))}
          menuShouldScrollIntoView={true}
        />
        </div>
        <i className="material-icons-outlined" style={{cursor: 'pointer'}} onClick={() => onDelete(idx)}>clear</i>
      </Stack>
      <NominalFeatureBar
        patternAttribute={patternAttribute}
        width={500}
        barheight={16}
        paddingH={30}
        paddingV={20}
        onClickCategory={onClickCategory}
      />
    </div>
  )
}

/**
  * Renders a numerical feature range for the pattern
  * @param {array} globalRange - array containing the attributes global range
  * @param {array} range - array containing the attributes patern range
  * @param {number} width - The width of the visual for the core features
  * @param {number} barheight - the bars height/thickness
  * @param {number} paddingH - horizontal padding for the component
  * @param {number} paddingV - vertical padding for the component
  * @param {function} onChangeRange - handles changing the attribute's range for the pattern 
  */
const NumericalFeatureBar = (props) => {
  const { range, globalRange, width, barheight, paddingH, paddingV, onChangeRange } = props

  const [brushExtent, setBrushExtent] = useState([paddingH, width-paddingH])

  const sc = xScale(width, paddingH, globalRange[0], globalRange[1])

  // Update brush extent when attribute pattern range changes
  useEffect(() => {
    setBrushExtent([
      sc(isNaN(range[0]) ? globalRange[0] : +range[0]),
      sc(isNaN(range[1]) ? globalRange[1] : +range[1])
    ])
  }, [range]);

  
  // If attribute has single unique value return text notification
  if(globalRange[0] == globalRange[1]){
    const suvText = {
      x: 10,
      y: 5,
      fontSize: 9,
      fontStyle: "italic",
      fill: "#0b67fd"
    }
    return(
      <svg>
        <text {...suvText}>
          {`Single Unique Value: ${abbreviateNumber(globalRange[1], 2)}`}
        </text>
      </svg>
    )
  }  

  const globalRect = {
    x: sc(globalRange[0]),
    y: paddingV,
    width: sc(globalRange[1]) - sc(globalRange[0]),
    height: barheight,
    fill: "#dadada",
  }

  const pattern = {
    min: sc(isNaN(range[0]) ? globalRange[0] : +range[0]),
    max: sc(isNaN(range[1]) ? globalRange[1] : +range[1])
  }

  const patternWidth = pattern.max - pattern.min
  
  const patterRect = {
    x: Math.min(pattern.min, width-4),
    y: paddingV,
    width: Math.max(patternWidth, 4),
    height: barheight,
    fill: "#9cb6fb",
  }

  const onBrushStart = ({target, type, selection, sourceEvent})=>{
  }

  const onBrush = ({target, type, selection, sourceEvent})=>{    
    if(selection == null){     
      onChangeRange(globalRange)
      return
    }  
    onChangeRange([+sc.invert(selection[0][0]),  +sc.invert(selection[1][0])])
  }

  const onBrushEnd = ({target, type, selection, sourceEvent})=>{    
    if(selection == null){      
      onChangeRange(globalRange)
    }
    else{     
      onChangeRange([+sc.invert(selection[0][0]),  +sc.invert(selection[1][0])])
    } 
  }

  const renderBrush = (x0,x1,y0,y1, sx0, sx1) => (
    <SVGBrush
      // Defines the boundary of the brush.
      // Strictly uses the format [[x0, y0], [x1, y1]] for both 1d and 2d brush.
      // Note: d3 allows the format [x, y] for 1d brush.
      extent={[[x0, y0], [x1, y1]]}
      selection={[[sx0, y0], [sx1, y1]]}
      // Obtain mouse positions relative to the current svg during mouse events.
      // By default, getEventMouse returns [event.clientX, event.clientY]
      brushType="x" // "2d" // "x"
      onBrushStart={onBrushStart}
      onBrush={onBrush}
      onBrushEnd={onBrushEnd}
    />
  )

  return(
    <svg width={width} height={barheight+2*paddingV}>
      <text x={paddingH - 2} y={paddingV + 12} fontSize={12} textAnchor='end'> 
        {abbreviateNumber(globalRange[0], 2)}
      </text>
      <rect {...globalRect}>
        <title>{`Global Range:\n${abbreviateNumber(globalRange[0], 2)} to ${abbreviateNumber(globalRange[1], 2)}`}</title>
      </rect>
      <rect {...patterRect}>
        <title>{`Pattern Range:\n${abbreviateNumber(range[0], 2)} to ${abbreviateNumber(range[1], 2)}`}</title>
      </rect>
      {renderBrush(paddingH, width - paddingH, paddingV, paddingV + barheight, brushExtent[0], brushExtent[1])}      

      <text x={width - paddingH + 2} y={paddingV + 12} fontSize={12}> 
        {abbreviateNumber(globalRange[1], 2)}
      </text>
    </svg>
  )
}

/**
  * Renders a control to edit a numrical pattern attribute
  * @param {number} idx - The row height - white space + bar height
  * @param {json} patternAttribute - The attribute properties
  * @param {array} attributes - list of attributes that can be a core attribute  
  * @param {function} onChangeAttribute - handles changing the attribute 
  * @param {function} onChangeRange - handles changing the attribute's range for the pattern 
  * @param {function} onDelete - handles deleting the attribute from the core attribute list
  */
const NumericPatternAttribute = (props) => {

  const { idx, attributes, patternAttribute, onChangeAttribute, onChangeRange, onDelete } = props

  const [range, setRange] = useState(patternAttribute.range)

  // Update components range if attribute's range changes
  useEffect(() => {
    setRange(patternAttribute.range)
  }, [patternAttribute.range]);

  // Delay attribute's range change for spinner or dragging interactions
  useEffect(() => {
    const timeoutId = setTimeout(() => onChangeRange(idx, range), 1000);
    return () => clearTimeout(timeoutId);
  }, [range]);
  
  // Updates component's range
  const onChangeLocalRange = (newRange) => {
    setRange(newRange)
  }

  return(
    <div style={{textAlign: 'center', marginBottom: 25}}>
      <Stack direction="horizontal" gap={3}>
        <Select
          arial-label="target"
          name="target"
          height="32px"
          menuPortalTarget={document.body}
          menuPlacement="auto"
          menuPosition="fixed"
          value={{ value: patternAttribute.attr, label: patternAttribute.attr }}
          onChange={(selected) => onChangeAttribute(props.idx, selected.value)}
          styles={customStyles}
          options={[{ value: patternAttribute.attr, label: patternAttribute.attr }, ...attributes.map(d=>({ value: d, label: d }))]}
          menuShouldScrollIntoView={true}
        />
        <div className="ms-auto">
          <FormControl
            name="maxPattern"
            type="number"
            step={`${(patternAttribute.globalRange[1] - patternAttribute.globalRange[0])/1000}`}
            min={patternAttribute.globalRange[0]}
            max={patternAttribute.globalRange[1]}
            aria-label="maxPattern"
            aria-describedby="basic-addon1"
            style={{width: 125, display: "inline-block"}}
            value={range[0]}
            onChange={(evt) => onChangeLocalRange([+evt.target.value, range[1]])}
          />
        </div>
        <div>
          <FormControl
            name="maxPattern"
            type="number"
            step={`${(patternAttribute.globalRange[1] - patternAttribute.globalRange[0])/1000}`}
            min={patternAttribute.globalRange[0]}
            max={patternAttribute.globalRange[1]}
            aria-label="maxPattern"
            aria-describedby="basic-addon1"
            value={range[1]}
            style={{width: 125, display: "inline-block"}}
            onChange={(evt) => onChangeLocalRange([range[0], +evt.target.value])}
          />
        </div>
        <i className="material-icons-outlined" style={{cursor: 'pointer'}} onClick={() => onDelete(props.idx)}>clear</i>
      </Stack>
      <NumericalFeatureBar
        globalRange={patternAttribute.globalRange}
        range={range}
        width={500}
        barheight={16}
        paddingH={30}
        paddingV={20}
        onChangeRange={(newRange) => onChangeLocalRange(newRange)}
      />
    </div>
  )
}

/**
 * Component that displays the pattern data in a table
 * @param {bool} show - Flag to indicate if the pattern builder should be displayed
 * @param {object} attributes - The list of attributes along with their global ranges and stats
 * @param {function} onBuildPattern - Function to build a pattern on the backend
 * @param {function} onHide - Function to close the pattern builder
*/
const PatternBuilder = (props) => {

  const { show, attributes, target, targetType, catLabels, buildPattern, onHide } = props

  const [availableAttrs, setAvailableAttrs] = useState(Object.keys(attributes))
  const [patternAttrs, setPatternAttrs] = useState([])
  const [selectedAttr, setSelectedAttr] = useState(Object.keys(attributes)[0])

  // Reset state when builder is shown
  useEffect(() => {
    setAvailableAttrs(Object.keys(attributes))
    setPatternAttrs([])
    setSelectedAttr(Object.keys(attributes)[0])
  }, [show]);

  if(!show) { return null }

  const onAddAttribute = () => {
    if(availableAttrs.length > 0) {
      const firstAttr = availableAttrs[0]
      const newAttr = Object.hasOwn(attributes[firstAttr], 'categories')
                      ? {
                          attr: firstAttr,
                          isCat: true,
                          type: "In",
                          globalRange: attributes[firstAttr].categories,
                          range: []
                        }
                      : {
                        attr: firstAttr,
                          isCat: false,
                          type: "In",
                          globalRange: [+attributes[firstAttr].min, +attributes[firstAttr].max],
                          range: [+attributes[firstAttr].min, +attributes[firstAttr].max]
                        }
      setPatternAttrs([...patternAttrs, newAttr])
      setSelectedAttr(firstAttr)
      setAvailableAttrs(availableAttrs.splice(1))      
    }
  }

  const onRemoveAttribute = (idx) => {
    const attr = patternAttrs[idx].attr    
    const newAvailableAttrs = [...availableAttrs, attr]
    const newPatternAttrs = patternAttrs.filter((d) => d.attr != attr);    
    setPatternAttrs(newPatternAttrs)    
    setAvailableAttrs(newAvailableAttrs)
  }

  const onChangeAttribute = (idx, attr) => {
    let tmpPatternAttrs = [...patternAttrs]
    const isAttrPresent = patternAttrs.map(d => d.attr).includes(attr)
    if(tmpPatternAttrs[idx].attr !== attr && isAttrPresent) {
      alert("Attribute already present")
    }
    else {
      const prevAttr = tmpPatternAttrs[idx].attr
      tmpPatternAttrs[idx].attr = attr
      if(Object.hasOwn(attributes[attr], 'categories')){
        tmpPatternAttrs[idx].isCat = true
        tmpPatternAttrs[idx].globalRange = attributes[attr].categories
        tmpPatternAttrs[idx].range = []
      }
      else {
        tmpPatternAttrs[idx].isCat = false
        tmpPatternAttrs[idx].globalRange = [+attributes[attr].min, +attributes[attr].max],
        tmpPatternAttrs[idx].range = [+attributes[attr].min, +attributes[attr].max]
      }
      setSelectedAttr(attr)
      setPatternAttrs(tmpPatternAttrs)
      setAvailableAttrs(a => [...a, prevAttr].filter(v => v != attr))       
    }    
  }

  const onChangeRange = (idx, newRange) => {
    let tmpPatternAttrs = [...patternAttrs]
    tmpPatternAttrs[idx].range = newRange
    setPatternAttrs(tmpPatternAttrs)
  }

  const onBuildPattern = () => {
    let isPatternValid = patternAttrs.reduce((acc, d) => {
      if(d.isCat){
        return acc && d.range.length < d.globalRange.length
      }

      return acc && d.range[0] <= d.range[1] && !(d.range[0] == d.globalRange[0] && d.range[1] == d.globalRange[1])

    }, true)

    if(isPatternValid) {
      buildPattern(patternAttrs)
    }
    else {
      alert("invalid pattern")
    }
  }

  return (
    <div className="ak-modal">
    <div className="ak-modal-content-fit" style={{textAlign: "left", width: 1400}}>
      <label className="contentDivHead" title={"Pattern Builder"}>New Pattern</label>

      <div style={{display: 'inline-block', width: "calc(100% - 700px)", verticalAlign: 'top', height: "calc(100% - 150px)", overflow: "hidden", margin: "0px 15px"}}>
        <div className='peekLabel' style={{display: 'block'}}>
          Core Features:
        </div>
        <div style={{maxHeight: "calc(100% - 95px)", padding: 10, overflow: "auto"}}>
        {
          patternAttrs.map((d, i) => {
            return(
              d.isCat
              ? <NominalPatternAttribute
                  key={d.attr}
                  idx={i}
                  attributes={availableAttrs}
                  patternAttribute={d}
                  onChangeAttribute={onChangeAttribute}
                  onChangeRange={onChangeRange}
                  onDelete={onRemoveAttribute}
                />
              : <NumericPatternAttribute
                  key={d.attr}
                  idx={i}
                  attributes={availableAttrs}
                  patternAttribute={d}
                  onChangeAttribute={onChangeAttribute}
                  onChangeRange={onChangeRange}
                  onDelete={onRemoveAttribute}
                />
            )
          })
        }
        </div>

        <button
          className="coreButtonSmall"
          onClick={onAddAttribute}
          style={{ display:"block", fontSize: 14, margin: 'auto', marginTop: 15}}>
            {"Add Feature"}
        </button>
      </div>

      <div style={{display: 'inline-block', verticalAlign: 'top', marginTop: 20}}>
        <Chart
          catLabels={catLabels}
          targetType={targetType}
          X={selectedAttr}
          Y={target}
          filters={patternAttrs}
          width={650}
          height={570}
          padding={50}
          xOptions={Object.keys(attributes)}
          setSelectedAttr={setSelectedAttr}
        />
      </div>

      <div className="ak-modal-buttonBox-fit">
        <input type="button" className="coreButton" onClick={onBuildPattern} value={"Add Pattern"} />
        <input type="button" className="coreButton" onClick={onHide} value={"Cancel"} />
      </div>
    </div>
    </div>
  );
}

export default PatternBuilder;