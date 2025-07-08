import React, { useEffect, useRef } from 'react';
import { Draggable } from "react-beautiful-dnd";
import { abbreviateNumber } from '../../../utilities/utilities';
import * as d3 from "d3";
import { intersection } from 'lodash';
import PatternTags from './PatternTags';
import PatternName from './PatternName';

import "./css/PatternCard.css"


const xScale = (width, padding, min, max) => {
  return d3.scaleLinear()
    .domain([min, max])
    .range([padding, width]);
};

/**
  * Renders a numerical feature range for the pattern
  * @param {number} d - The attribute details - name, range, etc
  * @param {number} i - The index of the feature
  * @param {number} width - The width of the visual for the core features
  * @param {number} patternID - The pattern id or index
  * @param {json} attrSummary - object containg the summary stats for each attribute across the entire dataset
  * @param {Array} highlightedFeatures - List of highligeted features
  * @param {number} offsetLeft - The left offset for the feature bar
  * @param {number} offsetTop - The top offset for the visual
  * @param {number} rowHeight - The row height - white space + bar height
  * @param {number} barheight - The bar height
  */
const NumericalFeature = (props) => {
  const { attr, desc, i, width, patternID, attrSummary, highlightedFeatures,
    offsetLeft, offsetTop, rowHeight, barheight } = props

  const patternText = {
    x: offsetLeft,
    y: offsetTop - 4 + i*rowHeight,
    fontSize: 11,
    textAnchor: "start",
    opacity: highlightedFeatures.length == 0 || highlightedFeatures.includes(attr) ? 1 : 0.35
  }

  const globalRange = attrSummary[attr]
  // If attribute has single unique value return text notification
  if(globalRange.min == globalRange.max){
    const suvText = {
      ...patternText,
      x: offsetLeft + 10,
      y: offsetTop + i*rowHeight + 8,
      fontSize: 9,
      fontStyle: "italic",
      fill: "#0b67fd"
    }
    return(
      <g>
        <text {...patternText}>
          <title>{attr}</title>
          {attr}
        </text>
        <text {...suvText}>
          {`Single Unique Value: ${abbreviateNumber(globalRange.max, 2)}`}
        </text>
      </g>
    )
  }
  const sc = xScale(width, offsetLeft, globalRange.min, globalRange.max)

  const globalRect = {
    x: sc(globalRange.min),
    y: offsetTop + i*rowHeight,
    width: sc(globalRange.max) - sc(globalRange.min),
    height: barheight,
    fill: "#dadada",
    opacity: highlightedFeatures.length == 0 || highlightedFeatures.includes(attr) ? 1 : 0.35
  }

  const pattern = {
    min: sc(isNaN(desc.min) ? globalRange.min : +desc.min),
    max: sc(isNaN(desc.max) ? globalRange.max : +desc.max)
  }

  const patternWidth = pattern.max - pattern.min
  const patterRect = {
    x: Math.min(pattern.min, width-4),
    y: offsetTop + i*rowHeight,
    width: Math.max(patternWidth, 4),
    height: barheight,
    fill: "#91b4ed",
    opacity: highlightedFeatures.length == 0 || highlightedFeatures.includes(attr) ? 1 : 0.35
  }

  return(
    <g>
      <text {...patternText}>
        <title>{attr}</title>
        {attr}
      </text>
      <rect {...globalRect}>
        <title>{`Global Range:\n${abbreviateNumber(globalRange.min, 2)} to ${abbreviateNumber(globalRange.max, 2)}`}</title>
      </rect>
      <rect {...patterRect}>
        <title>{`Pattern Range:\n${abbreviateNumber(desc.min, 2)} to ${abbreviateNumber(desc.max, 2)}`}</title>
      </rect>
    </g>
  )
}

/**
  * Renders a categorical feature range for the pattern
  * @param {number} d - The attribute details - name, range, etc
  * @param {number} i - The index of the feature
  * @param {number} width - The width of the visual for the core features
  * @param {number} patternID - The pattern id or index
  * @param {json} catLabels - Object that contains all categories in a nomial attribute
  * @param {Array} highlightedFeatures - List of highligeted features
  * @param {number} offsetLeft - The left offset for the feature bar
  * @param {number} offsetTop - The top offset for the visual
  * @param {number} rowHeight - The row height - white space + bar height
  * @param {number} barheight - The bar height
  */
const CategoricalFeature = (props) => {
  const { attr, desc, i, width, patternID, catLabels, highlightedFeatures,
          offsetLeft, offsetTop, rowHeight, barheight } = props

  // Determine number of segements and number of categories per segement  
  const wd = (width-offsetLeft) / catLabels[attr].length
  const patternCats = desc.categories.map( d => ({cat: d, idx: catLabels[attr].indexOf(d)}))

  const patternText = {
    x: offsetLeft,
    y: offsetTop - 4 + i*rowHeight,
    fontSize: 11,
    textAnchor: "start",
    opacity: highlightedFeatures.length == 0 || highlightedFeatures.includes(attr) ? 1 : 0.35
  }

  const globalRect = {
    x: offsetLeft,
    y: offsetTop + i*rowHeight,
    width: width-offsetLeft,
    height: barheight,
    fill: "#dadada",
    opacity: highlightedFeatures.length == 0 || highlightedFeatures.includes(attr) ? 1 : 0.35
  }

  const patternCatRect = {
    y: offsetTop + i*rowHeight,
    width: Math.max(2.5, wd) - 2,
    height: barheight,
    fill: "#91b4ed",
    opacity: highlightedFeatures.length == 0 || highlightedFeatures.includes(attr) ? 1 : 0.35
  }  

  const patternDiv = {
    y: offsetTop + i*rowHeight,
    width: 2,
    height: barheight,
    fill: "#ffffff",    
  }

  return(
    <g>
      <text {...patternText}>
        <title>{attr}</title>
        {attr}
      </text>
      <g>
        <title>{`All Categories:\n ${JSON.stringify(catLabels[attr])}`}</title>
        <rect {...globalRect}></rect>
      </g>
      <g>        
        {
          patternCats.map((v,i) =>
            <rect
              key={`pattern ${patternID}-${attr}-foreground-${i}`}
              {...patternCatRect}
              x={v.idx*(wd) + offsetLeft}
            >
              <title>{v.cat}</title>
            </rect>
          )
        }
      </g>
      { 
        catLabels[attr].length <= 30
        ? catLabels[attr].map((v,i) =>
          <rect
            key={`pattern ${patternID}-${attr}-div-${i}`}
            {...patternDiv}
            x={(i+1)*(wd) - 2 + offsetLeft}
          >
          <title>{v}</title>
          </rect>
        )
        : null
      }
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
 * @param {Array} highlightedFeatures - List of highligeted features
 */
const CoreFeatures = (props) => {
  const { width, patternID, attributes, highlightedFeatures, attrDesc, catLabels, attrSummary } = props
  const offsetLeft = 2
  const offsetTop = 13
  const rowHeight = 28
  const barheight = 8

  return(
    <svg width={width} height={80}>
      {attributes.map((d,i) => {
        // Render CategoricalFeature for nominal variables
        if(catLabels.hasOwnProperty(d)){
          return(
            <CategoricalFeature
              key={`pattern ${patternID} - ${d}`}
              {...{i, width, patternID, catLabels, highlightedFeatures}}
              attr={d}
              desc={attrDesc[d]}
              offsetLeft={offsetLeft}
              offsetTop={offsetTop}
              rowHeight={rowHeight}
              barheight={barheight}
            />
          )
        }

        // Render NumericalFeature
        return(
          <NumericalFeature
            key={`pattern ${patternID} - ${d}`}
            {...{i, width, patternID, attrSummary, highlightedFeatures}}
            attr={d}
            desc={attrDesc[d]}
            offsetLeft={offsetLeft}
            offsetTop={offsetTop}
            rowHeight={rowHeight}
            barheight={barheight}
          />
        )
      })}
    </svg>
  )
}

/**
 * Renders the main stats of the card - the diff in mean/probability & % of data
 * @param {string} targetType - The mining target type - numerical or binary
 * @param {number} stat - The main stat - mean diff for numerical & probability diff for binary
 * @param {number} dataSize - Size of the entire dataset
 */
const CardGeneralStats = (props) => {

  const { targetType, stats } = props

  const dec = Math.abs(+stats.globalDiff) > 1000 ? 1 : 2

  const color = +stats.globalDiff < 0 ? "#ce3f3f" : "#009a5e"
  
  const stat = targetType == 'numeric'
                ? abbreviateNumber(+stats.globalDiff, dec)
                : (+stats.globalDiff * 100).toFixed(1)

  const statSign = targetType == 'numeric'
                ? stats.globalDiff > 0 ? "+": ""
                : stats.globalDiff  > 0 ? "+": ""

  const label = targetType == 'numeric'
                ? `vs the mean`
                : `prob. diff.`

  return(
    <div className="patternItemSummaryBox">
      <div className="patternItemMeanVal" style={{color: color}}>
        {`${statSign}${isNaN(stat) ? 'NA' : stat}`}
      </div>
      <div className="patternItemDetailStatTxt" style={{color: color}}>
        {label}
      </div>

      <div className="patternItemAmtVal">
        {stats.globalSize.toFixed(1) + "%"}
      </div>
      <div className="patternItemDetailStatTxt" style={{color: "#628cff"}}>
        {"of the data"}
      </div>
    </div>
  )
}

/**
 * Renders the main stats of the card - the diff in mean/probability & % of data
 * @param {string} targetType - The mining target type - numerical or binary
 * @param {number} stat - The main stat - mean diff for numerical & probability diff for binary
 * @param {number} dataSize - Size of the entire dataset
 */
 const CardDetailStats = (props) => {

  const { targetType, stats } = props

  const dec = Math.abs(+stats.globalDiff) > 1000 ? 1 : 2

  const color1 = +stats.globalDiff < 0 ? "#ce3f3f" : "#009a5e"
  const stat1 = targetType == 'numeric'
                ? `${stats.globalDiff > 0 ? "+": ""}${abbreviateNumber(+stats.globalDiff, dec)}`
                : `${stats.globalDiff  > 0 ? "+": ""}${(+stats.globalDiff * 100).toFixed(1)}%`

  const color2 = +stats.comparDiff < 0 ? "#ce3f3f" : "#009a5e"
  const stat2 = targetType == 'numeric'
                ? `${stats.comparDiff > 0 ? "+": ""}${abbreviateNumber(+stats.comparDiff, dec)}`
                : `${stats.comparDiff  > 0 ? "+": ""}${(+stats.comparDiff * 100).toFixed(1)}%`

  const label = targetType == 'numeric'
                ? `vs the mean`
                : `prob. diff.`

  const sizeDiffTxt = `${stats.compareSize  > 0 ? "+": ""}${(+stats.compareSize).toFixed(1)}%`

  return(
    <div className="patternItemDetailSummaryBox">

      <div className="patternItemDetailTxt">
        Global
      </div>

      <div className="patternItemDetailTxt">
        Current
      </div>
      <br/>

      <div className="patternItemDetailMeanVal" style={{color: color1}}>
        {stat1}
      </div>
      <div className="patternItemDetailMeanVal" style={{color: color2}}>
        {stat2}
      </div>
      <div className="patternItemDetailStatTxt" style={{textAlign: 'center'}}>
        {label}
      </div>

      <div className="patternItemDetailAmtVal">
        {stats.globalSize.toFixed(1) + "%"}
      </div>
      <div className="patternItemDetailAmtVal">
        {sizeDiffTxt}
      </div>
      <div className="patternItemDetailStatTxt" style={{color: "#628cff", textAlign: 'center'}}>
        {"of the data"}
      </div>
    </div>
  )
}

const CardStats = (props) => {
  if(props.view=='detail') {
    return <CardDetailStats {...props} />
  }
  return <CardGeneralStats {...props} />
}

/**
 * Renders a pattern card
 * @param {string} view - The view in which the card is being shown - lists or detail view
 * @param {string} target - The mining target attribute or feature
 * @param {string} targetType - The mining target type
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {json} overallSummary - Summary of the dataset and mining results
 * @param {int} listId - The list ID or index
 * @param {json} data - Pattern description
 * @param {int} index - Pattern index within the list
 * @param {array} patternSetMin - A minimal version of the pattern list set
 * @param {array} highlightedFeatures - List og highlighted features
 * @param {function} changePatternName - Function to change the name of a pattern 
 * @param {function} onSelectPattern - Function to select a pattern card
 * @param {function} changeList - Function that handles moving a pattern to a different list
 * @param {array} likedPatterns - The list patterns that have been added to the output/liked
 * @param {function} toggleAddOutput -  The function that handles adding/removing a pattern from the output/liked list
 * @param {json} allTags - An object mapping the names of all pattern tags to colors
 * @param {json} cardEditParams - An object containign the indices of the list and card being edited
 * @param {boolean} showCardEdit - Flag indicating if the card edit menu is shown
 * @param {function} onShowCardEdit - Function to show the card edit menu
 */
export const PatternCard = (props) => {
  const { view, target, targetType, catLabels, overallSummary, compareSummary,
	  listId, data, index, highlightedFeatures, patternSetMin,
	  changePatternName, onSelectPattern, changeList,
	  likedPatterns, toggleAddOutput, allTags, 
    cardEditParams, showCardEdit, onShowCardEdit } = props

  const cardRef = useRef(null);

  const stats = compareSummary
                ? {
                    globalDiff: targetType == 'numeric'
                                ? data.stats[target].mu - overallSummary.stats[target].mu
                                : data.stats[target].prob - overallSummary.stats[target].prob,
                    globalSize: (100 * (+data.stats[target].size)/overallSummary.stats[target].size),
                    comparDiff: targetType == 'numeric'
                                ? data.stats[target].mu - (+compareSummary.stats[target].mu)
                                : data.stats[target].prob - (+compareSummary.stats[target].prob),
                    compareSize: (100 * ((+data.stats[target].size)-(+compareSummary.stats[target].size))/overallSummary.stats[target].size),
                  }
                : {
                    globalDiff: targetType == 'numeric'
                                ? data.stats[target].mu - overallSummary.stats[target].mu
                                : data.stats[target].prob - overallSummary.stats[target].prob,
                    globalSize: (100 * (+data.stats[target].size)/overallSummary.stats[target].size)
                  }

  // Generate text indicating the number of core attributes beyond the 3 shown
  const additionalTxt = data.shaps[target].length > 3
    ? <div className='patternItemAdditionalTxt'>
        {`+${data.shaps[target].length - 3} attributes`}
      </div>
    : null

  // True if pattern was liked, False o.w.
  const isLiked = likedPatterns.some(d=>d.ID===data.ID);

  /** Update menu hole size on adding a tag. */
  useEffect(() => {
    const isEditing = cardEditParams ? cardEditParams.listIdx == listId && cardEditParams.cardIdx == index : false
    if(showCardEdit && isEditing) {
      const cardEl = cardRef.current
      onShowCardEdit(cardEl.getBoundingClientRect(), listId, data.ID)
    }
  }, [data.tags]);

  /** Handles showing a menu to edit card properties. */
  const onShowOptions = (evt) => {
    evt.stopPropagation();
    const cardEl = cardRef.current
    onShowCardEdit(cardEl.getBoundingClientRect(), listId, data.ID)
  }

  return (
    <div ref={cardRef} style={{width: "100%", height: "100%"}} onClick={() => onSelectPattern(listId, data.ID)}>
      <i className={`material-icons-sharp patternOptionsIcon`} onClick={onShowOptions}>
        menu
      </i>

      <PatternName
        name={data.name}
        isLiked={isLiked}
        listID={listId}
        cardID={index}
        fontSize={'11pt'}
        iconSize={'14pt'}
        changePatternName={changePatternName}
      />

      <PatternTags
        view={view}
        cardTags={data.tags}
        allTags={allTags}
        size={'Small'}
        hasAddBtn={false}
      />

      <CardStats
        view={view}
        targetType={targetType}
        stats={stats}
      />

      <div className='patternItemCoreHead'>Core Features:</div>
      <CoreFeatures
        width={155}
        patternID={data.ID}
        attributes={data.shaps[target].slice(0, 3).map(d => d.attr)} // Render first 3 shaps
        attrDesc={data.attributes}
        catLabels={catLabels}
        attrSummary={overallSummary.attributes}
        highlightedFeatures={highlightedFeatures}
      />

      {additionalTxt}
    </div>
  );
}

/**
 * Renders a draggable pattern card
 * @param {string} target - The mining target attribute or feature
 * @param {string} targetType - The mining target type
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {json} overallSummary - Summary of the dataset and mining results
 * @param {int} listId - The list ID or index
 * @param {json} data - Pattern description
 * @param {int} index - Pattern index within the list
 * @param {boolean} showPattern - Flag indicating if the card is shown - filters use this flag to hide the card
 * @param {array} patternSetMin - A minimal version of the pattern list set
 * @param {json} selectedPattern - Object containing details of the selected pattern
 * @param {array} highlightedFeatures - List og highlighted features
 * @param {function} changePatternName - Function to change the name of a pattern 
 * @param {function} onSelectPattern - Function to select a pattern card
 * @param {function} changeList - Function that handles moving a pattern to a different list
 * @param {array} likedPatterns - The list patterns that have been added to the output/liked
 * @param {function} toggleAddOutput -  The function that handles adding/removing a pattern from the output/liked list
 * @param {json} allTags - An object mapping the names of all pattern tags to colors
 * @param {boolean} showCardEdit - Flag indicating if the card edit menu is shown
 * @param {function} onShowCardEdit - Function to show the card edit menu
 */
export const DraggablePatternCard = (props) => {
  const { listId, index, showPattern, selectedPattern, highlightedFeatures, data } = props

  // Determine if a pattern is selected
  const isSelected = selectedPattern != null
                    && props.data.ID == selectedPattern.patternID

  const opacity = highlightedFeatures.length == 0 || intersection(highlightedFeatures, data.core).length > 0
                         ? 1
                         : 0.45

  /**
   * Changes pattern style when it is being dragged
   * @param {json} draggableStyle - style object forwarded by beautiful-dnd
   * @param {boolean} isDraggingOver - Flag indicating if the list item is selected.
   */
  const getItemStyle = (draggableStyle, isSelected) => ({
    // change background colour if dragging
    background: "#ffffff",
    margin: isSelected ? '5px 5px 15px 5px' : '5px 10px 15px 10px',
    cursor: 'pointer',
    border: isSelected ? '5px solid #7f7f7f' : 'none',
    height: 'fit-content',
    padding: showPattern ? 10 : 0,
    ...draggableStyle,
    opacity: opacity
  })

  return (
    <Draggable
      key={index}
      draggableId={`List ${listId} Pattern ${index}`}
      index={index} >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className='patternItem'
            style={{...getItemStyle(
              provided.draggableProps.style,
              isSelected)}}>
              { showPattern ? <PatternCard {...props} /> : null }
          </div>
        )}
    </Draggable>
  );
}
