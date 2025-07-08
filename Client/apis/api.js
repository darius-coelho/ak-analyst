import axios from 'axios';
import { store } from '../components/modules/store';
import * as actions from '../components/modules/graph/graph.actions';
import * as selectors from '../components/modules/graph/graph.selectors';
import { parseOutputFun } from '../components/modules/graph/components/Action.prototype';
const NOOP_FUN = ()=>{};

function api() {
  this._address = null;
}

api.prototype.init = function(address) {
  this._address = address;
  this._errorFlag = false;
};

api.prototype.execute = function(pathTo, handleResponse=NOOP_FUN,
				 handleError=NOOP_FUN,
				 callback=NOOP_FUN) {
  if (this._errorFlag) {
    store.dispatch(actions.setIsLoading(pathTo.ID, false));
    
    if (callback===NOOP_FUN) {
      this._errorFlag = false;
    }
  }
  
  const endPoint = this._address + "Execute";
  axios.post(endPoint, pathTo, {withCredentials: true})
    .then((res)=>{      
      if (res.data !== 'OK' && 'outputList' in res.data) {	
	// Set loading flag when output ready
	const output = res.data.outputList.map(d => parseOutputFun(pathTo.type)(d))
	store.dispatch(actions.setOutput(pathTo.ID, output));
      }
      
      handleResponse(res);   
    })
    .catch((err)=>{
      this._errorFlag = true;
      handleError(err)
    })
    .finally(()=>{
      store.dispatch(actions.setIsLoading(pathTo.ID, false));

      if (callback === NOOP_FUN) {
	this._errorFlag = false;  // reset the flag
      }

      callback();
    });
}

api.prototype._executePipeline = function(pathTo, handleResponse=NOOP_FUN,
					  handleError=NOOP_FUN,
					  callback=NOOP_FUN) {
  store.dispatch(actions.setIsLoading(pathTo.ID, true));
  if (pathTo.input.length > 0) {
    for (var i=0; i < pathTo.input.length; ++i) {
      this._executePipeline(pathTo.input[i], NOOP_FUN, handleError,
			    this.execute.bind(this, pathTo, handleResponse,
					      handleError, callback));
    }    
  } else {
    this.execute(pathTo, handleResponse, handleError, callback);
  }
}

api.prototype.executePipeline = function(ID, handleResponse=NOOP_FUN,
					 handleError=NOOP_FUN,
					 callback=NOOP_FUN) {
  const pathTo = selectors.selectPathTo(store.getState().graph, ID, 0);
  this._executePipeline(pathTo, handleResponse, handleError, callback);
}

api.prototype.initTransformer = function(ID, transformations, deleted, options,
					 handleResponse=NOOP_FUN,
					 handleError=NOOP_FUN) {
  const pathTo = selectors.selectPathTo(store.getState().graph, ID, 0);
  this._executePipeline(pathTo, NOOP_FUN, handleError, NOOP_FUN);

  const request = {
    ID: ID,
    type: pathTo.type,
    outPort: pathTo.input[0].outPort,
    pathTo: pathTo.input[0],
    transformations,
    deleted,
    options
  };

  const endPoint = this._address + "InitTransformer";
  axios.post(endPoint, request, {withCredentials: true})
    .then(handleResponse).catch(handleError);
}

api.prototype.localLoadAction = function(fileData, handleResponse, handleError) {
  const endPoint = this._address + "LocalLoadAction";
  axios.post(endPoint, fileData)
    .then(handleResponse).catch(handleError);
}

api.prototype.addPattern = function(pattern, handleResponse, handleError) {
  const endPoint = this._address + "AddPattern";
  axios.post(endPoint, pattern, {withCredentials: true})
    .then(handleResponse).catch(handleError);
}

api.prototype.modelList = function(signal, handleResponse, handleError) {
  const endPoint = this._address + "ModelList";
  axios.post(endPoint, {}, {withCredentials: true, signal: signal})
    .then(handleResponse).catch(handleError);
}

api.prototype.modelOptions = function(selected, handleResponse, handleError) {
  const endPoint = this._address + "ModelOptions";
  axios.post(endPoint, selected, {withCredentials: true})
    .then(handleResponse).catch(handleError);
  
}

api.prototype.getFileDetails = function(folder, handleResponse, handleError) {
  const endPoint = this._address + "GetFileDetails";
  axios.post(endPoint, {folder: folder})
    .then(handleResponse).catch(handleError);
}

api.prototype.selectServerDataFile = function(fileData, handleResponse, handleError) {
  const endPoint = this._address + "SelectServerDataFile";
  axios.post(endPoint, fileData)
    .then(handleResponse).catch(handleError);
}

api.prototype.saveFile = function(folder, nameInfo, content,
				  handleResponse, handleError) {
  const endPoint = this._address + "SaveAction";
  const payload = {
    folder: folder,
    fname: nameInfo.filename,
    oldName: nameInfo.oldName || null,
    content: content
  };
  axios.post(endPoint, payload).then(handleResponse).catch(handleError);
}

api.prototype.deleteFile = function(folder, filename, handleResponse, handleError) {
  const endPoint = this._address + "DeleteFile";
  const payload = {folder: folder, filename: filename};
  axios.post(endPoint, payload).then(handleResponse).catch(handleError);  
}

api.prototype.getUniqueFilename = function(folder, filename, handleResponse, handleError) {
  const endPoint = this._address + "GetDefaultPipelineName";
  axios.get(`${endPoint}/${folder}/${filename}`).then(handleResponse).catch(handleError);
}

api.prototype.initCausal = function(ID, nodes, edges,
				    handleResponse=NOOP_FUN,
				    handleError=NOOP_FUN) {
  const pathTo = selectors.selectPathTo(store.getState().graph, ID, 0);
  this._executePipeline(pathTo, NOOP_FUN, handleError, NOOP_FUN);
  
  const request = {
    ID: ID,
    type: pathTo.type,
    outPort: pathTo.input[0].outPort,
    pathTo: pathTo.input[0],
    nodes,
    edges
  };

  const endPoint = this._address + "InitCausal";
  axios.post(endPoint, request, {withCredentials: true})
    .then(handleResponse).catch(handleError);
}

api.prototype.initCardBrowser = function(ID, handleResponse, handleError) {
  const pathTo = {...selectors.selectPathTo(store.getState().graph, ID, 0),
		  config: {browseType: 'card'}};
  this._executePipeline(pathTo, handleResponse, handleError, NOOP_FUN);  
}

api.prototype.initBubbleBrowser = function(ID, handleResponse, handleError) {
  const pathTo = {...selectors.selectPathTo(store.getState().graph, ID, 0),
		  config: {browseType: 'bubble'}};
  this._executePipeline(pathTo, handleResponse, handleError, NOOP_FUN);  
}

api.prototype.aggregate = function(ID, aggKey, aggMap, handleResponse, handleError) {
  const endPoint = this._address + "Aggregate";
  const pathTo = selectors.selectPathTo(store.getState().graph, ID, 0);
  
  const request = {
    ID: ID,
    type: pathTo.type,
    pathTo: pathTo,
    aggKey,
    aggMap
  };

  axios.post(endPoint, request, {withCredentials: true})
    .then(handleResponse).catch(handleError);
}

api.prototype.exportModel = function(pathTo, handleResponse, handleError) {
  const endPoint = this._address + "ExportModel";
  axios.post(endPoint, pathTo, {withCredentials: true, responseType: 'arraybuffer'})
    .then(handleResponse).catch(handleError);
}

api.prototype.freeMemory = function() {
  const endPoint = this._address + "FreeMemory";
  axios.put(endPoint, {}, {withCredentials: true})
    .then(NOOP_FUN).catch((err)=>console.error(err));
}

let API = new api();

export default API;
