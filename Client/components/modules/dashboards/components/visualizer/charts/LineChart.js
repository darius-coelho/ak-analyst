import React, { useState, useRef, useEffect } from 'react';
import { collectChart } from '../../../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";
import * as d3 from "d3";
import SVGBrush from 'react-svg-brush';
import XYAxis from '../../../../charts/components/XYAxis';
import "../../../../../css/Charts.css"

/**
 * Creates a d3 scale and returns a wrapper which
 * converts a data value to an X position
 * @param: {number} width - length of the axis.
 * @param: {number} padding - padding around the axis.
 * @param: {array} data - Array containing the data objects.
 * @param: {string} X - X attribute.
 * @param: {string} type - type of X attribute.
 */
const xScale = (width, padding, data, X, type) => {
  if(type == "Numerical"){
    return d3.scaleLinear()
      .domain([d3.min(data, function(d) { return +d[X] }), d3.max(data, function(d) { return +d[X] })])
      .range([padding, width-padding]);
  }
  const validDate = new Date(data[0][X]);
  if(validDate > 0) {
    return d3.scaleTime()
      .domain([new Date(data[0][X]), new Date(data[data.length-1][X])])
      .range([padding, width-padding]);
  }

  return  d3.scaleBand()
    .domain(data.map(function(d) { return d[X]; }))
    .range([padding, width - padding]);
};

/**
 * Creates a d3 scale and returns a wrapper which
 * converts a data value to a Y position
 * @param: {number} height - length of the axis.
 * @param: {number} padding - padding around the axis.
 * @param: {array} data - Array containing the data objects.
 * @param: {array} Y - List of numeric Y attribute.
 */
const yScale = (height, padding, data, Y) => {
  let min = Infinity
  for(let i=0; i < Y.length; i++){
    min = Math.min(min, d3.min(data, function(d) { return +d[Y[i].y] }))
    if(Y[i].lb != "None" && Y[i].ub != "None"){
      min = Math.min(min, d3.min(data, function(d) { return +d[Y[i].lb] }))
    }
  }
  let max = -Infinity
  for(let i=0; i < Y.length; i++){
    max = Math.max(max, d3.max(data, function(d) { return +d[Y[i].y] }))
    if(Y[i].lb != "None" && Y[i].ub != "None"){
      max = Math.max(max, d3.max(data, function(d) { return +d[Y[i].ub] }))
    }
  }
  return d3.scaleLinear()
    .domain([min, max])
    .range([height - padding, padding]);
};

/**
 * Returns the correct svg object based on marker type
 * @param: {string} key - length of the axis.
 * @param: {string} type - marker type.
 * @param: {number} X - X position for the marker.
 * @param: {number} Y - Y position for the marker.
 * @param: {string} color - marker color.
 */
const marker = (key, type, X, Y, color) => {
  switch(type){
    case "Circle":
      return <circle
        key={key}
        cx={X}
        cy={Y}
        stroke="#ffffff"
        strokeWidth={1}
        r={3}
        fill={color}
      />;
    case "Line":
      return <line
        key={key}
        x1={X}
        y1={Y-10}
        x2={X}
        y2={Y+10}
        stroke={color}
      />
    case "Square":
      return <rect
        key={key}
        x={X-2}
        y={Y-2}
        height={4}
        width={4}
        fill={color}
      />;
    case "Diamond":
      return <rect
        key={key}
        x={0}
        y={0}
        height={4}
        width={4}
        fill={color}
        transform={`translate(${X},${Y-2.8}) rotate(45)`}
      />;
    default:
      return null
  }
}

/**
 * Checks if a user defined condition for rendering a marker is satisfied
 * @param: {number} d - data point.
 * @param: {string} y - y attribute.
 * @param: {array} mCond - Array containing multiple conditions upon which to render a marker.
 * @param: {string} mCondJoin - Logical operator to join conditions.
 */
const checkCondition = (d, y, mCond, mCondJoin) => {
  let result = mCondJoin == "AND" ? true : false
  for(let i=0; i < mCond.length; i++){
    const {cond, attr} = mCond[i]
    switch (cond + mCondJoin){
      case "EQAND": result = result & (d[y] == d[attr]); continue;
      case "NEAND": result = result & (d[y] != d[attr]); continue;
      case "LTAND": result = result & (d[y] < d[attr]); continue;
      case "LTEAND": result = result & (d[y] <= d[attr]); continue;
      case "GTAND": result = result & (d[y] > d[attr]); continue;
      case "GTEAND": result = result & (d[y] >= d[attr]); continue;

      case "EQOR": result = result || (d[y] == d[attr]); continue;
      case "NEOR": result = result || (d[y] != d[attr]); continue;
      case "LTOR": result = result || (d[y] < d[attr]); continue;
      case "LTEOR": result = result || (d[y] <= d[attr]); continue;
      case "GTOR": result = result || (d[y] > d[attr]); continue;
      case "GTEOR": result = result || (d[y] >= d[attr]); continue;

      default: return false
    }
  }
  return result
}

/**
 * Renders conditional markers along the line
 *  @param {string} X - x axis attribute.
 *  @param {string} Y - y axis attribute.
 *  @param {function} xAx - x axis scaling function.
 *  @param {function} yAx - y axis scaling function.
 *  @param {string} mType - The marker type or shape.
 *  @param {array} mCond - Array containing multiple conditions upon which to render a marker.
 *  @param {string} mCondJoin - Logical operator to join conditions.
 *  @param {string} mColor - marker color.
 *  @param {boolean} isDate - flag indicating if x attribute is date type.
 */
const renderMarker = (X, Y, xAx, yAx, mType, mCond, mCondJoin, mColor, isDate) => {
  return (d,i) => {
    if(checkCondition(d, Y, mCond, mCondJoin)){
      return marker(
        "marker-" + Y + i, // key
        mType, // type
        xAx(isDate ? new Date(d[X]): d[X]), // x position
        yAx(d[Y]), // y position
        mColor // color
      )
    }
    return null
  }
}

/**
 * Renders a line on the line chart
 * @param: {array} data - array of data objects.
 * @param: {string} X - X attribute.
 * @param: {function} xAx - x axis scaling function.
 * @param: {function} yAx - y axis scaling function.
 */
const renderLine = (data, X, xAx, yAx) => {
  return (d,i) => {
    if(data.length < 1){
      return null
    }
    const validDate = new Date(data[0][X]);
    const line = d3.line()
                  .x(function(v) { return xAx( validDate > 0 ? new Date(v[X]) : v[X]) })
                  .y(function(v) { return yAx(+v[d.y]) });

    const lineProps = {
      d: line(data),
      stroke: d.lineColor,
      strokeWidth: 1,
      fill: "none"
    }

    let intervalPath = null
    if(d.lb != "None" && d.ub != "None"){
      const interval = d3.area()
                  .x(function(v) { return xAx( validDate > 0 ? new Date(v[X]) : v[X]) })
                  .y0(function(v) { return yAx(+v[d.lb]) })
                  .y1(function(v) { return yAx(+v[d.ub]) });
      const intervalProps = {
        d: interval(data),
        stroke: "none",
        opacity: 0.2,
        fill: d.lineColor,
        stroke: "#bdbdbd"
      }

      intervalPath =  <path {...intervalProps} ></path>
    }

    return(
      <g key={"line" + i}>
        {intervalPath}
        <path {...lineProps} ></path>
        {data.map(renderMarker(X, d.y, xAx, yAx, d.marker, d.mkCond, d.mkCondJoin, d.markerColor, validDate > 0))}
      </g>
    );
  }
};

/**
 * Renders a legend item
 *  @param {number} x - xPosition of the legend.
 *  @param {number} pad - padding for the legend.
 */
const renderLegend = (x, pad) => {
  return (d,i) => {

    const lineProps = {
      x0: 0,
      x1: 15,
      y0: 0,
      y1: 0,
      stroke: d.lineColor,
      strokeWidth: 2,
      fill: "none"
    }

    const textProps = {
      x: 20,
      y: 3,
      fontSize: 12,
    }

    const gProps = {
      key: "legend" + i,
      transform: `translate(${10 + x} ${pad + 12 + i*15})`,
    }

    const txt = d.y.length < 12
        ? d.y
        : d.y.slice(0,10) + "..."

    return(
      <g {...gProps}>
        <title>{d.y}</title>
        <line {...lineProps} />
        <text {...textProps}>{txt}</text>
      </g>
    );
  }
};

function LineChart(props) {
  const { width, height, padding, data, X, Y, types } = props

  const contextHt = 250
  const chartHt = height - contextHt

  const chartRef = useRef(null)

  // If no data return null
  if(data.length < 1) {
    return null
  }

  /**
   * Checks if a data point is valid for rendering
   *  @param {object} d - data point.
   */
  const isPointValid = (d) => {
    if(d[X] == null || (types[X] == 'Numerical' && isNaN(d[X]))){
      return false
    }
    for(let i=0; i < Y.length; i++){
      if(d[Y[i].y] == null || (types[Y[i].y] == 'Numerical' && isNaN(d[Y[i].y]))){
        return false
      }
    }
    return true
  }

  const dataClean = data.filter( d => isPointValid(d) )

  // Generate scaling functions
  const [zoomData, setZoomData] = useState(dataClean);
  const xAx = xScale(width, padding, zoomData, X, types[X]);
  const yAx = yScale(chartHt, padding, zoomData, Y);
  const contXAx = xScale(width, padding, dataClean, X, types[X]);
  const contYAx = yScale(contextHt, padding, dataClean, Y);

  /**
   * Removes invalid values from data on updates to X, Y or data
   */
  useEffect(() => {
    setZoomData(data.filter( d => isPointValid(d) ))
  }, [props.X, props.Y, props.data, setZoomData])

  const legWd = 110
  const legHt = Y.length*16 + 2
  const legX = width - 110 - padding

  const [sx0, setSX0] = useState(padding)
  const [sx1, setSX1] = useState(width - padding)

  const onBrushStart = ({target, type, selection, sourceEvent})=>{
  }

  const onBrush = ({target, type, selection, sourceEvent})=>{
    if(selection == null){
      setSX0(padding)
      setSX1(width - padding)
      return
    }

    setSX0(selection[0][0])
    setSX1(selection[1][0])
  }

  const onBrushEnd = ({target, type, selection, sourceEvent})=>{
    let sel0 = padding
    let sel1 = width - padding
    if(selection != null){
      sel0 = selection[0][0]
      sel1 = selection[1][0]
    }

    setSX0(sel0)
    setSX1(sel1)

    const lb = contXAx.invert(sel0)
    const ub = contXAx.invert(sel1)
    if(type == "Numerical"){
      setZoomData(dataClean.filter( d => +d[X] >= +lb &&  +d[X] <= +ub ))
    }
    const validDate = new Date(dataClean[0][X]);
    if(validDate > 0) {
      setZoomData(dataClean.filter( d => new Date(d[X]) >= lb &&  new Date(d[X]) <= ub ));     
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


  return (
    <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.visualizerLine'} name={`${X} vs ${Y[0].y}`} collect={collectChart}>
    <svg
      className='visualizerLine'
      ref={chartRef}
      width={width}
      height={chartHt}
      >

     {Y.map(renderLine(zoomData, X, xAx, yAx))}
     <XYAxis
        width={width}
        height={chartHt}
        padding={padding}
        xScale={xAx}
        yScale={yAx}
        X={X}
        Y={Y[0].y}
        XType={types[X]!= "Numerical" ? "Cat" : "Num"}
        YType={types[Y[0].y]!= "Numerical" ? "Cat" : "Num"}
        txtFontSize={12}/>

      <rect
        x={legX}
        y={padding}
        width={legWd}
        height={legHt}
        fill={"#ffffff"}
        stroke={"#d9d9d9"}
        opacity={0.8}
        strokeWidth={1}
        shapeRendering={"crispedges"}
      />
      {Y.map(renderLegend(legX, padding ))}
    </svg>
    <svg
      ref={chartRef}
      width={width}
      height={contextHt}
      >

     {Y.map(renderLine(dataClean, X, contXAx, contYAx))}

     {renderBrush(padding, width - padding, padding, contextHt - padding, sx0, sx1)}
     <XYAxis
        width={width}
        height={contextHt}
        padding={padding}
        xScale={contXAx}
        yScale={contYAx}
        X={X}
        Y={Y[0].y}
        XType={types[X]!= "Numerical" ? "Cat" : "Num"}
        YType={types[Y[0].y]!= "Numerical" ? "Cat" : "Num"}
        txtFontSize={12}/>
    </svg>
    </ContextMenuTrigger>
  );
}

export default LineChart;
