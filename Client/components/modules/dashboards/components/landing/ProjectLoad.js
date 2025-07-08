import React, {useState, useEffect, useContext} from 'react';
import axios from "axios"
import AddressContext from "../../../../AddressContext";
import { Link, Prompt, useHistory } from 'react-router-dom';

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import ListGroup from 'react-bootstrap/ListGroup'

import { FileUpload } from "../../../common/components/FileLoader";
import mixpanel from 'mixpanel-browser';

import "../../../../../components/css/Core.css";
import "./css/ProjectLoad.css"

const logo = require("../../../../../assets/icons/icon.png");
const new_pipeline = require("../../../../../assets/icons/new_pipeline.png");
const finance_sample = require("../../../../../assets/icons/finance_sample.png");
const stroke_sample = require("../../../../../assets/icons/stroke_sample.png");
const rolling_reg_sample = require("../../../../../assets/icons/rolling_regression_sample.png");

import * as sp500 from "./sp500_pipeline.json";
import * as stroke from "./stroke_pipeline.json";
import * as fund from "./fund_analysis_pipeline.json";


/**
 * Renders the panel which handles loading a previously saved pipeline.
 * @param {fun} onClick - Click handler which loads the selected pipeline.
 */
function LoadPipelinePanel(props) {
  const { onClick } = props;
  
  const context = useContext(AddressContext);
  const history = useHistory();
  const [pipelines, setPipelines] = useState([]); 
  
  useEffect(()=>{
    // Get the recent pipelines
    const endPoint = context.address + "GetFilenames";
    const payload = { folder: "Pipelines"};
    axios.post(endPoint, payload)
      .then(function(response) {
	setPipelines(response.data);
      })
      .catch(function(error) {
	console.warn(error);
      });
  }, []);

  // Handles the loading / uploading pipeline and navigates to main
  const onPipelineSelect = (fname) => {
    onClick(fname).then(()=>history.push("/main"));
  }
  
  return (
    <div className="panelDiv" style={{ width:"25%", borderRight: "1px inset #a8a8a8" }}>
      <label className="contentDivHead"  title={"Load Pipeline"}>
        Load Pipeline
      </label>

      <div style={{margin: "20px 10px 0px 10px" }}>
        <Row><Col lg='12' style={{fontSize: "15px"}}>Recent</Col></Row>
        <hr className="lineDivide"/>  
      </div>

      <ListGroup className='filenameList'>
      {
        pipelines.map( pname =>
	  <a key={`link-${pname}`} href={'#'} onClick={()=>onPipelineSelect(pname)}>
            <ListGroup.Item key={pname} >
              {pname}
            </ListGroup.Item>
          </a>)
      }
      </ListGroup>
      
      <div className='fileUploadBox'>
        <FileUpload
          folder={"Pipelines"}
          message={"Drag a file or click to upload"}
          setFileList={()=>{}}
          onOpenFile={(fname)=>onPipelineSelect(fname)}
        />
      </div>
    </div>
  );
}


/**
 * Handles rendering a single image / selectable pipeline.
 * @param {image} image - Image to render.
 * @param {string} text - Text to display under the image.
 * @param {fun} onClick - Handles click events.
 */
function Selectable(props) {
  const { image, text, onClick } = props;
  
  return (
      <div style={{textAlign: "center"}}>
        <Link to={{pathname: "/main"}} >
          <img className="pipelineImage" src={image.default} style={{width: 'inherit'}} onClick={()=>onClick()} />
        </Link>        
        <p>{text}</p>
      </div>
  );
}

/**
 * Renders the "Select to Start" panel.
 * @param {fun} loadPipeline - Function which handles loading a pipeline.
 * @param {fun} resetPipeline - Function which resets to a new pipeline.
 * @param {fun} loadSamplePipeline - Function which handles loading samples.
 */
function SelectPanel(props) {
  const { loadPipeline, resetPipeline, loadSamplePipeline } = props;

  /** load sp500 sample pipeline */
  function loadSampleSP500() {
    mixpanel.track("Load Sample", {"sample": "sp500"});
    loadSamplePipeline(sp500);
  }

  /** load stroke sample pipeline */
  function loadSampleStroke() {
    mixpanel.track("Load Sample", {"sample": "stroke"});
    loadSamplePipeline(stroke);
  }

  /** load fund analysis sample pipeline */
  function loadSampleFund() {
    mixpanel.track("Load Sample", {"sample": "fund"});
    loadSamplePipeline(fund);
  }
  
  return (
      <div className="panelDiv" style={{ width:"75%", left: "25%" }}>
        <div className="panelDiv" style={{ width:"100%", height: "55%", borderBottom: "1px inset #a8a8a8" }}>
          <label className="contentDivHead" title={"Select To Start"}>
            Select To Start
          </label>        
          <div style={{maxWidth: "30%", margin: "2em auto"}}> 
            <Selectable image={new_pipeline} text={"New Pipeline"} onClick={resetPipeline} />
          </div>
          
        </div>
        <div className="panelDiv" style={{ width:"100%", height: "45%", top: "55%"}}>
          <label className="contentDivHead" title={"Samples"}>
            Samples
          </label>
          <div style={{width:"100%"}}>
            <div className="sampleHolder">
              <Selectable
                image={finance_sample}
                text={"Finance"} onClick={loadSampleSP500}
              />
            </div>
            <div className="sampleHolder">
              <Selectable
                image={stroke_sample}
                text={"Stroke Detection"}
                onClick={loadSampleStroke}
              />
            </div>
            <div className="sampleHolder">
              <Selectable
                image={rolling_reg_sample}
                text={"Fund Prediction"}
                onClick={loadSampleFund}
              />
            </div>
            </div>
        </div>
      </div>
  );
}

/** 
 * Renders the start-up / project loading screen.
 * @param {fun} loadPipeline - Function which handles loading a pipeline.
 * @param {fun} resetPipeline - Function which resets to a new pipeline.
 * @param {fun} loadSamplePipeline - Function which handles loading samples.
 */
export default function ProjectLoad(props) {
  useEffect(()=>{
    mixpanel.track("Page View", {'name': 'landing'});
  }, []);
  
  const { loadPipeline, resetPipeline, loadSamplePipeline } = props;

  return (
    <div style={{height: `calc(100% - ${props.navbarH}px`, background: "#0d0034"}}>      
      <div className="contentdiv loaderDiv">
        <LoadPipelinePanel onClick={loadPipeline} />
        <SelectPanel {...{resetPipeline, loadPipeline, loadSamplePipeline}} />          
      </div>
      <div className='headerText'>
        <img className="logoImage" src={logo.default} style={{width: 'inherit'}} />
        AK Analyst
      </div>
    </div>      
  );
}
