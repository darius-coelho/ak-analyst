import React, {useState, useRef, useEffect, useContext} from 'react'

import axios from "axios"
import api from '../../../../../apis/api';
import _, { set } from 'lodash';

import NaviBar from '../../../common/components/NaviBar';
import AttributeDetails from "./AttributeDetails"
import AttributeList from './AttributeList'
import DerivedAttributeEditor from './DerivedAttributeEditor'
import MultiAttributeTransform from './MultiAttributeTransform'
import DataTable from '../../../charts/components/DataTable'

import { createFileOutput } from '../../../graph/components/Action.prototype';

import AddressContext from "../../../../AddressContext";

import { useInfoToastContext } from '../../../common/components/InfoToastContext';

import mixpanel from 'mixpanel-browser';

import "../../../../css/Spinners.css"
import "../../../../css/Core.css"

const Transformer = (props) => {  

  // get react context that stores the web address for the ak engine api
  const context = useContext(AddressContext);

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();
  
  const pad = 10;
  const barHt = 35;
  const listWd = 0.22*window.innerWidth;
  const menuHt = 35
  const [dims, setDims] = useState({
    attributeListBox: {
      top: pad + menuHt,
      left: pad,
      width: listWd,
      height: window.innerHeight - 2.5*pad - barHt - menuHt
    },  
    contentBox: {
      top: pad + menuHt,
      left: 2*pad + listWd,
      width: window.innerWidth - 3*pad - listWd,
      height: window.innerHeight - 2.5*pad - barHt - menuHt
    },
    buttonBox: {
      top: window.innerHeight - barHt - pad, 
      left: pad,
      width: listWd,
      height: barHt, 
      background: "none",
      boxShadow: "none",
      textAlign:"center",
    },
    statusBar:{
      top: window.innerHeight - barHt - pad, 
      left: 2*pad + listWd,
      width: window.innerWidth - 3*pad - listWd,
      height: barHt, 
      background: "none",
      boxShadow: "none",
      textAlign:"center",
    }
  })

  const [ transformProps, setTransformProps ] = useState({
    data: props.data,
    previewData: props.data.map(d=>_.omit(d, props.deleted)),
    description: props.description,
    transformations: props.transformations,
    deleted: props.deleted,
    attributes: props.attributes,
    attrTypes: {},
    orderings: {},
    origLen: props.origLen,
    currLen: props.currLen
  });
  
  const [ selIdx, setSelIdx ] = useState(null);
  const [ showDerived, setShowDerived ] = useState(false);
  const [ showMultiTx, setShowMultiTx ] = useState(false);
  const [ loaderDisplay, setloaderDisplay ] = useState("none");
  
  const abortController = useRef(new AbortController());
  
  /** 
   * Extracts the attribute types and their orderings from the attribute description array
   * and creates objecrt mapping attribute names to types and orderings
   * @param {Array} description - Array of attribute descriptions.
   */
  const createMappings = (description) => {
    const attrTypes = Object.assign({}, ...description.map(d=>({[d.name]: d.type})));
    const orderings = Object.assign({}, ...description.map(d=>({[d.name]: d.ordering})));
    return {attrTypes, orderings};
  }
  
  /*
   * Effect called on mounting to setup the tranformer component
   */
  useEffect(()=>{    
    mixpanel.track("Page View", {'name': 'transformer'}); 
    console.log("Create mappings...");
    // Create a mapping from attribute names to types and orderings
    const { attrTypes, orderings} = createMappings(transformProps.description);
    console.log("Done");

    setTransformProps({
      ...transformProps,
      attrTypes,
      orderings
    })
    
    console.log("Finished Mount");

    function handleResize() {
      setDims({
        attributeListBox: {
          top: pad + menuHt,
          left: pad,
          width: listWd,
          height: window.innerHeight - 2.5*pad - barHt - menuHt
        },  
        contentBox: {
          top: pad + menuHt,
          left: 2*pad + listWd,
          width: window.innerWidth - 3*pad - listWd,
          height: window.innerHeight - 2.5*pad - barHt - menuHt
        },
        buttonBox: {
          top: window.innerHeight - barHt - pad, 
          left: pad,
          width: listWd,
          height: barHt, 
          background: "none",
          boxShadow: "none",
          textAlign:"center",
        },
        statusBar:{
          top: window.innerHeight - barHt - pad, 
          left: 2*pad + listWd,
          width: window.innerWidth - 3*pad - listWd,
          height: barHt, 
          background: "none",
          boxShadow: "none",
          textAlign:"center",
        }
      })
    }

    window.addEventListener('resize', handleResize)
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);  

  /** 
   * Handles creating an endpoint along with config options. 
   * @param {string} name - The name of the api endpoint.
   * returns - A tuple containing the endpoint and config options.
   */
  function createEndpoint(name) {
    abortController.current = new AbortController();
    const endPoint = context.address + name;
    return [endPoint, {withCredentials: true, signal: abortController.current.signal}]    
  }

  /** Handles error responses from an api call. */
  function handleAPIError(error) { 
    setloaderDisplay("none")	
    if (axios.isCancel(error)) {
      console.log("User request was cancelled");
    } else {
      console.error(error);
      addInfoToast(error.response.data, 'danger')      
    } 
  }
  
  /** 
   * Applies a transform to an attribute in the data by making a request to the backend   
   * @param {JSON} transform - Object specifying the transform and its parameters.
   */
  const onTransformAttribute = (transform, callback=null) => {
    setloaderDisplay("block")

    const [endPoint, axiosConfig] = createEndpoint("TransformAttribute");
    axios.post(endPoint, transform, axiosConfig)
      .then((res) => {
        if(res.data.err == 0) {
          const { attrTypes, orderings} = createMappings(res.data.description);
          
          // Remove temporarily deleted columns from preview
          const preview = res.data.data.map(d => _.omit(d, transformProps.deleted));

          const rest = {
            data:res.data.data,
            previewData: preview,
            transformations: res.data.transformations,
            attrTypes: attrTypes,
            orderings: orderings,
            origLen: +res.data.counts.original,
            currLen: +res.data.counts.filtered
          }
          loadHistogram(res.data.description[selIdx].name, null, rest);
    
          if (callback !== null) {
            // call any callback functions on success
            callback();
          }
          setloaderDisplay("none")
        }
        else{
	        console.error(res.data.err);
          setloaderDisplay("none")
          addInfoToast(res.data.err, 'danger')
        }
      }, handleAPIError);
  }

  /** 
   * Applies a transform to multiple attributes in the data by making a request to the backend   
   * @param {JSON} transform - Object specifying the transform and its parameters.
   */
  const onApplyMultiTx = (transform) => {
    setloaderDisplay("block")
    const [endPoint, axiosConfig] = createEndpoint("TransformMultiAttribute");

    axios.post(endPoint, transform, axiosConfig)
      .then((res) => {
        if(res.data.err == 0) {
          const { attrTypes, orderings} = createMappings(res.data.description);

          // Remove temporarily deleted columns from preview
          const preview = res.data.data.map(d => _.omit(d, transformProps.deleted));
	  
          setTransformProps({
            ...transformProps,
            data: res.data.data,
            previewData: preview,
            description: res.data.description, 
            transformations: res.data.transformations,
            attributes: res.data.description.map(x => x.name),
            attrTypes: attrTypes,
            orderings: orderings,
            origLen: +res.data.counts.original, 
            currLen: +res.data.counts.filtered
          })
          setloaderDisplay("none")
        }
        else{
          console.error(res.data.err)
          addInfoToast(res.data.err, 'danger')
          setloaderDisplay("none")
        }
      }, (error) => handleAPIError(error));
  }

  /** 
   * Loads the histogram for the currently focused Numeric attribute.
   * @param {string} attr - Attribute to load histogram for.
   * @param {JSON} stateData - Data to set the state after loading.
   */
  const loadHistogram = (attr, idx=null, stateData={}) => {
    // Load histogram through the preview mechanism
    onPreviewFilter({attr: attr}, idx, stateData);
  }

  /** 
   * Removes a transform to that was applied to an attribute 
   * @param {JSON} tId - The transform id.
   */
  const onDeleteTransform = (tId) => {
    setloaderDisplay("block")
    
    const [endPoint, axiosConfig] = createEndpoint("DeleteTransform");
    axios.post(endPoint, tId, axiosConfig)
      .then((res) => {
	
	if (res.data.err == 0) {
          // If attributes are removed
          // update the index of the selected item
          const newIdx = res.data.description.map(x => x.name)
		                      .indexOf(transformProps.description[selIdx].name)
	  
          const { attrTypes, orderings} = createMappings(res.data.description);

          // Remove temporarily deleted columns from preview
	        const preview = res.data.data.map(d => _.omit(d, transformProps.deleted));
          
          // load the histogram data.
          const rest = {
            data: res.data.data,
            previewData: preview,
            transformations: res.data.transformations,
            attrTypes: attrTypes,
            orderings: orderings,
            origLen: +res.data.counts.original,
            currLen: +res.data.counts.filtered,          
          }
          if(newIdx > -1){
            loadHistogram(res.data.description[newIdx].name, newIdx, rest);
          }
          else { // if the selected item is no longer present show data table
            setSelIdx(null)
            setTransformProps({
              ...transformProps,
              ...rest,
              description: res.data.description,
              attributes: res.data.description.map(x => x.name),            
            })
          }        
          setloaderDisplay("none")
        } else {
          console.error(res.data.err);
          setloaderDisplay("none")
          addInfoToast(res.data.err, 'danger')
        }
      }, handleAPIError);
  }

  /** 
   * Disables a transform to that was applied to an attribute 
   * @param {JSON} tId - The transform id.
   */
  const onHideTransform = (tId) => {
    setloaderDisplay("block")

    const [endPoint, axiosConfig] = createEndpoint("ToggleHideTransform");
    axios.post(endPoint, tId, axiosConfig)
      .then((res) => {
	      if (res.data.err == 0) {
	        // If attributes are removed 
          // update the index of the selected item
          const newIdx = res.data.description.map(x => x.name)
		                        .indexOf(transformProps.description[selIdx].name)
	  
          const { attrTypes, orderings} = createMappings(res.data.description);

          // Remove temporarily deleted columns from preview
          const preview = res.data.data.map(d => _.omit(d, transformProps.deleted));
          
          const rest = {
            data: res.data.data,
            previewData: preview,
            transformations: res.data.transformations,
            attrTypes: attrTypes,
            orderings: orderings
          }
          if (newIdx > -1) {
            loadHistogram(res.data.description[selIdx].name, null, rest);
          }
          else {  // if the selected item is no longer present show data table
            setSelIdx(null)
            setTransformProps({
              ...transformProps,
              ...rest,
              description: res.data.description,
              attributes: res.data.description.map(x => x.name),            
            })
          }
          setloaderDisplay("none")
        } else {
          console.error(res.data.err);
          setloaderDisplay("none")
          addInfoToast(res.data.err, 'danger')
        }
      }, handleAPIError);
    
  }

  const onPreviewFilter = (filter, idx=null, rest={}) => {
    const setState = setState;
    const endPoint = context.address + "PreviewFilter"
    axios.post(endPoint, filter, {withCredentials: true}).then(
      (res) => {
        setTransformProps({
          ...transformProps,
          description: res.data.description,
          attributes: res.data.description.map(x => x.name),
	        ...rest
        })
        if(idx !== null) setSelIdx(idx)
      },
      (error) => {
        console.log(error);
        addInfoToast(error.response.data, 'danger')
      }
    );
  }  

  /** 
   * Creates a derived attribute and adds it to the dataset by making a request to the backend   
   * @param {JSON} req - Object specifying the derived attribute name expression to create it.
   */
  const onDeriveAttribute = (req) => {
    setloaderDisplay("block")

    const [endPoint, axiosConfig] = createEndpoint("TransformAttribute");
    axios.post(endPoint, req, axiosConfig)
      .then((res) => {
        if (res.data.err == 0) {
          const idx = res.data.description.length - 1
          const { attrTypes, orderings } = createMappings(res.data.description)
          
          // Remove temporarily deleted columns from preview
          const preview = res.data.data.map(d => _.omit(d, transformProps.deleted))
          setTransformProps({
            ...transformProps,
            data: res.data.data,
            previewData: preview,
            description: res.data.description,
            attributes:res.data.description.map(x => x.name),
            transformations: res.data.transformations,
            attrTypes: attrTypes,
            orderings: orderings,
          })
          setShowDerived(false)
          setSelIdx(idx)
          setloaderDisplay("none")
        } else {
          console.error(res.data.err)
          setloaderDisplay("none")
          addInfoToast(res.data.err, 'danger')
        }
      }, handleAPIError);
  }

  /** 
   * Duplicates the currently selected attribute and adds it to the dataset   
   */
  const onDuplicateAttribute = () => {
    // Determine new name for duplicate attribute
    let count = 1
    let name = transformProps.description[selIdx].name + "_" + count
    const attrs = transformProps.description.map(d => d.name);
    while(attrs.includes(name)){
      count += 1
      name = transformProps.description[selIdx].name + "_" + count
    }
    // Use derived attribute transform to duplicate the attribute
    const tx = {
      tType: 'Derived',
      attr: name,
      expr: transformProps.description[selIdx].name
    }
    onDeriveAttribute(tx)
  }
 
  /** 
   * Changes the currently selected attribute and 
   * updates the  information for the attribute detail view
   */
  const onSelectAttr = (idx) => {
    const description = transformProps.description
    if(isNaN(idx)){
      idx = description.findIndex(x => x.name == idx)
    }
    if(idx == selIdx){      
      setSelIdx(null)
    }
    else{
      if (description[idx].type === 'Numerical' || description[idx].type === 'DateTime') {
	      loadHistogram(description[idx].name, idx);
      } else {	      
        setSelIdx(idx)
      }
    }
  }  

  /**
   * Toggle the delete status of a list of attribute.
   * @param {string} attr - Attribute to delete / restore.
   */
  const toggleAttrDelete = (attributes) => {
    let deleted = transformProps.deleted
    console.log("searching for deleted attribute in list...");
    for(let i=0; i<attributes.length; i++){
      const attr = attributes[i]
      const idx = deleted.indexOf(attr)
      if (idx < 0) {
        deleted.push(attr)
      }
      else{
        deleted.splice(idx, 1);
      }
    }
    console.log("done");
    
    // Remove temporarily deleted columns from preview
    const preview = transformProps.data.map(d=>_.omit(d, deleted));    
    
    setTransformProps({
      ...transformProps,
      previewData: preview,
      deleted
    })
  }

  /** Cancels the current transform being applied. */
  const cancelTransform = () => {
    abortController.current.abort();
  }
  
  /**
  * Sets the config and output of the cleanse action 
  * with the transforms and transformed data 
  * on exiting the transformer
  */
  const onExit = () => {
    try{
      // Update config with transforms
      props.setParams({
        transformations: transformProps.transformations,
        deleted: transformProps.deleted
      });

      // Update backend cache
      let pathTo = props.pathTo();     
      pathTo.config={
        ...pathTo.config,
        transformations: transformProps.transformations,
        deleted: transformProps.deleted
      }
      
      api.execute(pathTo, (res)=>{
	      const output = res.data.outputList.map(d => createFileOutput(d));
        props.setOutput(output);

	      api.freeMemory();	
      }, (error)=>{
	      console.error(error.response.data);
        addInfoToast(error.response.data, 'danger')
      });
      
    }
    catch(error){
      console.warn(error)
      addInfoToast(error, 'danger')
    }
  }

  const cancelStyle = {
    position: 'relative',
    top: '49%',
    left: '52%',
    fontSize: '2rem',
    color: '#6470aa',
    cursor: 'pointer'
  };
  
  return (
    <div>
      <AttributeList
        description={transformProps.description}
        dataCount={transformProps.currLen}
        transformations={transformProps.transformations}
        deleted={transformProps.deleted}
        onSelect={onSelectAttr}
        selIdx={selIdx}
        onDelete={toggleAttrDelete}
        {...dims.attributeListBox}
      />
      {
        selIdx !== null
        ? <AttributeDetails
            isSample={props.isSample}
            description={transformProps.description[selIdx]}
            attributes={transformProps.attributes}
            attrTypes={transformProps.attrTypes}
            orderings={transformProps.orderings}
            transformations={transformProps.transformations}
            dataCount={transformProps.currLen}
            data={transformProps.data}
            deleted={transformProps.deleted}
            onDelete={toggleAttrDelete}
            onDuplicateAttribute={onDuplicateAttribute}
            onTransformAttribute={onTransformAttribute}
            onHideTransform={onHideTransform}
            onDeleteTransform={onDeleteTransform}
            onPreviewFilter={onPreviewFilter}
            onJumpTo={onSelectAttr}
            {...dims.contentBox}
          />
        : null
      }
          
      {
        selIdx == null
        ? <div className="contentdiv" style={dims.contentBox}>
            <label className="contentDivHead" title={"Data Preview"}>{"Data Preview"}</label>            
            <div className="placeholderText">
              {"Select an attribute from the left to view details."}
            </div>            
            <DataTable
              show={true}
              data={transformProps.previewData}
              rows={25}
              top={10}
              left={25}
              height={dims.contentBox.height - 120}
              width={dims.contentBox.width - 60}
            />
          </div>
        :null
      }

      <DerivedAttributeEditor
        show={showDerived}
        description={transformProps.description}
        onDeriveAttribute={onDeriveAttribute}
        onCancel={() => setShowDerived(false)}
        top={0}
        left={0}
        height={window.innerHeight}
        width={window.innerWidth}
      />

      <MultiAttributeTransform
        show={showMultiTx}
        description={transformProps.description}
        dataCount={transformProps.currLen}
        onApplyTx={onApplyMultiTx}
        deleted={transformProps.deleted}
        onDelete={toggleAttrDelete}
        onCancel={() => setShowMultiTx(false)}
        top={0}
        left={0}
        height={window.innerHeight}
        width={window.innerWidth}
      />
      
      <div className="contentdiv" style={dims.buttonBox}>
        <button
          className="coreButton"
          style={{maxWidth: dims.buttonBox.width/2 - 20}}
          onClick={() => setShowDerived(true)}
          title={"Add Derived Attribute"} >
            {"Add Derived Attribute"}
        </button>
        <button
          className="coreButton"
          style={{maxWidth: dims.buttonBox.width/2 - 20}}
          onClick={() => setShowMultiTx(true)}
          title={"Transform Multiple"} >
            {"Transform Multiple"}
        </button>
      </div>

      <div className="contentdiv" style={dims.statusBar}>
        <div className='statFootNote'>
          {
            `${(100*(transformProps.currLen / transformProps.origLen)).toFixed(2)}% of the data remains after filtering | 
            Attribute Count: ${transformProps.description.length - transformProps.deleted.length} (${transformProps.description.length})
            | Data Item Count: ${transformProps.currLen} (${transformProps.origLen})` 
          }
        </div>
      </div>

      <NaviBar
        backToData = {{pathname: "/main"}}
        onBack={onExit}
      />

      <div className="loaderContainer" style={{display: loaderDisplay}}>      
      <span className="material-icons-outlined" style={cancelStyle} onClick={cancelTransform}>
      cancel
      </span>
      <div className="loaderBarA" style={{top: "40%"}} />


      </div>
    </div>
  );  
}


export default Transformer;
