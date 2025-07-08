import React, { useState, useEffect } from 'react';

import SummaryStats from './SummaryStats';
import Chart from './charts/Chart';
import FeatureRangeBar from './charts/FeatureRangeBar';
import PatternName from './PatternName';
import PatternTags from './PatternTags';
import PatternTagEditorModal from './PatternTagEditorModal'
import HelpIcon from '../../../common/components/HelpIcon';

import "./css/PatternPeek.css"


/**
 * Renders the attribute ranges for the core attributes in a pattern
 * @param {json} width - the width of the parent component.
 * @param {json} patternID - The ID of the current pattern
 * @param {list} shaps - The list core attributes with their shapley values and ranges
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {json} attrRanges - The global ranges of all attributes
 * @param {string} selectedAttr - The name of the selected attribute
 * @param {function} onSelect - Function to change the selected core attribute
 * @param {json} filters - Object mapping attribute names to their filter status
 * @param {function} changeFilter - Function to set a filter on the data
 */
const CoreAttributes = (props) => {
  const { width, patternID, shaps, attrDesc, attrRanges, catLabels,
          selectedAttr, onSelect, filters, changeFilter } = props

  return(
    <div style={{display: 'inline-block', width: width-20, padding: 10}}>
      <div className='peekLabel' style={{display: 'block'}}>
        Core Features:
      </div>
      <div className='peekFilterLabel'>
        Filter
      </div>
      <div style={{display: 'inline-block', width: width-20, verticalAlign: 'top'}}>
      <FeatureRangeBar
        width={width-20}
        patternID={patternID}
        attributes={shaps.map(d => ({name: d.attr, pval: 0}))}
        attrDesc={attrDesc}
        catLabels={catLabels}
        attrSummary={attrRanges}
        selectedAttr={selectedAttr}
        onSelect={onSelect}
        filters={filters}
        changeFilter={changeFilter}
        shaps={shaps.reduce( (acc, d) => ({ ...acc, [d.attr]: [d.shap]}), {})}
      />
      </div>
    </div>
  )
}

/**
 * Renders a peek into the pattern details lists
 * @param {json} style - A style object for the div containing the pattern detail.
 * @param {string} view - The view type - 'peek' for this component 
 * @param {json} pattern - object containing the selected pattern details.
 * @param {json} selectedPattern - Object contianing the list id and card id of the selected pattern
 * @param {json} overallSummary - Summary of the dataset and mining results
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {string} target - The target attribute
 * @param {string} targetType - The mining target type
 * @param {function} changePatternName - Function to change the name of a pattern
 * @param {function} changeFilter - Function to set a filter on the data
 * @param {function} onSelectPattern - Function to select a pattern card
 * @param {function} onShowTable - Function to show the data table
 * @param {function} onDownloadData - Function to download the data as a csv
 * @param {function} toggleAddOutput -  The function that handles adding/removing a pattern from the output/liked list
 * @param {array} likedPatterns - The list patterns that have been added to the output/liked
 * @param {json} allTags - An object mapping the names of all pattern tags to colors
 * @param {function} addNewTag - The function that handles creating a new tag
 * @param {function} changePatternTag - The function that handles adding/removing a tag for a pattern
 */
const PatternPeek = (props) => {
  const { view, pattern, selectedPattern, overallSummary, catLabels, target, targetType, alpha,
	  changePatternName, changeFilter, onSelectPattern, onShowTable, onDownloadData, toggleAddOutput,
    likedPatterns, allTags, addNewTag, editTag, removeTag, changePatternTag }  = props

  if(pattern == null){
    return null
  }

  // True if pattern was liked, False o.w.
  const isLiked = likedPatterns.some(d=>d.ID===pattern.ID);

  const [selectedAttr, setSelectedAttr] = useState(pattern.shaps[target][0].attr)
  const [filters, setFilters] = useState( Object.keys(pattern.filters).reduce( (acc, k) => {
    if(pattern.filters[k] !='Off') {
      return [
        ...acc,
        {
          attr: k,
          type: pattern.filters[k],
          isCat: catLabels.hasOwnProperty(k),
          range: catLabels.hasOwnProperty(k) ? pattern.attributes[k].categories : [pattern.attributes[k].min, pattern.attributes[k].max]
        }
      ]
    }
    return acc
  }, []))
  const [showTagEditor, setShowTagEditor] = useState(false)

  // Update the selected attribute when the pattern in changed
  useEffect( () => {
    setSelectedAttr(pattern.shaps[target][0].attr)
  }, [pattern.ID]);

  // Update the filter object when a filter is changed
  useEffect( () => {
    const newFilters = Object.keys(pattern.filters).reduce( (acc, k) => {
      if(pattern.filters[k] !='Off') {
        return [
          ...acc,
          {
            attr: k,
            type: pattern.filters[k],
            isCat: catLabels.hasOwnProperty(k),
            range: catLabels.hasOwnProperty(k) ? pattern.attributes[k].categories : [pattern.attributes[k].min, pattern.attributes[k].max]
          }
        ]
      }
      return acc
    }, [])
    setFilters(newFilters)
  }, [pattern.filters]);

  /** Handles adding/removing from the liked list. */
  function onLike() {
    toggleAddOutput(pattern);
  }

   /** Handles showing an edit to add/remove tags from a pattern. */
  const onShowTagEdit = () => {
    setShowTagEditor(true)
  }

  return(
    <div>     
      <PatternName
        {...selectedPattern}
        name={pattern.name}
        isLiked={isLiked}
        fontSize={'14pt'}
        iconSize={'17pt'}
        margin={'10px 15px'}
        changePatternName={changePatternName}
      />

      <PatternTags
        cardTags={pattern.tags}
        allTags={allTags}
        size={"Large"}
        margin={'0px 10px'}
        hasAddBtn={true}
        onShow={onShowTagEdit}
      />

    <div style={{display: 'block', width: props.style.width-5, maxHeight: props.style.height-120, overflowX: "hidden", overflowY: "auto"}}>
      <SummaryStats
        view={view}
        type={targetType}
        alpha={alpha}
        pattern={pattern.stats[target]}
        overallSummary={overallSummary.stats[target]}
      />

      <Chart
        catLabels={catLabels}
        targetType={targetType}        
        X={selectedAttr}
        Y={target}
        filters={filters}
        width={460}
        height={360}
        padding={50}
        patternCats={pattern.attributes[selectedAttr].categories}
        xOptions={[...pattern.core, ...pattern.others.map(d=>d.name)]}
        setSelectedAttr={setSelectedAttr}
      />

      <CoreAttributes
        width={props.style.width}
        patternID={pattern.ID}
        shaps={pattern.shaps[target]}
        attrDesc={pattern.attributes}
        attrRanges={overallSummary.attributes}
        catLabels={catLabels}
        filters={pattern.filters}
        changeFilter={changeFilter}
        selectedAttr={selectedAttr}
        onSelect={setSelectedAttr}
      />
      </div>

      <div style={{width: "100%", textAlign: "center", marginTop: 5}}>
        <i className="material-icons detailIconBtn" onClick={onShowTable} title="View Pattern Data">
          table_view
        </i>

        <i className="material-icons detailIconBtn" onClick={onDownloadData} title="Download Pattern Data">
          download
        </i>

        <i className={`material-icons${isLiked ? '' : '-outlined'}  detailIconBtn`}
            onClick={onLike} title={`${isLiked ? "Remove from": "Add to"} Output`}>
          grade
        </i>
      </div>

      <div className="viewIconBox">
        <div className="viewIconHolder" onClick={() => props.changePatternView('detail')}>
          <i className="material-icons viewIcon">
              arrow_left
          </i>
        </div>
        <div className="viewIconHolder" onClick={() => onSelectPattern(selectedPattern.listID, pattern.ID)}>
          <i className="material-icons viewIcon">
              arrow_right
          </i>
        </div>
      </div>

      <HelpIcon
        textStyle={{whiteSpace: "pre-wrap"}}
        content={
          `This panel shows more information about the selected pattern that includes:
-The stats of the data points within this pattern and how they compare to the stats of all data points.
-A chart showing the data points based on filters.
-The ranges of the pattern's core attributes.`
        }/>

      <PatternTagEditorModal
        style={props.style}
        show={showTagEditor}
        listIdx={selectedPattern.listID}
        cardIdx={selectedPattern.cardID}
        allTags={allTags}
        cardTags={pattern.tags}
        addNewTag={addNewTag}
        editTag={editTag}
        removeTag={removeTag}
        changePatternTag={changePatternTag}
        onHide={() => setShowTagEditor(false)}
      />
    </div>
  );
}

export default PatternPeek;
