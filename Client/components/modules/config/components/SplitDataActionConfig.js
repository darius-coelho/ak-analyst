import React from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form'
import FormControl from 'react-bootstrap/FormControl'
import InputGroup from 'react-bootstrap/InputGroup'

import DefaultMessage from './DefaultMessage';

import { isInRange, isInRangeInt } from '../../utilities/utilities'

/**
  * Configuration display if the split type is Random
  * @param {Object} props.config - the configuration parameters the split data node
  * @param {function} props.setParams - function to set the configuration parameters
  */
function RandomSplitConfig(props) {
  const { setParams, config} = props;

  /** Handler called when the size value has changed. */
  const onSizeChange = (evt) => {
    setParams({
      ...config,
      sizeValue: evt.target.value
    });
  };
  
  return (
    <InputGroup size='sm' className="mb-3">
      <InputGroup.Text
        id="basic-addon2"
        style={{
          width: 148,
          height: 32,
          background: isInRange(config.sizeValue, 0, 100, 'exclude') ? "#e9ecef" : "#ffb9b9"
        }}>
          First Split Percentage
      </InputGroup.Text>
      <FormControl
        name="randomSizeValue"
        type="number"
        step={'1'}
        min={'0'}
        max={'100'}
        style={{color: isInRange(config.sizeValue, 0, 100, 'exclude') ? "#000000" : "#e32222"}}
        aria-label="randomSizeValue"
        aria-describedby="basic-addon1"
        value={config.sizeValue}
        onChange={onSizeChange}
      />
    </InputGroup>
  );
}

/**
  * Configuration display if the split type is InOrder
  * @param {Object} props.config - the configuration parameters the split data node
  * @param {function} props.setParams - function to set the configuration parameters
  */
function InOrderSplitConfig(props) {
  const { setParams, config} = props;

  /** Handler called when the size type has changed. */
  const onSizeTypeChange = (evt) => {
    setParams({
      ...config,
      sizeType: evt.target.value
    });
  };
  
  /** Handler called when the size value has changed. */
  const onSizeChange = (evt) => {
    setParams({
      ...config,
      sizeValue: evt.target.value
    });
  };

  const isValidValue = (val) => {
    if(config.sizeType == "Percentage"){
      return isInRange(config.sizeValue, 0, 100, 'exclude')
    }
    else {
      return isInRangeInt(config.sizeValue, 1, 'inf', 'include')
    }
  }
  
  return (
    <div>
      <InputGroup size='sm' className="mb-3">
        <InputGroup.Text id="basic-addon2" style={{width: 148, height: 32}}>Split By</InputGroup.Text>
        <Form.Select 
          aria-label="InOrderMethod"
          name="InOrderMethod"
          value={config.sizeType}
          onChange={onSizeTypeChange}
        >
          <option value="Percentage">Percentage</option>
          <option value="Absolute Count">Absolute Count</option>
        </Form.Select>
      </InputGroup>
      <InputGroup size='sm' className="mb-3">
        <InputGroup.Text
          id="basic-addon1"
          style={{
            width: 148,
            height: 32,
            background: isValidValue(config.sizeValue) ? "#e9ecef" : "#ffb9b9"
          }}>
          {config.sizeType}
        </InputGroup.Text>
        <FormControl
          name="InOrderSizeValue"
          type="number"
          step={'1'}
          min={'1'}
          style={{color: isValidValue(config.sizeValue) ? "#000000" : "#e32222"}}
          aria-label="InOrderSizeValue"
          aria-describedby="basic-addon1"
          value={config.sizeValue}
          onChange={onSizeChange}
        />
      </InputGroup>
    </div>
  );
}

/**
  * A selector function to select the approprite configuration display
  * @param {Object} props.config - the configuration parameters the split data node
  * @param {function} props.setParams - function to set the configuration parameters
  */
function SplitMethodConfig(props) {
  switch(props.config.method){
    case 'Random': 
      return <RandomSplitConfig {...props} />;
    case 'InOrder': 
      return <InOrderSplitConfig {...props} />;
    default: 
      return null;
  }
}

/**
  * A graphic to display the amount of data being output at each port
  * @param {Object} props.config - the configuration parameters the split data node
  */
function SplitGraphic(props) {
  const { method, sizeValue, sizeType } = props.config
  
  let text1 = sizeValue + "%"
  let text2 = 100 - sizeValue + "%"

  if(method != "Random" && sizeType != "Percentage"){
    text1 = sizeValue + " items"
    text2 = "Remaining items"
  }

  return (
    <svg 
      width="200" 
      height="70"
      preserveAspectRatio="xMidYMid meet"
      style={{display: "block", margin: "35px auto"}}>      
      <path fill="#767676" d="m59.01165,38.79148l-9.48127,0c-0.74608,0 -1.4914,-0.24045 -2.02428,-0.64138l-14.70149,-10.98228l14.59457,-10.98228c0.53281,-0.40093 1.27815,-0.64138 2.02428,-0.64138l9.48127,0l0,4.32855l18.2172,-7.93635l-18.2172,-7.93635l0,4.32855l-9.48127,0c-3.30227,0 -6.39225,0.9618 -8.73593,2.72542l-15.76641,11.94511c-0.53281,0.40093 -1.27815,0.64138 -2.02428,0.64138l-17.89685,0l0,7.21445l17.89685,0c0.74608,0 1.4914,0.24045 2.02428,0.64138l15.76641,11.86409c2.34369,1.7636 5.4329,2.72542 8.73593,2.72542l9.48127,0l0,4.32855l18.2172,-7.93635l-18.2172,-7.93635l0,4.24982l0.10691,0l0,-0.00001z"/>
      <text x={84} y={16} fontSize={14}>{text1}</text>
      <text x={84} y={47} fontSize={14}>{text2}</text>
    </svg>
  )
}

/**
  * Displays configuration panel for the split data action
  * @param {Object} props.input - a list of input objects to the split data node
  * @param {Object} props.config - the configuration parameters the split data node
  * @param {function} props.setParams - function to set the configuration parameters
  */
export function SplitDataActionConfig(props) {
  const { input, setParams, config} = props;

  /** Handler called when the selection method has changed. */
  const onMethodChange = (evt) => {
    if(evt.target.value.length>0) {
      setParams({
        ...config,
        method: evt.target.value,
        sizeValue: 30
      });
    }
  };
  
  return (
      <Container>

      <Row style={{marginTop: 30}}>
        <Col lg='12' style={{fontSize: "15px"}}>Split Parameters</Col>
      </Row>
      <hr style={{padding: "0px", margin: "0px", marginBottom: "10px"}}/>
      
      <InputGroup size='sm' className="mb-3">
        <InputGroup.Text id="basic-addon2" style={{width: 148, height: 32}}>Method</InputGroup.Text>
        <Form.Select 
          aria-label="selectMethod"
          name="selectMethod"
          value={config.method}
          onChange={onMethodChange} >
            <option value="Random">Random</option>
            <option value="InOrder">In Order</option>
        </Form.Select>
      </InputGroup>

      <SplitMethodConfig config={config} setParams={setParams} />
      <SplitGraphic config={config} />
    </Container>
  );  
}

export default SplitDataActionConfig;
 
