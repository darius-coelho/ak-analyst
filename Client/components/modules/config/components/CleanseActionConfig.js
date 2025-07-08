import React from 'react';
import { useHistory  } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import api from '../../../../apis/api';

import { SampleOptions } from './Options';

import { useInfoToastContext } from '../../common/components/InfoToastContext';

import mixpanel from 'mixpanel-browser';

import "../../../css/Core.css"
import "../css/General.css"

// Mapping for transfrom backend fucntion name
// to display name for the user
const TRANSFORMNAME = {
  "ColNameChange": "Column Name Change",      
  'Dtype': "Change Column Type",
  'OrdinalOrder': "Set Category Order",
  'Log': "Log Transform",  
  'Norm': "Normalize Values",
  'Clamp': "Clamp Values",
  'Repl': "Replace Values",
  'Missing': "Missing Values - Replace",
  "Missing-Drop": "Missing Values - Drop Rows",
  'Filter': "Filter Numerical Values",
  'FilterNom': "Filter Nominal Values",
  'FilterDate': "Filter Date Time Values",
  'CellSplit': "Cell Split",
  'OHE': "One-Hot Encoding",
  'Rank': "Rank Transform",
  'Custom': "Custom Transform",
  'Derived': "Created Derived Attributes"     
}

/** Component which renders the list of attributes 
 * to which a specific transforms is applied. 
 * @param {Number} width - width of the config panel.
 */
const renderTransform = () => {
  return ([k, d], index) => {   
    
    return <div key={"transform"+index}>
              <div className='transformBox'>            
                <div className='transformTitle'>{TRANSFORMNAME[k]}</div>         
                {Array.from(d).map(
                  (v,i) => {
                    return <div key={k+"-"+v} className='attributeItems' title={v}>{v}</div>  
                  }
                )}                                 
              </div>        
            </div>
  };
};

/** Component which renders the list of transforms. */
function TransformSummary (props) {     
  if(!props.transformations || props.transformations.length < 1){
    return (
	    <div style={{marginTop: 20, fontSize: 14, fontStyle: "italic" }}>
        No transforms applied.
      </div>
    );
  }
  
  var transformations = {}
  for(var t of props.transformations){        
    if(!transformations.hasOwnProperty(t.tType)){        
      transformations[t.tType] = new Set()
    }
    transformations[t.tType].add(t.attr)
  }
  
  return  <div style={{width: "100%", textAlign:"left"}}>
            {Object.entries(transformations).map(renderTransform())}
          </div>
}



/** Component which renders the list of dropped attributes. */
function DropSummary(props) {
  const { drop } = props;
  if (!drop || drop.length == 0) {
    return null
  }

  return(
      <div style={{width: "100%", textAlign:"left", marginBottom: 10}}>
        <div className='transformBox'>            
          <div className='transformTitle'>{"Dropped Columns"}</div>         
          {
            drop.map(d=>{
              return <div key={d} className='attributeItems' title={d}>{d}</div>;
            })
          }
        </div>
      </div>
  );  
}

export function CleanseActionConfig(props) {
    
  const linkClass = "btn btn-primary";   

  const config = props.config || {};
  const transformations = config.transformations || [];
  const deleted = config.deleted || [];

  // Get react router manipulator
  const history = useHistory();
  
  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();

  /**
  * Send  data transformer config to server to prepare 
  * data for  data transformer before
  * launching the  data transformer
  * @param {Object} event - mouse event, unused here.
  */
  function onLaunchTransformer() {       
    
    const handleResponse = (response) => {    
      /** 
       * Wrapper for setParams to include current config parameters. 
       * @param {Object} newConfig - New config parameters.
       */
      const setParams = (newConfig) => {
        props.setParams({
          ...props.config,
          ...newConfig
        });
      };
     
      if(history.location.pathname === "/main") {
        // Route to data transformer component with appropriate props
        history.push({
          pathname: "/data-transformer",
          state: {
            setParams: setParams,
            setOutput: props.setOutput,
            pathTo: props.pathTo,
            data: response.data.data,
            description: response.data.description,
            transformations: response.data.transformations,
            deleted: deleted || [],
            attributes: response.data.description.map(x => x.name),
            origLen: response.data.counts.original,
            currLen: response.data.counts.filtered,
            isSample: config.options.is_sample,
            isSaved: true
          }
        });
      }
    }; // end handleResponse
    
    const handleError = (error)=>{
      const errRes = error.response.data
      props.handleNodeError(errRes.nodeID, errRes.action_type, errRes.err)
      addInfoToast(error.response.data.err, 'danger');
    }; // end handleError

    api.initTransformer(props.ID, transformations, deleted, config.options,
			handleResponse, handleError);
    
  }
  
  const transformDivStyle = {
    position: "absolute",
    width: "calc(100% - 30px)",
    height: "calc(100% - 340px)",
    overflowX: 'hidden',
    overflowY: "auto",
    margin: 3,
    width: "calc(100% - 30px)"
  }

  return (
    <Container>
      <SampleOptions {...props} />
      <button
        data-testid="cleanseButton"
        className={linkClass}
        onClick={onLaunchTransformer}>
          {`Launch Data Transformer`}
      </button> 
      <Row style={{marginTop: 30, textAlign: "left"}}>
        <Col lg='12' style={{fontSize: "15px"}}>Transformation Summary</Col>
      </Row>
      <hr style={{padding: "0px", margin: "0px", marginBottom: "10px"}}/>
      <div style={transformDivStyle}>
        <TransformSummary transformations={transformations}/>
        <DropSummary drop={deleted} />
      </div>
    </Container>
  );
}

export default CleanseActionConfig;
