import React from 'react';
import { collectChart } from '../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";
import * as d3 from "d3";
import XYAxis from './XYAxis';

/**
 * Component which draws a single box and whisker.
 * @param {d3.scaleBand} xAx - X-axis transformer.
 * @param {d3.scaleLinear} yAx - Y-axis transformer.
 * @param {array} boxData - Object containing data for single box.
 */
function Box(props) {
  const {xAx, yAx, ...boxData} = props;

  const rectProps = {
    x: xAx(boxData.label),
    y: yAx(boxData.q3),
    width: xAx.bandwidth(),
    height: yAx(boxData.q1) - yAx(boxData.q3),
    fill: "#80c4ff",
    stroke: "#002e56",
    strokeWidth: 1,
  };

  const lineProps = {
    x1: xAx(boxData.label),
    y1: yAx(boxData.median),
    x2: xAx(boxData.label) + xAx.bandwidth(),
    y2: yAx(boxData.median),
    fill: "none",
    stroke: "#002e56" ,
    strokeWidth: 1,
  };

  const lineExtProps = {
    x1: xAx(boxData.label) + xAx.bandwidth()/2,
    y1: yAx(boxData.min),
    x2: xAx(boxData.label) + xAx.bandwidth()/2,
    y2: yAx(boxData.max),
    fill: "none",
    stroke: "#002e56" ,
    strokeWidth: 1,
  };

  const lineMinProps = {
    x1:  xAx(boxData.label),
    y1: yAx(boxData.min),
    x2: xAx(boxData.label) + xAx.bandwidth(),
    y2: yAx(boxData.min),
    fill: "none",
    stroke: "#002e56" ,
    strokeWidth: 1,
  };
  
  const lineMaxProps = {
    x1: xAx(boxData.label),
    y1: yAx(boxData.max),
    x2: xAx(boxData.label) + xAx.bandwidth(),
    y2: yAx(boxData.max),
    fill: "none",
    stroke: "#002e56" ,
    strokeWidth: 1,
  }
  
  return (
      <g>
        <line {...lineExtProps} ></line>
        <line {...lineMinProps} ></line>
        <line {...lineMaxProps} ></line>
        <rect {...rectProps} ></rect>
        <line {...lineProps} ></line>
      </g>
  );
}

/**
 * Component which draws a list of box and whiskers.
 * @param {d3.scaleBand} xAx - X-axis transformer.
 * @param {d3.scaleLinear} yAx - Y-axis transformer.
 * @param {array} data - List of objects containing data for each box.
 */
function BoxList(props) {
  const {xAx, yAx, data} = props;
  return data.map((d,i)=><Box key={i} {...d} xAx={xAx} yAx={yAx} />);
}


/**
 * Component which renders a line marking a bin position.
 * @param {d3.scaleBand} xAx - X-axis transformer.
 * @param {d3.scaleLinear} yAx - Y-axis transformer.
 * @param {string} label - Level where the bin should be drawn after.
 */
function BinLine(props) {
  const {xAx, yAx, label} = props;

  // padding to place the line in between to levels.
  const pad = xAx.step() * xAx.paddingInner() / 2;
  
  const lineProps = {
    x1: xAx(label) + xAx.bandwidth() + pad,
    x2: xAx(label) + xAx.bandwidth() + pad,
    y1: yAx.range()[0],
    y2: yAx.range()[1],
    stroke: "black",
    strokeDasharray: 5,
  };

  return (<g><line {...lineProps} /></g>);
}

/**
 * Component which renders lines marking the bin positions.
 * @param {d3.scaleBand} xAx - X-axis transformer.
 * @param {d3.scaleLinear} yAx - Y-axis transformer.
 * @param {array} data - List of objects containing data for each box.
 * @param {int} nbins - Number of bins.
 */
function BinLines(props) {
  const {xAx, yAx, data, nbins} = props;

  // number of categories
  const nlevels = data.length;
  const nlines = nbins - 1;
  const divLen = Math.floor(nlevels / nbins);
  
  const levels = [...Array(nlevels).keys()];

  // Get the labels corresponding to the last level in a bin.
  const lineLabels = [...Array(nlines).keys()]
	.map(d=>data[Math.floor(d3.quantile(levels, (d+1)/nbins))].label);
  
  return lineLabels.map((label, i)=><BinLine key={i} {...{label, xAx, yAx}}/>);
}

/**
 * Component which renders a box and whisker diagram.
 * @param {number} width - Width of the plot.
 * @param {number} height - Height of the plot.
 * @param {number} padding - Padding size around the plot.
 * @param {string} xAttr - X-Attribute name.
 * @param {string} yAttr - Y-Attribute name.
 * @param {array} data - List of objects containing data for each box.
 */
export function BoxPlot(props) {
  const {width, height, padding, xAttr, yAttr, data, nbins} = props;
  
  const xAx = d3.scaleBand()
	.paddingInner(0.1)
	.paddingOuter(0.05)
	.domain(data.map(d=>d.label))
	.range([padding, width - padding]);
  
  const yAx = d3.scaleLinear()
	.domain([d3.min(data, d=>d.min), d3.max(data, d=>d.max)])
	.range([height - padding, padding]);

  
  
  return (
    <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.transformerBoxPlot'} name={`${props.xAttr} vs ${props.yAttr}`} collect={collectChart}>
      <svg className='transformerBoxPlot' width={width} height={height}>
        <BoxList {...{xAx, yAx, data}} />
        <BinLines {...{xAx, yAx, data, nbins}} />
        <XYAxis {...props}
          xScale={xAx}
          yScale={yAx}
          X={xAttr}
          XType={"Cat"}
          Y={yAttr}
          txtFontSize={12}
        />
      </svg>
    </ContextMenuTrigger>
  );
}

export default BoxPlot;
