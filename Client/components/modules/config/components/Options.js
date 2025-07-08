import React from 'react';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import FormControl from 'react-bootstrap/FormControl';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';

import { isInRangeInt } from '../../utilities/utilities'

import "../../../css/Core.css";

/**
 * Component which renders the sampling options menu.
 * @param {Object} config - Config params. (including sample options).
 */
export function SampleOptions(props) {
  const { is_sample, nsamples } = props.config.options;
  
  /** Handles changes to the # Samples field. */
  function onChange(event) {
    const options = (props.config != null ? props.config.options || {} : {});
    props.setParams({
      ...props.config,
      options: {
        ...options,
        [event.target.name]: +event.target.value
      }
    });
  }

  /** Handles changes to the sample checkbox. */
  function onCheckChange(event) {
    const options = (props.config != null ? props.config.options || {} : {});
    props.setParams({
      ...props.config,
      options: {
        ...options,
        [event.target.name]: event.target.checked
      }
    });    
  }
  
  return (
      <div style={{textAlign: "left", marginTop: 20, marginBottom: 20}}>
      <Row><Col lg='12' style={{fontSize: "15px"}}>Sample Options</Col></Row>
      <hr className="lineDivide"/>
      <Row><Col lg='6'>      
        <InputGroup size='sm' className="mb-3">       
        <Form.Check
          type="switch"
          label="Use Sample"
          name="is_sample"
          className="optionLabel"
          checked={is_sample}
          onChange={onCheckChange} />
      </InputGroup>
      </Col>
      <Col lg='6'>
        <InputGroup size='sm' className="mb-0" style={{opacity: (!is_sample ? 0.75 : 1)}}>
          <InputGroup.Text
            id="basic-addon2"
            style={{
              width: "95px",
              background: isInRangeInt(nsamples, 1, 'inf', 'include') ? "#e9ecef" : "#ffb9b9"
            }}>
              # Samples
          </InputGroup.Text>
          <FormControl
            defaultValue={nsamples}
            name="nsamples"
            type="number"
            min={1}
            style={{color: isInRangeInt(nsamples, 1, 'inf', 'include') ? "#000000" : "#e32222"}}
            aria-label="header-row"
            aria-describedby="basic-addon2"
            data-testid="num-samples"
            disabled={!is_sample}
            onChange={onChange}
          />      
        </InputGroup>      
      </Col></Row>
      </div>
  );
}
