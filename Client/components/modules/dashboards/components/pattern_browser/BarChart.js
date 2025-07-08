import React, { useState } from 'react';
import * as d3 from "d3";
import { collectChart } from '../../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";
import XYAxis from '../../../charts/components/XYAxis';
import { Transition } from 'react-transition-group'
import * as d3Col from 'd3-scale-chromatic'

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

function BarGroup(props) {
  const { xattr, yattr, xAx, yAx, totals, data, yScaleType } = props;
    
  return data.map((item, index) => {   
    const yVal = yScaleType == 'Prob' ? item.count / totals[item[xattr]] : item.count
    const rectProps = {
      x: xAx(item[xattr]) + (item[yattr] > 0 ? xAx.bandwidth() / 2 : 0),
      y: yAx(yVal),
      width: xAx.bandwidth() / 2,
      height: yAx(yAx.domain()[0]) - yAx(yVal),
      fill: d3Col.schemeTableau10[item[yattr]],
      key: index
    };
     
    return (
	    <Transition key={index} in={true} timeout={duration} appear={true}>
        {(state) => (
            <rect {...rectProps} style={{
              ...defaultStyle,
              ...transitionStyles[state]
            }}><title>{"# Items: " + item.count}</title>
            </rect>
        )}
      </Transition>
    );    
  });
}

function Legend(props) {
  const { legendData, width, height, padding } = props;
  
  return legendData.map((d, index) => {
    const rectProps = {
      x:  width - padding,
      y: padding + index*20 ,
      width: 12, 
      height: 12,      
      fill: d3Col.schemeTableau10[index],      
    }; 

    const textProps = {
      x: width - padding - 25 + 40,
      y: padding + index*20 + 9,
      fontSize: 12,    
    };
    const toggle = (i) => console.log(i);
    
    return (
	    <g key={'l' + index} onClick={() => toggle(index)}>
        <text {...textProps}>{d}</text>
        <rect {...rectProps}></rect>
	    </g>
    );
  });
}

function AxisSelect(props) {
  const { padding, yScaleType, setYScaleType } = props;
  
  const styles = {
    position: "absolute",
    width: 60,
    top: padding-22,
    fontSize: 12,
    fontWeight: "bold",
    border: "none"
  };

  
  return (
    <select className="metaSelect"
      value={yScaleType}
      style={styles}
      onChange={(evt) => setYScaleType(evt.target.value)}
    >
        <option value={'Count'} key={0} >Count</option>
        <option value={'Prob'} key={1} >Prob.</option>
        <option value={'Log'} key={2} >Log</option>
    </select>
  );
}

export default function BarChart(props) {
  const [yScaleType, setYScaleType] = useState("Count");
  
  const { width, height, padding, labels, xattr, yattr, data } = props;
  
  // Compute total count for each category
  let totals = labels.reduce((dict, item) => ({ ...dict, [item]: 0}), {})
  for(var i = 0; i < data.length; i++) {
    totals[data[i][xattr]] += data[i].count
  }  
  let maxCount = yScaleType === "Prob" ? 1 : d3.max(data, d=>d.count);    
  const xAx = d3.scaleBand().domain(labels).range([padding, width-padding]).padding(0.1);
  const yAx = (yScaleType === "Log"
	       ? d3.scaleLog().domain([0.1, maxCount]).nice().range([height-padding, padding])
	       : d3.scaleLinear().domain([0, maxCount]).range([height-padding, padding]))

  
  // replace integer index with the label
  const adjData = data.map(d=>({...d, [xattr]: d[xattr]}));

  // Get unique target text
  const legendData = [...new Set(data.map(d=>d[yattr]))];
  legendData.sort()

  const xOffset = xAx.step() * xAx.paddingInner() * 0.5
  const x1 = xAx(props.filter[0]) - xOffset;
  const x2 = xAx(props.filter[props.filter.length - 1]) + xAx.bandwidth() + xOffset;
  
  return (
      <div  style={{display: "block", textAlign: "center"}}>
      <AxisSelect {...{padding, yScaleType, setYScaleType}} />
      <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.groupDetailBar'} name={`${xattr} vs ${yattr}`} collect={collectChart}>
      <svg className='groupDetailBar' width={width} height={height} >
      <BarGroup {...{xattr, yattr, xAx, yAx, totals, yScaleType}} data={adjData} />
      <Legend {...props} legendData={legendData} />

      <rect x={x1} y={padding} width={x2-x1}
          height={height-2*padding}
          fill={"#b3b3b3"}
          opacity={0.25}></rect>
        <line x1={x1} y1={padding}
          x2={x1} y2={height-padding}
          stroke={"#000000"}
          strokeDasharray={"5, 5"} ></line>
        <line x1={x2} y1={padding} x2={x2}
          y2={height-padding}
          stroke={"#000000"}
          strokeDasharray={"5, 5"} ></line>                  
      <XYAxis {...props} xScale={xAx} yScale={yAx} X={xattr} XType={"Cat"} Y={null} txtFontSize={12}/>
      </svg>
      </ContextMenuTrigger>
      </div>
  );
}
