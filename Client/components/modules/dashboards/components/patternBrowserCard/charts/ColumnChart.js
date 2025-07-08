import React, { useState, useEffect } from 'react';
import { scaleBand, scaleLinear, scaleLog, max, group } from "d3";

import { Transition } from 'react-transition-group'
import { schemeTableau10 } from 'd3-scale-chromatic'

import XYAxis from '../../../../charts/components/XYAxis';
import XDropdown from './XDropdown';

const duration = 300;

const defaultStyle = {
  transition: `opacity ${duration}ms ease-in-out, height ${duration}ms ease-in-out, y ${duration}ms ease-in-out, fill ${duration}ms ease-in-out`,
  opacity: 0,
  display: 'inline-block',
}

const transitionStyles = {
  entering: { opacity: 0},
  entered: { opacity: 1},
  exiting: { opacity: 1},
  exited: { opacity: 0},
};

/**
  * Creates a nominal/band x-scale function   
  * @param: {number} width - the width of the canvas 
  * @param: {number} padding - the padding at the left and right of the axis
  * @param: {array} categories - list of categories
*/
const xScale = (width, padding, categories) => {
  return scaleBand()
    .domain([...categories])
    .range([padding, width - padding]);
};

/**
 * Creates a d3 scale and returns a wrapper which converts a data value to a Y position   
 * @param: {number} height - length of the axis
 * @param: {number} padding - padding around the axis 
 * @param: {array} data - Array containing the data objects
 */
const yScale = (height, padding, data, yType) => {
  if(data.length <=0) return null

  const yMax = yType=="Prob." ? 1 : max(Object.keys(data).map(d => max(data[d])))

  return scaleLinear()    
    .domain([0,  yMax]).nice()    
    .range([height - padding, padding]);
};

/* Renders an option for a dropdown */
const renderOption = () => {
  return (option, index) => {
    return(
      <option value={option} key={`opt-${index}`} >{option}</option>
    )
  }
}

/**
 * Renders bars for a single data point
 * @param {function} xAx - x axis scaling function
 * @param {function} yAx - y axis scaling function
 * @param {string} X - x axis attribute
 * @param {string} Y - y axis attribute
 * @param {string} targetClass - the target value
 * @param {int} classIdx - the index of the bin set i.e. the index of the target value
 * @param {int} nClass - the number of different target values
 * @param {string} yType - the type of the y-axis - probability or count
 * * @param {bool} showOnlyFilter - flag to indicate if onlyly filtered data should be shown i.e. outData should be hidden
 */
const renderBars = (xAx, yAx, X, Y, targetClass, classIdx, nClass, inData, outData, totals, yType, showOnlyFilter) => {
  return (cat, i) => {
    if(outData[targetClass][i] == 0 || totals[i]==0) return null
    
    const pad = xAx.bandwidth() > 16 ? 4 : 0    

    const rectAllProps = {
      x: xAx(cat) + classIdx*(xAx.bandwidth() - 2*pad)/nClass + pad,
      y: yAx(outData[targetClass][i]/totals[i]),
      width: (xAx.bandwidth() - 2*pad) / nClass, 
      height:  yAx(yAx.domain()[0]) - yAx(outData[targetClass][i]/totals[i]),
      fill: schemeTableau10[+targetClass]
    }

    const rectProps = {
      x: rectAllProps.x,
      y: yAx(inData[targetClass][i]/totals[i]),
      width: rectAllProps.width, 
      height:  yAx(yAx.domain()[0]) - yAx(inData[targetClass][i]/totals[i]),
      fill: schemeTableau10[+targetClass],        
    }

    const textAll = yType == 'Prob.'
            ? `${Y}: ${targetClass}  ${X}: ${cat}\nProb.: ${(outData[targetClass][i]*100/totals[i]).toFixed(2)}%`
            : `${Y}: ${targetClass}  ${X}: ${cat}\n# Items: ${outData[targetClass][i]}`

    const text = yType == 'Prob.'
            ? `${Y}: ${targetClass}  ${X}: ${cat}\nProb.: ${(inData[targetClass][i]*100/totals[i]).toFixed(2)}%`
            : `${Y}: ${targetClass}  ${X}: ${cat}\n# Items: ${inData[targetClass][i]}`
    
    return <g key={`bar-${targetClass}-${i}`}>
              {
                !showOnlyFilter
                ? <Transition  in={true} timeout={duration} appear={true}>
                    {(state) => (
                      <rect {...rectAllProps} style={{
                        ...defaultStyle,
                        ...transitionStyles[state],
                        opacity: 0.11
                      }}><title>{textAll}</title>
                      </rect>
                    )}
                  </Transition>
                : null
              }
              {
                inData[targetClass][i] > 0
                ? <Transition in={true} timeout={duration} appear={true}>
                    {(state) => (
                      <rect {...rectProps} style={{
                        ...defaultStyle,
                        ...transitionStyles[state]
                      }}><title>{text}</title>
                      </rect>
                    )}
                  </Transition>
                : null
              }
            </g>;     
  };
};

/**
 * Renders a legend for bar colors mapping to target or Y-Attribute values
 * @param {int} width - The chart width
 * @param {int} padding - The chart padding
 */
const renderLegend = (Y, classes, width, padding) => {  
    
  const textProps = {
    x: width - padding,
    y: padding - 5,
    fontSize: 14,
    fontWeight: "bold"
  }

  const rectProps = (index, cls) => ({
    x: width - padding,
    y: padding + index*20 + 5,
    width: 12,
    height: 12,
    fill: schemeTableau10[+cls]
  })

  const labelProps = (index, cls) => ({
    x: width - padding - 25 + 40,
    y: padding + index*20 + 15,
    fontSize: 12,
  })
    
  return <g>
          <text {...textProps}>{Y}</text>
          {classes.map((d,i) => 
            <g key={`legend-${Y}-${d}`}>
              <rect {...rectProps(i, d)}></rect>
              <text {...labelProps(i, d)}>{d}</text>
            </g>
          )}          
         </g>;
  
};

/**
 * Computes and renders a histogram of the provided data for each target (Y) value
 * @param {list} data - A data object required to render the chart - contains categories, classes, counts for data in and outside filters
 * @param {string} X - The attribute to be shown on the x-axis
 * @param {string} Y - The attribute that data will be gropued by  
 * @param {bool} showOnlyFilter - flag to indicate if onlyly filtered data should be shown i.e. outData should be hidden
 * @param {int} width - The chart width
 * @param {int} height - The chart height
 * @param {int} padding - The chart padding
 */
const ColumnChart = (props) => {
  const { data, X, Y, xOptions, setSelectedAttr, showOnlyFilter,
          catLabels, width, height, padding } = props
  
  if(data == null) {
    return <div style={{display: "block", textAlign: "center", height: height}}>No Data</div>
  }
  
  const { categories, classes, inData, outData } = data
  const [totals, setTotals] = useState(Array(categories.length).fill(1))
  const [yType, setYType] = useState("Count")

  // Updates the totals based on the Y axis type
  useEffect(() => {    
    if(yType=="Count"){
      setTotals(Array(categories.length).fill(1))
    }
    if(yType=="Prob."){      
      setTotals(Array(categories.length).fill(0).map((d,i) => 
      classes.reduce(
        (acc, c) => acc + (showOnlyFilter ? inData[c][i] : outData[c][i]),
        0
      )
    ))
    }
  }, [data, showOnlyFilter, yType])
  
  const yTypeChanged = (evt) => setYType(evt.target.value)

  const xAx = xScale(width, padding, catLabels[X] ? catLabels[X] : categories)
  const yAx = showOnlyFilter 
              ? yScale(height, padding, inData, yType)
              : yScale(height, padding, outData, yType) 
  
  return (
    <div style={{display: "block", textAlign: "center"}}>
      <select
        value={yType}
        style={{
          position: "absolute",
          width: 60,
          marginTop: padding-22,
          fontSize: 12,
          fontWeight: "bold",
          border: "none",
          cursor: "pointer"
        }}
        onChange={yTypeChanged}
      >
      {["Count", "Prob."].map(renderOption())}
      </select>
      <XDropdown
        selected={X}
        options={xOptions}
        onChange={setSelectedAttr}
        {...{width, height, padding}}
      />
      <svg width={width} height={height}>
        {
          classes.map( (d, i) =>
            <g key={`class-${i}-${d}`}>
              {categories.map(renderBars(xAx, yAx, X, Y, d, i, classes.length, inData, outData, totals, yType, showOnlyFilter))}
            </g>
          )
        }
        {renderLegend(Y, classes, width, padding)}
        <XYAxis
          {...props}
          xScale={xAx}
          yScale={yAx}
          X={null}
          XType={"Cat"}
          Y={null}
          txtFontSize={12} />
      </svg>
    </div>
  );
}

export default ColumnChart
