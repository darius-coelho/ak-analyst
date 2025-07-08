import React from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form'
import FormControl from 'react-bootstrap/FormControl'
import InputGroup from 'react-bootstrap/InputGroup'
import Select from 'react-select';

import DefaultMessage from './DefaultMessage';

import { SampleOptions } from './Options';
import { isInRange, isInRangeInt } from '../../utilities/utilities'

import TargetOption from '../../common/components/TargetOption';

/** 
 * Component which renders the options for the FP miner.
 * @param {json} config - Configuration parameters.
 * @param {fn} setParams - Function which updates the redux config.
 */
function FPMinerParams(props) {
  const { config, setParams } = props;

  /** Handles changes to the max pattern value. */
  const onMaxPatternChange = (evt) => {    
    setParams({
      ...config,
      maxPattern: evt.target.value
    });
  };

  /** Handles changes to the threshold value. */  
  const onThresholdChange = (evt) => {    
    setParams({
      ...config,
      threshold: evt.target.value
    });
  };

  
  /** Handles changes to the p value threshold value. */  
  const onPValChange = (evt) => {    
    setParams({
      ...config,
      alpha: evt.target.value
    });
  };
  
  /** Handles changes to the holdout value. */  
  const onHoldoutChange = (evt) => {    
    setParams({
      ...config,
      holdout: evt.target.value
    });
  };

  /** Handles changes to the minsup value. */  
  const onMinsupChange =(evt) => {    
    setParams({
      ...config,
      minsup: (evt.target.value)
    });
  };

  /** Handles changes to the fdr  value. */  
  const onFDRChange = (evt) => {
    setParams({
      ...config,
      fdr: evt.target.value
    });
  };

  /** Checks if a threshold value is valid based on the mine type. */  
  const thresholdCheck = (val) => {
    if(config.mineType == 'numeric'){
      return isInRange(val, 0.5, 1, 'include')
    }
    else {
      return isInRange(val, 1, 'inf', 'include')
    }
  }

  return (
      <Row style={{marginTop: 25}}>
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            id="basic-addon1"
            style={{
              width: 130,
              height: 32,
              background: isInRangeInt(config.maxPattern, 1, 'inf', 'include') ? "#e9ecef" : "#ffb9b9"
            }}>
              Max Pattern
          </InputGroup.Text>
          <FormControl
            name="maxPattern"
            type="number"
            step={'1'}
            min={'1'}
            style={{color: isInRangeInt(config.maxPattern, 1, 'inf', 'include') ? "#000000" : "#e32222"}}
            aria-label="maxPattern"
            aria-describedby="basic-addon1"
            value={config.maxPattern}
            onChange={onMaxPatternChange}
          />
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            id="basic-addon1"
            style={{
              width: 130,
              height: 32,
              background: thresholdCheck(config.threshold) ? "#e9ecef" : "#ffb9b9"
            }}>
              Threshold
          </InputGroup.Text>
          <FormControl
            name="threshold"
            type="number"
            step={'0.1'}
            min={config.mineType == 'numeric' ? '0.5' : "1.0"}
            max={config.mineType == 'numeric' ? '1.0': null}
            style={{color: thresholdCheck(config.threshold) ? "#000000" : "#e32222"}}
            aria-label="threshold"
            aria-describedby="basic-addon1"
            value={config.threshold}
            onChange={onThresholdChange}
          />
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            id="basic-addon1"
            style={{
              width: 130,
              height: 32,
              background: isInRange(config.alpha, 0, 1, 'exclude') ? "#e9ecef" : "#ffb9b9"
            }}>
              P-Value threshold
          </InputGroup.Text>
          <FormControl
            name="pvalue"
            type="number"
            step={'0.01'}
            min={'0.0'}
            max={'1.0'}
            style={{color: isInRange(config.alpha, 0, 1, 'exclude') ? "#000000" : "#e32222"}}
            aria-label="threshold"
            aria-describedby="basic-addon1"
            value={config.alpha}
            onChange={onPValChange}
          />
        </InputGroup>
      
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            id="basic-addon1"
            style={{
              width: 130,
              height: 32,
              background: isInRangeInt(config.holdout, 0, 'inf', 'include') ? "#e9ecef" : "#ffb9b9"
            }}>
              Holdout
          </InputGroup.Text>
          <FormControl
            name="holdout"
            type="number"
            step={'1'}
            min={'0'}
            style={{color: isInRangeInt(config.holdout, 0, 'inf', 'include') ? "#000000" : "#e32222"}}
            aria-label="holdout"
            aria-describedby="basic-addon1"
            value={config.holdout}
            onChange={onHoldoutChange}
          />
        </InputGroup>

        <InputGroup size='sm' >
          <InputGroup.Text
            id="basic-addon1"
            style={{
              width: 130,
              height: 32,
              background: isInRange(config.minsup, 0, 1, 'include') ? "#e9ecef" : "#ffb9b9"
            }}>
              Min. Pattern Size
          </InputGroup.Text>
          <FormControl
            name="minSize"
            type="number"
            step={'.01'}
            min={'0'}
            max={'1'}
            style={{color: isInRange(config.minsup, 0, 1, 'include') ? "#000000" : "#e32222"}}
            aria-label="minSize"
            aria-describedby="basic-addon1"
            value={config.minsup}
            onChange={onMinsupChange}
          />
        </InputGroup>
      <div style={{fontSize: "13px", textAlign: "right"}}>(percentage of dataset)</div>

      <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            id="basic-addon1"
           >
              FDR Control Method
          </InputGroup.Text>
            <Form.Select 
              aria-label="fdr"
              name="fdr"
              value={config.fdr}
              onChange={onFDRChange}
            >
              <option value="fast">Alpha Invest</option>
              <option value="exhaustive">Benjamini-Hochberg</option>
            </Form.Select>      
        </InputGroup>
      
      </Row>     
  );
}

/** 
 * Component which renders the options for the Bayesian miner.
 * @param {json} config - Configuration parameters.
 * @param {fn} setParams - Function which updates the redux config.
 */
function BayesMinerParams(props) {
  const { config, setParams } = props;

  /** Handles changes to the max pattern value. */
  const onMaxPatternChange = (evt) => {    
    setParams({
      ...config,
      maxPattern: evt.target.value
    });
  };

  /** Handles changes to the nmodels value. */
  const onNumModelsChange = (evt) => {    
    setParams({
      ...config,
      nmodels: (evt.target.value)
    });
  };

  /** Handles changes to the niter value. */  
  const onNumIterChange = (evt) => {    
    setParams({
      ...config,
      niter: (evt.target.value)
    });
  };

  /** Handles changes to the nburn value. */  
  const onNumBurnChange = (evt) => {    
    setParams({
      ...config,
      nburn: (evt.target.value)
    });
  };

  return (
      <Row style={{marginTop: 25}}>
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            id="basic-addon1"
            style={{
              width: 130,
              height: 32,
              background: isInRangeInt(config.maxPattern, 1, 'inf', 'include') ? "#e9ecef" : "#ffb9b9"
            }}>
              Max Pattern
          </InputGroup.Text>
          <FormControl
            name="maxPattern"
            type="number"
            step={'1'}
            min={'1'}            
            style={{color: isInRangeInt(config.maxPattern, 1, 'inf', 'include') ? "#000000" : "#e32222"}}
            aria-label="maxPattern"
            aria-describedby="basic-addon1"
            value={config.maxPattern}
            onChange={onMaxPatternChange}
          />
        </InputGroup>
      
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            id="basic-addon1"
            style={{
              width: 130,
              height: 32,
              background: isInRangeInt(config.nmodels, 1, 'inf', 'include') ? "#e9ecef" : "#ffb9b9"
            }}>
              Num. Models
          </InputGroup.Text>
          <FormControl
            name="nmodels"
            type="number"
            step={'1'}
            min={'1'}
            style={{color: isInRangeInt(config.nmodels, 1, 'inf', 'include') ? "#000000" : "#e32222"}}
            aria-label="nmodels"
            aria-describedby="basic-addon1"
            value={config.nmodels}
            onChange={onNumModelsChange}
          />
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            id="basic-addon1"
            style={{
              width: 130,
              height: 32,
              background: isInRangeInt(config.niter, 1, 'inf', 'include') ? "#e9ecef" : "#ffb9b9"
            }}>
              Num. Iterations
          </InputGroup.Text>
          <FormControl
            name="niter"
            type="number"
            step={'1'}
            min={'1'}
            style={{color: isInRangeInt(config.niter, 1, 'inf', 'include') ? "#000000" : "#e32222"}}
            aria-label="niter"
            aria-describedby="basic-addon1"
            value={config.niter}
            onChange={onNumIterChange}
          />
        </InputGroup>

        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text
            id="basic-addon1"
            style={{
              width: 130,
              height: 32,
              background: isInRangeInt(config.nburn, 1, 'inf', 'include') ? "#e9ecef" : "#ffb9b9"
            }}>
              Num. Burn In
          </InputGroup.Text>
          <FormControl
            name="nburn"
            type="number"
            step={'1'}
            min={'1'}
            style={{color: isInRangeInt(config.nburn, 1, 'inf', 'include') ? "#000000" : "#e32222"}}
            aria-label="nburn"
            aria-describedby="basic-addon1"
            value={config.nburn}
            onChange={onNumBurnChange}
          />
        </InputGroup>
      </Row>     
  );
}

/** 
 * Component which renders the options for the pattern miner.
 * @param {json} config - Configuration parameters.
 * @param {fn} setParams - Function which updates the redux config.
 */
function MinerParams(props) {
  const { config } = props;
  if (config.method == "fpminer")
    return <FPMinerParams {...props}/>

  return <BayesMinerParams {...props}/>
}

export function AKMineActionConfig(props) {
  const { input, setParams, config} = props;
  
  // Select columns and types based on parent output port
  const columns = (input[0][input[0].outPort]
		   ? input[0][input[0].outPort].columns
		   : null);
  
  if(!columns){
    return <DefaultMessage text={'Data not ready. Run prior actions if any.'} />
  }

  const colTypes = input[0][input[0].outPort].colTypes  

  /** Handler called when the mining method has changed. */
  const onMethodChange = (evt) => {
    setParams({
      ...config,
      method: evt.target.value
    });
  };

  /** Handles changing the target variable. */
  const onTargetChange = (selected) => {    
    setParams({
      ...config,
      target: selected.map(d => d.value)
    });    
  };

  const onTypeChange = (evt) => {
    setParams({
      ...config,
      threshold: (evt.target.value === 'numeric' ? 0.6 : 2),
      mineType: evt.target.value
    });    
  };

  const customStyles = {
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

  const message = "Non-numerical attributes cannot be set as a target. "+
	"You can change the type using the data transformer";

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
          <Col lg='12' style={{fontSize: "15px"}}>Method</Col>
        </Row>
        <hr style={{padding: "0px", margin: "0px", marginBottom: "10px"}}/>
        <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon2" style={{width: 130, height: 32}}>Method</InputGroup.Text>
          <Form.Select 
            aria-label="method"
            name="method"
            value={config.method}
            onChange={onMethodChange}
          >
            <option value="fpminer">FP Miner</option>
            <option value="bayesian">Bayesian Miner</option>
          </Form.Select>      
        </InputGroup>
        
        <Row style={{marginTop: 15}}>
          <Col lg='12' style={{fontSize: "15px"}}>Target Details</Col>
        </Row>
        <hr style={{padding: "0px", margin: "0px", marginBottom: "10px"}}/>
        
        <Row style={{marginTop: 25}}>
          <InputGroup size='sm' className="mb-3">
            <InputGroup.Text id="basic-addon2" style={{width: 130}}>Target</InputGroup.Text>
            <div style={{width: "calc(100% - 130px)"}}>
              <Select
                arial-label="target"
                name="target"
                height="32px"
                isMulti
                value={config.target ? config.target.map( d => ({value: d, label: d})) : []}
                onChange={onTargetChange}
                styles={customStyles}
                options={columns.map(d=>(
                  {
                    value: d,
                    label: <TargetOption name={d} dtype={colTypes[d]} message={message} />,
                    isDisabled: colTypes[d]!="Numerical"
                  }
                ))}
              />
            </div>
          </InputGroup>

          <InputGroup size='sm' className="mb-3">
            <InputGroup.Text id="basic-addon2" style={{width: 130, height: 32}}>Mine Type</InputGroup.Text>
            <Form.Select 
              aria-label="mineType"
              name="mineType"
              value={config.mineType}
              onChange={onTypeChange}
            >
              <option value="numeric">Numeric</option>
              <option value="binary">Binary</option>
            </Form.Select>      
          </InputGroup>
        </Row>
        
        
        <Row style={{marginTop: 25}}>
          <Col lg='12' style={{fontSize: "15px"}}>AK Miner Parameters</Col>
        </Row>
        <hr style={{padding: "0px", margin: "0px", marginBottom: "10px"}}/>

        <MinerParams {...{config, setParams}}/>
      </Container>
    </div>
  );  
}

export default AKMineActionConfig;
