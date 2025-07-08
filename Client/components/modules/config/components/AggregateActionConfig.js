import React, { useState } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import Aggregator from '../../dashboards/components/aggregator/Aggregator';

import "../css/General.css"

/** Component which renders an aggregation function
 * and the list of attributes it is applied. 
 * @param {Number} width - width of the config panel.
 */
 const renderAggFunction = () => {
  return (d, index) => {
    return <div key={"agg"+index} className='transformBox'>
              <div className='transformTitle'>{d.aggFunc.label}</div>
              {d.attrs.map(
                (v,i) => {
                  return <div key={index+"-"+v.value} className='attributeItems' title={v.value}>{v.value}</div>
                }
              )}
            </div>
  };
};


export function AggregateActionConfig(props) {
     
  const linkClass = "btn btn-primary";
  
  const [showAggregator, setShowAggregator] = useState(false);
  const onShowAggregator = () => setShowAggregator(true)
  const onHideAggregator = () => setShowAggregator(false)

  const setParams = (newConfig) => {
    props.setParams({
      ...props.config,
      ...newConfig
    });
  };

  const transformDivStyle = {
    position: "absolute",
    width: "calc(100% - 30px)",
    height: "calc(100% - 230px)",
    overflowX: 'hidden',
    overflowY: "auto",
    margin: 3
  }
    
  return (
    <Container>
      <button 
        data-testid="cleanseButton"
        className={linkClass}
        onClick={onShowAggregator}
        style={{marginTop: "2em"}}>
          {`Launch Data Aggregator`}
      </button> 
      
      <Row style={{marginTop: 40, textAlign: "left"}}>
        <Col lg='12' style={{fontSize: "15px"}}>Aggregation Functions for Columns</Col>
      </Row>     
      <hr className='hrLine' />
      <div style={transformDivStyle}>
        <Row >
        {
          props.config.aggKey 
          ? <div style={{width: "100%", textAlign:"left", marginTop: 10}}>
              <div className='transformBox'>
              <div className='transformTitle'>Key Attribute</div>
              <div className='attributeItems'>
                {props.config.aggKey}
              </div>
            </div>
            </div>
          : null
        }
        
        <div style={{width: "100%", textAlign:"left", marginTop: 10}}>
          {props.config.aggMap.map(renderAggFunction())}
        </div>
        </Row>
      </div>

      { // toggle to show aggregator modal
        showAggregator
          ? <Aggregator
	          ID={props.ID}
            input={props.input[0]}            
            config={props.config}
            output={props.output}
            pathTo={props.pathTo}
            setParams={setParams}
            setOutput={props.setOutput}
            processOutput={props.processOutput}
            onHideAggregator={onHideAggregator}
            handleNodeError={props.handleNodeError}
          />
        : null
      }
    </Container>
  );
}

export default AggregateActionConfig;
