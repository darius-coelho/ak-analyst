import React, { useState, useEffect } from 'react';

import SummaryStats from './SummaryStats';
import Chart from './charts/Chart';
import FeatureRangeBar from './charts/FeatureRangeBar';
import { PatternCard } from './PatternCard';
import PatternTags from './PatternTags';
import PatternTagEditorModal from './PatternTagEditorModal'
import HelpIcon from '../../../common/components/HelpIcon';

import Form from 'react-bootstrap/Form';

import "./css/PatternDetail.css"

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
const FeatureRanges = (props) => {
  const { target, pattern, width, height, patternID, attrRanges, catLabels,
          selectedAttr, onSelect, filters, changeFilter } = props

  const [showOtherAttrs, setShowOtherAttrs] = useState(false)

  const toggleShowOtherAttrs = () => setShowOtherAttrs(!showOtherAttrs)

  const coreHeight = showOtherAttrs
                     ? Math.min(162, pattern.shaps[target].length*54 + 40)
                     : height - 100
  const otherHeight = height - coreHeight - 100

  return(
    <div style={{display: 'inline-block', width: width, marginLeft: 10, marginBottom: 10, verticalAlign: 'top', maxHeight: height, overflow: "hidden"}}>
      <div className='peekLabel' style={{display: 'block'}}>
        Core Features:
      </div>
      <div className='peekFilterLabel'>
        Filter
      </div>
      <div style={{display: 'inline-block', width: width, verticalAlign: 'top', maxHeight: coreHeight, overflowX: "hidden", overflowY: "auto"}}>
        <FeatureRangeBar
          width={width}
          patternID={patternID}
          attributes={pattern.shaps[target].map(d => ({name: d.attr, pval: 0}))}
          attrDesc={pattern.attributes}
          catLabels={catLabels}
          attrSummary={attrRanges}
          selectedAttr={selectedAttr}
          onSelect={onSelect}
          filters={filters}
          changeFilter={changeFilter}
          isDetail={true}
          shaps={pattern.shaps[target].reduce( (acc, d) => ({ ...acc, [d.attr]: [d.shap]}), {})}
        />
      </div>
      <Form.Check
        type="switch"
        id="otther-attr-switch"
        data-testid="advancedSwitch"
        checked={showOtherAttrs}
        className="detailAttrToggle"
        onChange={toggleShowOtherAttrs}
        label="Other Features"
      />

      {
        showOtherAttrs
        ?
          <div style={{display: 'inline-block', width: width, verticalAlign: 'top', maxHeight: otherHeight, overflowX: "hidden", overflowY: "auto"}}>
            <FeatureRangeBar
              width={width}
              patternID={patternID}
              attributes={pattern.others}              
              attrDesc={pattern.attributes}
              catLabels={catLabels}
              attrSummary={attrRanges}
              selectedAttr={selectedAttr}
              onSelect={onSelect}
              filters={filters}
              changeFilter={changeFilter}
              isDetail={true}
              shaps={null}
            />
          </div>
          : null
      }

    </div>
  )
}

/**
 * Renders a horizontal list of patterns related to the pattern in the detail view
 * @param {number} width - The width of the list component
 * @param {number} height - The height of the list component
 * @param {string} title - Title of the pattern list
 * @param {json} pattern - Object containing the pattern details of the selected pattern.
 * @param {list} list - List of patterns to be rendered
 * @param {string} targetType - The mining target type
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {json} overallSummary - Summary of the dataset and mining results
 * @param {function} changePatternName - Function to change the name of a pattern
 * @param {function} onSelectPattern - Function to select a pattern in the list
 * @param {string} infoText - text to be displayed in the info tooltip
 */
const PatternDetailList = (props) => {
  const {width, height, title, pattern, list, target, targetType, catLabels, patternSetMin,
	 overallSummary, changePatternName, onSelectPattern, changeList,
	 infoText, likedPatterns, toggleAddOutput, allTags } = props

  return(
  <div className='detailListBox' style={{width: width, height: height}}>
    <div className='detailBackgroundBox' style={{width: width, height: height-20}}></div>
    <div className='detailListHead'>{title}</div>
    {
      list.length < 1
      ? <div className='detailCardHolder' style={{width: width-10}}>
        <div style={{margin: 10, fontStyle: "italic"}}>None</div>
        </div>
	    : <div className='detailCardHolder' style={{width: width-10}}>
        {
          list.map( (d, i) =>
          <div key={i} className="detailCard" >
            <PatternCard
              view={'detail'}
              patternSetMin={patternSetMin}
              compareSummary={pattern}
              target={target}
              targetType={targetType}
              listId={d.listID}
              data={d}
              catLabels={catLabels}
              allTags={allTags}
              overallSummary={overallSummary}
              highlightedFeatures={[]}
              index={d.cardID}
              key={i}
              changePatternName={changePatternName}
              onSelectPattern={onSelectPattern}
  	          changeList={changeList}
	            likedPatterns={likedPatterns}
	            toggleAddOutput={toggleAddOutput}
            />
          </div>
          )
        }
        </div>
    }
    <HelpIcon
      iconStyle={{right: "inherit", top: "inherit", marginTop: 5, marginLeft: width-27.4}}
      content={infoText}
    />
  </div>
  )
}

/**
 * Renders a detailed view of the pattern
 * @param {json} style - A style object for the div containing the pattern detail.
 * @param {string} view - The view type - 'detail' for this component 
 * @param {json} pattern - object containing the selected pattern details.
 * @param {json} selectedPattern - Object contianing the list id and card id of the selected pattern
 * @param {json} enhance - A list of patterns that are enhancements of the current pattern.
 * @param {json} generalize - A list of patterns that are generalizations of the current pattern.
 * @param {json} related - A list of patterns related to the current pattern.
 * @param {json} overallSummary - Summary of the dataset and mining results
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {string} target - The target attribute
 * @param {string} targetType - The mining target type
 * @param {array} patternSetMin - A minimal version of the pattern list set
 * @param {function} changePatternName - Function to change the name of a pattern
 * @param {function} changeFilter - Function to set a filter on the data
 * @param {function} onSelectPattern - Function to select a pattern card
 * @param {function} changeList - Function that handles moving a pattern to a different list
 * @param {function} onShowTable - Function to show the data table
 * @param {function} onDownloadData - Function to download the data as a csv
 * @param {function} toggleAddOutput -  The function that handles adding/removing a pattern from the output/liked list
 * @param {array} likedPatterns - The list patterns that have been added to the output/liked
 * @param {json} allTags - An object mapping the names of all pattern tags to colors
 * @param {function} addNewTag - The function that handles creating a new tag
 * @param {function} changePatternTag - The function that handles adding/removing a tag for a pattern
 */
const PatternDetail = (props) => {
  const { view, pattern, selectedPattern, enhance, generalize, related,
	  overallSummary, catLabels, target, targetType,  alpha, patternSetMin,
	  changePatternName, changeFilter, onSelectPattern, changeList,
	  onShowTable, onDownloadData, toggleAddOutput, likedPatterns,
    allTags, addNewTag, editTag, removeTag, changePatternTag }  = props

  if(pattern == null){
    return null
  }

  const [selectedAttr, setSelectedAttr] = useState(pattern.shaps[target][0].attr)
  const [filters, setFilters] = useState([])
  const [showTagEditor, setShowTagEditor] = useState(false)
  const [ newName, setNewName ] = useState(pattern.name)
  const [ newList, setNewList ] = useState(selectedPattern.listID)

  // Update the selected attribute when the pattern in changed
  useEffect( () => {
    setSelectedAttr(pattern.shaps[target][0].attr)
    setNewName(pattern.name)
    setNewList(selectedPattern.listID)
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

  const onChangeNewName = (evt) => {
    setNewName(evt.target.value)
  }

  const rename = () => {
    changePatternName(selectedPattern.listID, selectedPattern.cardID, newName)
  }

  const onChangeNewList = (evt) => {
    setNewList(evt.target.value)
  }

  const moveToList = (evt) => {
    changeList({
      source: { index: selectedPattern.cardID, droppableId: selectedPattern.listID },
      destination: { index: patternSetMin[newList].len, droppableId: newList }
    })
  }

  /** Handles showing an edit to add/remove tags from a pattern. */
  const onShowTagEdit = () => {
    setShowTagEditor(true)
  }

  /** Handles adding/removing from the liked list. */
  function onLike() {
    toggleAddOutput(pattern);
  }
  
  // True if pattern was liked, False o.w.
  const isLiked = likedPatterns.some(d=>d.ID===pattern.ID);
  const isNewName = pattern.name != newName
  const isNewList = selectedPattern.listID != newList

  const maxTagWidth = Math.max(100, props.style.width - (675 + isLiked*25 + isNewName*85 + isNewList*100))

  return(
    <div>
      <div className='detailMetaBox'>
          {
            isLiked
            ? <i className={`material-icons-sharp detailLikeIcon`}>
                star
              </i>
            : null 
          }
          <div className='detailLbl'>Name:</div>
          <input
            type="text"
            className='coreTextInput detailInput'
            value={newName}
            onChange={onChangeNewName}
          />
          {
            isNewName
            ? <button
                className="coreButtonSmall"
                disabled={newName.replace(/\s+/g, '').length <= 0}
                style={{verticalAlign: 'middle'}}
                onClick={rename}>
                  {"Set Name"}
              </button>
            : null
          }
          <div className='detailLbl'>Pattern List:</div>
          <select
            value={newList}
            className="coreTextInput detailDropdown"
            onChange={onChangeNewList}
          >
            {
              patternSetMin.map( (d,i) =>
                <option key={i} value={i}>{d.name}</option>
              )
            }
          </select>
          {
            isNewList
            ? <button
                className="coreButtonSmall"
                style={{verticalAlign: 'middle'}}
                onClick={moveToList}>
                 {"Move to List"}
              </button>
            : null
          }
          <div className='detailLbl'>Tags:</div>
          <div className='detailTagHolder' style={{maxWidth: maxTagWidth}}>
            <PatternTags
              cardTags={pattern.tags}
              allTags={allTags}
              size={"Large"}
              view={'detail'}
              margin={'0px 10px'}
              hasAddBtn={true}
              onShow={onShowTagEdit}
            />
          </div>
      </div>
      <div style={{display: 'inline-block', width: props.style.width-800, verticalAlign: 'top', height: props.style.height-320, overflow: "hidden", marginRight: 50}}>
        
        <div style={{width: "100%", textAlign: "center", margin: "5px 0px"}}>
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

        <SummaryStats
          view={view}
          type={targetType}
          alpha={alpha}
          pattern={pattern.stats[target]}
          overallSummary={overallSummary.stats[target]}
        />

        <FeatureRanges
          width={props.style.width-800-10}
          height={props.style.height-465}
          target={target}
          patternID={pattern.ID}
          pattern={pattern}
          attrRanges={overallSummary.attributes}          
          catLabels={catLabels}
          filters={pattern.filters}
          changeFilter={changeFilter}
          selectedAttr={selectedAttr}
          onSelect={setSelectedAttr}
        />        
      </div>

      <div style={{display: 'inline-block', width: 700, verticalAlign: 'top'}}>
        <Chart
          catLabels={catLabels}
          targetType={targetType}        
          X={selectedAttr}
          Y={target}
          filters={filters}
          width={700}
          height={Math.min(700, props.style.height-310-50)}
          padding={50}
          patternCats={pattern.attributes[selectedAttr].categories}
          xOptions={[...pattern.core, ...pattern.others.map(d=>d.name)]}
          setSelectedAttr={setSelectedAttr}
        />
      </div>

      <div style={{display: 'block', width: props.style.width, overflow: 'hidden'}}>
        <PatternDetailList
          width={(props.style.width-60)/3}
          height={260}
          title="Enhance"
          patternSetMin={patternSetMin}
          pattern={pattern}
          list={enhance}
          target={target}
          targetType={targetType}
          catLabels={catLabels}
          allTags={allTags}
          overallSummary={overallSummary}
          onSelectPattern={onSelectPattern}
          changePatternName={changePatternName}
          changeList={changeList}
          infoText={`This list contains patterns that are enhancements of the current pattern.
                     The selected pattern's core attributes are a subset of the core attributes of patterns in this list.
                     The ranges of the matching core attributes of patterns in this list fall within the ranges of those in the selected pattern.`}
          likedPatterns={likedPatterns}
          toggleAddOutput={toggleAddOutput}
        />
        <PatternDetailList
          width={(props.style.width-60)/3}
          height={260}
          title="Generalize"
          patternSetMin={patternSetMin}
          pattern={pattern}
          list={generalize}
          target={target}
          targetType={targetType}
          catLabels={catLabels}
          allTags={allTags}
          overallSummary={overallSummary}
          onSelectPattern={onSelectPattern}
          changePatternName={changePatternName}
          changeList={changeList}
          infoText={`This list contains patterns that are generalizations of the current pattern.
                     The core attributes of patterns in this list are a subset of the core attributes of the selected pattern.
                     The ranges of the selected pattern's core attributes fall within the ranges of those in the patterns in the list.`}
          likedPatterns={likedPatterns}
          toggleAddOutput={toggleAddOutput}
        />
        <PatternDetailList
          width={(props.style.width-60)/3}
          height={260}
          title="Related Patterns"
          patternSetMin={patternSetMin}
          pattern={pattern}
          list={related}
          target={target}
          targetType={targetType}
          catLabels={catLabels}
          allTags={allTags}
          overallSummary={overallSummary}
          onSelectPattern={onSelectPattern}
          changePatternName={changePatternName}
          changeList={changeList}
          infoText={`This list contains patterns that are related to the current pattern.
                     Related patterns are those whose data points significanlty overlap with those of the selected pattern.`}
          likedPatterns={likedPatterns}
          toggleAddOutput={toggleAddOutput}
        />
      </div>

      <div className="viewIconBox">
        <div className="viewIconHolder" onClick={() => props.changePatternView('peek')}>
          <i className="material-icons viewIcon">
              arrow_right
          </i>
        </div>
      </div>
     
      <HelpIcon
        textStyle={{whiteSpace: "pre-wrap"}}
        content={
          `This panel shows detailed information about the selected pattern that includes:
-The pattern name and the list it belongs which can be edited.
-The stats of the data points within this pattern and how they compare to the stats of all data points.
-The ranges of the pattern's core attributes as well as the other attributes along with the distribution of the attribute values across the dataset.
-A chart showing the data points based on filters.
-Three lists that show patterns that are enhancements, generalization, and related to the selected pattern.`
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

export default PatternDetail;
