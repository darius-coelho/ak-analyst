import React, { useState,  useEffect, useContext } from 'react'
import axios from "axios"

import { ConfirmDialog } from '../../../common/components/ConfirmDialog'

import AddressContext from "../../../../AddressContext";

import { useInfoToastContext } from '../../../common/components/InfoToastContext';

import AttrRenameControl from './control/AttrRenameControl';
import AttributeTypeControl from './control/AttributeTypeControl'
import OrdinalOrderControl from './control/OrdinalOrderControl';
import AttributeSummary from './AttributeSummary';
import AttributeTransforms from './AttributeTransforms'
import NotificationList from './notifications/NotificationList';
import TransformList from './TransformList'
import UnsampledOptions from './UnsampledOptions';
import HelpIcon from '../../../common/components/HelpIcon';

import "../../../../css/Core.css"
import "./css/Transformer.css"

const AttributeDetails = (props) => {

  const { description, attributes, attrTypes, orderings, deleted,
          dataCount, data, isSample, transformations,
          onDelete, onDuplicateAttribute, onTransformAttribute, onHideTransform,
          onDeleteTransform, onPreviewFilter, onJumpTo,
          top, left, width, height } = props

  // get react context that stores the web address for the ak engine api
  const context = useContext(AddressContext);

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();

  const [plotYAttr, setPlotYAttr] = useState(null) // Y-axis attribute for plot data. 
  const [plotData, setPlotData] = useState(null) // Y-axis attribute for plot data. 
  const [nranks, setNranks] = useState(3)  // Number of rank bins. 
  const [selectedCatsTmp, setSelectedCatsTmp] = useState([])
  const [transformType, setTransformType] = useState((description.type == "Numerical" || description.type == "DateTime") ? "Filter" : "FilterNom")
  const [showTransforms, setShowTransforms] = useState(true)
  const [showUnsampledOptions, setShowUnsampledOptions] = useState(false)
  

  
  // static getDerivedStateFromProps(props, state) {    
  //   if(props.description.name != state.description.name){
  //     return {
  //       description: props.description,
  //       selectedCatsTmp: [],     
  //       showTransforms: true,
  //       transformType: (props.description.type == "Numerical"
	// 		|| props.description.type == "DateTime") ? "Filter" : "FilterNom",
  //       plotData: null,
  //       plotYAttr: null,
  //       nranks: 3,
  //     };
  //   }
  //   return {
  //     description: props.description,
  //   };
  // }

  useEffect(() => {
    setSelectedCatsTmp([])
    setShowTransforms(true)
    setTransformType((description.type == "Numerical" || description.type == "DateTime") ? "Filter" : "FilterNom")
    setPlotData(null)
    setPlotYAttr(null)
    setNranks(3)
  }, [props.description.name]);

  /**
   * Gets the box plot data and updates this components state.
   * @param {string} yAttr - Y-attribute in the box-plot.
   */ 
  const onSetYAttr = (yAttr) => {
    const request = {'xattr': description.name, 'yattr': yAttr};
    const endPoint = context.address + "GetBoxPlot"
    axios.post(endPoint, request, {withCredentials: true})
      .then((response) => {
        setPlotData(response.data)
        setPlotYAttr(yAttr)
      },
      (err) => {
        console.warn(err)
        addInfoToast(err.response.data, 'danger');
      });
  }

  /**
   * Sets the number of ranks for the Rank transformation.
   * @param {int} nranks - Number of ranks/bins.
   */
  const onSetNRankBins = (n) => {
    setNranks(n)
  }

  /**
   * Sets a new name for the attribute.
   */
  const onRename = (newName) => {    
    var isNotValid = attributes.includes(newName) 
    if(isNotValid){
      addInfoToast(
        "Attribute name already exists, please use another name.",
        'danger'
      );
    }
    else{
      var transform = {
        attr: description.name,
        tType: "ColNameChange",
        name: newName
      }
      onTransformAttribute(transform)      
    }
  }

  /** Called when changing the data type of an attribute. */
  const onChangeType = (type) => {    
    let transform = {
      attr: description.name,
      tType: "Dtype",
      new_type: type,
    }
    if(type == 'Ordinal'){
      transform.ordering = [] 
      if(['Nominal', "Index"].includes(description.type)){
        transform.ordering = description.divisionAll
      }
    }
    
    onTransformAttribute(transform)
    if (type === "DateTime" || type === "Numerical")
      setTransformType("Filter");

    if (type === "Ordinal" || type === "Nominal")
      setTransformType("FilterNom");
  }  

  const onTransform = (transform, callback=null) => {
    transform.attr = description.name
    onTransformAttribute(transform, callback)
  }

  const onConfirmDeleteTransform = (uid) => {    
    ConfirmDialog(
      `Transforms that follow this one and depend on it will be hidden.
      Are sure you want to delete?`,
      () => onDeleteTransform({uid: uid})
    )
  }  

  const onConfirmHideTransform = (uid) => {    
    ConfirmDialog(
      `Hiding this transform will hide transforms that follow it. 
      Are sure you want to hide?`,
      () => onHideTransform({uid: uid})
    )
  }  

  const onChangeReplacement = (missFunc) => {
    let transform = {
      attr: description.name,
      tType: "Missing",
      method: missFunc,
      replaceVal: null
    }    
    if(missFunc == "Drop"){
      transform.tType = "Missing-" + missFunc
    }
    if(typeof missFunc === 'object' && missFunc !== null){      
      transform.tType = "Missing"
      transform.method = missFunc.tType
      transform.replaceVal = missFunc.replaceVal
    }
    onTransformAttribute(transform)
  }
  
  const onShowTransforms = () => {    
    setShowTransforms(!showTransforms)
  } 

  const onSetTransformType = (tType) => {       
    // Reset Numerical filter on changing away from filter transform
    if(transformType == "Filter"){
      onPreviewFilter({
        attr: description.name,
        lb: description.min,
        ub: description.max,
      })
    }    
    // Disable the plotData and plotYAttr values.
    setTransformType(tType)
    setPlotData(null)
    setPlotYAttr(null)
    setNranks(3)
    setSelectedCatsTmp([])
  }

  return (
    <div className="contentdiv" style={{top: top, left: left, width: width, height: height, overflow: "hidden"}}>
      <label className="contentDivHead" title={"Attribute Details"}>Attribute Details</label>
      <HelpIcon 
        content={
          `This panel shows the statistical summary for each attribute and
           a list of transformations that can be applied to the attribute. 
           It also shows a list of notifications associated with the attribute 
           and the list of transforms that have already been applied to it.`
        }
      />
      <div className="contentInnerdiv" style={{top: 50, left: 5, width: 0.55*(width) - 10, height: height-70}}>
        {
          isSample && description.type == "Ordinal"
          ? <button
              className="coreButtonSmall"
              style={{position: "absolute", right: 5, width: 105}}
              onClick={() => setShowUnsampledOptions(true)}>
                {"Out of Sample Options"}
            </button>
          : null
        }
        <AttrRenameControl
          name={description.name}
          onRename = {onRename} />
        
        <AttributeTypeControl
          type={description.type}
          onChangeType={onChangeType} />
        
        <OrdinalOrderControl
          isSample={isSample}
          type={description.type}
          categories={description.ordering}
          onTransform={onTransform} />
                                                  
        <AttributeSummary 
          description={description}
          dataCount={dataCount}
          selectedCatsTmp={selectedCatsTmp}
          plotData={plotData}
          plotYAttr={plotYAttr}
          nranks={nranks}
          onTransform={onTransform}
          width={0.55*(width) - 30}
          height={0.3*height}
          padding={50} />
                
        <AttributeTransforms 
          description={description}
          dataCount={dataCount}
          attributes={attributes}
          attrTypes={attrTypes}
          attr={description.name}
          onSetYAttr={onSetYAttr}
          onSetNRankBins={onSetNRankBins}
          onTransform={onTransform} 
          onPreviewFilter={onPreviewFilter}
          onSelectCats={setSelectedCatsTmp}
          setTransformType={onSetTransformType}
          transformType={transformType}
          width={0.55*(width) - 30} />              

        <div style={{textAlign: "center", marginTop: 35}}>              
          <button className="coreButton" onClick={onDuplicateAttribute} >{"Make Duplicate"}</button>
          <button className="coreButton" onClick={() => onDelete([description.name])}>{"Delete"}</button>        
        </div>
      </div>
      
      <NotificationList
        width={width}
        height={height}
        description={description}
        attrTypes={attrTypes}
        orderings={orderings}
        data={data}  
        dataCount={dataCount}
        deleted={deleted}
        onJumpTo={onJumpTo}
        showTransforms={showTransforms}
        onChangeReplacement={onChangeReplacement}
        onDelete={onDelete}
        setTransformType={onSetTransformType}
      />

      <TransformList 
        top={showTransforms ? 50 +height/2 : height-40}
        left={0.55*(width) + 5}
        width={0.45*(width) - 10 }
        height={height/2 - 70}
        attr={description.name}
        transforms={description.transforms}
        transformations={transformations}
        show={showTransforms}
        onShow={onShowTransforms}
        onHideTransform={onConfirmHideTransform}
        onDeleteTransform={onConfirmDeleteTransform}
      />

      <UnsampledOptions
        show={showUnsampledOptions}
        type={description.type}
        categories={description.ordering}
        onTransform={onTransform}
        onShow={setShowUnsampledOptions}
      />
    </div>       
  );
}


export default AttributeDetails;