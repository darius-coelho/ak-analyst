import React, { useEffect } from 'react';
import { connect } from 'react-redux';

import { selectNodeByID } from  '../../graph/graph.selectors';

import _ from 'lodash';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import InputGroup from 'react-bootstrap/InputGroup'
import Form from 'react-bootstrap/Form'
import FormControl from 'react-bootstrap/FormControl'

import DefaultMessage from './DefaultMessage';
import { abbreviateText } from '../../utilities/utilities'
import MultiAttributeSelect from '../../common/components/MultiAttributeSelect';

import "../../../css/Core.css";
import "../../../css/Modal.css";

/**
 * Renders the missing predictors options.
 * @param {array} missing - list of missing predictor names.
 * @param {json} config - Configuration for the predict action.
 * @param {fun} setParams - Callback for setting the config.
 */
function MissingOptions(props) {
  const { missing, config, setParams } = props;

  if (missing.length == 0) return null;

  /** Handles changes to default values. */
  function onChange(col, evt) {
    let missingPredictors = config.missingPredictors;
    missingPredictors[col] = +evt.target.value;
    
    setParams({
      ...config,
      missingPredictors: missingPredictors,
    })
  }

  return missing.map((col, cid) => {
    return (
    <Row className="pt-1" key={`row-${col}`}>
      <InputGroup size='sm' className="mb-3">
        <InputGroup.Text id="basic-addon1" title={col} style={{width: 160, height: 32}}>
        {abbreviateText(col, 15)}
        </InputGroup.Text>
        <FormControl
          name={col}
          type="number"
          aria-label={col}
          aria-describedby="basic-addon1"
          value={config.missingPredictors[col]}
          onChange={(evt) => onChange(col, evt)}
        />
        </InputGroup>
      </Row>
    );
  }); 
}

/**
 * Renders the configuration panel for the predict action.
 * @param {array} input - List of input objects to this action.
 * @param {fun} getNodeByID - Function for getting the node object.
 * @param {json} config - Configuration parameters for this action.
 */
export function PredictActionConfig(props) {
  const { input, getNodeByID } = props;
  const { includeResiduals, includeProbability, outputColumns } = props.config;
  
  const fileInput = input.filter(iput=>('columns' in iput[0]));
  const columns = fileInput[0][0].columns

  const modelInput = input.filter(iput=>!('columns' in iput[0]));
  const modelType = modelInput[0][0].modelType;
  const predictors = modelInput[0][0].predictors;
  
  // predictors missing in the test set.
  const missingPred = predictors.filter(p=>!columns.includes(p));
  
  if (missingPred.length > 0 && _.isEmpty(props.config.missingPredictors)) {
    // set defaults for missing predictor values
    props.setParams({
      ...props.config,
      missingPredictors: Object.assign({}, ...missingPred.map(d=>({[d]: 0})))
    })
  }
  
  const srcId = modelInput[0].srcId;
  const target = getNodeByID(srcId).config.target;
  
  useEffect(() => {
    // check if configuration needs to be updated
    const missingColumns = outputColumns.some(c=>!columns.includes(c));

    // Check if the residual cannot be calculated
    const residualFlagChange = (includeResiduals &&
				(modelType !== 'regressor' || !columns.includes(target)));

    // something has changed in the input so update the configuration
    if (missingColumns || residualFlagChange) {
     props.setParams({
	...props.config,
	outputColumns: outputColumns.filter(c=>columns.includes(c)),
	includeResiduals: (includeResiduals
			   && modelType === 'regressor'
			   && columns.includes(target))
      });
    }
  }, []);
  
  /** Handles changes to the predictors checkbox.  */
  function onAddPredictors(event) {
    props.setParams({
      ...props.config,
      outputColumns: [...new Set([...outputColumns, ...predictors.filter(p=>columns.includes(p))])]
    });
  }

  /** Handles changes to the residuals checkbox.  */
  function onIncludeResidualsChange(event) {
    props.setParams({
      ...props.config,
      includeResiduals: !includeResiduals,
    });
  }
  
  /** Handles changes to the residuals checkbox.  */
  function onIncludeTargetChange(event) {
    props.setParams({
      ...props.config,
      outputColumns: (outputColumns.includes(target)
		      ? outputColumns.filter(d=>d!==target)
		      : [...outputColumns, target])
    });
  }

  /** Handles changes to the probability checkbox.  */
  function onIncludeProbabilityChange(event) {
    props.setParams({
      ...props.config,
      includeProbability: !includeProbability,      
    });
  }

  /** Handles changes to the list of output columns. */
  function onChangeOutputColumns(val) {
    props.setParams({
      ...props.config,
      outputColumns: val.map(d=>d.value),
    });
  }

  const buttonStyle = {
    width: "100%",
    fontSize: "11pt",
    background: "steelblue",
    marginTop: "0.5rem"
  };
  
  return (
      <Container style={{marginTop: 20}}>
        <Row><Col lg='12' style={{fontSize: "15px"}}>Output Options</Col></Row>
        <hr className="lineDivide"/>

      
    {
      modelType==='regressor'
      ? <Form.Check
          className="optionLabel"
          type={'checkbox'}
          id={'include-residuals'}
          label={'Include Residuals'}    
          checked={includeResiduals}
          disabled={!columns.includes(target)}
          onChange={onIncludeResidualsChange}
        />
      : null
    }
    
      <Form.Check
        className="optionLabel"
        type={'checkbox'}
        id={'include-target'}
        label={'Include Target'}    
        checked={outputColumns.includes(target)}
        disabled={!columns.includes(target)}
        onChange={onIncludeTargetChange}
      />

    {
      modelType === 'classifier'
      ? <Form.Check
          className="optionLabel"
          type={'checkbox'}
          id={'include-proba'}
          label={'Include Probability'}
          checked={includeProbability}
          onChange={onIncludeProbabilityChange}
	/>
      : null
    }

    {
      missingPred.length > 0 ?
	<div>
          <Row className='pt-3'>
	<Col lg='12' style={{fontSize: "15px"}}>
	Missing Predictors
       <span style={{fontSize: '0.7rem'}}>
	{" (set the default values for the dataset.)"}
      </span>
      </Col>
	  </Row>
          <hr className="lineDivide"/>
	<MissingOptions missing={missingPred} config={props.config} setParams={props.setParams}/>
	</div>
	: null
    }

    
      <Row className={"mt-3"}>
        <Col lg='12' style={{fontSize: "15px"}}>Include Additional Columns</Col>
      </Row>
      <hr className="lineDivide"/>

      <MultiAttributeSelect
        attributes={columns.map(col=>({
          label: col,
	  value: col
        }))}
        onChange={onChangeOutputColumns}
        selected={outputColumns.map(d=>({label: d, value: d}))}
      />
      <button
        className={"btn btn-primary"}
        style={buttonStyle}
        onClick={onAddPredictors}
      >
        Add Predictors to Output
      </button>
      </Container>
  );
}

const mapStateToProps = (state) => {
  return {
    getNodeByID: (nodeId) => selectNodeByID(state.graph, nodeId),  
  };
};

export default connect(mapStateToProps, null)(PredictActionConfig);
