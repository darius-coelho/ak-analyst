import React, { useState, useEffect, useContext } from 'react';
import api from '../../../../../apis/api.js';

import Select from 'react-select';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import DataTable from '../../../charts/components/DataTable';

import MultiAttributeSelect from '../../../common/components/MultiAttributeSelect';

import HelpIcon from '../../../common/components/HelpIcon';

import { useInfoToastContext } from '../../../common/components/InfoToastContext.js';

import mixpanel from 'mixpanel-browser';

import "./css/Aggregator.css"

const AGGFUNC = [
  {value: "mean", label: "Mean", type: "Numerical"},
  {value: "min", label: "Min", type: "Numerical"},
  {value: "max", label: "Max", type: "Numerical"},
  {value: "std", label: "Standard Deviation", type: "Numerical"},
  {value: "var", label: "Variance", type: "Numerical"},
  {value: "sum", label: "Sum Total", type: "Numerical"},
  {value: "first", label: "First", type: "Numerical"},
  {value: "last", label: "Last", type: "Numerical"},
  {value: "size", label: "Count (All)", type: "Numerical"},
  {value: "count", label: "Count (Exclude NaN)", type: "Numerical"},
  {value: "max_count", label: "Most Frequent", type: "Nominal"},
  {value: "ohe", label: "One-Hot Encoding", type: "Nominal"}
]

const BINDAGGFUNC = {
  Index: [
    {value: "max_count", label: "Most Frequent"}
  ],
  Numerical:  [
    {value: "mean", label: "Mean"},
    {value: "min", label: "Min"},
    {value: "max", label: "Max"},
    {value: "std", label: "Standard Deviation"},
    {value: "var", label: "Variance"},
    {value: "sum", label: "Sum Total"},
    {value: "first", label: "First"},
    {value: "last", label: "Last"},
    {value: "size", label: "Count (All)"},
    {value: "count", label: "Count (Exclude NaN)"},
  ],  
  Nominal: [
    {value: "max_count", label: "Most Frequent"}
  ],
  Ordinal: [
    {value: "max_count", label: "Most Frequent"}
  ],
}

/**
  * Renders select components to bind attributes with corresponding aggregation functions
  * to an OHE transform on an attribute
  * @param: {string} attr - the key attribute  to which ohe is being applied
  * @param: {array} attrOptions - list of attribute objects for dropdown
  * @param: {function} onChangeFuncParam - function to set the aggregation function parameters for the current attribute
  * @param: {function} removeParam - function that handles removing a parameter from the parameter list
  */
 const OHEBindOptions = (idx, attrOptions, onChangeBindParam, removeOheBind) => {
  return (d, index) => {
    return <div className='aggBindOption' key={'oheOptions'+ idx + index}>
            <div className='aggBindInner'>
              <label className='aggBindLabel'>{"Bind:"}</label>
              <div className='aggBindSelect'>
                <Select
                  options={[{ label: "None", value: "None", type: "Numerical" }].concat(attrOptions)}
                  value={d.attr}
                  onChange={(values) => onChangeBindParam(idx, index, "attr", values)}
                  labelField={'oheBindAttr'+ idx + index}
                  valueField={'oheBindAttr'+ idx + index} />
              </div>

              <label className='aggBindLabel'>{"Method:"}</label>
              <div className='aggBindSelect'>
                <Select
                  options={BINDAGGFUNC[d.attr.type]}
                  value={d.func}
                  onChange={(values) => onChangeBindParam(idx, index, "func", values)}
                  labelField={'oheBindFunc'+ idx + index}
                  valueField={'oheBindFunc'+ idx + index} />
              </div>
            </div>
            
            
            <i className="material-icons-outlined aggBindRemove"
               onClick={() => removeOheBind(idx, index)}>
                {"clear"}
            </i>
          </div>
  }
}

/**
  * Renders select components to set aggregation functions
  * for each attribute in the data except the key attribute
  * @param: {string} aggKey - the key attribute  
  * @param: {array} attrOptions - list of objects that store the settings for each attribute 
  * @param: {object} funcParams - objects that maps attributes to the options for the aggregation function
  * @param: {function} onChangeFunc - function to set the aggregation function for the current attribute
  * @param: {function} updateOheBindParams - function to set the aggregation function parameters for the current attribute
  */
const AggFunctionMapper = (funcOptions, attrOptions, onChangeFunc, onChangeAttrs, removeItem, addOheBind, removeOheBind, onChangeBindParam) => {
  return (d, index) => {

    const customStyles = {
      valueContainer: base => ({
        ...base,
        overflow: "auto",
        maxHeight: 100,
        margin: 4
      }),
    };

    return(
      <div key={"agg"+index} className='aggMapItem'>
        <div className='aggFuncSelect'>
          <Select
            options={funcOptions}
            value={d.aggFunc}
            onChange={(value) => onChangeFunc(index, value)}
            labelField={'option-func-' + index}
            valueField={'option-func-' + index}
            className={'select-func-' + d.index}
            classNamePrefix={'select-func-' + d.index}
          />
          {
            d.aggFunc.value == "ohe"
            ? <div style={{textAlign: "center"}}>
                {d.bind.map(OHEBindOptions(index, attrOptions["All"], onChangeBindParam, removeOheBind))}
                <input
                  type="button"
                  className="coreButton aggBindAdd"
                  onClick={() => addOheBind(index)}
                  value={"+"}
                />
              </div>
            : null
          }
        </div>
        <div className='aggAttrSelect'>
          <MultiAttributeSelect
            attributes={attrOptions[d.aggFunc.type]}
            selected={d.attrs}
            onChange={(values) => onChangeAttrs(index, values)}
            styles={customStyles}
          />
        </div>
        <i 
          className="material-icons-outlined aggRemove"
          onClick={() => removeItem(index)}>
            {"clear"}
        </i>
      </div>
    )
  };
};

/**
* Renders the aggregator interface
*/
export function Aggregator(props) {
  
  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();

  const { processOutput, onHideAggregator } = props
  const { config, output } = props

  useEffect(()=>{
    mixpanel.track("Page View", {'name': 'aggregator'});
  }, []);
  
  // Select attributes and types based on single- or multiple-output parent nodes
  const attributes = props.input[props.input.outPort].columns
  
  const types = props.input[props.input.outPort].colTypes

  const [loaderDisplay, setloaderDisplay] = useState("none");
  
  // Attribute to aggregate over
  const [aggKey, setAggKey] = useState(config.aggKey);

  // Initialize attribute options
  const [attrOptions, setAttrOptions] = useState({
    All: attributes.map(d => {return { label: d, value: d, type: types[d] }}),
    Numerical: attributes
                .filter(d => types[d] == "Numerical")
                .map(d =>{
                  return { label: d, value: d, type: types[d] }
                }),
    Nominal: attributes
              .filter(d => types[d] == "Nominal" || types[d] == "Ordinal")
              .map(d =>{
                return { label: d, value: d, type: types[d] }
              })
  }); 

  const [attrAggMap, setAttrAggMap] = useState(
    Object.entries(config.aggMap).length == 0
    ? [
        {
          aggFunc: AGGFUNC[0],
          attrs: attrOptions["Numerical"],
          bind: []
        },
        {
          aggFunc: AGGFUNC[10],
          attrs: attrOptions["Nominal"],
          bind: []
        }
      ]
    : config.aggMap
  );
  
  const [funcOptions, setFuncOptions] = useState(
    Object.entries(config.aggMap).length == 0
    ? AGGFUNC.filter( d => !attrAggMap.map( v => v.aggFunc.value).includes(d.value) || d.value == "ohe")
    : AGGFUNC.filter( d => !Object.keys(config.aggMap).includes(d.value) || d.value == "ohe")
  )

  const [preview, setPreview] = useState(output[0] ? output[0].preview : null);

  useEffect(()=>{
    setAttrOptions({
      All: attributes
            .filter(d => d != aggKey)
            .map(d => {return { label: d, value: d, type: types[d] }}),
      Numerical: attributes
                  .filter(d => types[d] == "Numerical" &&  d != aggKey)
                  .map(d =>{
                    return { label: d, value: d, type: types[d] }
                  }),
      Nominal: attributes
                .filter(d => (types[d] == "Nominal" || types[d] == "Ordinal") && d != aggKey)
                .map(d =>{
                  return { label: d, value: d, type: types[d] }
                })
    })

    setAttrAggMap(attrAggMap.map( d => ({
      ...d,
      attrs: d.attrs.filter(d => d.value != aggKey)
    })))
  }, [aggKey]);

  useEffect(()=>{   
    setFuncOptions(
      AGGFUNC.filter( d => !attrAggMap.map( v => v.aggFunc.value).includes(d.value) || d.value == "ohe")
    )
  }, [attrAggMap]);

  /**
  * Adds an item to the aggregation function-attributes map
  */
   const onAddItemAggMap = () => {
    setAttrAggMap([
      ...attrAggMap,
      {
        aggFunc: funcOptions[0],
        attrs: [],
        bind: []
      }
    ])
  }

  /**
  * Removes an item from the aggregation function-attributes map
  * @param: {number} index - index of item to be removed
  */
  const onRemoveItemAggMap = (index) => {
    setAttrAggMap([...attrAggMap].filter((d,i) => i != index))
  }

  /**
  * Sets the key attribute for the aggregation
  * @param: {object} option - the attribute name in an object supported by react-select
  */
   const onChangeAggKey = (option) => {
    setAggKey(option.value)
  }
  
  /**
  * Sets the attributes to which an aggregation function maps
  * for an item in the aggregation function-attributes map
  * @param: {number} index - the index in the map
  * @param: {object} options - the attributes in a list of objects supported by react-select
  */
  const onChangeFunc = (index, option) => {
    let newAggMap = [...attrAggMap]
    newAggMap[index].aggFunc = option
    if(option.value == "ohe"){
      newAggMap[index].bind = [{
        attr: { label: "None", value: "None", type: "Numerical" },
        func: BINDAGGFUNC["Numerical"][0]
      }]
    }
    newAggMap[index].attrs = newAggMap[index].attrs.filter( d => d.type == option.type)    
    setAttrAggMap(newAggMap)
  }

  /**
  * Sets the aggregation function for an item in the 
  * aggregation function-attributes map
  * @param: {number} index - the index in the map
  * @param: {object} option - the aggregation function in an object supported by react-select
  */
   const onChangeAttrs = (index, options) => {
    let newAggMap = [...attrAggMap]
    newAggMap[index].attrs = options
    setAttrAggMap(newAggMap)
  }

  /**
  * Adds a binding to the list of bindings to OHE function for an item in the aggregation map
  * @param: {number} index - the index in the aggregation map
  */
  const addOheBind = (index) => {
    let newAggMap = [...attrAggMap]
    newAggMap[index].bind.push({
      attr: { label: "None", value: "None", type: "Numerical" },
      func: BINDAGGFUNC["Numerical"][0]
    })
    setAttrAggMap(newAggMap)
  }

  /**
  * Removes a binding from the list of bindings to OHE function for an item in the aggregation map
  * @param: {number} mapIdx - the index in the aggregation map
  * @param: {number} bindIdx - the index in the list of binding parameters
  */
  const removeOheBind = (mapIdx, bindIdx) => {
    if(attrAggMap[mapIdx].bind.length > 1){
      let newAggMap = [...attrAggMap]
      newAggMap[mapIdx].bind = newAggMap[mapIdx].bind.filter((d,i) => i != bindIdx)
      setAttrAggMap(newAggMap)
    }
    else {
      addInfoToast(
        "You must have at least one aggregation function bound to the One-hot-encoding method.",
        'danger'
      );
    }
  }

  /**
  * Changes a binding parameter for a binding in the list of bindings 
  * to the OHE function for an item in the aggregation map
  * @param: {number} mapIdx - the index in the aggregation map
  * @param: {number} bindIdx - the index in the list of binding parameters
  * @param: {string} param - the parameter being changed
  * @param: {object} option - the new value for the parameter in react-select format
  */
  const changeOheBindFunc = (mapIdx, bindIdx, param, option) => {
    let newAggMap = [...attrAggMap]
    const oldType = attrAggMap[mapIdx].bind[bindIdx].attr.type
    newAggMap[mapIdx].bind[bindIdx][param] = option
    if(param == "attr" && option.type != oldType) { 
      newAggMap[mapIdx].bind[bindIdx].func = BINDAGGFUNC[option.type][0]
    }
    setAttrAggMap(newAggMap)
  }  

  /**
  * Send a call to the server to perform the aggregation
  */
  function onApply() {   
    // Show loader
    setloaderDisplay("block")
    const handleResponse = (response) => {
      // Set aggregator config
        props.setParams({
          aggKey: aggKey,
          aggMap: attrAggMap
        })
        // Set aggregator output
        props.setOutput([processOutput(response.data.outputList[0])]);
        setPreview(response.data.outputList[0].preview)
        setloaderDisplay("none")            
    };

    const handleError = (error) => {
      setloaderDisplay("none")
      const errRes = error.response.data
      props.handleNodeError(errRes.nodeID, errRes.action_type, errRes.err)
      addInfoToast(error.response.data.err, 'danger');    
    };
    
    // Make request to API
    api.aggregate(props.ID, aggKey, attrAggMap, handleResponse, handleError);
  }

  return (
    <div className="ak-modal">
      <div className="ak-modal-content-fit" style={{textAlign: "left"}}>
        <label className="contentDivHead" title={"Aggregator"}>Aggregator</label>
        <HelpIcon 
          content={
            `This action allows you to aggregate rows in a dataset.
            To aggregate rows you must select a key column that will
            contain repeating keys that indicate which rows should be combined.
            You also must select aggregation functions for the remainder 
            of the columns that tell the software how to combine the rows.`
          }
        />
        <div className='aggregatorContent'>
          <Row>
            <Col lg='12' className='aggregatorHeaders'>Select Column to Aggregate Over</Col>
          </Row>
          <hr style={{padding: "0px", margin: "0px", marginBottom: "15px"}}/>
          
          <div className='aggKeySelect'>
            <Select
              isMulti={false}
              options={attrOptions["All"]}
              value={{value: aggKey, label: aggKey}}
              onChange={onChangeAggKey}
              labelField='name'
              valueField='name'
              className="selectAttr"
              classNamePrefix="selectAttr"
            />
          </div>

          <Row>
            <Col lg='12' className='aggregatorHeaders'>Select Aggregation Functions for Columns</Col>
          </Row>
          <hr style={{padding: "0px", margin: "0px", marginBottom: "15px"}}/>

          { // Display aggregation options for each attribute
            aggKey
            ? <div className='aggregatorMapBox'>
                {attrAggMap.map(AggFunctionMapper(
                                    funcOptions,
                                    attrOptions,
                                    onChangeFunc,
                                    onChangeAttrs,
                                    onRemoveItemAggMap,
                                    addOheBind,
                                    removeOheBind,
                                    changeOheBindFunc))}
                <input
                  type="button"
                  className="coreButton"
                  style={{marginTop: 25}}
                  onClick={onAddItemAggMap}
                  value={"Add Aggregation Function"}
                />
              </div>
            : <div className='aggregatorMapBox'>
                {"Please select an attribute to aggregate over."}
              </div>
          }

          { // Display data preview
            preview
            ? <div className='aggPreview'>
                <DataTable 
                  show={preview ? true : false}
                  rows={25}
                  data={preview ? preview : null}
                  top={0}
                  left={0}
                  width={"calc(100%)"}
                  height={"calc(100%)"}
                />
              </div>
            : null
          }
        </div>

        <div className="ak-modal-buttonBox">
          <input
            type="button"
            className="coreButton"
            onClick={onApply}
            value={"Apply"}
          />
          <input
            type="button"
            className="coreButton"
            onClick={onHideAggregator}
            value={"Done"}
          />
        </div>
      </div>
      
      <div className="loaderContainer" style={{display:loaderDisplay}}>
        <div className="loaderBarA" style={{top: "40%"}}/>
      </div>
    </div>
  )
}

export default Aggregator;
