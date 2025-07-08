import React, { useState } from 'react';

import Select from 'react-select';

import Container from 'react-bootstrap/Container';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import CloseButton from 'react-bootstrap/CloseButton';
import ListGroup from 'react-bootstrap/ListGroup';
import FormControl from 'react-bootstrap/FormControl'
import DefaultMessage from './DefaultMessage';

import { isNodeDualOutput } from '../../graph/components/Action.prototype'

import '../css/General.css';

/** Renders a dropdown to add a column to the column set to join on. */
function ColumnSelect(props) {
  const { name } = props;
  const { config, setParams } = props;

  const options = props.columns.map(col=>{
    return {label: col, value: col};
  });

  const onChange = (val) => {
    const joinCols = ('join' in config ? [...config.join] : [[null, null]]);
    joinCols[props.id][props.index] = val.value;
    
    setParams({
      ...config,
      join: joinCols
    });    
  }

  const customStyles = {
    control: base => ({
      ...base,
      height: '2.5rem',
      minHeight: '2.5rem'
    })
  };
  // Set the previous value.
  const defaultVal = (props.val === null ? [] : [{name: props.val}]);
  const selectStyle = {
    width: '10rem', 
    fontSize: '0.8rem'
  };

  return (
      <div style={selectStyle}>
      <Select options={options}
    value={props.val === null ? [] : {value: props.val, label: props.val}}
    onChange={onChange}
    styles={customStyles}
    menuPortalTarget={document.querySelector('body')}
      />
      </div>
  );
}

/** Renders a row of dropdowns to select a column set to join on. */
function RowSelect(props) {
  const {fileName, config, input, setParams, isFirst, rowId} = props;

  const joinArr = config.join;
  const onAdd = () => {
    setParams({
      ...config,
      join: [...joinArr, [null, null]]
    });
  }

  const cProps = {
    ...props,
    ...input[input.outPort],
    index: rowId, 
    val: null
  };
  return (      
      <Row>
        <Col lg={9} className="mt-3">
          <Row key={`row-sel-${rowId}`} style={{flexWrap: 'nowrap'}}>
      {
	joinArr.map((j, i)=>(
	    <Col key={`col-sel-${i}`}>
	      <ColumnSelect {...{...cProps, id: i, val: j[rowId]}} />
	    </Col>
	))
      }
            {isFirst ? <Col><Button variant="light" onClick={onAdd}>+</Button></Col> : null}
          </Row>
        </Col>
      </Row>
  );
}

/** Renders a button for canceling a column set to join on. */
function CancelRow(props) {
  const { config, setParams } = props;
  const join = config.join;

  const onDelete = (index)=>{
    setParams({
      ...config,
      join: join.filter((item,loc)=>loc!==index)
    });
  }
  
  return (      
      <Row>
      <Col key={'cancel-col'} lg={9} className="mt-3">
      <Row key={'cancel-row'} style={{flexWrap: 'nowrap'}}>
      {
	join.map((j, i)=>(
	    <Col key={`cancel-${i}`}>
	      <div style={{width: '10rem'}}>
	        <CloseButton
	          onClick={()=>onDelete(i)}
	          style={{display: i===0 ? 'none' : 'block', margin: 'auto'}} />
	      </div>
	    </Col>
	))
      }
          </Row>
        </Col>
      </Row>
  );
}

/** Renders a vertical list of filenames. */
function FileNameCol({ fileNames }) {
  const styles = {
    height: '2.5rem',
    paddingTop: '0.5rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  };
  
  return fileNames.map((name)=><Col className="mt-3" title={name} style={styles}>{name}</Col>);
}

/** Renders a table view for handling changes to the columns to merge on. */
function Table(props) {
  const { config, input, setParams } = props;
  const fileNames = input.map((iput)=>iput[iput.outPort].name);
  const joinArr = config.join;

  return (
      <div>
      <Row style={{fontSize: '0.85rem', textAlign: 'center'}}>
        <Col lg={3}>File Name</Col><Col lg={9}>Columns To Join On </Col>
      </Row>
      <hr style={{padding: 0, margin: 0, marginBottom: '0.5rem'}} />
      <Row>
        <Col lg={3} className="lightgray-border p-1"><FileNameCol fileNames={fileNames} /></Col>
        <Col lg={9} className="m-0 p-0 thin-scroll lightgray-border">
        <Col className="p-1 mb-1">
      {
	input.map((iput, i)=>(
	    <RowSelect key={`rs-${i}`}
	      config={config}
    	      input={iput}
	      setParams={setParams}
	      isFirst={i===0}
	      rowId={i} />
	))		  
      }
          <CancelRow {...{config, setParams}} />
        </Col>
      </Col>
      </Row>
      </div>
  );    
}

// Component for handling selecting columns to join from the two datasets.
function SelectToJoin(props) {
  const leftFileName = props.input[0][props.input[0].outPort].name;
  const rightFileName = props.input[1][props.input[1].outPort].name;
  
  return (
      <Container>      
      <Table {...props} />
      </Container>
  );
}

function RadioGroup(props) {
  const { config, setParams } = props;
  const { how } = config;
  const onChange = (evt) => {
    setParams({
      ...config,
      how: evt.target.value
    });
  }
  
  return (
      <ListGroup onChange={onChange} horizontal style={{width:"fit-content", margin: "auto"}}>
        <ListGroup.Item>
        <input type="radio" value="left" name="join-type" defaultChecked={how==="left"}/> Left
        </ListGroup.Item>

        <ListGroup.Item>
        <input type="radio" value="right" name="join-type" defaultChecked={how==="right"}/> Right
        </ListGroup.Item>

        <ListGroup.Item>
        <input type="radio" value="inner" name="join-type" defaultChecked={how==="inner"}/> Inner
        </ListGroup.Item>

        <ListGroup.Item>
        <input type="radio" value="outer" name="join-type" defaultChecked={how==="outer"}/> Outer
        </ListGroup.Item>
      </ListGroup>    
  );
}

/** Component which renders an inputs for adding suffixes
 * to overlapping columns in the datasets being joined. 
 * @param {array} props.input - The list of file inputs to the join action.
 * @param {object} props.config - The join config.
 * @param {object} props.setParams - The reducer funtion to set the config.
 */
function ColumnSuffix(props) {
  const { config, input, setParams } = props;
  const fileNames = input.map((iput)=>iput[iput.outPort].name);

  /** Handles changes to the suffix fields */
  const onChange = (evt, index) => {
    let suffix = [...config.suffix];
    suffix[index] = evt.target.value;
    
    setParams({
      ...config,
      suffix: suffix,
      isDefaultSuffix: false,
    });
  }
  
  return (
    <Container>
      <Row>
      <Col key={'filename-col'} lg={3} className="lightgray-border p-1">
        <FileNameCol fileNames={fileNames} />
      </Col>
      <Col key={'suffix-col'} lg={9} className="lightgray-border p-1 pe-2">
      {
	input.map((iput, index)=>(
	  <Col key={`sfx-${index}`} className="mt-3">
            <FormControl              
              name="leftSfx"
              aria-label="left-Sfx"
              aria-describedby="basic-addon2"
              value={config.suffix[index]}
              onChange={(evt)=>onChange(evt, index)} />
	  </Col>
	))
      }
      </Col>
      </Row>
    </Container>
  );
}


export function JoinActionConfig(props) {
  const { input, setParams, ...config} = props;
  
  return (
    <div 
      className="contentInnerdiv" 
      style={{
        width: "calc(100% - 10px)",
        height: "calc(100% - 115px)",
        margin: 5
      }}>
      <Container>
        <Row style={{marginTop: 20}}>
          <Col lg='12' style={{fontSize: "15px"}}>Select Join Column</Col>
        </Row>
        <hr style={{padding: "0px", margin: "0px", marginBottom: "15px"}}/>
        <SelectToJoin {...{config, input, setParams}}/>
        
        <Row style={{marginTop: 40}}>
          <Col lg='12' style={{fontSize: "15px"}}>Join Type</Col>
        </Row>
        <hr style={{padding: "0px", margin: "0px", marginBottom: "15px"}}/>
        <RadioGroup {...{config, setParams}} />

        <Row style={{marginTop: 40}}>
          <Col lg='12' style={{fontSize: "15px"}}>Overlapping Column Suffix</Col>
        </Row>
        <hr style={{padding: "0px", margin: "0px", marginBottom: "15px"}}/>
        <ColumnSuffix {...{config, input, setParams}}/>
      </Container>
    </div>
  );
}

export default JoinActionConfig;
