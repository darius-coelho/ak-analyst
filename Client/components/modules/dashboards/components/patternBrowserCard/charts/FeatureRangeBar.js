import React from 'react';
import { scaleLinear, sum, extent, bin } from "d3";

import FeatureHistogram from './FeatureHistogram';
import FeatureColumn from './FeatureColumn';
import { abbreviateNumber } from '../../../../utilities/utilities';

import "../css/FeatureRangeBar.css"



const xScale = (width, padding, min, max) => {
  return scaleLinear()
    .domain([min, max])
    .range([padding, width-padding])
    .clamp(true);
};

const shapScale = (width, leftPad, rightPad, shapSum) => {  
  return scaleLinear()
    .domain([0, shapSum])
    .range([leftPad, width-rightPad]);
};

const FilterSwitch = (props) => {
  const { attribute, filterVal, rowID, width, rowHeight, 
          barHeight, histoHeight, offsetTop, offsetLeft, changeFilter } = props

  const filterRect = (xShift, isSelected) => ({
    x: width - (offsetLeft+110) + 20 + xShift,
    y: offsetTop + histoHeight + rowID*rowHeight - 3,
    width: 28,
    height: barHeight + 6,
    fill: isSelected ? '#4682b4' : '#f0f0f0'
  })

  const filterText = (xShift, isSelected) => ({
    x: width - (offsetLeft+110) + 20 + 15 + xShift,
    y: offsetTop + histoHeight + rowID*rowHeight - 3 + 13,
    fontSize: 11,
    fill:"#707070",
    textAnchor:"middle",
    fill: isSelected ? '#ffffff' : '#707070'
  })

  return(
    <g>
      <g onClick={() => changeFilter(attribute, 'In')} cursor="pointer">
        <rect {...filterRect(0, filterVal == 'In')}/>
        <text {...filterText(0, filterVal == 'In')}>In</text>
      </g>
      <g onClick={() => changeFilter(attribute, 'Out')} cursor="pointer">
        <rect {...filterRect(29, filterVal == 'Out')}/>
        <text {...filterText(29, filterVal == 'Out')}>Out</text>
      </g>
      <g onClick={() => changeFilter(attribute, 'Off')} cursor="pointer">
        <rect {...filterRect(58, filterVal == 'Off')}/>
        <text {...filterText(58, filterVal == 'Off')}>Off</text>
      </g>
    </g>
  )
}

/**
  * Renders a numerical feature range for the pattern
  * @param {string} attr - The attribute name
  * @param {json} desc - The attribute details stats, range, etc
  * @param {function} shapAx - Function to scale the shap values for display
  * @param {float} shapVal - The shap value of the current attribute
  * @param {float} shapSum - The sum of all shap values in the pattern
  * @param {number} i - The index of the feature
  * @param {number} width - The width of the visual for the core features
  * @param {number} patternID - The pattern id or index
  * @param {json} attrSummary - object containg the summary stats for each attribute across the entire dataset
  * @param {string} selectedAttr - The name of the selected attribute
  * @param {function} onSelect - Function to be called when an attribute is selected i.e a feature bar is clicked
  * @param {json} filters - object of mapping attribute names to their filter status
  * @param {list} data - The dataset
  * @param {function} changeFilter - Function tochange the filter status of the current attribute
  * @param {number} offsetLeft - The left offset for the feature bar
  * @param {number} offsetTop - The top offset for the visual
  * @param {number} rowHeight - The row height - white space + bar height
  * @param {number} barHeight - The bar height
  * @param {number} histoHeight - The histogram height
  */
const NumericalFeature = (props) => {
  const { attr, pval, desc, shapAx, shapVal, shapSum, i, width, patternID, attrSummary,
	  selectedAttr, onSelect, filters, data, offsetLeft, shapPadLeft,
	  offsetTop, rowHeight, barHeight, histoHeight, changeFilter } = props

  let globalAttrDesc = attrSummary[attr];

  // make the p value pretty
  const pvalTxt = (pval < 0.001 ? pval.toExponential(2) : pval.toFixed(3));

  const attrName = pval < 0.05 ? `*${attr}` : attr;
  const attrTooltip = pval < 0.05 ? `${attr}\np-value=${pvalTxt}` : attr;
  
  // Generate icon if atttribute has missing values in pattern
  let icon = null  
  if(desc.missing > 0) {
    const iconTxt = `${abbreviateNumber(desc.missing*100, 2)}% missing values`
    icon = <div
            style={{ 
              display: "inline-block",
              marginTop: 3, 
              verticalAlign: "middle",
              height: 18,
              marginTop: -6,
              marginLeft: 3
            }}
            title={iconTxt}
          >
          <i className="material-icons-round" style={{color: "#ebfb00", marginLeft: -6, fontSize: 19}}>warning</i>
          <i className="material-icons-round" style={{color: "#000000", marginLeft: -19, fontSize: 19}}>warning_amber</i>
        </div>
  }

  const sc = xScale(width, offsetLeft+110, globalAttrDesc.min, globalAttrDesc.max)
  
  const globalRect = {
    x: sc(globalAttrDesc.min),
    y: offsetTop + histoHeight + i*rowHeight,
    width: sc(globalAttrDesc.max) - sc(globalAttrDesc.min),
    height: barHeight,
    fill: filters[attr] == 'Out' || filters[attr] == 'Off' ? "#91b4ed" : "#dadada"
  }

  const globalMark = {
    y1: offsetTop + histoHeight + i*rowHeight,
    y2: offsetTop + histoHeight + i*rowHeight + barHeight+3,
    stroke: "#dadada",
    strokeWidth: 2.5,
  }

  const globalMarkText = {
    y: offsetTop + histoHeight + i*rowHeight + barHeight + 3 + 10,
    fontSize: 10,
    fill: "#dadada",
  };
  
  const pattern = {
    min: sc(isNaN(desc.min) ? globalAttrDesc.min : +desc.min),
    max: sc(isNaN(desc.max) ? globalAttrDesc.max : +desc.max)
  }
  
  const patternRect = {
    x: pattern.min,
    y: offsetTop + histoHeight + i*rowHeight,
    width: pattern.max - pattern.min,
    height: barHeight,
    fill: filters[attr] == 'In' || filters[attr] == 'Off' ? "#91b4ed" : "#dadada"
  }

  const patternText = {
    x: offsetLeft,
    y: offsetTop + histoHeight - 4 + i*rowHeight,
    width: 100,
    height: rowHeight
  }

  const patternMark = {
    y1: offsetTop + histoHeight + i*rowHeight,
    y2: offsetTop + histoHeight + i*rowHeight + barHeight,
    stroke: "#444444",
    strokeWidth: 1,
    shapeRendering: "crispEdges"
  }

  const patternRange = {
    x1: pattern.min,
    x2: pattern.max,
    y1: offsetTop + histoHeight + i*rowHeight + (barHeight+1)/2,
    y2: offsetTop + histoHeight + i*rowHeight + (barHeight+1)/2,
    stroke: "#444444",
    strokeWidth: 1,
    shapeRendering: "crispEdges"
  }

  const patternMarkText = {
    y: offsetTop + histoHeight + i*rowHeight - 6,
    fontSize: 10,
    fill: "#1a1a1a",
  }

  const shapRect = shapAx != null
                    ? {
                        x: shapPadLeft,
                        y: offsetTop + histoHeight + i*rowHeight + barHeight + 11,
                        width: shapAx(Math.abs(shapVal)) - shapPadLeft,
                        height: 4,
                        rx: 2,
                        fill: "#1561a8"
                      }
                    : null

  const shapTxt = shapAx != null
                    ? {
                        x: shapAx(Math.abs(shapVal)) + 2  ,
                        y: offsetTop + histoHeight + i*rowHeight + barHeight + 11 + 5,                        
                        fill: "#bababa",
                        fontSize: 10,
                        textAnchor: 'start'
                      }
                    : null

  const shapImp = Math.abs((100 * shapVal/shapSum)).toFixed(1)

  const isSmall = pattern.max - pattern.min < 32 ? true : false
  const isNarrow  = pattern.max - pattern.min < 12 ? true : false
  const patternMid = (pattern.min + pattern.max) / 2

  
  if(desc.missing >= 1) {
    return(
      <g>      
        <g onClick={() => onSelect(attr)} cursor="pointer">
          <FeatureHistogram
            show={attr == selectedAttr && histoHeight > 0}
            counts={globalAttrDesc.counts}            
            attr={attr}
            bins={globalAttrDesc.bins}
            width={width}
            height={histoHeight}
            top={offsetTop + i*rowHeight}
            padding={offsetLeft+110}
          />
          <foreignObject {...patternText}>
            <div className="featAttrLbl" title={attrTooltip}
                 style={{fontWeight: attr == selectedAttr ? "bold" : "initial"}}>
              {icon}
              {attrName}
            </div>
          </foreignObject>
  
          <line {...globalMark} x1={sc(globalAttrDesc.min)} x2={sc(globalAttrDesc.min)} />
          <text {...globalMarkText} x={sc(globalAttrDesc.min)} textAnchor={"start"}>
            {abbreviateNumber(globalAttrDesc.min, 1)}
          </text>
  
          <line {...globalMark} x1={sc(globalAttrDesc.max)-1} x2={sc(globalAttrDesc.max)-1} />
          <text {...globalMarkText} x={sc(globalAttrDesc.max)} textAnchor={"end"}>
            {abbreviateNumber(globalAttrDesc.max, 1)}
          </text>
  
          <rect {...globalRect} fill={"#dadada"}>
            <title>
              {`Global Range:\n${abbreviateNumber(globalAttrDesc.min, 3)} to ${abbreviateNumber(globalAttrDesc.max, 3)}`}
            </title>
          </rect>

          <foreignObject x={globalRect.x + globalRect.width/2 - 12} y={globalRect.y-7} width={25} height={24}>
            <div
              style={{
                display: "inline-block",
                marginTop: 3,
                verticalAlign: "middle",
                height: 18,
                marginTop: -6,
                marginLeft: 4
              }}
              title={"All values missing"}
            >
              <i className="material-icons-round" style={{color: "#ebfb00", marginLeft: -4, fontSize: 25}}>warning</i>
              <i className="material-icons-round" style={{color: "#000000", marginLeft: -25, fontSize: 25}}>warning_amber</i>
            </div>
          </foreignObject>
        </g> 
      </g>
    )
  }

  return(
    <g>      
      <g onClick={() => onSelect(attr)} cursor="pointer">
        <FeatureHistogram
          show={attr == selectedAttr && histoHeight > 0}
          counts={globalAttrDesc.counts}            
          attr={attr}
          bins={globalAttrDesc.bins}
          width={width}
          height={histoHeight}
          top={offsetTop + i*rowHeight}
          padding={offsetLeft+110}
        />
        <foreignObject {...patternText}>
          <div className="featAttrLbl" title={attrTooltip}
               style={{fontWeight: attr == selectedAttr ? "bold" : "initial"}}>
            {icon}
            {attrName}
          </div>
        </foreignObject>

        <line {...globalMark} x1={sc(globalAttrDesc.min)} x2={sc(globalAttrDesc.min)} />
        <text {...globalMarkText} x={sc(globalAttrDesc.min)} textAnchor={"start"}>
          {abbreviateNumber(globalAttrDesc.min, 1)}
        </text>

        <line {...globalMark} x1={sc(globalAttrDesc.max)-1} x2={sc(globalAttrDesc.max)-1} />
        <text {...globalMarkText} x={sc(globalAttrDesc.max)} textAnchor={"end"}>
          {abbreviateNumber(globalAttrDesc.max, 1)}
        </text>

        <rect {...globalRect}>
          <title>
            {`Global Range:\n${abbreviateNumber(globalAttrDesc.min, 3)} to ${abbreviateNumber(globalAttrDesc.max, 3)}`}
          </title>
        </rect>

        <rect {...patternRect}>
          <title>
            {`Pattern Range:\n${abbreviateNumber(desc.min, 3)} to ${abbreviateNumber(desc.max, 3)}`}
          </title>
        </rect>
        
        {
          isNarrow
          ? <text {...patternMarkText} x={patternMid} textAnchor={"middle"}>
              {`${abbreviateNumber(desc.min, 1)} - ${abbreviateNumber(desc.max, 1)}`}
            </text>
            
          : <g>
              <text {...patternMarkText} x={pattern.min} textAnchor={isSmall ? "end" : "middle"}>
                {abbreviateNumber(desc.min, 1)}
              </text>
              <text {...patternMarkText} x={pattern.max} textAnchor={isSmall ? "start" : "middle"}>
                {abbreviateNumber(desc.max, 1)}
              </text>
            </g>
        }

        <line {...patternMark} x1={pattern.min} x2={pattern.min} />
        <line {...patternMark} x1={pattern.max} x2={pattern.max} />
        <line {...patternRange}/>

        {
          shapRect
          ? <g>              
              <rect {...shapRect}><title>{`Feature Importance: ${shapImp}%`}</title></rect>
              <text {...shapTxt}>{`${shapImp}%`}</text>
            </g>
          : null
        }
      </g> 

      <FilterSwitch
        attribute={attr}
        filterVal={filters[attr]}
        rowID={i}
        width={width}
        rowHeight={rowHeight}
        barHeight={barHeight}
        histoHeight={histoHeight}
        offsetLeft={offsetLeft}
        offsetTop={offsetTop}
        changeFilter={changeFilter}
      />
    </g>
  )
}

/**
  * Renders a categorical feature range for the pattern
  * @param {string} attr - The attribute name 
  * @param {json} desc - The attribute details stats, range, etc
  * @param {function} shapAx - Function to scale the shap values for display
  * @param {float} shapVal - The shap value of the current attribute
  * @param {float} shapSum - The sum of all shap values in the pattern
  * @param {number} i - The index of the feature
  * @param {number} width - The width of the visual for the core features
  * @param {number} patternID - The pattern id or index
  * @param {json} attrSummary - object containg the summary stats for each attribute across the entire dataset
  * @param {string} selectedAttr - The name of the selected attribute
  * @param {function} onSelect - Function to be called when an attribute is selected i.e a feature bar is clicked
  * @param {json} filters - object of mapping attribute names to their filter status
  * @param {list} data - The dataset
  * @param {function} changeFilter - Function tochange the filter status of the current attribute
  * @param {number} offsetLeft - The left offset for the feature bar
  * @param {number} offsetTop - The top offset for the visual
  * @param {number} rowHeight - The row height - white space + bar height
  * @param {number} barHeight - The bar height
  * @param {number} histoHeight - The histogram height
  */ 
const CategoricalFeature = (props) => {
  const { attr, pval, desc, shapAx, shapVal, shapSum, i, width, patternID, catLabels, selectedAttr, onSelect, filters, attrSummary,
          offsetLeft, shapPadLeft, offsetTop, rowHeight, barHeight, histoHeight, changeFilter } = props
  
  let globalAttrDesc = attrSummary[attr];

  
  // make the p value pretty
  const pvalTxt = (pval < 0.001 ? pval.toExponential(2) : pval.toFixed(3));

  const attrName = pval < 0.05 ? `*${attr}` : attr;
  const attrTooltip = pval < 0.05 ? `${attr}\np-value=${pvalTxt}` : attr;
  
  const wd = (width-2*(offsetLeft+110)) / catLabels[attr].length
  const patternCats = desc.categories.map(d => ({cat: d, idx: catLabels[attr].indexOf(d)}))

  // Generate icon if atttribute has missing values in pattern
  let icon = null  
  if(desc.missing > 0) {
    const iconTxt = `${abbreviateNumber(desc.missing*100, 2)}% missing values`
    icon = <div
            style={{ 
              display: "inline-block",
              marginTop: 3, 
              verticalAlign: "middle",
              height: 18,
              marginTop: -6,
              marginLeft: 3
            }}
            title={iconTxt}
          >
          <i className="material-icons-round" style={{color: "#ebfb00", marginLeft: -6, fontSize: 19}}>warning</i>
          <i className="material-icons-round" style={{color: "#000000", marginLeft: -19, fontSize: 19}}>warning_amber</i>
        </div>
  }

  const globalRect = {
    x: offsetLeft + 110,
    y: offsetTop + histoHeight + i*rowHeight,
    width: width-2*(offsetLeft+110),
    height: barHeight,
    fill: filters[attr] == 'Out' || filters[attr] == 'Off' ? "#91b4ed" : "#dadada"
  }
  
  const patternCatRect = {
    y: offsetTop + histoHeight + i*rowHeight,
    width: Math.max(2.5, wd) - 2,
    height: barHeight,
    fill: filters[attr] == 'In' || filters[attr] == 'Off' ? "#91b4ed" : "#dadada"
  }

  const patternDiv = {
    y: offsetTop + histoHeight + i*rowHeight,
    width: 2,
    height: barHeight,
    fill: "#ffffff",    
  }

  const patternMark = (x) => ({
    x1: x,
    x2: x,
    y1: offsetTop + histoHeight + i*rowHeight,
    y2: offsetTop + histoHeight + i*rowHeight + barHeight,
    stroke: "#444444",
    strokeWidth: 1,
    shapeRendering: "crispEdges"
  })

  const patternRange = (x) => ({
    x1: x,
    x2: x+wd-2,
    y1: offsetTop + histoHeight + i*rowHeight + (barHeight+1)/2,
    y2: offsetTop + histoHeight + i*rowHeight + (barHeight+1)/2,
    stroke: "#444444",
    strokeWidth: 1,
    shapeRendering: "crispEdges"
  })


  const patterText = {
    x: offsetLeft,
    y: offsetTop + histoHeight - 4 + i*rowHeight,
    width: 100,
    height: rowHeight
  }

  const shapRect = shapAx != null
                    ? {
                        x: shapPadLeft,
                        y: offsetTop + histoHeight + i*rowHeight + barHeight + 11,
                        width: shapAx(Math.abs(shapVal)) - shapPadLeft,
                        height: 4,
                        rx: 2,
                        fill: "#1561a8"
                      }
                    : null
    
  const shapTxt = shapAx != null
                    ? {
                        x: shapAx(Math.abs(shapVal)) + 2  ,
                        y: offsetTop + histoHeight + i*rowHeight + barHeight + 11 + 5,
                        fill: "#bababa",
                        fontSize: 10,
                        textAnchor: 'start'
                      }
                    : null

  const shapImp = Math.abs((100 * shapVal/shapSum)).toFixed(1)
  const catTooltipMsg = `Pattern Categories:\n${JSON.stringify(patternCats.map(d=>d.cat))}` +
	`\n\nAll Categories:\n ${JSON.stringify(catLabels[attr])}`;
  
  if(desc.missing >= 1) {
    return(
      <g>      
        <g onClick={() => onSelect(attr)} cursor="pointer">
          <FeatureColumn
            show={attr == selectedAttr && histoHeight > 0}
            categories={catLabels[attr]}
            catCounts={globalAttrDesc.catCounts}
            attr={attr}
            segWidth={wd}
            height={histoHeight}
            top={offsetTop + i*rowHeight}
            padding={offsetLeft+110}
          />
          <foreignObject {...patterText}>
            <div className="featAttrLbl" title={attrTooltip} 
                style={{fontWeight: attr == selectedAttr ? "bold" : "initial"}}>
              {icon}
              {attrName}
            </div>
          </foreignObject>
  
          <g>
            <title>{catTooltipMsg}</title>
            <rect {...globalRect} fill={"#dadada"}></rect>
          </g>

          { 
            catLabels[attr].length <= 30
            ? catLabels[attr].map((v,i) =>
              <rect
                key={`pattern ${patternID}-${attr}-div-${i}`}
                {...patternDiv}
                x={(i+1)*(wd) - 2 + offsetLeft + 110}
              >
              <title>{v}</title>
              </rect>
            )
            : null
          }

          <foreignObject x={globalRect.x + globalRect.width/2 - 12} y={globalRect.y-7} width={25} height={24}>
            <div
              style={{
                display: "inline-block",
                marginTop: 3,
                verticalAlign: "middle",
                height: 18,
                marginTop: -6,
                marginLeft: 4
              }}
              title={"All values missing"}
            >
              <i className="material-icons-round" style={{color: "#ebfb00", marginLeft: -4, fontSize: 25}}>warning</i>
              <i className="material-icons-round" style={{color: "#000000", marginLeft: -25, fontSize: 25}}>warning_amber</i>
            </div>
          </foreignObject>
        </g> 
      </g>
    )
  }

  return(
    <g>
      <g onClick={() => onSelect(attr)} cursor="pointer">
        <FeatureColumn
          show={attr == selectedAttr && histoHeight > 0}
          categories={catLabels[attr]}
          catCounts={globalAttrDesc.catCounts}
          attr={attr}
          segWidth={wd}
          height={histoHeight}
          top={offsetTop + i*rowHeight}
          padding={offsetLeft+110}
        />

        <foreignObject {...patterText}>
          <div className="featAttrLbl" title={attrTooltip} 
               style={{fontWeight: attr == selectedAttr ? "bold" : "initial"}}>
            {icon}
            {attrName}
          </div>
        </foreignObject>

        <g>
          <title>{catTooltipMsg}</title>
          <rect {...globalRect}></rect>
        </g>

        { 
          catLabels[attr].length <= 30
          ? catLabels[attr].map((v,i) =>
            <rect
              key={`pattern ${patternID}-${attr}-div-${i}`}
              {...patternDiv}
              x={(i+1)*(wd) - 2 + offsetLeft + 110}
            >
            <title>{v}</title>
            </rect>
          )
          : null
        }

        <g>        
          {
            patternCats.map((v,i) =>
            <g key={`pattern ${patternID}-${attr}-foreground-${i}`}>
              <rect {...patternCatRect} x={v.idx*(wd) + offsetLeft + 110}>
                <title>{v.cat}</title>
              </rect>
              <line {...patternRange(v.idx*(wd) + offsetLeft + 110)}/>
              <line {...patternMark(v.idx*(wd) + offsetLeft + 110)}/>
              <line {...patternMark(v.idx*(wd) + offsetLeft + 108 + wd)}/>
            </g>            
            )
          }          
        </g>        
        
        {
          shapRect
          ? <g>
              <rect {...shapRect}><title>{`Feature Importance: ${shapImp}%`}</title></rect>
              <text {...shapTxt}>{`${shapImp}%`}</text>
            </g>
          : null
        }
      </g>
      
      <FilterSwitch
        attribute={attr}
        filterVal={filters[attr]}
        rowID={i}
        width={width}
        rowHeight={rowHeight}
        barHeight={barHeight}
        histoHeight={histoHeight}
        offsetLeft={offsetLeft}
        offsetTop={offsetTop}
        changeFilter={changeFilter}
      />
    </g>
  )
}


/**
 * Renders the top 3 feature ranges for the pattern
 * @param {number} width - The width of the visual for the core features
 * @param {number} patternID - The pattern id or index
 * @param {list} attributes - List of the core attributes in the pattern and their details
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {json} attrSummary - object containg the summary stats for each attribute across the entire dataset
 * @param {boolean} isCore - Indicated if the attributes rendered are core attributes
 */ 
const FeatureRangeBar = (props) => {
  const { width, patternID, attributes, attrDesc, catLabels, attrSummary, data,
          selectedAttr, onSelect, filters, changeFilter, isDetail, shaps } = props
  
  if(width < 100){
    return null
  }

  if(!attributes) {
    return null
  }

  // If shaps is undefined or null, then it must be an other feature
  const isCoreFeature = shaps ? true : false;
   
  const selectedIdx = attributes.map(d=>d.name).indexOf(selectedAttr)
  
  const offsetLeft = 10
  const shapPadLeft = 10
  const offsetTop = 15
  const histoOffset = selectedIdx >= 0 && isDetail ? 40 : 0
  const rowHeight = 54
  const barHeight = 13
  const height = rowHeight * attributes.length + histoOffset

  const shapSum = isCoreFeature
                  ? sum(attributes, d => Math.abs(+shaps[d.name]))
                  : 0
  const shapAx = isCoreFeature
                 ? shapScale(offsetLeft+110, shapPadLeft, 36, shapSum)
                 : null

  return(
    <svg width={width} height={height}>
      {attributes.map((d,i) => {
        const histoHeight = i >= selectedIdx && selectedIdx >= 0 ? histoOffset : 0
        // Render CategoricalFeature for nominal variables
        if(catLabels.hasOwnProperty(d.name)){
          return(
            <CategoricalFeature
              key={`pattern ${patternID} - core ${i}`}
              {...{i, patternID, catLabels, attrSummary}}
              width={width-10}
              attr={d.name}
	            pval={isCoreFeature ? 1.0 : parseFloat(d.pval)}
              desc={attrDesc[d.name]}
              shapAx={shapAx}
              shapVal={isCoreFeature ? +shaps[d.name] : 0}
              shapSum={shapSum}
              offsetLeft={offsetLeft}
              shapPadLeft={shapPadLeft}
              offsetTop={offsetTop}
              rowHeight={rowHeight}
              barHeight={barHeight}
              histoHeight={histoHeight}
              selectedAttr={selectedAttr}
              onSelect={onSelect}
              filters={filters}
              changeFilter={changeFilter}
              />
          )
        }

        // Render NumericalFeature
        return(
	    <g>
	    
          <NumericalFeature
            key={`pattern ${patternID} - core ${i}`}
            {...{i, patternID, attrSummary, data}}
            width={width-10}
            attr={d.name}
	          pval={isCoreFeature ? 1.0 : parseFloat(d.pval)}
            desc={attrDesc[d.name]}
            shapAx={shapAx}
            shapVal={isCoreFeature ? +shaps[d.name] : 0}
            shapSum={shapSum}
            offsetLeft={offsetLeft}
            shapPadLeft={shapPadLeft}
            offsetTop={offsetTop}
            rowHeight={rowHeight}
            barHeight={barHeight}
            histoHeight={histoHeight}
            selectedAttr={selectedAttr}
            onSelect={onSelect}
            filters={filters}
            changeFilter={changeFilter}
            />
	    </g>
        )
      })}
    </svg>
  )
}

export default FeatureRangeBar;
