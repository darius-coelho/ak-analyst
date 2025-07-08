import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import Card from 'react-bootstrap/Card';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Select from 'react-select';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form'
import FormControl from 'react-bootstrap/FormControl'
import InputGroup from 'react-bootstrap/InputGroup'
import { Options } from '../../../config/components/SKLearnActionConfig';
import { useInfoToastContext } from '../../../common/components/InfoToastContext';
import AddressContext from "../../../../AddressContext";

/** Renders the text indicating the level of fit. */
function FitScoreText(props) {
  const { node } = props;

  
  // check if focus node is selected
  if (node === undefined) return null;

  // no fit for latent nodes
  if (node.type === 'latent') return null;

  // check if fit score was calculated
  if (node.fitScore === null) return null;

  const textStyle = {
    fontSize: "13px",
    textAlign: 'end',
    paddingTop: '3px',
    color: 'darkgreen'
  };
  
  if (node.dtype === 'Numerical') {
    return (
	<Col lg={8} style={textStyle}>
	R<sup>2</sup>: {node.fitScore.toFixed(2)}
        </Col>
    );    
  }

  return (
      <Col lg={8} style={textStyle}>
        Accuracy: {node.fitScore.toFixed(2)}
      </Col>
  );
}

/** Renders the appropriate intervention fields (i.e. atomic vs shift) */
function CausalType(props) {
  const {isAtomic, reference, alternative, shift, refChange, altChange, shiftChange} = props;

  if (isAtomic) {
    return (
      <Row>
      <Col lg={6}>
      <InputGroup size='sm' className="mb-3">
      <InputGroup.Text id="basic-addon1" style={{height: 32, fontSize: '0.8rem'}}>
        Reference
      </InputGroup.Text>
      
          <FormControl
            name="reference"
            aria-label="reference"
            aria-describedby="basic-addon1"
            value={reference}
            onChange={refChange}
          />
      </InputGroup>
      </Col>
      
      <Col lg={6}>
     <InputGroup size='sm' className="mb-3">
       <InputGroup.Text id="basic-addon1" style={{height: 32, fontSize: '0.8rem'}}>
         Alternative
       </InputGroup.Text>
      
       <FormControl
         name="alternative"
         aria-label="alternative"
         aria-describedby="basic-addon1"
         value={alternative}
         onChange={altChange}
       />
      </InputGroup>
      </Col>
      </Row>
    );
  }

  return (
      <Row>
      <Col lg={6} style={{margin: 'auto'}}>
     <InputGroup size='sm' className="mb-3">
       <InputGroup.Text id="basic-addon1" style={{height: 32, fontSize: '0.8rem'}}>
         Shift
       </InputGroup.Text>
      
       <FormControl
         name="shift"
         aria-label="shift"
         aria-describedby="basic-addon1"
         value={shift}
         onChange={shiftChange}
       />
      </InputGroup>
      </Col>
      </Row>
  );
}

/** Renders the parameters for the Effect Inference section. */
function EffectInference(props) {

  const { buttonStyle, focusNode,
	  nodes, edges, setNodes, setLoading } = props;

  // get react context that stores the web address for the ak engine api
  const context = useContext(AddressContext);

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();
  
  if (focusNode === null || !(focusNode in nodes) || nodes[focusNode].type !== 'observed') {
    return null;
  }

  const [isAtomic, setIsAtomic] = useState(true);

  useEffect(() => {
    if (nodes[focusNode].dtype !== 'Numerical') {
      setIsAtomic(true);
    }
  }, [focusNode]);
  
  const alternative = nodes[focusNode].alternative;
  const reference = nodes[focusNode].reference;
  const shift = nodes[focusNode].shift;  
  const isDisabled = (isAtomic && (alternative === '' || reference === ''))
	|| (!isAtomic && (shift === ''));

  const selectDisplay = edges.filter(e=>e.sourceAttr === focusNode).length == 0 ? 'none': 'block';

  
  /** Estimates the average causal effect. */
  function estimateEffect() {
    const endPoint = context.address + "EstimateIntervention";
    const execData = {
      nodes: Object.fromEntries(Object.entries(nodes).filter(d=>d[1].type==='observed')),
      edges: edges.filter(e=>(nodes[e.sourceAttr].type==='observed' &&
			      nodes[e.targetAttr].type==='observed')),
      focus: focusNode,
      alternative: alternative,
      reference: reference,
      shift: shift,
      isAtomic: isAtomic
    };
    setLoading(true);
    axios.post(endPoint, execData, {withCredentials: true})
        .then(
          (res)=> {
            let unodes = {...nodes};
            for (let succ in res.data) {
              unodes[succ].ate = {
                ...unodes[succ].ate,
                [focusNode]: {ate: res.data[succ][0], ci: res.data[succ][1]}
              }
            } // end for succ
            setLoading(false);
          },
          (error)=>{
            setLoading(false);
            addInfoToast(error.response.data, 'danger')
          }
        );
  }

  /** Sets the reference value. */
  function refChange(e) {
    if (focusNode === null)  return;
    setNodes({...nodes, [focusNode]: {...nodes[focusNode], reference: e.target.value}});
  }

  /** Sets the alternative value. */
  function altChange(e) {
    if (focusNode === null)  return;
    setNodes({...nodes, [focusNode]: {...nodes[focusNode], alternative: e.target.value}});
  }

  /** Sets the shift value. */
  function shiftChange(e) {
    if (focusNode === null)  return;
    setNodes({...nodes, [focusNode]: {...nodes[focusNode], shift: e.target.value}});
  }


  /** Handles changes to the intervention type. */
  function onChange(e) {
    setIsAtomic(!e.target.checked);
  }

  return (
      <Col lg={12} style={{display: selectDisplay, marginTop: 20}}>
      <Row>
      <Col lg={6} style={{fontSize: "15px"}}>Intervention</Col>
      <Col lg={2}  style={{fontSize: "13px", paddingTop: '1px'}}>Type:</Col>
      <Col lg={4} className="ps-0">
      <Form>
      <Form.Check 
        type="switch"
        id="intervention-type"
        name="intervention_type"
        checked={!isAtomic}
        disabled={nodes[focusNode].dtype !== 'Numerical'}
        label={isAtomic ? "atomic" : "shift"}
        onChange={onChange}
        style={{fontSize: '13px', paddingTop: '1px', maxHeight: '15px', marginBottom: '0px'}}
      /></Form>
      </Col>      
      </Row>
      <hr className="lineDivide"/>

      <CausalType {...{isAtomic, reference, alternative, shift, refChange, altChange, shiftChange}} />

      <Row>
      <Col lg={12}>
      <Button disabled={isDisabled} style={buttonStyle} onClick={estimateEffect}>
        Estimate Effect
      </Button>
      </Col>
      </Row>
 
      </Col>
  );
}

/** 
 * Renders the options in the configuration menu.
 * @param {int} width - Width of the menu.
 * @param {int} start - Start location of the menu.
 * @param {json} nodes - JSON object of nodes.
 * @param {array} edges - List of edges.
 * @param {string} focusNode - Name of the current focused node.
 * @param {fun} setNodes - Callback for setting the nodes.
 * @param {fun} setEdges - Callback for setting the edges.
 * @param {fun} setLoading - Callback for toggling the loading screen.
 */
function CausalOptions(props) {
  const {width, start, nodes, edges, focusNode, modelList,
	 resetNodeCausalParams, setNodes, setEdges, setLoading } = props;

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();

  // true if there exists a cycle in the graph
  const isCycle = Object.entries(nodes).reduce((agg, [k, v])=>agg || v.inCycle, false);
  
  if (isCycle) {
    return (
	<div style={{textAlign: 'center', marginTop: 20}}>
	Graph Contains a Cycle
	</div>
    );
  }
  
  // get react context that stores the web address for the ak engine api
  const context = useContext(AddressContext);

  const style = {
    width: width,
    zIndex: 1,
    minHeight: 50,
    background: "white",
    top: 45,
    left: start
  };

  /** Handles call to the backend to estimate the intrinsic influence. */
  function estimateInfluence() {
    const endPoint = context.address + "EstimateInfluence";
    const execData = {
      focus: focusNode,
      nodes: Object.fromEntries(Object.entries(nodes).filter(d=>d[1].type==='observed')),
      edges: edges.filter(e=>(nodes[e.sourceAttr].type==='observed' &&
			      nodes[e.targetAttr].type==='observed'))
    };
    setLoading(true);
    axios.post(endPoint, execData, {withCredentials: true})
        .then(
          (res) => {
            let unodes = {...nodes};
            for (let k in res.data) {
              unodes[k].influence = {...unodes[k].influence, [focusNode]: 1+res.data[k]};
            } // end for k
            setNodes(unodes);
            setLoading(false);
          },
          (error)=>{
            console.log(error);
            setLoading(false);
            addInfoToast(error.response.data, 'danger')
          }
        );
  }
  
  /** Handles call to the backend to estimate the edge strength */
  function estimateEdgeStrength() {
    const endPoint = context.address + "EstimateEdgeStrength";
    const execData = {
      focus: focusNode,
      nodes: Object.fromEntries(Object.entries(nodes).filter(d=>d[1].type==='observed')),
      edges: edges.filter(e=>(nodes[e.sourceAttr].type==='observed' &&
			      nodes[e.targetAttr].type==='observed'))
    };
    setLoading(true);
    axios.post(endPoint, execData, {withCredentials: true})
        .then(
          (res) => {
            setEdges(edges.map(e=>{
              if (e.targetAttr in res.data) {
                // update targetAttr weights
                return {...e, weight: res.data[e.targetAttr][e.sourceAttr]};
              }
              return {...e};
            }));
            setLoading(false);
          },
          (error)=> {
            console.log(error);
            setLoading(false);
            addInfoToast(error.response.data, 'danger')
          }
        );
  }

  /** Handles calls to backend to estimate the fit. */
  function estimateFit() {
    const endPoint = context.address + "EstimateFit";
    const execData = {
      focus: focusNode,
      nodes: Object.fromEntries(Object.entries(nodes).filter(d=>d[1].type==='observed')),
      edges: edges.filter(e=>(nodes[e.sourceAttr].type==='observed' &&
			      nodes[e.targetAttr].type==='observed'))
    };
    setLoading(true);
    axios.post(endPoint, execData, {withCredentials: true})
        .then(
          (res) => {
            setNodes({...nodes, [focusNode]: {...nodes[focusNode], fitScore: res.data.score}});
            setLoading(false);
          },
          (error) =>{
            console.log(error);
            setLoading(false);
            addInfoToast(error.response.data, 'danger')
          }
        );
  }
  
  /** Handles calls to the backend to perform latent variable search. */
  function findLatent() {
    const endPoint = context.address + "FindLatent";
    const execData = {
      focus: focusNode,
      nodes: Object.fromEntries(Object.entries(nodes).filter(d=>d[1].type==='observed')),
      edges: edges.filter(e=>(nodes[e.sourceAttr].type==='observed' &&
			      nodes[e.targetAttr].type==='observed'))
    };
    setLoading(true);
    axios.post(endPoint, execData, {withCredentials: true})
        .then(
          (res) => {
            const result = JSON.parse(res.data.result);
            const unodes = result.filter(d=>d.confounders.length > 0)
            .map((d,i)=>({
              [`U${i}`]: {
                x: (nodes[d.n1].x + nodes[d.n2].x) / 2,
                y: (nodes[d.n1].y + nodes[d.n2].y) / 2,
                type: 'latent',
                ate: null,
                influence: {},
                payload: d.confounders,
                influence: {},
                inCycle: false,
              }
            }));
            setNodes({...resetNodeCausalParams(nodes), ...Object.assign({}, ...unodes)});
            const uedges1 = result.filter(d=>d.confounders.length>0)
                            .map((d,i)=>({sourceAttr: `U${i}`, targetAttr: d.n1,
                            sourcePort: 'bottom', targetPort: 'top'}));
          
            const uedges2 = result.filter(d=>d.confounders.length>0)
                            .map((d,i)=>({sourceAttr: `U${i}`, targetAttr: d.n2,
                            sourcePort: 'bottom', targetPort: 'top'}));

	          setEdges([...edges, ...uedges1, ...uedges2]);
            setLoading(false);
          },
          (error)=>{
            console.log(error);
            setLoading(false);
            addInfoToast(error.response.data, 'danger')
          }
        );
  }


  
  /** Update the node state when specifying the functional form */
  function onSelectedChange(selected) {
    const endPoint = context.address + "ModelOptions";
    axios.post(endPoint, selected, {withCredentials: true})
        .then(
          (response) => {
            setNodes({
              ...nodes,
              [focusNode]: {
                ...nodes[focusNode],
                model: selected,
                paramList: response.data.options
              }
            });
          },
          (error)=>{
            console.log(error);
            addInfoToast(error.response.data, 'danger')
          }
        );
  }

  /** Updates the param list for the selected sklearn model. */
  function setParams(params) {
    setNodes({
      ...nodes,
      [focusNode]: {
        ...nodes[focusNode],
        paramList: params.paramList
      }
    });
  }

  const selectDisplay = (
    focusNode === null || edges.filter(e=>e.targetAttr===focusNode).length == 0
      ? 'none'
      :'block'
  );
  
  const textStyle = {
    fontSize: '0.8rem',
    padding: '0.5rem',
    textAlign: 'end',
    display: selectDisplay 
  };

  const buttonStyle = {
    width: "100%",
    fontSize: "0.9rem",
    background: '#ABC3E5',
    color: "black"
  };

  const title = focusNode === null ? "Graph Options" : `${focusNode} Options`;
  return (
    <Container style={{marginTop: 20, marginBottom: 20, overflow: 'auto', height: "100%"}}>
      <Row><Col lg={12} style={{fontSize: "15px"}}>{title}</Col></Row>
      <hr className="lineDivide"/>
      
      <Row>
      <Col lg={12}>
      <Button style={buttonStyle} onClick={findLatent}>
        Find Latent Variables
      </Button>
      </Col>
      </Row>

      <Row className='mt-2'>
      <Col lg={12}>
      <Button style={buttonStyle} onClick={estimateEdgeStrength}>
        Estimate Edge Strength
      </Button>
      </Col>
      </Row>

      { 
        focusNode === null
        ? null
        : <Row className='mt-2'>
            <Col lg={12}>
              <Button style={buttonStyle} onClick={estimateInfluence}>
                Estimate Intrinisic Influence
              </Button>
            </Col>
          </Row>
      }
      <EffectInference {...{selectDisplay, buttonStyle, focusNode,
			    nodes, edges, setNodes, setLoading}} />

      <Col lg={12} style={{display: selectDisplay, marginTop: 20}}>
      <Row>
      <Col lg={4} style={{fontSize: "15px"}}>Select Model</Col>
      <FitScoreText node={nodes[focusNode]} />
      </Row>
      <hr className="lineDivide"/>
      <Select
        value={(focusNode in nodes && 'model' in nodes[focusNode])
	       ? nodes[focusNode].model
	       : modelList[0]}
        name='models'   
        options={modelList}
        onChange={onSelectedChange}
      />
      </Col>

      <Row className='mt-2' style={{display: selectDisplay}}>
      <Col lg={12}>
      <Button style={buttonStyle} onClick={estimateFit}>
        Estimate Fit
      </Button>
      </Col>
      </Row>

      {
	      focusNode in nodes && 'paramList' in nodes[focusNode] && nodes[focusNode].paramList.length > 0
        ? <Col lg={12} style={{marginTop: 20}}>
            <Row><Col lg={12} style={{fontSize: '15px'}}>Configuration</Col></Row>
            <hr className="lineDivide"/>
            <Options paramList={nodes[focusNode].paramList} setParams={setParams} />
          </Col>
        : null
      }
    </Container>
  );
}


/** 
 * Renders the causal configuration panel.
 * @param {json} style - Style options for the panel.
 * @param {json} nodes - JSON object of nodes.
 * @param {array} edges - List of edges.
 * @param {string} focusNode - Name of the current focused node.
 * @param {array} modelList - List of sklearn models.
 * @param {fun} setNodes - Callback for setting the nodes.
 * @param {fun} setEdges - Callback for setting the edges.
 * @param {fun} setLoading - Callback for toggling the loading screen.
 */
export function CausalConfig(props) {
  const { style, nodes, edges, focusNode, modelList,
	  resetNodeCausalParams, setNodes, setEdges,
	  setLoading } = props;
  
  return (
      <Card style={{...style, position: "absolute"}}>
      <label className="contentDivHead"  title={"Causal Configuration"}>
        Causal Configuration
      </label>
      
      <CausalOptions
        width={style.width}
        start={style.left}
        nodes={nodes}
        edges={edges}
        focusNode={focusNode}
        modelList={modelList}
        resetNodeCausalParams={resetNodeCausalParams}
        setNodes={setNodes}
        setEdges={setEdges}
        setLoading={setLoading}
      />
      </Card>
  );
}

export default CausalConfig;
