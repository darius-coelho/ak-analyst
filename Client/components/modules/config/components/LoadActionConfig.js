import React, { useState } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form'
import FormControl from 'react-bootstrap/FormControl'
import InputGroup from 'react-bootstrap/InputGroup'

import CreatableSelect from 'react-select/creatable';

import LoaderLocal from './LoaderLocal';
import LoaderServer from './LoaderServer';
import LoaderCloud from './LoaderCloud';

import "../../../css/Core.css"

const toPlainObj = (file) => {
  return JSON.parse(JSON.stringify(file));
};

function Options(props) {
  if (!props.config)  return null;  

  if (!props.config.options)  return null;

  const [showAdvanced, setShowAdvanced] = useState(false);
  const onChangeAdvanced = () => setShowAdvanced(!showAdvanced);

  const [inputValue, handleInputChange] = useState('');
  const onInputChange = (inputValue) => handleInputChange(inputValue);  
  
  /**
   * Function that handles changing an option value
   * @param {Object} event - Javascript event object.
   */
  const onChange = (event) => {
    let val = event.target.value
    if(event.target.name == "skipEmpty"){
      val = event.target.checked
    }
    let options = (props.config != null ? props.config.options || {} : {});
    props.setParams({
      ...props.config,
      options: {
        ...options,
        [event.target.name]: val
      }
    });
  }
  
  /**
   * Function that sets values to be detected as NA 
   * in the react-select CreatableSelect component
   * @param {List} newValue - List of values to be shown in the react-select.
   * @param {Object} actionMeta - react-select action object.
   */
  const handleChange = (newValue, actionMeta) => {    
    let options = (props.config != null ? props.config.options || {} : {});
    props.setParams({
      ...props.config,
      options: {
        ...options,
        naOptions: newValue
      }
    });
  };

  // Removes the dropdown button for react-select
  const components = {
    DropdownIndicator: null,
  };
  
  // Style object for react-select
  const selectStyle ={
    control: (styles) => ({ 
        ...styles,
       backgroundColor: 'white',       
       borderTopLeftRadius: 0,
       borderBottomLeftRadius: 0,
       padding: 0,    
       minHeight: 32,   
       fontSize: 13,
       overflow: "hidden"
    }),       
    multiValueLabel: (styles) => ({
      ...styles,
      padding: 2,
    }),
  };

  return (
    <Container>
    <div style={{textAlign: "left", marginTop:10}}>
      <Row><Col lg='12' style={{fontSize: "15px"}}>Options</Col></Row>
      <hr className="lineDivide"/>
      <Row data-testid="loadFileOptions">     
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: 160, height: 32}}>Encoding</InputGroup.Text>
          <Form.Select 
            aria-label="encoding"
            name="encoding"
            value={props.config.options.encoding}
            onChange={onChange}
          >
            <option value="utf_8">utf_8</option>
            <option value="utf_16">utf_16</option>
            <option value="utf_32">utf_32</option>
            <option value="ascii">ascii</option>
            <option value="latin_1">latin_1</option>
          </Form.Select>
        </InputGroup>
        
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon1" style={{width: 160, height: 32}}>Column Delimiter</InputGroup.Text>
          <FormControl
            name="delim"
            aria-label="delim"
            aria-describedby="basic-addon1"
            value={props.config.options.delim}
            onChange={onChange}
          />
        </InputGroup>
        
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: 160, height: 32}}>Line Delimiter</InputGroup.Text>
          <FormControl
            name="lineDelim"
            aria-label="lineDelim"
            aria-describedby="basic-addon2"
            value={props.config.options.lineDelim}
            onChange={onChange}
          />
        </InputGroup> 

          <InputGroup size='sm' className="mb-3">            
            <Form.Check 
              type="switch"
              id="custom-switch"
              data-testid="advancedSwitch"
              checked={showAdvanced}
              onChange={onChangeAdvanced}
              label="Advanced Options"
            />    
          </InputGroup>    
      </Row>

      {
        showAdvanced
        ? <Row data-testid="loadFileOptions-Advanced">            
            <InputGroup size='sm' className="mb-3">
              <InputGroup.Text id="basic-addon2" style={{width: 160, height: 32}}>Header Row</InputGroup.Text>
              <FormControl              
                name="headerRow"
                aria-label="header-row"
                aria-describedby="basic-addon2"
                value={props.config.options.headerRow}
                onChange={onChange}
              />   
            </InputGroup>                     

            <InputGroup size='sm' className="mb-3">
              <InputGroup.Text id="basic-addon2" style={{width: 160, height: 32}}>Skip Rows after Header</InputGroup.Text>
              <FormControl              
                name="startLine"
                aria-label="startLine"
                aria-describedby="basic-addon2"
                value={props.config.options.startLine}
                onChange={onChange}
              />      
            </InputGroup> 

            <InputGroup size='sm' className="mb-3">
              <InputGroup.Text id="basic-addon2" style={{width: 160, height: 32}}>Escape Character</InputGroup.Text>
              <FormControl              
                name="escapechar"
                aria-label="escapechar"
                aria-describedby="basic-addon2"
                value={props.config.options.escapechar}
                onChange={onChange}
              />      
            </InputGroup>

            <InputGroup size='sm' className="mb-3">
              <InputGroup.Text id="basic-addon2" style={{width: 160, height: 32}}>Comment Character</InputGroup.Text>
              <FormControl              
                name="comment"
                aria-label="comment"
                aria-describedby="basic-addon2"
                value={props.config.options.comment}
                onChange={onChange}
              />      
            </InputGroup> 

            <InputGroup size='sm' className="mb-3">
              <InputGroup.Text id="basic-addon2" style={{width: 160, height: 32}}>Thousands Separator</InputGroup.Text>
              <FormControl              
                name="thousands"
                aria-label="thousands"
                aria-describedby="basic-addon2"
                value={props.config.options.thousands}
                onChange={onChange}
              />      
            </InputGroup> 

            <InputGroup size='sm' className="mb-3">
              <InputGroup.Text id="basic-addon2" style={{width: 160, height: 32}}>Decimal Character</InputGroup.Text>
              <FormControl              
                name="decimal"
                aria-label="decimal"
                aria-describedby="basic-addon2"
                value={props.config.options.decimal}
                onChange={onChange}
              />      
            </InputGroup> 

            <InputGroup size='sm' className="mb-3">
              <InputGroup.Text id="basic-addon2" style={{width: 160}}>NA Values</InputGroup.Text>
              <div style={{width: "calc(100% - 160px)"}}>
              <CreatableSelect   
                styles={selectStyle}
                components={components}                        
                isClearable
                isMulti           
                onChange={handleChange}
                options={props.config.options.naOptions}
                inputValue={inputValue}
                onInputChange={onInputChange}
                placeholder="Type additional NA values"
              />
              </div>
              
            </InputGroup>

            <InputGroup size='sm' className="mb-3">
              <Form.Check
                style={{width: 160, height: 32}}
                type="checkbox"
                id="skipRows-check"
                name="skipEmpty"
                checked={props.config.options.skipEmpty}
                onChange={onChange}
                label="Skip Empty Rows"
              />  
            </InputGroup> 

          </Row>
        : null
      }      
      </div>
      </Container>
  );
}



function Preview(props) {
  if (!props.config)  return null;

  const { rawPreview } = props.config;

  if (!rawPreview)  return null;
  var rowWidth = 100
  for(var i=0; i<rawPreview.length; i++){
    rowWidth = Math.max(6*rawPreview[i].length, rowWidth)
  }
  const previewRowDiv = (i) => {
    return {
      width: rowWidth, 
      padding: "10px", 
      background: i%2 == 0 ? "#ececec" : "#ffffff", 
      fontSize:12
    }
  }
  return (
    <Container>
    <div data-testid="rawPreview" style={{textAlign: "left", marginTop:20}}>
      <Row><Col lg='12' style={{fontSize: "15px"}}>Raw Data Preview</Col></Row>
      <hr className="lineDivide"/>
      <Row><Col lg='12'>
      <div style={{border: "solid 1px lightgray", padding: "8px", overflow: "auto", maxHeight: 500}} >   
      {rawPreview.map((d,i) => (
        <div key={'rawPreview'+i} style={previewRowDiv(i)}>  
          {d}
        </div>
      ))}
      </div>
      </Col>
      </Row>                 
    </div>
    </Container>
  )
}

function Loader(props){
  if(props.type == 'LOAD_FILE'){
    return process.env.akaWeb == 1
        ? <LoaderServer {...props} />
        : <LoaderLocal {...props} />
  }
  if(props.type  == 'LOAD_CLOUD'){
    return <LoaderCloud {...props} />
  }
  return null
}

/** Component which handles toggling where to store the data. */
function InCacheToggle({ config, pathTo, setParams, setOutput }) {
  let { inMemory } = config;

  const output = pathTo().output;
  
  /** Toggles whether to store data in memory or on dist. */
  function toggleInMemory(e) {
    setParams({
      ...config,
      inMemory: !e.target.checked
    });

    // output shouldn't change
    setOutput({...output});
  }

  
  return (
      <Container>
      <InputGroup size='sm' className="mt-2">            
      <Form.Check 
        type="switch"
        id="inmem-switch"
        data-testid="inmemSwitch"
        checked={!(inMemory || false)}
        onChange={e=>toggleInMemory(e)}
        label="Store data on disk"
      />    
      </InputGroup>
      </Container>
  );
}

export function LoadActionConfig(props) {
  return (
    <div 
      className="contentInnerdiv" 
      style={{
        width: "calc(100% - 10px)",
        height: "calc(100% - 115px)",
        margin: 5
      }}>
      <Loader {...props} />
      <InCacheToggle {...props} />
      <Options {...props} />
      <Preview {...props} />
    </div>  
  );
}

export default LoadActionConfig;
