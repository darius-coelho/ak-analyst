import React, { useState, useEffect, useRef } from 'react'
import partition from 'lodash/partition';

import Form from 'react-bootstrap/Form';
import InfiniteScroll from "react-infinite-scroll-component";

import { AttributeListFilter, filterAttributeList } from "./AttributeListFilter"
import HelpIcon from '../../../common/components/HelpIcon';

import "../../../../css/Core.css"
import "./css/Transformer.css"



/**
 * Renders an element of the attribute list.
 * @param {json} data - Data for the attribute being rendered.
 * @param {list} transforms - List of transforms applied to attributes in the dataset
 * @param {string} selAttr - Name of the selected attribute
 * @param {list} deleted - List of deleted attributes
 * @param {bool} renderDeleted - Indicator if the attribute was deleted.
 * @param {fun} onSelect - Function to select an attribute
 * @param {function} onDelete - Funtion to delete an attribute
 */
function AttributeListEl(props) {
  const { data, transforms, selAttr, deleted, renderDeleted,
	  onSelect, onDelete } = props;
  
  let col = null
  if(data.name == selAttr){
    col = "#dadada"
  }

  let icon = null
  
  let iconTxt = ""
  if(data.hasMiss){
    iconTxt += "Attribute has missing values."
  }

  let coll = 0
  for(let i=0; i<data.coll.length; i++) {
    if( !(deleted.indexOf(data.coll[i].name) >=0) ) {
      coll++
    }
  }
  if(coll > 0){
    iconTxt += iconTxt.length > 0 ? "\n" : ""
    iconTxt += "Attribute is collinear with other attributes."
  }
  if(data.hasHighCard){
    iconTxt += iconTxt.length > 0 ? "\n" : ""
    iconTxt += "High cardinality."
  }  

  let oneUnique = false
  if(data.type == "Numerical" && data.min == data.max){
    oneUnique = true
  }

  if(data.type == "Nominal" && data.card == 1){
    oneUnique = true
  }


  if(oneUnique){
    iconTxt += iconTxt.length > 0 ? "\n" : ""
    iconTxt += "Single unique value."
  }  

  if(iconTxt.length > 0){
    icon = <div
    className="listIcon"
    style={{ 
      display: "inline-block",
      marginTop: 3, 
      verticalAlign: "middle"
    }}
    title={iconTxt}
      >
      <i className="material-icons-round" style={{color: "#ebfb00"}}>warning</i>
      <i className="material-icons-round" style={{color: "#000000", marginLeft: -24}}>
      warning_amber
    </i>
      </div>
  }

  let filt = null
  let trans = null

  for(let i=0; i < transforms.length; i++ ){
    if(data.name == transforms[i]['attr'] ){
      if(transforms[i].tType == "Filter"){
        filt = <i className="material-icons-outlined listIcon" >filter_list</i>
      }
      else{
        trans = <i className="material-icons-outlined listIcon" >handyman</i>
      }
    }
  }

  const divStyle = {
    opacity: renderDeleted ? 0.65 : 1,
    background: col,
  }

  return <div key={"attrAsg-"+data.name} className="listItem">
    <div className="listInnerItem" style={divStyle} onClick={() => onSelect(data.name)}>
    <label className="listLabel" title={data.name}>{data.name}</label>
    { icon }
    { filt }
    { trans }
    <div className="listContentRight">{data.type}</div>
    </div>
    <i className="material-icons-outlined hiddenIcon"
      onClick={() => onDelete([data.name])}>{renderDeleted ? "add" : "clear"}</i>
    </div>
}


/** 
 * Component which renders the infinite scrolling attribute list.
 * @param {list} attrsDesc - List containing [deleted, not deleted] attributes.
 * @param {str} selAttr - The selected attribute.
 * @param {list} transforms - List of transforms.
 * @param {list} deleted - List of deleted attributes.
 * @param {fun} onSelect - Callback when selecting an attribute.
 * @param {fun} onDelete - Callback when deleting an attribute.
 */
function Attributes(props) {
  const { attrsDesc, selAttr, transforms, deleted,
	  onSelect, onDelete } = props;

  // number of non-deleted attributes
  const nactive = attrsDesc[1].length;
  
  // all attributes with deleted ones last
  const attributes = attrsDesc[1].concat(attrsDesc[0]);
  
  const [attrs, setAttrs] = useState([]);
  
  useEffect(()=>{
    setAttrs(attributes.slice(0,20));
  }, [attrsDesc]);

  /** Updates the attributes list. */
  function fetchMoreData() {
    setAttrs(attrs.concat(attributes.slice(attrs.length, attrs.length+20)));
  }
  
  return (
    <InfiniteScroll
      dataLength={attrs.length}
      next={fetchMoreData}
      hasMore={attrs.length < attributes.length}
      loader={<h4>Loading...</h4>}
      scrollableTarget="attrListDiv" >
        {
          attrs.map((data,index)=> (
            <div key={`element-${data.name}`}>
              {
                index == nactive
                  ? <div key={index} style={{margin:5, marginTop:30, display: "block"}}>Deleted:</div>
                  : null
              }
              <AttributeListEl
                {...{data, transforms, selAttr, deleted, onSelect, onDelete}}
                renderDeleted={index >= nactive}	      
              />
            </div>
          ))
        }
    </InfiniteScroll>
  );

}


/**
 * Renders the list of selectable attributes in the data transformer.
 * @param {float} top - top css attribute.
 * @param {float} left - left css attribute.
 * @param {float} width - Width of the attribute list panel.
 * @param {float} height - Height of the attribute list panel.
 * @param {list} description - Description of each attribute.
 * @param {list} dataCount - The number of data items.
 * @param {list} transformations - List of transforms applied to attributes in the dataset
 * @param {int} selIdx - Index of the selected attribute.
 * @param {list} deleted - List of deleted attributes.
 * @param {fun} onSelect - Function to select an attribute.
 * @param {fun} onDelete - Function to delete an attribute.
 */
export function AttributeList(props) {
  
  if(props.description.length < 1)
    return null

  const searchInput = useRef(null);

  const { top, left, width, height,
          description, dataCount, transformations, selIdx, deleted,
          onSelect, onDelete } = props
  
  const [attrsDesc, setAttrsDesc] = useState(partition(description,
						       (d)=>deleted.indexOf(d.name) >= 0))
 
  const [searchString, setSearchString] = useState("")
  const [showFilter, setShowFilter] = useState(false)
  const [attrFilters, setAttrFilters] = useState(null)
  
  useEffect(() => {
    const newDescription = filterAttributeList(props.description, attrFilters)
    setAttrsDesc(partition(newDescription, function(d) { return props.deleted.indexOf(d.name) >= 0 }))
  }, [props.description, deleted.length]);

  /**
   * Toggles the filtering options
   */
  const onShowFilterChange = () => setShowFilter(!showFilter)

  /**
   * Sets temporary name for the attribute until it is applied.
   * @param {object} evt - Input event object.
   */
  const onChangeSearchString = (evt) => {
    const searchVal = evt.target.value
    setSearchString(searchVal)
  }

  /**
   * Defocuses search when enter key is hit
   */
  const defocusSearch = (evt) => {
    if (evt.keyCode === 13 || evt.keyCode === 27) { // On Enter or Esc
      searchInput.current.blur();
    }
  }  

  /**
   * Tracks the types of filters applied
   */
  const updateAttrFilters = (filters) => {
    const newDescription = filterAttributeList(props.description, filters)
    setAttrsDesc(partition(newDescription, function(d) { return deleted.indexOf(d.name) >= 0 }))
    setAttrFilters(filters)
  }

  /** Filters the attributes and combines them so that deleted attrs come last */
  const filteredAttrs = () => {
    const re = new RegExp(searchString, 'i');
    return [attrsDesc[0].filter(d=>d.name.match(re)),
	    attrsDesc[1].filter(d=>d.name.match(re))];
  }
  
  const outerStyle = {
    top: top, left: left, 
    width: width, height: height,
    display: 'flex', 
    flexDirection: 'column', 
    paddingBottom: 10
  }
  
  // attribute name that is currently focused
  const focusedAttr = (selIdx === null ? null :description[selIdx].name);

  return (
    <div className="contentdiv" style={outerStyle}>
      <HelpIcon
        content={
          `This panel lists all the attributes in the dataset.
          Each item displays the attribute name, data type, and icons indicating if the attribute was transformed,
          filtered, or has a warning(e.g. missing values, hig cardinality etc).`
        }
      />

      <label className="contentDivHead" title={"Attributes"}>Attributes</label>

      <div        
        className="contentInnerdiv"
        style={{
          top: 45,
          width: "calc(100% - 10px)",
          height: "calc(100% - 65px)",
          margin: 5
        }}>

      <input
        ref={searchInput}
        className='listSearchInput'
        type="text"
        placeholder="Search..."
        value={searchString}
        style={{display: "block"}}
        onChange={onChangeSearchString}
        onKeyDown={defocusSearch}
      />

      <Form.Check
        type="switch"
        label="Filter Attributes"
        name="attr_filter"
        className="listFilterOptionToggle"
        checked={showFilter}
        onChange={onShowFilterChange} />

      <div style={{display: showFilter ? "block" : "none"}}>
        <AttributeListFilter          
          dataCount={dataCount}          
          setFilters={updateAttrFilters}
          inlineStyle={true}
        />
      </div>
      </div>

      <div
        id="attrListDiv"
        className="contentInnerdiv"
        style={{
          top: 110 + (showFilter ? 240 : 0),
          width: "calc(100% - 10px)",
          height: `calc(100% - ${135 + (showFilter ? 240 : 0)}px)`,
          margin: 5
        }}>
          <Attributes
            attrsDesc={filteredAttrs()}
            selAttr={focusedAttr}
            transforms={transformations}
            deleted={deleted}
            onSelect={onSelect}
            onDelete={onDelete}
          />
      </div>
    </div>
  ); 
}

export default AttributeList;
