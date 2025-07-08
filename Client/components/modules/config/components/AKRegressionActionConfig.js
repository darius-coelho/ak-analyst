import React from 'react';

import Select from 'react-select';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form'
import FormControl from 'react-bootstrap/FormControl'
import InputGroup from 'react-bootstrap/InputGroup'

import DefaultMessage from './DefaultMessage';

import { SampleOptions } from './Options';
import { isInRange, isInRangeInt } from '../../utilities/utilities'

export function AKRegressionActionConfig(props) {
  const { input, setParams, config} = props;

  // Select columns and types based on parent output port
  const columns = input[0][input[0].outPort].columns 

  if(!columns){
    return <DefaultMessage text={'Data not ready. Run prior actions if any.'} />
  }

  const predictors = (config.predictors ? config.predictors.map(d=>({label: d, value: d})): []);
  
  const onTargetChange = (evt) => {
    setParams({
      ...config,
      target: evt.target.value
    });
  };  

  const onPredictorsChange = (val) => {
    setParams({
      ...config,
      predictors: val.map(d => d.value)
    });
  }; 

  const onWindowSizeChange = (evt) => {    
    setParams({
      ...config,
      windowSize: evt.target.value
    });
  }; 

  const onConfidIntervalChange = (evt) => {    
    setParams({
      ...config,
      confidInterval: evt.target.value
    });
  }; 

  const onFeatureSelChange = (evt) => {    
    setParams({
      ...config,
      featureSel: !config.featureSel
    });
  };
  
  const columnOptions = columns.map(col=>({label: col, value: col}));  

  // Style object for react-select
  const selectStyle ={
    control: styles => ({ 
      ...styles,
     backgroundColor: 'white',       
     borderTopLeftRadius: 0,
     borderBottomLeftRadius: 0,
     padding: 0,           
     minHeight: '32px',             
     fontSize: 13,
     overflow: "hidden"
    }),    
    multiValueLabel: (styles) => ({
      ...styles,
      padding: 2,
    }),
  };
  
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
      <Row style={{marginTop: 15}}>
        <Col lg='12' style={{fontSize: "15px"}}>Regression Parameters</Col>
      </Row>
      <hr style={{padding: "0px", margin: "0px", marginBottom: "10px"}}/>
      
      
      <Row style={{marginTop: 25}}>
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: 150, height: 32}}>Target</InputGroup.Text>
          <Form.Select 
            aria-label="target"
            name="target"
            value={config.target}
            onChange={onTargetChange} >
              <option value="AK_NONE">None</option>
              {columns.map(
                  (d,i) => {
                    return <option key={'target-' + i} value={d}>{d}</option>
                  }
              )}
          </Form.Select>      
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: 150}}>Predictors</InputGroup.Text>
          <div style={{width: "calc(100% - 150px)"}}>
            <Select
              styles={selectStyle}
              defaultValue={[]}
              isMulti
              name="predictors"
              options={columnOptions}
              onChange={onPredictorsChange}          
              value={predictors}
              className="selectPreds"
              classNamePrefix="selectPreds"      
            />
          </div>
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            id="basic-addon1"
            style={{
              width: 150,
              height: 32,
              background: isInRangeInt(config.windowSize, 1, 10000, 'include') ? "#e9ecef" : "#ffb9b9"
            }}>
              Window
          </InputGroup.Text>
          <FormControl
            data-testid="window"
            name="window"
            type="number"
            step={'1'}
            min={'1'}
            max={'10000'}
            style={{color: isInRangeInt(config.windowSize, 1, 10000, 'include') ? "#000000" : "#e32222"}}
            aria-label="window"
            aria-describedby="basic-addon1"
            value={config.windowSize}
            onChange={onWindowSizeChange}
          />
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            id="basic-addon1"
            style={{
              width: 150,
              height: 32,
              background: isInRange(config.confidInterval, 1, 100, 'include') ? "#e9ecef" : "#ffb9b9"
            }}>
              Confidence Interval
          </InputGroup.Text>
          <FormControl
            data-testid="confidence"
            name="confidence"
            type="number"
            step={'1'}
            min={'1'}
            max={'100'}
            style={{color: isInRange(config.confidInterval, 1, 100, 'include') ? "#000000" : "#e32222"}}
            aria-label="confidence"
            aria-describedby="basic-addon1"
            value={config.confidInterval}
            onChange={onConfidIntervalChange}
          />
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <Form.Check 
            type="switch"
            id="featureSel-switch"
            data-testid="featureSelSwitch"
            checked={config.featureSel}
            onChange={onFeatureSelChange}
            label="Feature Selection"
          /> 
        </InputGroup>
      </Row>
      </Container>
    </div>
  );  
}

export default AKRegressionActionConfig;
