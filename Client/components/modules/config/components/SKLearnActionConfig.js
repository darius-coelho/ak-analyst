import React, { useState, useEffect, useContext } from 'react';
import Select from 'react-select';

import api from '../../../../apis/api';

import AddressContext from "../../../AddressContext";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import InputGroup from 'react-bootstrap/InputGroup'
import Form from 'react-bootstrap/Form'
import FormControl from 'react-bootstrap/FormControl'
import MultiAttributeSelect from '../../common/components/MultiAttributeSelect';

import DefaultMessage from './DefaultMessage';
import TargetOption from '../../common/components/TargetOption';

import { SampleOptions } from './Options';
import { isInRangeInt } from '../../utilities/utilities'

import "../../../css/Core.css";
import "../../../css/Modal.css";


/** 
 * Helper for rendering configuration options for a model. 
 * @param {array} paramList - List of parameters for the selected model.
 */
export function Options(props) {
  const { paramList } = props;

  function onChange(evt) {
    // update config
    const params = paramList.map(param=>{
      if (param.name === evt.target.name) {
	      return {name: param.name, value: evt.target.value};
      }
      return param;
    })

    props.setParams({...props.config, paramList: params});
  }
  
  return paramList.map((param, pid) => {
    return (
	<Row className="pt-1" key={`row-${pid}`}>
          <InputGroup size='sm' className="mb-3">
	          <InputGroup.Text id="basic-addon1" style={{width: 160, height: 32}}>
              {param.name}
            </InputGroup.Text>
	          <FormControl
              name={param.name}
              aria-label={param.name}
              aria-describedby="basic-addon1"
              value={param.value}
              onChange={onChange}
	          />
          </InputGroup>
	</Row>
    );
  });
}

/** Renders the cross validation options. */
function CVOptions(props) {
  const { config, setParams } = props;

  /** Handle setting the CV method */
  function onMethodChange (evt) {
    props.setParams({...config, cvMethod: evt.target.value});
  }


  /** Handle setting the number of cv folds */
  function onNFoldsChange(evt) {
    props.setParams({...config, numCVFolds: +evt.target.value});
  }

  
  /** Handle setting the number of random search iterations */
  function onNIterChange(evt) {
    props.setParams({...config, numIter: +evt.target.value});
  }
  
  return (
    <Row className="pt-1">
      <InputGroup size='sm' className="mb-3">
        <InputGroup.Text id="basic-addon1" style={{width: 160, height: 32}}>
        Method
        </InputGroup.Text>
        <Form.Select
          aria-label="cv-method"
          name="cv-method"
          value={config.cvMethod}
          onChange={onMethodChange}
        >
          <option value="RandomizedSearchCV">Random Search</option>
          <option value="GridSearchCV">Grid Search</option>
        </Form.Select>
      </InputGroup>
      
      <InputGroup size='sm' className="mb-3">
        <InputGroup.Text
          id="basic-addon1"
          style={{
            width: 160,
            height: 32,
            background: isInRangeInt(config.numCVFolds, 1, 100, 'include') ? "#e9ecef" : "#ffb9b9"
          }}>
            Num. Folds
        </InputGroup.Text>
        <FormControl
          name="folds"
          type="number"
          step={'1'}
          min={'1'}
          max={'100'}
          style={{color: isInRangeInt(config.numCVFolds, 1, 100, 'include') ? "#000000" : "#e32222"}}
          aria-label="folds"
          aria-describedby="basic-addon1"
          value={config.numCVFolds}
          onChange={onNFoldsChange}
        />
      </InputGroup>

    {
      config.cvMethod === "RandomizedSearchCV"
      ? <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon1" style={{width: 160, height: 32}}>
            Num. Iterations
          </InputGroup.Text>
          <FormControl
            name="niter"
            type="number"
            step={'1'}
            min={'1'}
            style={{color: isInRangeInt(config.numIter, 1, 'inf', 'include') ? "#000000" : "#e32222"}}
            aria-label="niter"
            aria-describedby="basic-addon1"
            value={config.numIter}
            onChange={onNIterChange}
          />
        </InputGroup>
      : null
    }
    </Row>
  );
}

/** Renders the switch element toggling cross-validation. */
function CrossValidateOptions(props) {
  const { config, setParams} = props;

  const { isCVEnabled } = config;

  /** Handle toggling the cross validation options */
  function onEnable(evt) {
    props.setParams({...config, isCVEnabled: evt.target.checked});
  }
  
  return (
    <div>
      <Form.Check
        type="switch"
        label="Cross Validate"
        name="cross_validate"
        className="optionLabel"
        checked={isCVEnabled}
        onChange={onEnable}
      />

    {
      isCVEnabled
	? <CVOptions {...props} />
	: null
    }
    </div>
  );
}

/** Renders Configuration parameters for the selected model. 
 * @param {array} paramList - List of parameters for the selected model.
 */
function Configuration(props) {
  const { paramList, config } = props;
  
  if (paramList.length == 0)  return null;

  const heightOffset = (
    config.isCVEnabled && config.cvMethod === "RandomizedSearchCV"
      ? 615  // adds extra space for num iterations
      : (
	config.isCVEnabled
	  ? 565  // space for cv options
	  : 455
      ));
  const transformDivStyle = {
    position: "absolute",
    width: "calc(100% - 30px)",
    //height: `calc(100% - ${heightOffset}px)`,
    overflowX: 'hidden',
    overflowY: "auto",
    margin: 3,
    width: "calc(100% - 30px)"
  }
 
  return (
      <div style={{textAlign: "left", marginTop: 20}}>
      <Row><Col lg='12' style={{fontSize: "15px"}}>Configuration
    {
      config.isCVEnabled
	? <span style={{fontSize: '10px'}}>
	{" (use comma separated values to indicate the param. grid.)"}
      </span>
	: null
    }
      </Col></Row>
      <hr className="lineDivide"/>
      <div style={transformDivStyle}>     
      <Options {...props} />
      </div>
      </div>
  );
}

/** Renders the configuration panel for the SKLearn action. */
export function SKLearnActionConfig(props) {
  // get react context that stores the web address for the ak engine api
  const context = useContext(AddressContext);
  const [modelList, setModelList] = useState([]);
  const [modelPackage, setModelPackage] = useState(
    props.config.model && props.config.model.module === 'statsmodels.api'
      ? 'statsmodels'
      : 'sklearn'
  );
  
  const paramList = props.config.paramList;
  const { input } = props;
  
  useEffect(()=>{
    const endPoint = context.address + "ModelList";
    const controller = new AbortController();
    const handleResponse = (response) => {
      const models = response.data.models;
      setModelList(models);   
    };
    const handleError = (error) => {
      console.error(error);
    };
    
    api.modelList(controller.signal, handleResponse, handleError);    
    return ()=>controller.abort();
  }, []);

  const incoming = input[0][input[0].outPort];
 
  // Select columns and types based on parent output port
  const columns = incoming.columns
  
  if(!columns){
    return <DefaultMessage text={'Data not ready. Run prior actions if any.'} />
  }
    
  const colTypes = incoming.colTypes    
    
  /** Handler called when the model is changed. */
  function onSelectedChange(selected) {

    const handleResponse = (response) => {
      props.setParams({
        ...props.config,
        model: selected,
        paramList: response.data.options
      });
    };

    const handleError = (error) => {
      console.error(error);
    };
    
    api.modelOptions(selected, handleResponse, handleError);
  }

  /** Handler called when the target is changed. */
  function onTargetChange(selected) {
    props.setParams({
      ...props.config,
      target: selected.value,
      
      // remove the target from predictors
      predictors: props.config.predictors.filter(d=>d!=selected.value)
    });
  }

  function onPredictorsChange(val) {
    props.setParams({
      ...props.config,
      predictors: val.map(d => d.value)
    });
  }; 
    
  const targetValue = (props.config.target
		       ? {label: props.config.target, value: props.config.target}
		       : []);
  
  const customStyles = {
    control: (styles) => ({ 
      ...styles, 
      borderRadius: "0px 4px 4px 0px"
    }),
  }
 
  const predictors = (props.config.predictors
		      ? props.config.predictors.map(d=>({label: d, value: d}))
		      : []);

  const message = "Non-numerical attributes cannot be set as a predictor. "+
	"You can change the type using the data transformer";

  /** On change package between sklearn and statsmodels. */
  function onPackageChange(evt) {
    setModelPackage(evt.target.value);

    // reset the model selection
    props.setParams({
      ...props.config,
      model: null,
      paramList: [],
      isCVEnabled: false
    });
  }
  
  return (
    <div 
      className="contentInnerdiv" 
      style={{
        width: "calc(100% - 10px)",
        height: "calc(100% - 115px)",
        margin: 5
    }}>
      <Container>
      <SampleOptions {...props} />
      <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: 130, height: 32}}>Package</InputGroup.Text>
          <Form.Select 
            aria-label="method"
            name="method"
            value={modelPackage}
            onChange={onPackageChange}
          >
            <option value="sklearn">Scikit Learn</option>
            <option value="statsmodels">Statsmodels</option>
          </Form.Select>      
        </InputGroup>
      <Row style={{marginTop: 15}}>
        <Col lg='12' style={{fontSize: "15px"}}>Select Model</Col>
      </Row>
      <hr style={{padding: "0px", margin: "0px", marginBottom: "10px"}}/>
      <Row style={{marginTop: 20}}>
        <div style={{width: "100%"}}>
          <Select
            value={(props.config.model || [])}            
            name="models"
            options={modelList.filter(d=>(modelPackage === "statsmodels"
					  ? d.module === 'statsmodels.api'
					  : d.module != 'statsmodels.api')
				     )}
            onChange={onSelectedChange}
          />
        </div>
      </Row>
      <Row style={{marginTop: 15}}>
        <Col lg='12' style={{fontSize: "15px"}}>Target Details</Col>
      </Row>
      <hr style={{padding: "0px", margin: "0px", marginBottom: "10px"}}/>
      
      <Row style={{marginTop: 20}}>
        <InputGroup size='sm' className="mb-2">
          <InputGroup.Text id="basic-addon2" style={{width: 130}}>Target</InputGroup.Text>
          <div style={{width: "calc(100% - 130px)"}}>
            <Select
              value={targetValue}
              styles={customStyles}
              name="target"
              options={columns.map(col=>({label: col, value: col}))}
              onChange={onTargetChange}    
            />
          </div>
      </InputGroup>
      </Row>

     <Row>
      <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: 130}}>Predictors</InputGroup.Text>
          <div style={{width: "calc(100% - 130px)"}}>
            <MultiAttributeSelect
            customStyles={customStyles}
            attributes={columns.filter(col=>col!=props.config.target)
			.map(col=>({
			  label: <TargetOption name={col} dtype={colTypes[col]} message={message}/>,
			  value: col,
			  isDisabled: colTypes[col]!="Numerical"
			}))}
            onChange={onPredictorsChange}          
            selected={predictors}
          />
        </div>
        </InputGroup>
      </Row>
      <CrossValidateOptions config={props.config} setParams={props.setParams} />
      <Configuration paramList={paramList} config={props.config} setParams={props.setParams} />
      </Container>
    </div>
  );
}

export default SKLearnActionConfig;
